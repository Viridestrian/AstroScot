export type PlanetName = 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune';

export interface PlanetConditionsLocation {
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface PlanetCondition {
  name: PlanetName;
  symbol: string;
  visible: boolean;
  status: 'good' | 'possible' | 'not-recommended';
  reason: string;
  bestTime: Date | null;
  bestAltitude: number | null;
  direction: string | null;
  magnitude: number | null;
  rise: Date | null;
  set: Date | null;
  visibleFrom: Date | null;
  visibleUntil: Date | null;
}

export interface UpcomingPlanetOpportunity {
  name: PlanetName;
  symbol: string;
  startDate: Date;
  endDate: Date;
  daysUntilStart: number;
  bestTime: Date | null;
}

export interface PlanetConditionsData {
  sunset: Date;
  windowEnd: Date;
  planets: PlanetCondition[];
  upcoming: UpcomingPlanetOpportunity[];
}

type OrbitalElements = {
  N: number;
  i: number;
  w: number;
  a: number;
  e: number;
  M: number;
};

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const DAY_MS = 86400000;
const FUTURE_LOOKAHEAD_DAYS = 90;
const MIN_UPCOMING_RUN_DAYS = 3;

const PLANETS: Record<PlanetName, { symbol: string; elements: (d: number) => OrbitalElements; magnitudeBase: number; magnitudeSlope: number; nakedEye: boolean }> = {
  Mercury: { symbol: '☿', elements: mercuryElements, magnitudeBase: -0.4, magnitudeSlope: 0.03, nakedEye: true },
  Venus: { symbol: '♀', elements: venusElements, magnitudeBase: -4.2, magnitudeSlope: 0.01, nakedEye: true },
  Mars: { symbol: '♂', elements: marsElements, magnitudeBase: -1.0, magnitudeSlope: 0.015, nakedEye: true },
  Jupiter: { symbol: '♃', elements: jupiterElements, magnitudeBase: -2.2, magnitudeSlope: 0.004, nakedEye: true },
  Saturn: { symbol: '♄', elements: saturnElements, magnitudeBase: 0.7, magnitudeSlope: 0.004, nakedEye: true },
  Uranus: { symbol: '⛢', elements: uranusElements, magnitudeBase: 5.7, magnitudeSlope: 0.001, nakedEye: false },
  Neptune: { symbol: '♆', elements: neptuneElements, magnitudeBase: 7.8, magnitudeSlope: 0.001, nakedEye: false },
};

function mercuryElements(d: number): OrbitalElements { return { N: 48.3313 + 3.24587e-5 * d, i: 7.0047 + 5e-8 * d, w: 29.1241 + 1.01444e-5 * d, a: 0.387098, e: 0.205635 + 5.59e-10 * d, M: 168.6562 + 4.0923344368 * d }; }
function venusElements(d: number): OrbitalElements { return { N: 76.6799 + 2.4659e-5 * d, i: 3.3946 + 2.75e-8 * d, w: 54.891 + 1.38374e-5 * d, a: 0.72333, e: 0.006773 - 1.302e-9 * d, M: 48.0052 + 1.6021302244 * d }; }
function marsElements(d: number): OrbitalElements { return { N: 49.5574 + 2.11081e-5 * d, i: 1.8497 - 1.78e-8 * d, w: 286.5016 + 2.92961e-5 * d, a: 1.523688, e: 0.093405 + 2.516e-9 * d, M: 18.6021 + 0.5240207766 * d }; }
function jupiterElements(d: number): OrbitalElements { return { N: 100.4542 + 2.76854e-5 * d, i: 1.303 - 1.557e-7 * d, w: 273.8777 + 1.64505e-5 * d, a: 5.20256, e: 0.048498 + 4.469e-9 * d, M: 19.895 + 0.0830853001 * d }; }
function saturnElements(d: number): OrbitalElements { return { N: 113.6634 + 2.3898e-5 * d, i: 2.4886 - 1.081e-7 * d, w: 339.3939 + 2.97661e-5 * d, a: 9.55475, e: 0.055546 - 9.499e-9 * d, M: 316.967 + 0.0334442282 * d }; }
function uranusElements(d: number): OrbitalElements { return { N: 74.0005 + 1.3978e-5 * d, i: 0.7733 + 1.9e-8 * d, w: 96.6612 + 3.0565e-5 * d, a: 19.18171 - 1.55e-8 * d, e: 0.047318 + 7.45e-9 * d, M: 142.5905 + 0.011725806 * d }; }
function neptuneElements(d: number): OrbitalElements { return { N: 131.7806 + 3.0173e-5 * d, i: 1.77 - 2.55e-7 * d, w: 272.8461 - 6.027e-6 * d, a: 30.05826 + 3.313e-8 * d, e: 0.008606 + 2.15e-9 * d, M: 260.2471 + 0.005995147 * d }; }

function daysSince2000(date: Date): number { return date.getTime() / DAY_MS - 10957.5; }
function normalizeDegrees(value: number): number { return ((value % 360) + 360) % 360; }

function solveKepler(meanAnomaly: number, eccentricity: number): number {
  let eccentricAnomaly = meanAnomaly + eccentricity * Math.sin(meanAnomaly) * (1 + eccentricity * Math.cos(meanAnomaly));
  for (let i = 0; i < 5; i += 1) eccentricAnomaly -= (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) / (1 - eccentricity * Math.cos(eccentricAnomaly));
  return eccentricAnomaly;
}

function heliocentricEcliptic(elements: OrbitalElements) {
  const E = solveKepler(normalizeDegrees(elements.M) * DEG, elements.e);
  const xv = elements.a * (Math.cos(E) - elements.e);
  const yv = elements.a * Math.sqrt(1 - elements.e * elements.e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.hypot(xv, yv);
  const N = elements.N * DEG;
  const i = elements.i * DEG;
  const w = elements.w * DEG;
  return {
    x: r * (Math.cos(N) * Math.cos(v + w) - Math.sin(N) * Math.sin(v + w) * Math.cos(i)),
    y: r * (Math.sin(N) * Math.cos(v + w) + Math.cos(N) * Math.sin(v + w) * Math.cos(i)),
    z: r * Math.sin(v + w) * Math.sin(i),
    distance: r,
  };
}

function earthElements(d: number): OrbitalElements {
  return { N: 0, i: 0, w: 282.9404 + 4.70935e-5 * d, a: 1, e: 0.016709 - 1.151e-9 * d, M: 356.047 + 0.9856002585 * d + 180 };
}

function planetEquatorial(date: Date, planet: PlanetName) {
  const d = daysSince2000(date);
  const earth = heliocentricEcliptic(earthElements(d));
  const target = heliocentricEcliptic(PLANETS[planet].elements(d));
  const xh = target.x - earth.x;
  const yh = target.y - earth.y;
  const zh = target.z - earth.z;
  const obliquity = (23.4393 - 3.563e-7 * d) * DEG;
  const xe = xh;
  const ye = yh * Math.cos(obliquity) - zh * Math.sin(obliquity);
  const ze = yh * Math.sin(obliquity) + zh * Math.cos(obliquity);
  const ra = normalizeDegrees(Math.atan2(ye, xe) * RAD) / 15;
  const dec = Math.atan2(ze, Math.hypot(xe, ye)) * RAD;
  return { ra, dec, distanceAu: Math.hypot(xe, ye, ze) };
}

function localSiderealTime(date: Date, longitude: number): number {
  const jd = date.getTime() / DAY_MS + 2440587.5;
  const gst = normalizeDegrees(280.46061837 + 360.98564736629 * (jd - 2451545)) / 15;
  return normalizeDegrees(gst + longitude / 15);
}

function altitudeAndAzimuth(date: Date, latitude: number, longitude: number, ra: number, dec: number) {
  const hourAngle = (localSiderealTime(date, longitude) - ra) * 15 * DEG;
  const lat = latitude * DEG;
  const decRad = dec * DEG;
  const sinAltitude = Math.sin(lat) * Math.sin(decRad) + Math.cos(lat) * Math.cos(decRad) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude))) * RAD;
  const y = Math.sin(hourAngle);
  const x = Math.cos(hourAngle) * Math.sin(lat) - Math.tan(decRad) * Math.cos(lat);
  const azimuth = normalizeDegrees(Math.atan2(y, x) * RAD + 180);
  return { altitude, azimuth };
}

