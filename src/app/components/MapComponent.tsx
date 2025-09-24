'use client'

import { useEffect, useRef } from 'react'

interface MapComponentProps {
  center: { lat: number; lng: number }
  routePoints: { lat: number; lng: number }[]
  destination?: { lat: number; lng: number; address: string } | null
  zoom?: number
  wazeStyle?: boolean
}

export default function MapComponent({ 
  center, 
  routePoints, 
  destination, 
  zoom = 15, 
  wazeStyle = false 
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const routeLayerRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const destinationMarkerRef = useRef<any>(null)

  useEffect(() => {
    // Importação dinâmica do Leaflet para evitar problemas de SSR
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return

      const L = await import('leaflet')
      await import('leaflet/dist/leaflet.css')

      // Fix para ícones do Leaflet no Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })

      // Inicializar o mapa com estilo Waze se solicitado
      const map = L.map(mapRef.current, {
        zoomControl: wazeStyle ? false : true,
        attributionControl: !wazeStyle
      }).setView([center.lat, center.lng], zoom)
      
      mapInstanceRef.current = map

      // Escolher tiles baseado no estilo
      if (wazeStyle) {
        // Tiles mais escuros para estilo Waze
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map)
      } else {
        // Tiles padrão
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map)
      }

      // Criar ícone personalizado para posição atual (estilo Waze)
      const currentLocationIcon = L.divIcon({
        html: `
          <div style="
            width: 20px; 
            height: 20px; 
            background: #00D4AA; 
            border: 3px solid white; 
            border-radius: 50%; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            position: relative;
          ">
            <div style="
              position: absolute;
              top: -8px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-bottom: 12px solid #00D4AA;
            "></div>
          </div>
        `,
        className: 'current-location-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })

      // Adicionar marcador inicial com estilo personalizado
      const startMarker = L.marker([center.lat, center.lng], {
        icon: wazeStyle ? currentLocationIcon : undefined
      })
        .addTo(map)
        .bindPopup(wazeStyle ? 'Sua localização' : 'Localização inicial')
      
      markersRef.current.push(startMarker)

      // Adicionar controles customizados se estilo Waze
      if (wazeStyle) {
        // Botão de zoom in customizado
        const zoomInButton = L.control({ position: 'topright' })
        zoomInButton.onAdd = function() {
          const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom')
          div.innerHTML = `
            <a href="#" style="
              background: rgba(30, 41, 59, 0.9);
              color: white;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              text-decoration: none;
              font-size: 18px;
              font-weight: bold;
              border-radius: 8px;
              margin-bottom: 4px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255,255,255,0.1);
            ">+</a>
          `
          div.onclick = function() {
            map.zoomIn()
          }
          return div
        }
        zoomInButton.addTo(map)

        // Botão de zoom out customizado
        const zoomOutButton = L.control({ position: 'topright' })
        zoomOutButton.onAdd = function() {
          const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom')
          div.innerHTML = `
            <a href="#" style="
              background: rgba(30, 41, 59, 0.9);
              color: white;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              text-decoration: none;
              font-size: 18px;
              font-weight: bold;
              border-radius: 8px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255,255,255,0.1);
            ">−</a>
          `
          div.onclick = function() {
            map.zoomOut()
          }
          return div
        }
        zoomOutButton.addTo(map)
      }
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [center.lat, center.lng, zoom, wazeStyle])

  // Adicionar marcador de destino
  useEffect(() => {
    const addDestinationMarker = async () => {
      if (!mapInstanceRef.current || !destination) return

      const L = await import('leaflet')

      // Remover marcador de destino anterior
      if (destinationMarkerRef.current) {
        mapInstanceRef.current.removeLayer(destinationMarkerRef.current)
      }

      // Criar ícone personalizado para destino (estilo Waze)
      const destinationIcon = wazeStyle ? L.divIcon({
        html: `
          <div style="
            width: 24px; 
            height: 24px; 
            background: #EF4444; 
            border: 3px solid white; 
            border-radius: 50%; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
          ">🏁</div>
        `,
        className: 'destination-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      }) : undefined

      // Adicionar marcador de destino
      const destMarker = L.marker([destination.lat, destination.lng], {
        icon: destinationIcon
      })
        .addTo(mapInstanceRef.current)
        .bindPopup(`Destino: ${destination.address.split(',')[0]}`)
      
      destinationMarkerRef.current = destMarker

      // Ajustar visualização para mostrar origem e destino
      if (routePoints.length > 0) {
        const bounds = L.latLngBounds([
          [routePoints[0].lat, routePoints[0].lng],
          [destination.lat, destination.lng]
        ])
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
      }
    }

    addDestinationMarker()
  }, [destination, wazeStyle, routePoints])

  useEffect(() => {
    const updateRoute = async () => {
      if (!mapInstanceRef.current || routePoints.length < 2) return

      const L = await import('leaflet')

      // Remover rota anterior
      if (routeLayerRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current)
      }

      // Criar nova rota com estilo Waze
      const latlngs: [number, number][] = routePoints.map(point => [point.lat, point.lng])
      const polylineOptions = wazeStyle ? {
        color: '#00D4AA',
        weight: 6,
        opacity: 0.9,
        dashArray: '0, 10',
        lineCap: 'round',
        lineJoin: 'round'
      } : {
        color: '#3B82F6',
        weight: 4,
        opacity: 0.8
      }

      const polyline = L.polyline(latlngs, polylineOptions).addTo(mapInstanceRef.current)
      routeLayerRef.current = polyline

      // Adicionar marcador na posição atual (último ponto)
      if (routePoints.length > 0) {
        const currentPoint = routePoints[routePoints.length - 1]
        
        // Remover marcadores anteriores (exceto o inicial)
        markersRef.current.slice(1).forEach(marker => {
          mapInstanceRef.current?.removeLayer(marker)
        })
        markersRef.current = markersRef.current.slice(0, 1)

        // Criar ícone para posição atual em movimento
        const movingIcon = wazeStyle ? L.divIcon({
          html: `
            <div style="
              width: 16px; 
              height: 16px; 
              background: #00D4AA; 
              border: 2px solid white; 
              border-radius: 50%; 
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              animation: pulse 2s infinite;
            "></div>
            <style>
              @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(0, 212, 170, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(0, 212, 170, 0); }
                100% { box-shadow: 0 0 0 0 rgba(0, 212, 170, 0); }
              }
            </style>
          `,
          className: 'moving-marker',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        }) : undefined

        // Adicionar marcador atual
        const currentMarker = L.marker([currentPoint.lat, currentPoint.lng], {
          icon: movingIcon
        })
          .addTo(mapInstanceRef.current)
          .bindPopup(wazeStyle ? 'Posição atual' : 'Posição atual')
        
        markersRef.current.push(currentMarker)

        // Ajustar visualização para mostrar toda a rota se não há destino específico
        if (!destination) {
          mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [20, 20] })
        }
      }
    }

    updateRoute()
  }, [routePoints, wazeStyle, destination])

  return (
    <div 
      ref={mapRef} 
      className={`w-full h-full min-h-[400px] ${wazeStyle ? 'rounded-none' : 'rounded-xl'}`}
      style={{ 
        zIndex: 1,
        filter: wazeStyle ? 'contrast(1.1) saturate(1.2)' : 'none'
      }}
    />
  )
}