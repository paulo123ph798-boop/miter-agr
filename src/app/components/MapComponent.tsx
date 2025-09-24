'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix para ícones do Leaflet no Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MapComponentProps {
  center: { lat: number; lng: number }
  routePoints: { lat: number; lng: number }[]
  zoom?: number
}

export default function MapComponent({ center, routePoints, zoom = 15 }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const routeLayerRef = useRef<L.Polyline | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Inicializar o mapa
    const map = L.map(mapRef.current).setView([center.lat, center.lng], zoom)
    mapInstanceRef.current = map

    // Adicionar tiles do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    // Adicionar marcador inicial
    const startMarker = L.marker([center.lat, center.lng])
      .addTo(map)
      .bindPopup('Localização inicial')
    
    markersRef.current.push(startMarker)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [center.lat, center.lng, zoom])

  useEffect(() => {
    if (!mapInstanceRef.current || routePoints.length < 2) return

    // Remover rota anterior
    if (routeLayerRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current)
    }

    // Criar nova rota
    const latlngs: [number, number][] = routePoints.map(point => [point.lat, point.lng])
    const polyline = L.polyline(latlngs, { 
      color: '#3B82F6', 
      weight: 4,
      opacity: 0.8 
    }).addTo(mapInstanceRef.current)
    
    routeLayerRef.current = polyline

    // Adicionar marcador na posição atual (último ponto)
    if (routePoints.length > 0) {
      const currentPoint = routePoints[routePoints.length - 1]
      
      // Remover marcadores anteriores (exceto o inicial)
      markersRef.current.slice(1).forEach(marker => {
        mapInstanceRef.current?.removeLayer(marker)
      })
      markersRef.current = markersRef.current.slice(0, 1)

      // Adicionar marcador atual
      const currentMarker = L.marker([currentPoint.lat, currentPoint.lng])
        .addTo(mapInstanceRef.current)
        .bindPopup('Posição atual')
      
      markersRef.current.push(currentMarker)

      // Ajustar visualização para mostrar toda a rota
      mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [20, 20] })
    }
  }, [routePoints])

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full min-h-[400px] rounded-xl"
      style={{ zIndex: 1 }}
    />
  )
}