import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import type { AstroScotLocation } from '@astroscot/shared';
import { InfoCard } from './components/InfoCard';
import { PlanetCard } from './components/PlanetCard';

const STORAGE_KEY = 'astroscot-location';
const SYNODIC_MONTH = 29.530588853;
const NEW_MOON_EPOCH = Date.parse('2000-01-06T18:14:00Z');
const EARTH_RADIUS_KM = 6378.14;
const prototypeLocation: AstroScotLocation = { name: 'Choose your town or city', latitude: 0, longitude: 0, timezone: 'Local timezone will appear here', source: 'manual' };
type LocationStatus = 'idle' | 'loading' | 'ready' | 'error';
type WeatherStatus = 'idle' | 'loading' | 'ready' | 'error';
interface GeocodingResult { id: number; name: string; latitude: number; longitude: number; timezone?: string; country?: string; country_code?: string; admin1?: string; }
interface GeocodingResponse { results?: GeocodingResult[]; }
interface WeatherResponse { current: { temperature_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number }; hourly: { time: string[]; precipitation_probability: number[]; rain: number[]; weather_code: number[] }; daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; sunrise: string[]; sunset: string[] } }
interface MoonPosition { altitude: number; distanceKm: number; }
interface MoonData { phase: number; illumination: number; phaseName: string; message: string; moonrise: Date | null; moonset: Date | null; nextFullMoon: Date; fullMoonName: string; daysUntilFull: number; specialEvents: string[]; }
const eclipseDates = [{ date: '2028-12-31', type: 'Blood Moon' }, { date: '2029-06-26', type: 'Blood Moon' }, { date: '2029-12-20', type: 'Blood Moon' }, { date: '2032-04-25', type: 'Blood Moon' }, { date: '2032-10-18', type: 'Blood Moon' }, { date: '2033-04-14', type: 'Blood Moon' }, { date: '2033-10-08', type: 'Blood Moon' }];
function safeTimezone(timezone: string) { return timezone.includes('Local timezone') ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone; }
async function searchLocations(query: string): Promise<GeocodingResult[]> { const params = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' }); const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`); if (!response.ok) throw new Error(`Location search failed with status ${response.status}`); const data = (await response.json()) as GeocodingResponse; return data.results ?? []; }
async function fetchWeather(location: AstroScotLocation): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
    hourly: 'precipitation_probability,rain,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: 'auto',
    forecast_days: '1'
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error(`Weather request failed with status ${response.status}`);
  const data = (await response.json()) as WeatherResponse;
  if (!data.current || !data.hourly || !data.daily || !Array.isArray(data.hourly.time) || !Array.isArray(data.hourly.precipitation_probability) || !Array.isArray(data.hourly.rain) || !Array.isArray(data.hourly.weather_code) || !Array.isArray(data.daily.time) || !Array.isArray(data.daily.weather_code) || !Array.isArray(data.daily.temperature_2m_max) || !Array.isArray(data.daily.temperature_2m_min) || !Array.isArray(data.daily.precipitation_probability_max) || !Array.isArray(data.daily.sunrise) || !Array.isArray(data.daily.sunset) || data.daily.time.length === 0) throw new Error('Weather response was incomplete');
  return data;
}
function formatLocation(result: GeocodingResult) { const region = result.admin1 || result.country || ''; return region ? `${result.name}, ${region}` : result.name; }
function weatherDescription(code: number) { if (code === 0) return 'Clear sky'; if (code === 1) return 'Mostly clear'; if (code === 2) return 'Partly cloudy'; if (code === 3) return 'Cloudy'; if ([45, 48].includes(code)) return 'Foggy'; if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle'; if ([61, 63, 65, 66, 67].includes(code)) return 'Rainy'; if ([71, 73, 75, 77].includes(code)) return 'Snowy'; if ([80, 81, 82].includes(code)) return 'Rain showers'; if ([85, 86].includes(code)) return 'Snow showers'; if ([95, 96, 99].includes(code)) return 'Thunderstorms'; return 'Mixed weather'; }
function weatherIcon(code: number) { if (code === 0) return '☀️'; if ([1, 2].includes(code)) return '🌤️'; if (code === 3) return '☁️'; if ([45, 48].includes(code)) return '🌫️'; if ([51, 53, 55, 56, 57].includes(code)) return '🌦️'; if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️'; if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️'; if ([95, 96, 99].includes(code)) return '⛈️'; return '🌤️'; }
function feelsLikeMessage(actual: number, apparent: number) { const difference = apparent - actual; if (Math.abs(difference) <= 2) return null; return difference > 0 ? 'It feels a little warmer outside.' : 'It feels a little colder outside.'; }
function formatTime(value: string | Date, timezone: string) { return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: safeTimezone(timezone) }).format(typeof value === 'string' ? new Date(value) : value); }
function formatDate(value: string, timezone: string) { return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: safeTimezone(timezone) }).format(new Date(`${value}T12:00:00`)); }
function formatToday(timezone: string) { return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: safeTimezone(timezone) }).format(new Date()); }
function isTomorrow(value: Date, timezone: string) { const zone = safeTimezone(timezone); const parts = (date: Date) => { const formatted = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); return `${formatted.find((part) => part.type === 'year')?.value}-${formatted.find((part) => part.type === 'month')?.value}-${formatted.find((part) => part.type === 'day')?.value}`; }; const today = parts(new Date()); const target = parts(value); const tomorrow = new Date(`${today}T12:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); return target === tomorrow.toISOString().slice(0, 10); }
function rainMessage(probability: number, hourly: WeatherResponse['hourly'], timezone: string) { if (probability === 0) return 'There is no chance of rain today.'; let message = probability < 20 ? 'Rain is very unlikely today.' : probability < 40 ? 'There is a small chance of rain today.' : probability < 60 ? 'There is a good chance of rain today.' : probability < 80 ? 'It will probably rain today.' : 'Rain is very likely today.'; const now = Date.now(); const index = hourly.time.findIndex((time, i) => new Date(time).getTime() >= now && hourly.rain[i] > 0.05); if (index >= 0) message += ` It may start around ${formatTime(hourly.time[index], timezone)}.`; return message; }
function moonPosition(date: Date, latitude: number, longitude: number): MoonPosition { const d = (date.getTime() - Date.parse('1999-12-31T00:00:00Z')) / 86400000, rad = Math.PI / 180; const N = (125.1228 - 0.0529538083 * d) * rad, i = 5.1454 * rad, w = (318.0634 + 0.1643573223 * d) * rad, a = 60.2666, e = 0.0549, M = (115.3654 + 13.0649929509 * d) * rad; const E = M + e * Math.sin(M) * (1 + e * Math.cos(M)); const xv = a * (Math.cos(E) - e), yv = a * Math.sqrt(1 - e * e) * Math.sin(E), v = Math.atan2(yv, xv), r = Math.sqrt(xv * xv + yv * yv); const xh = r * (Math.cos(N) * Math.cos(v + w) - Math.sin(N) * Math.sin(v + w) * Math.cos(i)); const yh = r * (Math.sin(N) * Math.cos(v + w) + Math.cos(N) * Math.sin(v + w) * Math.cos(i)); const zh = r * Math.sin(v + w) * Math.sin(i), ecl = (23.4393 - 3.563e-7 * d) * rad; const xe = xh, ye = yh * Math.cos(ecl) - zh * Math.sin(ecl), ze = yh * Math.sin(ecl) + zh * Math.cos(ecl); const ra = Math.atan2(ye, xe) / rad / 15, dec = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye)) / rad; const jd = date.getTime() / 86400000 + 2440587.5, gst = (18.697374558 + 24.06570982441908 * (jd - 2451545.0)) % 24, lst = (gst + longitude / 15 + 24) % 24, hourAngle = (lst - ra) * 15 * rad, lat = latitude * rad, decRad = dec * rad; const altitude = Math.asin(Math.sin(lat) * Math.sin(decRad) + Math.cos(lat) * Math.cos(decRad) * Math.cos(hourAngle)) / rad; return { altitude, distanceKm: r * EARTH_RADIUS_KM }; }
function moonPhase(date: Date) { const age = ((date.getTime() - NEW_MOON_EPOCH) / 86400000) % SYNODIC_MONTH, normalizedAge = (age + SYNODIC_MONTH) % SYNODIC_MONTH, phase = normalizedAge / SYNODIC_MONTH, illumination = (1 - Math.cos(phase * Math.PI * 2)) / 2; const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'], phaseName = names[Math.round(phase * 8) % 8]; const message = phaseName === 'New Moon' ? 'The Moon is nearly invisible tonight.' : phaseName === 'Full Moon' ? 'The whole face of the Moon is lit up tonight.' : phaseName.includes('Waxing') ? 'The Moon is getting brighter each night.' : 'The Moon is getting a little dimmer each night.'; return { phase, illumination, phaseName, message, age: normalizedAge }; }
function nextFullMoon(date: Date) { const { age } = moonPhase(date), days = age < SYNODIC_MONTH / 2 ? SYNODIC_MONTH / 2 - age : SYNODIC_MONTH * 1.5 - age; return new Date(date.getTime() + days * 86400000); }
function fullMoonName(date: Date) { return ['Wolf Moon', 'Snow Moon', 'Worm Moon', 'Pink Moon', 'Flower Moon', 'Strawberry Moon', 'Buck Moon', 'Sturgeon Moon', 'Harvest Moon', 'Hunter’s Moon', 'Beaver Moon', 'Cold Moon'][date.getUTCMonth()]; }
function sameCalendarMonth(a: Date, b: Date) { return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth(); }
function interpolateCrossing(start: Date, end: Date, startAltitude: number, endAltitude: number) { const denominator = endAltitude - startAltitude; if (denominator === 0) return new Date((start.getTime() + end.getTime()) / 2); const fraction = Math.max(0, Math.min(1, -startAltitude / denominator)); return new Date(start.getTime() + (end.getTime() - start.getTime()) * fraction); }
function moonRiseSet(latitude: number, longitude: number, now: Date) {
  const horizon = -0.3;
  const stepMinutes = 2;
  const start = new Date(now.getTime() - 36 * 60 * 60000);
  const end = new Date(now.getTime() + 48 * 60 * 60000);
  const rises: Date[] = [];
  const sets: Date[] = [];
  let previousTime = start;
  let previous = moonPosition(previousTime, latitude, longitude).altitude - horizon;
  for (let timeMs = start.getTime() + stepMinutes * 60000; timeMs <= end.getTime(); timeMs += stepMinutes * 60000) {
    const time = new Date(timeMs);
    const altitude = moonPosition(time, latitude, longitude).altitude - horizon;
    if (previous <= 0 && altitude > 0) rises.push(interpolateCrossing(previousTime, time, previous, altitude));
    if (previous >= 0 && altitude < 0) sets.push(interpolateCrossing(previousTime, time, previous, altitude));
    previousTime = time;
    previous = altitude;
  }
  const futureRise = rises.find((event) => event.getTime() >= now.getTime()) ?? null;
  const futureSet = sets.find((event) => event.getTime() >= now.getTime()) ?? null;
  return { rise: futureRise, set: futureSet };
}
function moonSpecialEvents(fullMoon: Date, latitude: number, longitude: number) { const events: string[] = [], previous = new Date(fullMoon.getTime() - SYNODIC_MONTH * 86400000), following = new Date(fullMoon.getTime() + SYNODIC_MONTH * 86400000); if (sameCalendarMonth(previous, fullMoon) || sameCalendarMonth(following, fullMoon)) events.push('Blue Moon'); if (moonPosition(fullMoon, latitude, longitude).distanceKm < 360000) events.push('Supermoon'); const eclipse = eclipseDates.find((item) => Math.abs(Date.parse(`${item.date}T00:00:00Z`) - fullMoon.getTime()) < 2 * 86400000); if (eclipse) events.push(eclipse.type); return events; }
function calculateMoon(location: AstroScotLocation): MoonData { const now = new Date(), current = moonPhase(now), fullMoon = nextFullMoon(now), riseSet = moonRiseSet(location.latitude, location.longitude, now); return { phase: current.phase, illumination: current.illumination, phaseName: current.phaseName, message: current.message, moonrise: riseSet.rise, moonset: riseSet.set, nextFullMoon: fullMoon, fullMoonName: fullMoonName(fullMoon), daysUntilFull: Math.max(0, Math.round((fullMoon.getTime() - now.getTime()) / 86400000)), specialEvents: moonSpecialEvents(fullMoon, location.latitude, location.longitude) }; }
function MoonVisual({ illumination, phase }: { illumination: number; phase: number }) { const waxing = phase < 0.5; const shadowOffset = waxing ? illumination * 108 : (illumination - 1) * 108; return <div className="moon-visual" aria-label={`Moon is ${Math.round(illumination * 100)} percent illuminated`} style={{ '--moon-shadow-offset': `${shadowOffset.toFixed(1)}px` } as CSSProperties}><span /></div>; }
function MoonCard({ location }: { location: AstroScotLocation }) { const [...MOON_CARD_REST_OF_FILE...] }
