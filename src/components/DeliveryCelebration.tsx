'use client'

import { useEffect, useCallback } from 'react'
import confetti from 'canvas-confetti'

interface DeliveryCelebrationProps {
  trigger: boolean
  onComplete?: () => void
}

export function DeliveryCelebration({ trigger, onComplete }: DeliveryCelebrationProps) {
  const celebrate = useCallback(() => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(interval)
        onComplete?.()
        return
      }

      const particleCount = 50 * (timeLeft / duration)

      // Red confetti (Tesla theme)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#E31937', '#ff4d6d', '#ff8fa3'],
      })

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#E31937', '#ff4d6d', '#ff8fa3'],
      })
    }, 250)

    return () => clearInterval(interval)
  }, [onComplete])

  useEffect(() => {
    if (trigger) {
      const cleanup = celebrate()
      return cleanup
    }
  }, [trigger, celebrate])

  return null
}

export function triggerCelebration() {
  const duration = 2000
  const animationEnd = Date.now() + duration

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#E31937', '#ff4d6d', '#ffffff'],
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#E31937', '#ff4d6d', '#ffffff'],
    })

    if (Date.now() < animationEnd) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}
