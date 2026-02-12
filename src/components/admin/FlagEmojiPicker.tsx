'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { TwemojiEmoji } from '@/components/TwemojiText'

// Country flags - sorted by likely usage for Tesla orders
const FLAG_EMOJIS = [
  // Most common Tesla markets
  { emoji: '🇩🇪', name: 'Deutschland', code: 'DE' },
  { emoji: '🇦🇹', name: 'Österreich', code: 'AT' },
  { emoji: '🇨🇭', name: 'Schweiz', code: 'CH' },
  { emoji: '🇳🇱', name: 'Niederlande', code: 'NL' },
  { emoji: '🇧🇪', name: 'Belgien', code: 'BE' },
  { emoji: '🇫🇷', name: 'Frankreich', code: 'FR' },
  { emoji: '🇮🇹', name: 'Italien', code: 'IT' },
  { emoji: '🇪🇸', name: 'Spanien', code: 'ES' },
  { emoji: '🇵🇹', name: 'Portugal', code: 'PT' },
  { emoji: '🇬🇧', name: 'Großbritannien', code: 'GB' },
  { emoji: '🇮🇪', name: 'Irland', code: 'IE' },
  { emoji: '🇩🇰', name: 'Dänemark', code: 'DK' },
  { emoji: '🇸🇪', name: 'Schweden', code: 'SE' },
  { emoji: '🇳🇴', name: 'Norwegen', code: 'NO' },
  { emoji: '🇫🇮', name: 'Finnland', code: 'FI' },
  { emoji: '🇵🇱', name: 'Polen', code: 'PL' },
  { emoji: '🇨🇿', name: 'Tschechien', code: 'CZ' },
  { emoji: '🇭🇺', name: 'Ungarn', code: 'HU' },
  { emoji: '🇷🇴', name: 'Rumänien', code: 'RO' },
  { emoji: '🇬🇷', name: 'Griechenland', code: 'GR' },
  { emoji: '🇱🇺', name: 'Luxemburg', code: 'LU' },
  { emoji: '🇸🇮', name: 'Slowenien', code: 'SI' },
  { emoji: '🇸🇰', name: 'Slowakei', code: 'SK' },
  { emoji: '🇭🇷', name: 'Kroatien', code: 'HR' },
  { emoji: '🇧🇬', name: 'Bulgarien', code: 'BG' },
  // Baltic states
  { emoji: '🇪🇪', name: 'Estland', code: 'EE' },
  { emoji: '🇱🇻', name: 'Lettland', code: 'LV' },
  { emoji: '🇱🇹', name: 'Litauen', code: 'LT' },
  // Other European countries
  { emoji: '🇮🇸', name: 'Island', code: 'IS' },
  { emoji: '🇨🇾', name: 'Zypern', code: 'CY' },
  { emoji: '🇲🇹', name: 'Malta', code: 'MT' },
  { emoji: '🇺🇦', name: 'Ukraine', code: 'UA' },
  { emoji: '🇲🇩', name: 'Moldau', code: 'MD' },
  { emoji: '🇧🇾', name: 'Belarus', code: 'BY' },
  { emoji: '🇷🇸', name: 'Serbien', code: 'RS' },
  { emoji: '🇲🇪', name: 'Montenegro', code: 'ME' },
  { emoji: '🇧🇦', name: 'Bosnien-Herzegowina', code: 'BA' },
  { emoji: '🇦🇱', name: 'Albanien', code: 'AL' },
  { emoji: '🇲🇰', name: 'Nordmazedonien', code: 'MK' },
  { emoji: '🇽🇰', name: 'Kosovo', code: 'XK' },
  // European microstates
  { emoji: '🇱🇮', name: 'Liechtenstein', code: 'LI' },
  { emoji: '🇲🇨', name: 'Monaco', code: 'MC' },
  { emoji: '🇦🇩', name: 'Andorra', code: 'AD' },
  { emoji: '🇸🇲', name: 'San Marino', code: 'SM' },
  { emoji: '🇻🇦', name: 'Vatikanstadt', code: 'VA' },
  // Other common countries
  { emoji: '🇺🇸', name: 'USA', code: 'US' },
  { emoji: '🇨🇦', name: 'Kanada', code: 'CA' },
  { emoji: '🇦🇺', name: 'Australien', code: 'AU' },
  { emoji: '🇯🇵', name: 'Japan', code: 'JP' },
  { emoji: '🇨🇳', name: 'China', code: 'CN' },
  { emoji: '🇰🇷', name: 'Südkorea', code: 'KR' },
  { emoji: '🇹🇼', name: 'Taiwan', code: 'TW' },
  { emoji: '🇮🇱', name: 'Israel', code: 'IL' },
  { emoji: '🇦🇪', name: 'VAE', code: 'AE' },
  { emoji: '🇹🇷', name: 'Türkei', code: 'TR' },
  { emoji: '🇧🇷', name: 'Brasilien', code: 'BR' },
  { emoji: '🇲🇽', name: 'Mexiko', code: 'MX' },
  { emoji: '🇳🇿', name: 'Neuseeland', code: 'NZ' },
  { emoji: '🇿🇦', name: 'Südafrika', code: 'ZA' },
  { emoji: '🇮🇳', name: 'Indien', code: 'IN' },
]

interface FlagEmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
}

export function FlagEmojiPicker({ value, onChange }: FlagEmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredFlags = FLAG_EMOJIS.filter(
    flag =>
      flag.name.toLowerCase().includes(search.toLowerCase()) ||
      flag.code.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (emoji: string) => {
    onChange(emoji)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-16 h-10 p-0 flex items-center justify-center"
            type="button"
          >
            {value ? (
              <TwemojiEmoji emoji={value} size={24} />
            ) : (
              <TwemojiEmoji emoji="🏳️" size={24} />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-2" align="start">
          <div className="space-y-2">
            <Input
              placeholder="Land suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
            <div className="grid grid-cols-6 gap-1 max-h-[200px] overflow-y-auto">
              {filteredFlags.map((flag) => (
                <button
                  key={flag.code}
                  type="button"
                  className="w-10 h-10 hover:bg-muted rounded flex items-center justify-center transition-colors"
                  onClick={() => handleSelect(flag.emoji)}
                  title={flag.name}
                >
                  <TwemojiEmoji emoji={flag.emoji} size={24} />
                </button>
              ))}
            </div>
            {filteredFlags.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Kein Land gefunden
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Oder manuell eingeben..."
        className="flex-1"
      />
    </div>
  )
}