function solarPosition(date: Date, latitude: number, longitude: number) {
  const d = daysSince2000(date);
  const earth = heliocentricEcliptic(earthElements(d));
  const sunX = -earth.x;
  const sunY = -earth.y;
  const sunZ = -earth.z;
  const obliquity = (23.4393 - 3.563e-7 * d) * DEG;
  const ra = normalizeDegrees(Math.atan2(sunY * Math.cos(obliquity) - sunZ * Math.sin(obliquity), sunX) * RAD) / 15;
  const dec = Math.atan2(sunY * Math.sin(obliquity) + sunZ * Math.cos(obliquity), Math.hypot(sunX, sunY)) * RAD;
  return altitudeAndAzimuth(date, latitude, longitude, ra, dec);
}

function findCrossing(start: Date, end: Date, latitude: number, longitude: number, targetAltitude: number): Date | null {
  let a = start.getTime();
  let b = end.getTime();
  let fa = solarPosition(new Date(a), latitude, longitude).altitude - targetAltitude;
  let fb = solarPosition(new Date(b), latitude, longitude).altitude - targetAltitude;
  if (fa * fb > 0) return null;
  for (let i = 0; i < 25; i += 1) {
    const mid = (a + b) / 2;
    const fm = solarPosition(new Date(mid), latitude, longitude).altitude - targetAltitude;
    if (fa * fm <= 0) { b = mid; fb = fm; } else { a = mid; fa = fm; }
  }
  return new Date((a + b) / 2);
}

function localDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function zonedTimeToDate(year: number, month: number, day: number, hour: number, minute: number, timezone: string): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(guess);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
  return new Date(guess.getTime() + (guess.getTime() - asUtc));
}

function findSolarCrossing(dateStart: Date, dateEnd: Date, latitude: number, longitude: number, targetAltitude: number): Date | null {
  const step = 10 * 60000;
  let previousTime = dateStart;
  let previous = solarPosition(previousTime, latitude, longitude).altitude - targetAltitude;
  for (let time = dateStart.getTime() + step; time <= dateEnd.getTime(); time += step) {
    const currentTime = new Date(time);
    const current = solarPosition(currentTime, latitude, longitude).altitude - targetAltitude;
    if (previous >= 0 && current < 0) return findCrossing(previousTime, currentTime, latitude, longitude, targetAltitude);
    previousTime = currentTime;
    previous = current;
  }
  return null;
}

function approximateMagnitude(planet: PlanetName, distanceAu: number): number {
  const definition = PLANETS[planet];
  const distanceFactor = 5 * Math.log10(Math.max(0.1, distanceAu));
  return definition.magnitudeBase + definition.magnitudeSlope * Math.abs(distanceAu - 1) + distanceFactor;
}

function directionName(azimuth: number): string {
  const names = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  return names[Math.round(azimuth / 45) % 8];
}

function practicalThreshold(planet: PlanetName, magnitude: number, solarAltitude: number): number {
  if (planet === 'Venus') return solarAltitude <= -2 ? 8 : 12;
  if (planet === 'Jupiter') return solarAltitude <= -6 ? 10 : 14;
  if (planet === 'Saturn') return solarAltitude <= -6 ? 12 : 16;
  if (planet === 'Mars') return solarAltitude <= -6 ? 10 : 15;
  if (planet === 'Mercury') return solarAltitude <= -8 ? 8 : 12;
  if (planet === 'Uranus') return 25;
  return 30;
}

