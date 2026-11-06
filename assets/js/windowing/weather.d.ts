export interface WeatherCondition {
  label: string
  icon: string
}

export interface ShownWeather {
  temp: number
  city: string
  condition: string
  icon: string
}

export function weatherCondition(code: number | string | null | undefined): WeatherCondition
export function weatherFromApi(
  data: { current_weather?: { temperature: number; weathercode: number }; city?: string } | null | undefined,
): ShownWeather | null
