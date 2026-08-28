import type { AstroScotLocation } from '@astroscot/shared';
import { InfoCard } from './components/InfoCard';

const prototypeLocation: AstroScotLocation = {
  name: 'Choose your town or city',
  latitude: 0,
  longitude: 0,
  timezone: 'Local timezone will appear here',
  source: 'manual',
};

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

export function App() {
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
          <p>{prototypeLocation.name}</p>
        </div>
        <button type="button" className="location-button" aria-label="Location search coming soon">
          Town search coming soon
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
