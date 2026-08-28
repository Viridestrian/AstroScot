export type LocationSource = 'manual' | 'future-geolocation';

export interface AstroScotLocation {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source: LocationSource;
}

export type CardStatus = 'placeholder' | 'ready' | 'unavailable';

export interface PrototypeCard {
  title: string;
  status: CardStatus;
  message: string;
}
