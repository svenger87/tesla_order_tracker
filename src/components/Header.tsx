'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  LogIn,
  Heart,
  Coffee,
  Github,
  Code2,
  Menu,
} from 'lucide-react'

interface HeaderProps {
  isAdmin: boolean
  settings: { showDonation?: boolean; donationUrl?: string; paypalUrl?: string } | null
}

export function Header({ isAdmin, settings }: HeaderProps) {
  const t = useTranslations('home')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')
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
            {settings?.showDonation && (settings?.donationUrl || settings?.paypalUrl) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                    <Heart className="h-3.5 w-3.5" />
                    {tc('support')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {settings.donationUrl && (
                    <DropdownMenuItem asChild>
                      <a href={settings.donationUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                        <Coffee className="h-4 w-4" />
                        Buy Me a Coffee
                      </a>
                    </DropdownMenuItem>
                  )}
                  {settings.paypalUrl && (
                    <DropdownMenuItem asChild>
                      <a href={settings.paypalUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                        <svg className="h-4 w-4" viewBox="0 0 48 48" fill="none"><path fill="#001C64" d="M37.972 13.82c.107-5.565-4.485-9.837-10.799-9.837H14.115a1.278 1.278 0 0 0-1.262 1.079L7.62 37.758a1.038 1.038 0 0 0 1.025 1.2h7.737l-1.21 7.572a1.038 1.038 0 0 0 1.026 1.2H22.5c.305 0 .576-.11.807-.307.231-.198.269-.471.316-.772l1.85-10.885c.047-.3.2-.69.432-.888.231-.198.433-.306.737-.307H30.5c6.183 0 11.43-4.394 12.389-10.507.678-4.34-1.182-8.287-4.916-10.244Z"/><path fill="#0070E0" d="m18.056 26.9-1.927 12.22-1.21 7.664a1.038 1.038 0 0 0 1.026 1.2h6.67a1.278 1.278 0 0 0 1.261-1.079l1.758-11.14a1.277 1.277 0 0 1 1.261-1.078h3.927c6.183 0 11.429-4.51 12.388-10.623.68-4.339-1.504-8.286-5.238-10.244-.01.462-.05.923-.121 1.38-.959 6.112-6.206 10.623-12.389 10.623h-6.145a1.277 1.277 0 0 0-1.261 1.077Z"/><path fill="#003087" d="M16.128 39.12h-7.76a1.037 1.037 0 0 1-1.025-1.2l5.232-33.182a1.277 1.277 0 0 1 1.262-1.078h13.337c6.313 0 10.905 4.595 10.798 10.16-1.571-.824-3.417-1.295-5.44-1.295H21.413a1.278 1.278 0 0 0-1.261 1.078L18.057 26.9l-1.93 12.22Z"/></svg>
                        PayPal
                      </a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Link href="/docs">
              <Button variant="ghost" size="icon" className="h-9 w-9" title={tn('apiDocs')}>
                <Code2 className="h-4 w-4" />
                <span className="sr-only">{tn('apiDocs')}</span>
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
            <SheetDescription className="sr-only">{tn('navigationMenu')}</SheetDescription>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-2">
            <Link href="/docs" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Code2 className="h-4 w-4" />
                {tn('apiDocs')}
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
                  Buy Me a Coffee
                </Button>
              </a>
            )}
            {settings?.showDonation && settings?.paypalUrl && (
              <a
                href={settings.paypalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
              >
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 48 48" fill="none"><path fill="#001C64" d="M37.972 13.82c.107-5.565-4.485-9.837-10.799-9.837H14.115a1.278 1.278 0 0 0-1.262 1.079L7.62 37.758a1.038 1.038 0 0 0 1.025 1.2h7.737l-1.21 7.572a1.038 1.038 0 0 0 1.026 1.2H22.5c.305 0 .576-.11.807-.307.231-.198.269-.471.316-.772l1.85-10.885c.047-.3.2-.69.432-.888.231-.198.433-.306.737-.307H30.5c6.183 0 11.43-4.394 12.389-10.507.678-4.34-1.182-8.287-4.916-10.244Z"/><path fill="#0070E0" d="m18.056 26.9-1.927 12.22-1.21 7.664a1.038 1.038 0 0 0 1.026 1.2h6.67a1.278 1.278 0 0 0 1.261-1.079l1.758-11.14a1.277 1.277 0 0 1 1.261-1.078h3.927c6.183 0 11.429-4.51 12.388-10.623.68-4.339-1.504-8.286-5.238-10.244-.01.462-.05.923-.121 1.38-.959 6.112-6.206 10.623-12.389 10.623h-6.145a1.277 1.277 0 0 0-1.261 1.077Z"/><path fill="#003087" d="M16.128 39.12h-7.76a1.037 1.037 0 0 1-1.025-1.2l5.232-33.182a1.277 1.277 0 0 1 1.262-1.078h13.337c6.313 0 10.905 4.595 10.798 10.16-1.571-.824-3.417-1.295-5.44-1.295H21.413a1.278 1.278 0 0 0-1.261 1.078L18.057 26.9l-1.93 12.22Z"/></svg>
                  PayPal
                </Button>
              </a>
            )}

            <div className="h-px bg-border my-2" />

            {isAdmin ? (
              <Link href="/admin" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2 border-primary/30 text-primary">
                  <LogIn className="h-4 w-4" />
                  {tn('adminDashboard')}
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
export function HeaderWithData() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [settings, setSettings] = useState<{ showDonation?: boolean; donationUrl?: string; paypalUrl?: string } | null>(null)

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
    />
  )
}
