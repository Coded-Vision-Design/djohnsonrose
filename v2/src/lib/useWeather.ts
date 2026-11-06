import { useEffect } from 'react'
import { useOsStore } from '../store/osStore'
import { weatherFromApi } from '../../../assets/js/windowing/weather.js'

interface WeatherApiResponse {
  current_weather?: {
    temperature: number
    weathercode: number
  }
  city?: string
}

// Fetches /api/weather.php on mount and every 30 minutes after. PHP backend
// caches the upstream OpenMeteo response so we never hammer it.
export function useWeather() {
  const setWeather = useOsStore((s) => s.setWeather)

  useEffect(() => {
    let cancelled = false

    const fetchWeather = async () => {
      try {
        const res = await fetch('/api/weather.php')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: WeatherApiResponse = await res.json()
        // The codes are read in assets/js/windowing/weather.js, shared with v1.
        const weather = weatherFromApi(data)
        if (!weather) throw new Error('No weather')
        if (cancelled) return
        setWeather({ ...weather, status: 'ready' })
      } catch {
        // Widgets says so, rather than showing NaN, as v1 does. A later
        // refresh can still succeed.
        if (cancelled || useOsStore.getState().weather.status === 'ready') return
        setWeather({ temp: '--', condition: 'Weather unavailable', icon: '☁️', status: 'error' })
      }
    }

    fetchWeather()
    const id = window.setInterval(fetchWeather, 30 * 60 * 1000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [setWeather])
}