function scanPlanet(planet: PlanetName, location: PlanetConditionsLocation, sunset: Date, windowEnd: Date): PlanetCondition {
  const definition = PLANETS[planet];
  let bestTime: Date | null = null;
  let bestAltitude: number | null = null;
  let bestAzimuth = 0;
  let bestMagnitude: number | null = null;
  let rise: Date | null = null;
  let set: Date | null = null;
  let visibleFrom: Date | null = null;
  let visibleUntil: Date | null = null;
  let wasAbove = false;
  let previousAltitude = altitudeAndAzimuth(sunset, location.latitude, location.longitude, planetEquatorial(sunset, planet).ra, planetEquatorial(sunset, planet).dec).altitude;
  let usefulMinutes = 0;
  const step = 5 * 60000;

  for (let timeMs = sunset.getTime(); timeMs <= windowEnd.getTime(); timeMs += step) {
    const time = new Date(timeMs);
    const equatorial = planetEquatorial(time, planet);
    const horizontal = altitudeAndAzimuth(time, location.latitude, location.longitude, equatorial.ra, equatorial.dec);
    const sunAltitude = solarPosition(time, location.latitude, location.longitude).altitude;
    const magnitude = approximateMagnitude(planet, equatorial.distanceAu);
    const threshold = practicalThreshold(planet, magnitude, sunAltitude);
    const practical = horizontal.altitude >= threshold && sunAltitude <= (planet === 'Venus' ? -2 : -6);

    if (previousAltitude <= 0 && horizontal.altitude > 0) rise = time;
    if (previousAltitude >= 0 && horizontal.altitude < 0) set = time;
    if (practical) {
      usefulMinutes += 5;
      if (!visibleFrom) visibleFrom = time;
      visibleUntil = time;
      if (bestAltitude === null || horizontal.altitude > bestAltitude) {
        bestTime = time;
        bestAltitude = horizontal.altitude;
        bestAzimuth = horizontal.azimuth;
        bestMagnitude = magnitude;
      }
    }
    wasAbove = wasAbove || practical;
    previousAltitude = horizontal.altitude;
  }

  const minimumMinutes = planet === 'Mercury' ? 10 : planet === 'Venus' ? 15 : planet === 'Uranus' || planet === 'Neptune' ? 30 : 20;
  const nakedEyePlausible = definition.nakedEye && (bestMagnitude === null || bestMagnitude <= 2.5);
  const visible = wasAbove && usefulMinutes >= minimumMinutes && (definition.nakedEye ? nakedEyePlausible : false);
  const status: PlanetCondition['status'] = visible ? (usefulMinutes >= 45 && (bestAltitude ?? 0) >= 20 ? 'good' : 'possible') : 'not-recommended';

  let reason = 'Not a practical evening target.';
  if (visible && bestTime && bestAltitude !== null) {
    const sky = solarPosition(bestTime, location.latitude, location.longitude).altitude;
    reason = planet === 'Venus' ? 'Bright enough to be a good evening target.' : sky > -6 ? 'Look while the sky is still getting dark.' : 'High enough above the horizon to be worth looking for.';
  } else if (bestAltitude !== null && bestAltitude < 10) reason = 'It stays too close to the horizon for an easy sight.';
  else if (rise && rise > sunset && rise > windowEnd) reason = 'It does not rise before 9 PM.';
  else if (bestMagnitude !== null && bestMagnitude > 2.5) reason = 'It is too faint for a typical naked-eye sight.';
  else if (planet === 'Mercury') reason = 'It is too close to the Sun for an easy evening sight.';

  return { name: planet, symbol: definition.symbol, visible, status, reason, bestTime, bestAltitude, direction: bestTime ? directionName(bestAzimuth) : null, magnitude: bestMagnitude, rise, set, visibleFrom, visibleUntil };
}

function futureSunsetForDate(date: Date, location: PlanetConditionsLocation): Date | null {
  const { year, month, day } = localDateParts(date, location.timezone);
  const dayStart = zonedTimeToDate(year, month, day, 0, 0, location.timezone);
  const nextDay = new Date(dayStart.getTime() + DAY_MS);
  return findSolarCrossing(dayStart, nextDay, location.latitude, location.longitude, -0.833)
    ?? findSolarCrossing(dayStart, nextDay, location.latitude, location.longitude, 0);
}

