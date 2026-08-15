'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LogOut, Home, Settings, ArrowLeftRight, SlidersHorizontal, Image as ImageIcon, Archive } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { SettingsTab } from '@/components/admin/SettingsTab'
import { ImportExportTab } from '@/components/admin/ImportExportTab'
import { OptionsTab } from '@/components/admin/OptionsTab'
import { CompositorTab } from '@/components/admin/CompositorTab'
import { BackupsTab } from '@/components/admin/BackupsTab'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('admin')
  const tc = useTranslations('common')

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/check')
      const data = await res.json()
      if (!res.ok || !data.authenticated) {
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
      <div className="flex items-center justify-center px-4 py-16">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </div>
    )
  }

  return (
    <div>
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('manageDescription')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  {t('backToOverview')}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="settings">
          {/* Full width and scrollable, with the labels folded away below sm.
              Five German labels measured 656px on a 390px screen and dragged
              the whole document sideways — every page of the admin area
              scrolled horizontally, whichever tab was open. sr-only rather
              than hidden keeps each tab named for a screen reader. */}
          <TabsList className="mb-6 w-full justify-start overflow-x-auto sm:w-fit group-data-[orientation=horizontal]/tabs:h-12 sm:group-data-[orientation=horizontal]/tabs:h-9">
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">{t('settings')}</span>
            </TabsTrigger>
            <TabsTrigger value="import-export">
              <ArrowLeftRight className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">{t('importExport')}</span>
            </TabsTrigger>
            <TabsTrigger value="options">
              <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">{t('options')}</span>
            </TabsTrigger>
            <TabsTrigger value="compositor">
              <ImageIcon className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">{t('compositor')}</span>
            </TabsTrigger>
            <TabsTrigger value="backups">
              <Archive className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">{t('backups')}</span>
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

          <TabsContent value="backups">
            <BackupsTab locale={locale} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
