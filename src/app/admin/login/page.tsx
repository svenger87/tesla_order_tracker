'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn } from 'lucide-react'
import Link from 'next/link'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login fehlgeschlagen')
      }

      router.push('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <LogIn className="h-5 w-5" />
            Admin Login
          </CardTitle>
          <CardDescription>
            Melde dich an, um Bestellungen zu verwalten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Benutzername</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Anmelden...' : 'Anmelden'}
            </Button>

            <div className="text-center">
              <Link href="/" className="text-sm text-muted-foreground hover:underline">
                Zurück zur Übersicht
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
