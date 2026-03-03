// packages/shared/src/geo.ts
// PostGIS point parse, bounding box, cluster hesaplama

export interface LatLng {
  lat: number
  lng: number
}

export interface BoundingBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

/**
 * Supabase'den gelen PostGIS point string'ini parse et
 * Formatlar: "POINT(28.9784 41.0082)" veya GeoJSON {type:"Point", coordinates:[lng,lat]}
 */
export function parsePostGISPoint(point: unknown): LatLng | null {
  if (!point) return null

  // GeoJSON formatı
  if (typeof point === 'object' && point !== null) {
    const geo = point as { type?: string; coordinates?: number[] }
    if (geo.type === 'Point' && Array.isArray(geo.coordinates)) {
      return { lng: geo.coordinates[0], lat: geo.coordinates[1] }
    }
  }

  // WKT formatı: "POINT(lng lat)"
  if (typeof point === 'string') {
    const match = point.match(/POINT\(([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\)/)
    if (match) {
      return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) }
    }
  }

  return null
}

/** LatLng → PostGIS WKT string */
export function toPostGISPoint(lat: number, lng: number): string {
  return `POINT(${lng} ${lat})`
}

/** Harita görünüm alanı (viewport) hesapla */
export function getBoundingBox(center: LatLng, radiusMeters: number): BoundingBox {
  const R = 6_371_000
  const latDelta = (radiusMeters / R) * (180 / Math.PI)
  const lngDelta = latDelta / Math.cos((center.lat * Math.PI) / 180)
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  }
}

/** Noktaları basit grid clustering ile grupla (zoom seviyesine göre) */
export function clusterPoints<T extends { lat: number; lng: number; id: string }>(
  points: T[],
  zoom: number
): Array<{ lat: number; lng: number; count: number; items: T[] }> {
  // Zoom seviyesine göre hücre boyutu (derece cinsinden)
  const cellSize = zoom >= 14 ? 0.002 : zoom >= 12 ? 0.008 : zoom >= 10 ? 0.03 : 0.1

  const grid = new Map<string, { lat: number; lng: number; count: number; items: T[] }>()

  for (const point of points) {
    const cellLat = Math.floor(point.lat / cellSize) * cellSize
    const cellLng = Math.floor(point.lng / cellSize) * cellSize
    const key = `${cellLat.toFixed(6)},${cellLng.toFixed(6)}`

    if (!grid.has(key)) {
      grid.set(key, { lat: cellLat + cellSize / 2, lng: cellLng + cellSize / 2, count: 0, items: [] })
    }

    const cell = grid.get(key)!
    cell.count++
    cell.items.push(point)
    // Ağırlıklı merkez hesapla
    cell.lat = cell.items.reduce((s, p) => s + p.lat, 0) / cell.items.length
    cell.lng = cell.items.reduce((s, p) => s + p.lng, 0) / cell.items.length
  }

  return Array.from(grid.values())
}

/** Bir noktanın viewport içinde olup olmadığını kontrol et */
export function isInViewport(point: LatLng, bbox: BoundingBox): boolean {
  return (
    point.lat >= bbox.minLat &&
    point.lat <= bbox.maxLat &&
    point.lng >= bbox.minLng &&
    point.lng <= bbox.maxLng
  )
}
