'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LogOut, Home, Settings, ArrowLeftRight, SlidersHorizontal, Image } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { SettingsTab } from '@/components/admin/SettingsTab'
import { ImportExportTab } from '@/components/admin/ImportExportTab'
import { OptionsTab } from '@/components/admin/OptionsTab'
import { CompositorTab } from '@/components/admin/CompositorTab'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const t = useTranslations('admin')
  const tc = useTranslations('common')

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/check')
      if (!res.ok) {
        router.push('/admin/login')
        return false
      }
      return true
    } catch {
      router.push('/admin/login')
      return false
    }
  }, [router])

  useEffect(() => {
    checkAuth().then((authed) => {
      if (authed) setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('manageDescription')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  {t('backToOverview')}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="settings">
          <TabsList className="mb-6">
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              {t('settings')}
            </TabsTrigger>
            <TabsTrigger value="import-export">
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              {t('importExport')}
            </TabsTrigger>
            <TabsTrigger value="options">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {t('options')}
            </TabsTrigger>
            <TabsTrigger value="compositor">
              <Image className="h-4 w-4 mr-2" />
              {t('compositor')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>

          <TabsContent value="import-export">
            <ImportExportTab />
          </TabsContent>

          <TabsContent value="options">
            <OptionsTab />
          </TabsContent>

          <TabsContent value="compositor">
            <CompositorTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
