import { PrismaClient } from '@/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // In development, prefer local SQLite unless explicitly using Turso
  const isDev = process.env.NODE_ENV !== 'production'
  const useLocalDb = isDev && !process.env.USE_TURSO_IN_DEV

  const url = useLocalDb
    ? (process.env.DATABASE_URL || 'file:./prisma/dev.db')
    : (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./prisma/dev.db')
  const authToken = useLocalDb ? undefined : process.env.TURSO_AUTH_TOKEN

  const adapter = new PrismaLibSql({
    url,
    ...(authToken && { authToken }),
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
