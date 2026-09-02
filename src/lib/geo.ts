// Geocodificação gratuita via Nominatim (OpenStreetMap) e distância haversine.
// Nível 1 do roteirizador: proximidade em linha reta. Para trânsito em tempo real,
// trocar por Google Distance Matrix / Mapbox mantendo as mesmas assinaturas.

export async function geocodeEndereco(
  endereco: string,
  cidade?: string | null
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = [endereco, cidade, "Ceará", "Brasil"].filter(Boolean).join(", ");
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ai-super-visao-fortaleza/1.0 (vistorias)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data?.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null; // geocodificação é melhoria, nunca bloqueia o fluxo
  }
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
