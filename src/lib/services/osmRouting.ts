export interface Coordinates {
  lat: number;
  lng: number;
}

const geocodeCache = new Map<string, Coordinates | null>();

const ARUBA_SUFFIX = 'Aruba';

const normalizeQuery = (address: string) => {
  const trimmed = address.trim();
  if (!trimmed) return '';
  return trimmed.toLowerCase().includes('aruba') ? trimmed : `${trimmed}, ${ARUBA_SUFFIX}`;
};

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const query = normalizeQuery(address);
  if (!query) return null;

  if (geocodeCache.has(query)) {
    return geocodeCache.get(query) ?? null;
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=aw&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  const match = results[0]
    ? {
        lat: Number(results[0].lat),
        lng: Number(results[0].lon),
      }
    : null;

  geocodeCache.set(query, match);
  return match;
}

export function buildOpenStreetMapSearchUrl(address: string) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(normalizeQuery(address))}`;
}

export function buildOpenStreetMapDirectionsUrl(destination: Coordinates, origin: Coordinates) {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.lat}%2C${origin.lng}%3B${destination.lat}%2C${destination.lng}`;
}

export function getCurrentLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(error.message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  });
}
