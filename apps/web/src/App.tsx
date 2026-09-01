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

const cards = [
  {
    eyebrow: 'Weather',
    title: 'Today outside',
    icon: '☀️',
    className: 'weather-card',
    items: ['Current temperature', "Today's high and low", 'Rain or snow chance', 'Wind, sunrise, and sunset'],
    message: 'Weather details will appear here after Open-Meteo is connected.',
  },
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

function formatLocation(result: GeocodingResult) {
  const region = result.admin1 || result.country || '';
  return region ? `${result.name}, ${region}` : result.name;
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
        {cards.map((card) => (
          <InfoCard key={card.title} {...card} />
        ))}
      </section>
    </main>
  );
}
