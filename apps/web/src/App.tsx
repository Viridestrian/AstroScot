import { useEffect, useState } from 'react';
import type { AstroScotLocation } from '@astroscot/shared';
import { InfoCard } from './components/InfoCard';

const STORAGE_KEY = 'astroscot-location';

const prototypeLocation: AstroScotLocation = {
  name: 'Choose your town or city',
  latitude: 0,
  longitude: 0,
  timezone: 'Local timezone will appear here',
  source: 'manual',
};

type LocationStatus = 'idle' | 'loading' | 'ready' | 'error';
type WeatherStatus = 'idle' | 'loading' | 'ready' | 'error';

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country?: string;
  country_code?: string;
  admin1?: string;
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

interface WeatherResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

const cards = [
  {
    eyebrow: 'Moon',
    title: 'Moon mission',
    icon: '🌕',
    className: 'moon-card',
    items: ['Moon phase', 'Moonrise and moonset', 'Next full moon countdown', 'Special Moon news'],
    message: 'Moon times and full moon stories will appear here after astronomy calculations are added.',
  },
  {
    eyebrow: 'Planet Watching',
    title: 'Tonight’s sky quest',
    icon: '🪐',
    className: 'planet-card',
    items: ['Mercury, Venus, Mars, Jupiter, Saturn', 'Best time to look', 'Easy, tricky, or not tonight', 'Friendly viewing tips'],
    message: 'Planet watching guidance will appear here after visibility rules are added.',
  },
];

async function searchLocations(query: string): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'en',
    format: 'json',
  });

  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!response.ok) {
    throw new Error(`Location search failed with status ${response.status}`);
  }

  const data = (await response.json()) as GeocodingResponse;
  return data.results ?? [];
}

async function fetchWeather(location: AstroScotLocation): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: location.timezone,
    forecast_days: '1',
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) {
    throw new Error(`Weather request failed with status ${response.status}`);
  }

  return (await response.json()) as WeatherResponse;
}

function formatLocation(result: GeocodingResult) {
  const region = result.admin1 || result.country || '';
  return region ? `${result.name}, ${region}` : result.name;
}

function weatherDescription(code: number) {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mostly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67].includes(code)) return 'Rainy';
  if ([71, 73, 75, 77].includes(code)) return 'Snowy';
  if ([80, 81, 82].includes(code)) return 'Rain showers';
  if ([85, 86].includes(code)) return 'Snow showers';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Mixed weather';
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value));
}

