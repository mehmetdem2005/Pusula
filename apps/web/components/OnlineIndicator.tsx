'use client'
import { useEffect, useState } from 'react'

export function OnlineIndicator() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    setOnline(navigator.onLine)

    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return (
    <div className="flex items-center gap-1">
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          online ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      />
      <span className="text-[9px] text-slate-500">{online ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
    </div>
  )
}
