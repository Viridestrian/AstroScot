import { useEffect, useState } from 'react';
import type { AstroScotLocation } from '@astroscot/shared';
import { calculatePlanetConditions, formatPlanetTime, type PlanetConditionsData } from '../astronomy/planetConditions';

function statusLabel(status: 'good' | 'possible' | 'not-recommended') {
  if (status === 'good') return 'Good target';
  if (status === 'possible') return 'Possible';
  return 'Skip tonight';
}

function heightDescription(altitude: number | null) {
  if (altitude === null) return '';
  if (altitude >= 45) return 'High in the sky';
  if (altitude >= 25) return 'Fairly high in the sky';
  if (altitude >= 12) return 'Low in the sky';
  return 'Low and close to the horizon';
}

export function PlanetCard({ location }: { location: AstroScotLocation }) {
  const [conditions, setConditions] = useState<PlanetConditionsData | null>(null);

  useEffect(() => {
    if (location.latitude === 0 && location.longitude === 0) {
      setConditions(null);
      return;
    }
    const update = () => setConditions(calculatePlanetConditions(location));
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, [location]);

  if (!conditions) {
    return <article className="info-card planet-card"><div className="card-header"><div><p className="card-eyebrow">Planets</p></div></div><p className="placeholder-note">Choose a location above and My Sky Ally will show tonight’s planet targets here.</p></article>;
  }

  // The astronomy engine may know when a planet is highest overall, but this card is specifically for evening viewing.
  const visiblePlanets = conditions.planets.filter((planet) => planet.visible && planet.bestTime && planet.bestTime.getTime() >= conditions.sunset.getTime() && planet.bestTime.getTime() <= conditions.windowEnd.getTime());

  return <article className="info-card planet-card"><div className="card-header"><div><p className="card-eyebrow">Planets</p></div></div><div className="planet-content"><div className="planet-list">{visiblePlanets.length > 0 ? visiblePlanets.map((planet) => <div className="planet-item" key={planet.name}><div className="planet-item-title"><span aria-hidden="true">{planet.symbol}</span><strong>{planet.name}</strong></div><span>{statusLabel(planet.status)} · {planet.bestTime ? `Best around ${formatPlanetTime(planet.bestTime, location.timezone)}` : 'Evening window'} · {planet.direction ?? 'Look up'}</span><p>{planet.reason}{planet.bestAltitude !== null ? ` ${heightDescription(planet.bestAltitude)}.` : ''}</p></div>) : <div className="planet-item"><div className="planet-item-title"><span aria-hidden="true">🔭</span><strong>No easy planet targets</strong></div><span>Tonight</span><p>Nothing is high and bright enough to make an easy naked-eye evening target tonight.</p></div>}</div></div></article>;
}
