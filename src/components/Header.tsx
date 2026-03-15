'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Search,
  Plus,
  LogIn,
  Coffee,
  Github,
  Code2,
  Menu,
  LayoutDashboard,
} from 'lucide-react'

interface HeaderProps {
  isAdmin: boolean
  settings: { showDonation?: boolean; donationUrl?: string } | null
  onSearchOpen: () => void
}

export function Header({ isAdmin, settings, onSearchOpen }: HeaderProps) {
  const t = useTranslations('home')
  const tc = useTranslations('common')
  const ts = useTranslations('search')
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg shadow-sm">
      <div className="h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
      <div className="w-full max-w-[98vw] mx-auto px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Logo + title */}
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="relative rounded-lg bg-primary p-1.5 w-[34px] h-[40px] transition-transform hover:scale-105 shadow-md shadow-primary/20">
              <Image
                src="/logo.webp"
                alt="Tesla Tracker Logo"
                fill
                sizes="40px"
                className="object-contain p-0.5"
              />
            </div>
            <span className="text-lg font-bold tracking-tight">TFF Order Stats</span>
          </Link>

          {/* Desktop nav (>=1024px) */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/new">
              <Button size="sm" className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                {t('newOrder')}
              </Button>
            </Link>

            <div className="w-px h-5 bg-border mx-2" />

            {settings?.showDonation && settings?.donationUrl && (
              <a
                href={settings.donationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <Coffee className="h-3.5 w-3.5" />
                  {tc('support')}
                </Button>
              </a>
            )}
            <Link href="/docs">
              <Button variant="ghost" size="icon" className="h-9 w-9" title="API Docs">
                <Code2 className="h-4 w-4" />
                <span className="sr-only">API Docs</span>
              </Button>
            </Link>
            <a
              href="https://github.com/svenger87/tesla_order_tracker"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Github className="h-4 w-4" />
                <span className="sr-only">GitHub</span>
              </Button>
            </a>

            <div className="w-px h-5 bg-border mx-2" />

            {/* Search */}
            <Button
              variant="outline"
              size="sm"
              onClick={onSearchOpen}
              className="gap-2 text-muted-foreground border-input/60 bg-muted/30 hover:bg-muted/50"
            >
              <Search className="h-4 w-4" />
              {ts('openSearch')}
              <kbd className="pointer-events-none ml-1 hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 lg:flex">
                <span className="text-xs">&#8984;</span>K
              </kbd>
            </Button>
            <LanguageSwitcher />
            <ThemeToggle />

            {/* Admin */}
            {isAdmin ? (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/5">
                  Admin
                </Button>
              </Link>
            ) : (
              <Link href="/admin/login">
                <Button variant="ghost" size="sm">
                  <LogIn className="h-4 w-4 mr-1.5" />
                  Admin
                </Button>
              </Link>
            )}
          </nav>

          {/* Tablet nav (640-1024px): icon-only */}
          <nav className="hidden sm:flex lg:hidden items-center gap-1">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Dashboard">
                <LayoutDashboard className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/new">
              <Button size="icon" className="h-9 w-9 shadow-sm" title={t('newOrder')}>
                <Plus className="h-4 w-4" />
              </Button>
            </Link>

            <div className="w-px h-5 bg-border mx-1" />

            <Button
              variant="outline"
              size="icon"
              onClick={onSearchOpen}
              className="h-9 w-9 text-muted-foreground"
              title={ts('openSearch')}
            >
              <Search className="h-4 w-4" />
            </Button>
            <LanguageSwitcher />
            <ThemeToggle />

            {isAdmin ? (
              <Link href="/admin">
                <Button variant="outline" size="icon" className="h-9 w-9 border-primary/30 text-primary" title="Admin">
                  <LogIn className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/admin/login">
                <Button variant="ghost" size="icon" className="h-9 w-9" title="Admin">
                  <LogIn className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile nav (<640px) */}
          <div className="flex sm:hidden items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onSearchOpen}
              className="h-9 w-9"
            >
              <Search className="h-4 w-4" />
              <span className="sr-only">{ts('openSearch')}</span>
            </Button>
            <LanguageSwitcher />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">{tc('menu')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile slide-out menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle>TFF Order Stats</SheetTitle>
            <SheetDescription className="sr-only">Navigation menu</SheetDescription>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-2">
            <Link href="/" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/new" onClick={() => setMobileOpen(false)}>
              <Button className="w-full justify-start gap-2">
                <Plus className="h-4 w-4" />
                {t('newOrder')}
              </Button>
            </Link>

            <div className="h-px bg-border my-2" />

            <Link href="/docs" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Code2 className="h-4 w-4" />
                API Docs
              </Button>
            </Link>
            <a
              href="https://github.com/svenger87/tesla_order_tracker"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
            >
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Github className="h-4 w-4" />
                GitHub
              </Button>
            </a>
            {settings?.showDonation && settings?.donationUrl && (
              <a
                href={settings.donationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
              >
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Coffee className="h-4 w-4" />
                  {tc('support')}
                </Button>
              </a>
            )}

            <div className="h-px bg-border my-2" />

            {isAdmin ? (
              <Link href="/admin" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2 border-primary/30 text-primary">
                  <LogIn className="h-4 w-4" />
                  Admin Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/admin/login" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <LogIn className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  )
}

/**
 * Self-contained header wrapper that fetches its own data.
 * Used in layout.tsx (server component) to avoid prop drilling.
 */
export function HeaderWithData({ onSearchOpen }: { onSearchOpen: () => void }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [settings, setSettings] = useState<{ showDonation?: boolean; donationUrl?: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [authRes, settingsRes] = await Promise.all([
        fetch('/api/auth/check'),
        fetch('/api/settings'),
      ])
      const authData = await authRes.json()
      setIsAdmin(authData.authenticated)
      const settingsData = await settingsRes.json()
      setSettings(settingsData)
    } catch {
      // Silently handle — header renders fine without admin/settings
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <Header
      isAdmin={isAdmin}
      settings={settings}
      onSearchOpen={onSearchOpen}
    />
  )
}
