'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { dedupedJson } from '@/lib/dedupe-fetch'

interface Settings {
  showDonation?: boolean
  donationUrl?: string
  paypalUrl?: string
  yearlyGoal?: number | null
  yearlyRaised?: number | null
}

/**
 * The frame every page sits in.
 *
 * Header and footer used to live inside HomeClient, so the home page had
 * navigation, a language switcher, a theme toggle and the site's name, and
 * every other page had none of it — the order detail page, the form, the legal
 * pages and the API docs were islands. Someone arriving on the imprint from a
 * search result saw a card floating on an empty background.
 *
 * A client component on purpose: the layout is statically generated per locale
 * (`generateStaticParams`), and reading cookies or the database up there would
 * make every page in the app dynamic. The two things the frame needs — whether
 * a donation link is configured, and whether an admin is signed in — are
 * fetched instead, deduplicated so a navigation does not re-ask.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const pathname = usePathname()
  const tn = useTranslations('nav')

  useEffect(() => {
    dedupedJson<Settings>('/api/settings')
      .then(setSettings)
      .catch(() => setSettings(null))
  }, [])

  // Re-checked per navigation: signing in or out happens on these very pages,
  // and the frame would otherwise keep showing the state from the first load.
  useEffect(() => {
    let active = true
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => { if (active) setIsAdmin(Boolean(data.authenticated)) })
      .catch(() => { if (active) setIsAdmin(false) })
    return () => { active = false }
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Seven tab stops separated a keyboard user from the content on every
          page. Hidden until focused, which is the point: the first Tab press
          offers the shortcut, and everyone else never sees it. */}
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline focus:outline-2 focus:outline-primary"
      >
        {tn('skipToContent')}
      </a>

      <Header isAdmin={isAdmin} settings={settings} />
      {/* The main landmark belongs to the frame, not to individual pages: three
          of them brought their own and six had none, so on most of the site
          there was nothing for a screen reader to skip to. Pages keep their own
          width and padding in a plain container inside this one. */}
      <main id="inhalt" className="flex-1">{children}</main>
      <Footer settings={settings} />
    </div>
  )
}