function WeatherCard({ location }: { location: AstroScotLocation }) {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [status, setStatus] = useState<WeatherStatus>('idle');

  useEffect(() => {
    if (!location || (location.latitude === 0 && location.longitude === 0)) {
      setWeather(null);
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    fetchWeather(location)
      .then((data) => {
        if (!cancelled) {
          setWeather(data);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [location]);

  const daily = weather?.daily;
  const current = weather?.current;

  return (
    <article className="info-card weather-card">
      <div className="card-header">
        <div>
          <p className="card-eyebrow">Weather</p>
          <h2>Today outside</h2>
        </div>
        <span className="card-icon" aria-hidden="true">☀️</span>
      </div>

      {status === 'idle' && (
        <p className="placeholder-note">Choose a location above and AstroScot will show today’s weather here.</p>
      )}
      {status === 'loading' && <p className="placeholder-note">Checking the sky outside…</p>}
      {status === 'error' && <p className="placeholder-note">AstroScot could not get the weather right now. Try again in a moment.</p>}

      {status === 'ready' && weather && daily && current && (
        <div className="weather-content">
          <div className="weather-current">
            <span className="weather-temperature">{Math.round(current.temperature_2m)}°</span>
            <div>
              <strong>{weatherDescription(current.weather_code)}</strong>
              <span>Feels like {Math.round(current.apparent_temperature)}°</span>
            </div>
          </div>

          <div className="weather-summary">
            <div><span>High</span><strong>{Math.round(daily.temperature_2m_max[0])}°</strong></div>
            <div><span>Low</span><strong>{Math.round(daily.temperature_2m_min[0])}°</strong></div>
            <div><span>Rain chance</span><strong>{Math.round(daily.precipitation_probability_max[0])}%</strong></div>
          </div>

          <div className="weather-times">
            <span>🌅 Sunrise {formatTime(daily.sunrise[0], location.timezone)}</span>
            <span>🌇 Sunset {formatTime(daily.sunset[0], location.timezone)}</span>
          </div>
        </div>
      )}
    </article>
  );
}

export function App() {
  const [location, setLocation] = useState<AstroScotLocation>(prototypeLocation);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationMessage, setLocationMessage] = useState('Enter your town or city. AstroScot will remember it on this device.');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<GeocodingResult[]>([]);
  const [showLocationSearch, setShowLocationSearch] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const savedLocation = JSON.parse(saved) as AstroScotLocation;
      if (savedLocation.name && typeof savedLocation.latitude === 'number' && typeof savedLocation.longitude === 'number') {
        setLocation(savedLocation);
        setLocationStatus('ready');
        setLocationMessage('AstroScot remembered this location on your device.');
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveLocation = (result: GeocodingResult) => {
    const nextLocation: AstroScotLocation = {
      name: formatLocation(result),
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone || 'Local timezone',
      source: 'manual',
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLocation));
    setLocation(nextLocation);
    setLocationStatus('ready');
    setLocationMessage('AstroScot will remember this location on this device.');
    setLocationQuery('');
    setLocationResults([]);
    setShowLocationSearch(false);
  };

  const findLocation = async () => {
    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationStatus('error');
      setLocationMessage('Please enter at least two letters for a town or city.');
      return;
    }

    setLocationStatus('loading');
    setLocationMessage('Looking for that town or city…');
    setLocationResults([]);

    try {
      const results = await searchLocations(query);
      if (results.length === 0) {
        setLocationStatus('error');
        setLocationMessage('I could not find that place. Try adding a state, like “Worcester, MA”.');
        return;
      }

      setLocationResults(results);
      setLocationStatus('idle');
      setLocationMessage('Choose the location you mean:');
    } catch {
      setLocationStatus('error');
      setLocationMessage('I could not search for that location right now. Please try again.');
    }
  };

  return (
    <main className="app-shell" aria-labelledby="page-title">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="mission-label">AstroScot V1 prototype</p>
          <h1 id="page-title">Your friendly sky guide</h1>
          <p className="hero-text">
            A colourful iPad-first home for daily weather, Moon news, and planet watching tips for curious kids.
          </p>
        </div>
        <div className="orbital-badge" aria-hidden="true">
          <span className="planet-dot" />
          <span className="ring" />
          <span className="badge-emoji">🚀</span>
        </div>
      </section>

      <section className="location-panel" aria-labelledby="location-title">
        <div className="location-copy">
          <p className="section-kicker">Location</p>
          <h2 id="location-title">Where should AstroScot check the sky?</h2>
          <p>{location.name}</p>
          <p className="location-status" role="status">{locationMessage}</p>
        </div>

        {!showLocationSearch && locationStatus === 'ready' ? (
          <button type="button" className="location-button" onClick={() => setShowLocationSearch(true)}>
            Change location
          </button>
        ) : (
          <div className="location-search">
            <label htmlFor="location-input">Town or city</label>
            <div className="location-search-row">
              <input
                id="location-input"
                type="text"
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') findLocation();
                }}
                placeholder="Worcester, MA"
                autoComplete="address-level2"
              />
              <button
                type="button"
                className="location-button"
                onClick={findLocation}
                disabled={locationStatus === 'loading'}
              >
                {locationStatus === 'loading' ? 'Searching…' : 'Find'}
              </button>
            </div>
            {locationResults.length > 0 && (
              <div className="location-results" role="listbox" aria-label="Location search results">
                {locationResults.map((result) => (
                  <button
                    key={`${result.id}-${result.latitude}-${result.longitude}`}
                    type="button"
                    className="location-result"
                    onClick={() => saveLocation(result)}
                  >
                    <strong>{formatLocation(result)}</strong>
                    <span>{result.country || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card-grid" aria-label="AstroScot daily cards">
        <WeatherCard location={location} />
        {cards.map((card) => (
          <InfoCard key={card.title} {...card} />
        ))}
      </section>
    </main>
  );
}
