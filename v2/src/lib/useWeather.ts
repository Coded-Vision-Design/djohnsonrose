import { useEffect } from 'react'
import { useOsStore } from '../store/osStore'

interface WeatherApiResponse {
  current_weather?: {
    temperature: number
    weathercode: number
  }
  city?: string
}

const CONDITIONS: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  51: { label: 'Drizzle', icon: '🌦️' },
  61: { label: 'Rain', icon: '🌧️' },
  71: { label: 'Snow', icon: '❄️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
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
        if (cancelled || !data.current_weather) return
        const cond = CONDITIONS[data.current_weather.weathercode] ?? {
          label: 'Cloudy',
          icon: '☁️',
        }
        setWeather({
          temp: Math.round(data.current_weather.temperature),
          city: data.city || 'London',
          condition: cond.label,
          icon: cond.icon,
        })
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
