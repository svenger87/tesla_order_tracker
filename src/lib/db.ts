import { PrismaClient } from '@/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql/web'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL_PREVIEW || ''
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN_PREVIEW

  const adapter = new PrismaLibSql({
    url,
    ...(authToken && { authToken }),
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
