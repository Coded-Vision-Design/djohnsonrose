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
        const data: WeatherApiResponse = await res.json()
        // The codes are read in assets/js/windowing/weather.js, shared with v1.
        const weather = weatherFromApi(data)
        if (cancelled || !weather) return
        setWeather(weather)
      } catch {
        // Silent — taskbar already shows the loading placeholder.
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
