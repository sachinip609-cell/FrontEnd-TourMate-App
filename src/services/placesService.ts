import { AppConfig } from '../constants/AppConfig';
import { getToken } from './authService';

export interface Place {
  _id: string;
  name: string;
  shortDescription: string;
  details: string;
  category: string;
  latitude: number;
  longitude: number;
  distanceMetres: number;
  imageUrl?: string;
}

export const fetchNearbyPlaces = async (
  lat: number,
  lng: number,
  radiusMetres = 500,
): Promise<Place[]> => {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated.');

  const url = `${AppConfig.api.baseUrl}/places/nearby?lat=${lat}&lng=${lng}&radius=${radiusMetres}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AppConfig.api.timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message ?? 'Failed to fetch places.');
    return json.data.places as Place[];
  } finally {
    clearTimeout(timeoutId);
  }
};
