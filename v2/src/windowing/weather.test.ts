import { describe, it, expect } from 'vitest'
import { weatherCondition, weatherFromApi } from '../../../assets/js/windowing/weather.js'

// The weather words both builds show for Open-Meteo's WMO codes.

describe('weatherCondition', () => {
  it('names moderate rain as rain, not cloud', () => {
    expect(weatherCondition(63).label).toBe('Rain')
    expect(weatherCondition(63).label).not.toMatch(/cloud/i)
  })

  it('covers every WMO code Open-Meteo sends', () => {
    const codes = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]
    for (const code of codes) expect(weatherCondition(code).label).not.toBe('Unknown')
    expect(new Set(codes.map((code) => weatherCondition(code).label)).size).toBe(codes.length)
  })

  it('gives a code it does not list the family it belongs to', () => {
    expect(weatherCondition(64).label).toBe('Rain')
    expect(weatherCondition(97).label).toBe('Thunderstorm')
    expect(weatherCondition('73').label).toBe('Snow')
  })

  it('says unknown for something that is not a code', () => {
    expect(weatherCondition(undefined).label).toBe('Unknown')
    expect(weatherCondition(-1).label).toBe('Unknown')
  })
})

describe('weatherFromApi', () => {
  it('rounds the temperature and keeps the city', () => {
    expect(weatherFromApi({ current_weather: { temperature: 11.6, weathercode: 63 }, city: 'Ipswich' })).toEqual({
      temp: 12,
      city: 'Ipswich',
      condition: 'Rain',
      icon: '🌧️',
    })
  })

  it('falls back to London with no city', () => {
    expect(weatherFromApi({ current_weather: { temperature: 3, weathercode: 0 } })?.city).toBe('London')
  })

  it('shows nothing for an answer with no weather in it', () => {
    expect(weatherFromApi({})).toBeNull()
    expect(weatherFromApi(null)).toBeNull()
    expect(weatherFromApi({ current_weather: { temperature: Number.NaN, weathercode: 1 } })).toBeNull()
  })
})
