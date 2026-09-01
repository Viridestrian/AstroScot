import { useState } from 'react';
import type { AstroScotLocation } from '@astroscot/shared';
import { InfoCard } from './components/InfoCard';

const prototypeLocation: AstroScotLocation = {
  name: 'Choose your town or city',
  latitude: 0,
  longitude: 0,
  timezone: 'Local timezone will appear here',
  source: 'manual',
};

type LocationStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ReverseGeocodeResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
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

async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    localityLanguage: 'en',
  });

  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`);
  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with status ${response.status}`);
  }

  return response.json() as Promise<ReverseGeocodeResponse>;
}

export function App() {
  const [location, setLocation] = useState<AstroScotLocation>(prototypeLocation);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationMessage, setLocationMessage] = useState('AstroScot can use your device location when you choose.');

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationMessage('Location services are not available in this browser.');
      return;
    }

    setLocationStatus('loading');
    setLocationMessage('Finding your location…');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const place = await reverseGeocode(latitude, longitude);
          const city = place.city || place.locality || 'Your area';
          const state = place.principalSubdivision || '';

          setLocation({
            name: state ? `${city}, ${state}` : city,
            latitude,
            longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            source: 'future-geolocation',
          });
          setLocationStatus('ready');
          setLocationMessage('AstroScot is using your current device location.');
        } catch {
          setLocationStatus('error');
          setLocationMessage('We found your coordinates, but could not name the location yet.');
        }
      },
      (error) => {
        setLocationStatus('error');
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was not granted. You can try again whenever you are ready.'
            : 'AstroScot could not determine your location. Please try again.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const locationButtonLabel = locationStatus === 'loading' ? 'Finding you…' : locationStatus === 'ready' ? 'Update location' : 'Use my location';

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
        <div>
          <p className="section-kicker">Location</p>
          <h2 id="location-title">Where should AstroScot check the sky?</h2>
          <p>{location.name}</p>
          <p className="location-status" role="status">{locationMessage}</p>
        </div>
        <button
          type="button"
          className="location-button"
          onClick={useMyLocation}
          disabled={locationStatus === 'loading'}
        >
          {locationButtonLabel}
        </button>
      </section>

      <section className="card-grid" aria-label="AstroScot daily cards">
        {cards.map((card) => (
          <InfoCard key={card.title} {...card} />
        ))}
      </section>
    </main>
  );
}
