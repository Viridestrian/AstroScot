import { useEffect, useState } from 'react';
import type { AstroScotLocation } from '@astroscot/shared';
import { calculatePlanetConditions, formatPlanetTime, type PlanetConditionsData, type PlanetCondition, type UpcomingPlanetOpportunity } from '../astronomy/planetConditions';

function statusLabel(planet: PlanetCondition) {
  if (planet.tier === 'low') return 'Very low in the sky';
  if (planet.tier === 'advanced') return 'Advanced target';
  if (planet.status === 'good') return 'Good target';
  if (planet.status === 'possible') return 'Possible';
  return 'Skip tonight';
}

function heightDescription(altitude: number | null) {
  if (altitude === null) return '';
  if (altitude >= 45) return 'High in the sky';
  if (altitude >= 25) return 'Fairly high in the sky';
  if (altitude >= 12) return 'Low in the sky';
  return 'Low and close to the horizon';
}

function formatApproximatePlanetTime(value: Date, timezone: string) {
  const rounded = new Date(Math.round(value.getTime() / (15 * 60000)) * 15 * 60000);
  return formatPlanetTime(rounded, timezone);
}

function viewingWindow(visibleFrom: Date | null, visibleUntil: Date | null, sunset: Date, timezone: string) {
  if (!visibleFrom || !visibleUntil) return null;
  const start = visibleFrom.getTime() - sunset.getTime() <= 20 * 60000 ? 'around sunset' : formatApproximatePlanetTime(visibleFrom, timezone);
  return `Can be seen ${start === 'around sunset' ? start : `from about ${start}`} until about ${formatApproximatePlanetTime(visibleUntil, timezone)}.`;
}

function upcomingDescription(opportunity: UpcomingPlanetOpportunity, timezone: string) {
  const durationDays = Math.round((opportunity.endDate.getTime() - opportunity.startDate.getTime()) / (24 * 60 * 60000)) + 1;
  const duration = durationDays >= 21 ? 'several weeks' : durationDays >= 7 ? 'about a week or more' : 'a few evenings';
  const when = opportunity.daysUntilStart <= 1 ? 'tomorrow' : `in about ${opportunity.daysUntilStart} days`;
  const bestTime = opportunity.bestTime ? ` Best time will be around ${formatApproximatePlanetTime(opportunity.bestTime, timezone)}.` : '';
  return `Starting ${when}, ${opportunity.name} should become a good evening target and remain visible for ${duration}.${bestTime}`;
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

  const visiblePlanets = conditions.planets.filter((planet) => planet.visible && planet.bestTime && planet.bestTime.getTime() >= conditions.sunset.getTime() && planet.bestTime.getTime() <= conditions.windowEnd.getTime());
  const upcomingPlanets = conditions.upcoming.slice(0, Math.max(0, 3 - visiblePlanets.length));

  return <article className="info-card planet-card"><div className="card-header"><div><p className="card-eyebrow">Planets</p></div></div><div className="planet-content"><div className="planet-list">
    {visiblePlanets.map((planet) => <div className="planet-item" key={planet.name}><div className="planet-item-title"><span aria-hidden="true">{planet.symbol}</span><strong>{planet.name}</strong></div><span>{statusLabel(planet)} · {planet.direction ?? 'Look up'}</span><p>{viewingWindow(planet.visibleFrom, planet.visibleUntil, conditions.sunset, location.timezone) ?? 'Look during the evening.'} {planet.bestTime ? `Best time to look will be around ${formatApproximatePlanetTime(planet.bestTime, location.timezone)}.` : ''} {planet.reason}{planet.bestAltitude !== null ? ` ${heightDescription(planet.bestAltitude)}.` : ''}</p></div>)}
    {upcomingPlanets.map((planet) => <div className="planet-item" key={`upcoming-${planet.name}`}><div className="planet-item-title"><span aria-hidden="true">{planet.symbol}</span><strong>{planet.name}</strong></div><span>Coming soon · {planet.daysUntilStart <= 1 ? 'tomorrow' : `about ${planet.daysUntilStart} days`}</span><p>{upcomingDescription(planet, location.timezone)}</p></div>)}
    {visiblePlanets.length === 0 && upcomingPlanets.length === 0 && <div className="planet-item"><div className="planet-item-title"><span aria-hidden="true">🔭</span><strong>No easy planet targets yet</strong></div><span>Looking ahead</span><p>My Sky Ally is checking the next few weeks for a good evening planet target.</p></div>}
  </div></div></article>;
}
