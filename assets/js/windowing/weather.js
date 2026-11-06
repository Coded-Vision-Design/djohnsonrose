// What the weather in the taskbar and widgets says, shared by both builds.
// api/weather.php passes on Open-Meteo, which reports WMO weather codes.

const CONDITIONS = {
  0: { label: 'Clear', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Freezing fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Heavy drizzle', icon: '🌧️' },
  56: { label: 'Freezing drizzle', icon: '🌧️' },
  57: { label: 'Heavy freezing drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌦️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  66: { label: 'Freezing rain', icon: '🌧️' },
  67: { label: 'Heavy freezing rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '🌨️' },
  80: { label: 'Light showers', icon: '🌦️' },
  81: { label: 'Showers', icon: '🌧️' },
  82: { label: 'Heavy showers', icon: '🌧️' },
  85: { label: 'Snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '🌨️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm with hail', icon: '⛈️' },
  99: { label: 'Thunderstorm with heavy hail', icon: '⛈️' },
};

// WMO groups its codes in tens, so a code missing above still has a family.
const FAMILIES = [
  [95, CONDITIONS[95]],
  [85, CONDITIONS[85]],
  [80, CONDITIONS[81]],
  [71, CONDITIONS[73]],
  [61, CONDITIONS[63]],
  [51, CONDITIONS[53]],
  [45, CONDITIONS[45]],
  [0, CONDITIONS[3]],
];

/** The label and icon for a WMO weather code. */
export function weatherCondition(code) {
  const n = Number(code);
  if (CONDITIONS[n]) return CONDITIONS[n];
  if (!Number.isFinite(n) || n < 0) return { label: 'Unknown', icon: '🌡️' };
  return FAMILIES.find(([from]) => n >= from)[1];
}

/** The weather to show from an api/weather.php answer, or null when it has none. */
export function weatherFromApi(data) {
  const current = data?.current_weather;
  if (!current || !Number.isFinite(Number(current.temperature))) return null;
  const condition = weatherCondition(current.weathercode);
  return {
    temp: Math.round(Number(current.temperature)),
    // Essex is the default place in config.php.
    city: data.city || 'Essex',
    condition: condition.label,
    icon: condition.icon,
  };
}

/**
 * The weather in a reply from api/weather.php, or an error. The body is read
 * either way: Chrome keeps a request open until it is, so an unread error
 * reply would stop the page ever going quiet on the network.
 */
export async function weatherFromResponse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const weather = weatherFromApi(data);
  if (!weather) throw new Error('No weather');
  return weather;
}
