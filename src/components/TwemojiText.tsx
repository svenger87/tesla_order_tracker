'use client'

import React, { memo } from 'react'
import { parse, EmojiEntity } from 'twemoji-parser'

// Use jsDelivr CDN which has proper CORS support (maxcdn has CORS issues)
const TWEMOJI_CDN_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/'

// Convert twemoji-parser URL to jsDelivr URL
function fixTwemojiUrl(url: string): string {
  // Extract emoji code from URL like https://twemoji.maxcdn.com/v/latest/72x72/1f1e9-1f1ea.png
  const match = url.match(/\/([a-f0-9-]+)\.png$/i)
  if (match) {
    return `${TWEMOJI_CDN_BASE}${match[1]}.png`
  }
  return url
}

interface TwemojiTextProps {
  text: string
  className?: string
  size?: number
}

/**
 * Renders text with emojis replaced by Twemoji images for cross-platform consistency.
 * This ensures flag emojis display correctly on Windows (which doesn't support them natively).
 */
export const TwemojiText = memo(function TwemojiText({
  text,
  className = '',
  size = 20
}: TwemojiTextProps) {
  if (!text) return null

  const entities: EmojiEntity[] = parse(text, { assetType: 'png' })

  if (entities.length === 0) {
    return <span className={className}>{text}</span>
  }

  const elements: React.ReactNode[] = []
  let lastIndex = 0

  entities.forEach((entity, i) => {
    // Add text before this emoji
    if (entity.indices[0] > lastIndex) {
      elements.push(text.substring(lastIndex, entity.indices[0]))
    }

    // Add the emoji as an image
    elements.push(
      <img
        key={i}
        src={fixTwemojiUrl(entity.url)}
        alt={entity.text}
        className="inline-block align-text-bottom"
        style={{
          width: size,
          height: size,
          verticalAlign: 'middle'
        }}
        draggable={false}
      />
    )

    lastIndex = entity.indices[1]
  })

  // Add any remaining text
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex))
  }

  return <span className={className}>{elements}</span>
})

/**
 * Renders just an emoji as a Twemoji image
 */
export const TwemojiEmoji = memo(function TwemojiEmoji({
  emoji,
  size = 20,
  className = ''
}: {
  emoji: string
  size?: number
  className?: string
}) {
  const entities = parse(emoji, { assetType: 'png' })

  if (entities.length === 0) {
    return <span className={className}>{emoji}</span>
  }

  return (
    <img
      src={fixTwemojiUrl(entities[0].url)}
      alt={emoji}
      className={`inline-block ${className}`}
      style={{
        width: size,
        height: size,
        verticalAlign: 'middle'
      }}
      draggable={false}
    />
  )
})