function findUpcomingPlanetOpportunities(
  location: PlanetConditionsLocation,
  currentConditions: PlanetCondition[],
  now: Date,
): UpcomingPlanetOpportunity[] {
  const currentVisible = new Set(currentConditions.filter((planet) => planet.visible).map((planet) => planet.name));
  const futureRuns: UpcomingPlanetOpportunity[] = [];

  for (const planet of Object.keys(PLANETS) as PlanetName[]) {
    if (currentVisible.has(planet)) continue;
    if (!PLANETS[planet].nakedEye) continue;

    let runStart: Date | null = null;
    let runEnd: Date | null = null;
    let runBestTime: Date | null = null;

    const finishRun = () => {
      if (!runStart || !runEnd) return;
      const runDays = Math.round((runEnd.getTime() - runStart.getTime()) / DAY_MS) + 1;
      if (runDays >= MIN_UPCOMING_RUN_DAYS) {
        const startDate = runStart;
        futureRuns.push({
          name: planet,
          symbol: PLANETS[planet].symbol,
          startDate,
          endDate: runEnd,
          daysUntilStart: Math.max(1, Math.round((startDate.getTime() - now.getTime()) / DAY_MS)),
          bestTime: runBestTime,
        });
      }
      runStart = null;
      runEnd = null;
      runBestTime = null;
    };

    for (let dayOffset = 1; dayOffset <= FUTURE_LOOKAHEAD_DAYS; dayOffset += 1) {
      const date = new Date(now.getTime() + dayOffset * DAY_MS);
      const sunset = futureSunsetForDate(date, location);
      if (!sunset) {
        finishRun();
        continue;
      }
      const windowEnd = zonedTimeToDate(...Object.values(localDateParts(date, location.timezone)) as [number, number, number], 21, 0, location.timezone);
      const condition = scanPlanet(planet, location, sunset, windowEnd);

      if (condition.visible) {
        if (!runStart) runStart = sunset;
        runEnd = sunset;
        if (!runBestTime && condition.bestTime) runBestTime = condition.bestTime;
      } else {
        finishRun();
      }
    }
    finishRun();
  }

  return futureRuns.sort((a, b) => {
    if (a.daysUntilStart !== b.daysUntilStart) return a.daysUntilStart - b.daysUntilStart;
    const aDuration = a.endDate.getTime() - a.startDate.getTime();
    const bDuration = b.endDate.getTime() - b.startDate.getTime();
    return bDuration - aDuration;
  });
}

export function calculatePlanetConditions(location: PlanetConditionsLocation, now = new Date()): PlanetConditionsData | null {
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || (location.latitude === 0 && location.longitude === 0)) return null;
  const timezone = location.timezone.includes('Local timezone') ? Intl.DateTimeFormat().resolvedOptions().timeZone : location.timezone;
  const { year, month, day } = localDateParts(now, timezone);
  const dayStart = zonedTimeToDate(year, month, day, 0, 0, timezone);
  const nextDay = new Date(dayStart.getTime() + DAY_MS);
  const sunset = findSolarCrossing(dayStart, nextDay, location.latitude, location.longitude, -0.833) ?? findSolarCrossing(dayStart, nextDay, location.latitude, location.longitude, 0);
  if (!sunset) return null;
  const windowEnd = zonedTimeToDate(year, month, day, 21, 0, timezone);
  const planets = (Object.keys(PLANETS) as PlanetName[]).map((planet) => scanPlanet(planet, location, sunset, windowEnd));
  const visiblePlanets = planets.filter((planet) => (planet.name !== 'Uranus' && planet.name !== 'Neptune') || planet.visible);
  const upcoming = findUpcomingPlanetOpportunities(location, visiblePlanets, now);
  return { sunset, windowEnd, planets: visiblePlanets, upcoming };
}

export function formatPlanetTime(date: Date, timezone: string): string {
  const safeTimezone = timezone.includes('Local timezone') ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: safeTimezone }).format(date);
}

export function formatPlanetAltitude(altitude: number | null): string {
  return altitude === null ? '' : `${Math.round(altitude)}° high`;
}
