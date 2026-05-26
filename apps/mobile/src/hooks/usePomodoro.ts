import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef, useState } from 'react'

export type PomodoroPhase = 'idle' | 'focus' | 'short_break' | 'long_break'

interface PomodoroOptions {
  focusMinutes?: number
  shortBreakMinutes?: number
  longBreakMinutes?: number
  cyclesUntilLongBreak?: number
  onPhaseEnd?: (phase: PomodoroPhase, nextPhase: PomodoroPhase) => void
}

/**
 * Klasik Pomodoro: 25 dakika focus → 5 dakika kısa mola.
 * 4 cycle sonra 15 dakika uzun mola.
 *
 * Timer ekran kapalıyken de çalışsın diye absolute time hesabıyla.
 */
export function usePomodoro(opts: PomodoroOptions = {}) {
  const {
    focusMinutes = 25,
    shortBreakMinutes = 5,
    longBreakMinutes = 15,
    cyclesUntilLongBreak = 4,
    onPhaseEnd,
  } = opts

  const [phase, setPhase] = useState<PomodoroPhase>('idle')
  const [secondsLeft, setSecondsLeft] = useState(focusMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedCycles, setCompletedCycles] = useState(0)

  const phaseEndAtRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const onPhaseEndRef = useRef(onPhaseEnd)
  onPhaseEndRef.current = onPhaseEnd

  const phaseDuration = useCallback(
    (p: PomodoroPhase): number => {
      switch (p) {
        case 'focus':
          return focusMinutes * 60
        case 'short_break':
          return shortBreakMinutes * 60
        case 'long_break':
          return longBreakMinutes * 60
        default:
          return 0
      }
    },
    [focusMinutes, shortBreakMinutes, longBreakMinutes],
  )

  const tick = useCallback(() => {
    if (!phaseEndAtRef.current) return
    const remaining = Math.max(0, Math.floor((phaseEndAtRef.current - Date.now()) / 1000))
    setSecondsLeft(remaining)

    if (remaining <= 0) {
      // Phase bitti
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})

      const currentPhase = phase
      let nextPhase: PomodoroPhase
      let nextCycles = completedCycles

      if (currentPhase === 'focus') {
        nextCycles = completedCycles + 1
        nextPhase = nextCycles % cyclesUntilLongBreak === 0 ? 'long_break' : 'short_break'
      } else {
        nextPhase = 'focus'
      }

      setCompletedCycles(nextCycles)
      onPhaseEndRef.current?.(currentPhase, nextPhase)

      // Otomatik geçme — kullanıcı bunu durdurmadıysa
      const next = phaseDuration(nextPhase)
      phaseEndAtRef.current = Date.now() + next * 1000
      setPhase(nextPhase)
      setSecondsLeft(next)
    }
  }, [phase, completedCycles, cyclesUntilLongBreak, phaseDuration])

  useEffect(() => {
    if (isRunning) {
      tick() // hemen bir kez
      intervalRef.current = setInterval(tick, 1000) as unknown as number
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }
    return
  }, [isRunning, tick])

  const start = useCallback(() => {
    if (phase === 'idle') {
      setPhase('focus')
      const dur = phaseDuration('focus')
      phaseEndAtRef.current = Date.now() + dur * 1000
      setSecondsLeft(dur)
    } else if (!phaseEndAtRef.current) {
      const dur = phaseDuration(phase)
      phaseEndAtRef.current = Date.now() + secondsLeft * 1000
      setSecondsLeft(secondsLeft || dur)
    }
    setIsRunning(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
  }, [phase, secondsLeft, phaseDuration])

  const pause = useCallback(() => {
    setIsRunning(false)
    phaseEndAtRef.current = null
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }, [])

  const reset = useCallback(() => {
    setIsRunning(false)
    setPhase('idle')
    setSecondsLeft(focusMinutes * 60)
    setCompletedCycles(0)
    phaseEndAtRef.current = null
  }, [focusMinutes])

  const skip = useCallback(() => {
    if (phase === 'idle') return
    let nextPhase: PomodoroPhase
    let nextCycles = completedCycles
    if (phase === 'focus') {
      nextCycles = completedCycles + 1
      nextPhase = nextCycles % cyclesUntilLongBreak === 0 ? 'long_break' : 'short_break'
    } else {
      nextPhase = 'focus'
    }
    setCompletedCycles(nextCycles)
    setPhase(nextPhase)
    const dur = phaseDuration(nextPhase)
    setSecondsLeft(dur)
    if (isRunning) {
      phaseEndAtRef.current = Date.now() + dur * 1000
    } else {
      phaseEndAtRef.current = null
    }
  }, [phase, completedCycles, cyclesUntilLongBreak, phaseDuration, isRunning])

  const totalDuration = phaseDuration(phase)
  const progress = totalDuration > 0 ? 1 - secondsLeft / totalDuration : 0

  return {
    phase,
    isRunning,
    secondsLeft,
    completedCycles,
    progress,
    start,
    pause,
    reset,
    skip,
  }
}

export function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}
