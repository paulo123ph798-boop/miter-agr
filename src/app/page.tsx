'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, Settings, History, Car, MapPin, Clock, DollarSign, Plus, ArrowLeft, Plane, Edit, Trash2, X, CreditCard, Percent, Download, Phone, Globe, Smartphone, Search, Navigation } from 'lucide-react'
import dynamic from 'next/dynamic'

// Importação dinâmica do mapa para evitar problemas de SSR
const MapComponent = dynamic(() => import('@/app/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-blue-800 rounded-xl flex items-center justify-center">Carregando mapa...</div>
})

export default function TaxiMeterApp() {
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [time, setTime] = useState(0)
  const [distance, setDistance] = useState(0)
  const [fare, setFare] = useState(0)
  const [currentView, setCurrentView] = useState('meter')
  const [showMap, setShowMap] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [routePoints, setRoutePoints] = useState<{lat: number, lng: number}[]>([])
  const [selectedRide, setSelectedRide] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddTariffModal, setShowAddTariffModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCustomTipModal, setShowCustomTipModal] = useState(false)
  const [showEditNameModal, setShowEditNameModal] = useState(false)
  
  // Estados para busca de endereço
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [destination, setDestination] = useState<{lat: number, lng: number, address: string} | null>(null)
  
  // Estados para pagamento e gorjetas
  const [selectedTipPercentage, setSelectedTipPercentage] = useState(0)
  const [customTipPercentages, setCustomTipPercentages] = useState([0, 10, 15, 20])
  const [tempCustomTips, setTempCustomTips] = useState([0, 10, 15, 20])
  const [finalFare, setFinalFare] = useState(0)
  const [tipAmount, setTipAmount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  
  // Estado para detecção de dispositivo
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop')
  
  // Estado para nome da interface
  const [appName, setAppName] = useState('Taxímetro Digital')
  const [tempAppName, setTempAppName] = useState('Taxímetro Digital')
  
  // Configurações de tarifa
  const [tariffSettings, setTariffSettings] = useState({
    initialFare: 4.50,
    perKmRate: 2.30,
    perMinuteRate: 0.50,
    nightSurcharge: 1.20
  })

  // Estado do histórico de corridas (vazio inicialmente)
  const [rideHistory, setRideHistory] = useState<any[]>([])

  // Estado das tarifas personalizadas (vazio inicialmente)
  const [customTariffs, setCustomTariffs] = useState<any[]>([])

  // Estado do formulário de nova tarifa
  const [newTariff, setNewTariff] = useState({
    name: '',
    description: '',
    initialFare: '',
    perKmRate: '',
    perMinuteRate: '',
    nightSurcharge: ''
  })

  // Detectar tipo de dispositivo
  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      if (/iphone|ipad|ipod/.test(userAgent)) {
        setDeviceType('ios')
      } else if (/android/.test(userAgent)) {
        setDeviceType('android')
      } else {
        setDeviceType('desktop')
      }
    }

    detectDevice()
  }, [])

  // Função para fazer download automático baseado no dispositivo
  const handleAutoDownload = () => {
    switch (deviceType) {
      case 'ios':
        // Simula redirecionamento para App Store
        window.open('https://apps.apple.com/app/taxi-meter-pro', '_blank')
        break
      case 'android':
        // Simula redirecionamento para Google Play
        window.open('https://play.google.com/store/apps/details?id=com.taximeter.pro', '_blank')
        break
      default:
        // Para desktop, oferece opções
        alert('Acesse este link no seu celular para baixar o aplicativo automaticamente!')
        break
    }
  }

  // Função para buscar endereços usando Nominatim (OpenStreetMap)
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=pt&addressdetails=1`
      )
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Erro ao buscar endereço:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounce para busca de endereço
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchAddress(searchQuery)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Função para selecionar destino e iniciar corrida
  const selectDestination = (result: any) => {
    const dest = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name
    }
    setDestination(dest)
    setSearchQuery('')
    setSearchResults([])
    startMeter()
  }

  // Obter localização do usuário
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setUserLocation(newLocation)
          setRoutePoints([newLocation])
        },
        (error) => {
          console.error('Erro ao obter localização:', error)
          // Localização padrão (Lisboa)
          const defaultLocation = { lat: 38.7223, lng: -9.1393 }
          setUserLocation(defaultLocation)
          setRoutePoints([defaultLocation])
        }
      )
    }
  }

  // Rastrear movimento durante a corrida
  useEffect(() => {
    let watchId: number
    if (isRunning && !isPaused) {
      watchId = navigator.geolocation?.watchPosition(
        (position) => {
          const newPoint = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setRoutePoints(prev => [...prev, newPoint])
        },
        (error) => console.error('Erro ao rastrear localização:', error),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      )
    }
    return () => {
      if (watchId) navigator.geolocation?.clearWatch(watchId)
    }
  }, [isRunning, isPaused])

  // Timer para o taxímetro
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTime(prev => prev + 1)
        // Simula incremento de distância (em km)
        setDistance(prev => prev + 0.01)
        // Calcula tarifa
        const timeInMinutes = (time + 1) / 60
        const calculatedFare = tariffSettings.initialFare + 
                              (distance * tariffSettings.perKmRate) + 
                              (timeInMinutes * tariffSettings.perMinuteRate)
        setFare(calculatedFare)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, isPaused, time, distance, tariffSettings])

  // Calcular valores de pagamento
  useEffect(() => {
    const tip = (finalFare * selectedTipPercentage) / 100
    setTipAmount(tip)
    setTotalAmount(finalFare + tip)
  }, [finalFare, selectedTipPercentage])

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startMeter = () => {
    getCurrentLocation()
    setShowMap(true)
    setIsRunning(true)
    setIsPaused(false)
  }

  const pauseMeter = () => {
    setIsPaused(!isPaused)
  }

  const stopMeter = () => {
    // Preparar dados para pagamento
    setFinalFare(fare)
    setSelectedTipPercentage(0)
    setShowPaymentModal(true)
    
    setIsRunning(false)
    setIsPaused(false)
    setShowMap(false)
    setDestination(null)
  }

  const finishPayment = () => {
    // Salvar corrida no histórico
    if (time > 0 || distance > 0 || finalFare > 0) {
      const newRide = {
        id: Date.now(),
        date: new Date().toLocaleDateString('pt-PT'),
        time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        duration: formatTime(time),
        distance: distance.toFixed(2),
        fare: finalFare.toFixed(2),
        tip: tipAmount.toFixed(2),
        total: totalAmount.toFixed(2),
        destination: destination?.address || 'Destino não especificado'
      }
      setRideHistory(prev => [newRide, ...prev])
    }

    // Reset dos valores
    setTime(0)
    setDistance(0)
    setFare(0)
    setRoutePoints([])
    setShowPaymentModal(false)
    setSelectedTipPercentage(0)
    setFinalFare(0)
    setTipAmount(0)
    setTotalAmount(0)
    setDestination(null)
  }

  // Função para deletar corrida específica
  const deleteRide = (rideId: number) => {
    setRideHistory(prev => prev.filter(ride => ride.id !== rideId))
    setSelectedRide(null)
    setShowDeleteModal(false)
  }

  // Função para limpar todo o histórico
  const clearAllHistory = () => {
    setRideHistory([])
    setSelectedRide(null)
    setShowDeleteModal(false)
  }

  // Função para adicionar nova tarifa
  const addTariff = () => {
    if (newTariff.name.trim() === '') return

    const tariff = {
      id: Date.now(),
      name: newTariff.name,
      description: newTariff.description,
      initialFare: parseFloat(newTariff.initialFare) || 0,
      perKmRate: parseFloat(newTariff.perKmRate) || 0,
      perMinuteRate: parseFloat(newTariff.perMinuteRate) || 0,
      nightSurcharge: parseFloat(newTariff.nightSurcharge) || 1
    }

    setCustomTariffs(prev => [...prev, tariff])
    setNewTariff({
      name: '',
      description: '',
      initialFare: '',
      perKmRate: '',
      perMinuteRate: '',
      nightSurcharge: ''
    })
    setShowAddTariffModal(false)
  }

  // Função para deletar tarifa
  const deleteTariff = (tariffId: number) => {
    setCustomTariffs(prev => prev.filter(tariff => tariff.id !== tariffId))
  }

  // Função para salvar gorjetas personalizadas
  const saveCustomTips = () => {
    setCustomTipPercentages([...tempCustomTips])
    setShowCustomTipModal(false)
  }

  // Função para salvar nome do app
  const saveAppName = () => {
    setAppName(tempAppName)
    setShowEditNameModal(false)
  }

  // Modal para editar nome da interface
  const renderEditNameModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-blue-900 rounded-2xl p-6 w-full max-w-sm border border-blue-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Editar Nome da Interface</h3>
          <button
            onClick={() => setShowEditNameModal(false)}
            className="text-blue-300 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-6">
          <label className="block text-blue-200 text-sm mb-2">Nome da Interface</label>
          <input
            type="text"
            value={tempAppName}
            onChange={(e) => setTempAppName(e.target.value)}
            placeholder="Digite o nome da interface"
            className="w-full bg-blue-800 text-white p-3 rounded-lg border border-blue-600 focus:border-blue-400 focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowEditNameModal(false)}
            className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={saveAppName}
            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )

  // Modal de pagamento
  const renderPaymentModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-blue-900 rounded-2xl p-6 w-full max-w-md border border-blue-700 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <CreditCard className="w-12 h-12 text-blue-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Pagamento da Corrida</h3>
          <div className="text-3xl font-bold text-blue-300 mb-2">€ {finalFare.toFixed(2)}</div>
          <p className="text-blue-200 text-sm">Valor total da viagem</p>
          {destination && (
            <div className="bg-blue-800/50 rounded-lg p-2 mt-3">
              <p className="text-blue-200 text-xs">Destino:</p>
              <p className="text-white text-sm truncate">{destination.address}</p>
            </div>
          )}
        </div>

        {/* Seção de Gorjetas */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold flex items-center">
              <Percent className="w-5 h-5 mr-2" />
              Gorjetas
            </h4>
          </div>
          
          {/* Opções de gorjeta em linha horizontal */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {customTipPercentages.map((percentage) => (
              <button
                key={percentage}
                onClick={() => setSelectedTipPercentage(percentage)}
                className={`py-3 px-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedTipPercentage === percentage
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-800 text-blue-200 hover:bg-blue-700'
                }`}
              >
                {percentage}%
              </button>
            ))}
          </div>

          {/* Botão personalizar */}
          <button
            onClick={() => {
              setTempCustomTips([...customTipPercentages])
              setShowCustomTipModal(true)
            }}
            className="w-full bg-blue-700 text-white py-2 rounded-lg font-semibold text-sm hover:bg-blue-600 transition-colors"
          >
            Personalizar
          </button>
        </div>

        {/* Resumo do pagamento */}
        <div className="bg-blue-800/50 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-blue-200">Valor da corrida:</span>
            <span className="text-white">€ {finalFare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-blue-200">Gorjeta ({selectedTipPercentage}%):</span>
            <span className="text-white">€ {tipAmount.toFixed(2)}</span>
          </div>
          <div className="border-t border-blue-600 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold">Total:</span>
              <span className="text-blue-300 font-bold text-lg">€ {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowPaymentModal(false)}
            className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={finishPayment}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold"
          >
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  )

  // Modal para personalizar gorjetas
  const renderCustomTipModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-blue-900 rounded-2xl p-6 w-full max-w-sm border border-blue-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Personalizar Gorjetas</h3>
          <button
            onClick={() => setShowCustomTipModal(false)}
            className="text-blue-300 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          {tempCustomTips.map((tip, index) => (
            <div key={index}>
              <label className="block text-blue-200 text-sm mb-2">Opção {index + 1} (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={tip}
                onChange={(e) => {
                  const newTips = [...tempCustomTips]
                  newTips[index] = parseInt(e.target.value) || 0
                  setTempCustomTips(newTips)
                }}
                className="w-full bg-blue-800 text-white p-3 rounded-lg border border-blue-600 focus:border-blue-400 focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowCustomTipModal(false)}
            className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={saveCustomTips}
            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )

  // Modal de confirmação de exclusão
  const renderDeleteModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-blue-900 rounded-2xl p-6 w-full max-w-sm border border-blue-700">
        <div className="text-center mb-6">
          <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {selectedRide ? 'Excluir Corrida' : 'Limpar Histórico'}
          </h3>
          <p className="text-blue-200 text-sm">
            {selectedRide 
              ? 'Tem certeza que deseja excluir esta corrida?' 
              : 'Tem certeza que deseja limpar todo o histórico de corridas?'
            }
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={() => selectedRide ? deleteRide(selectedRide) : clearAllHistory()}
            className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )

  // Modal para adicionar nova tarifa
  const renderAddTariffModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-blue-900 rounded-2xl p-6 w-full max-w-md border border-blue-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Nova Tarifa</h3>
          <button
            onClick={() => setShowAddTariffModal(false)}
            className="text-blue-300 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-blue-200 text-sm mb-2">Nome da Tarifa *</label>
            <input
              type="text"
              value={newTariff.name}
              onChange={(e) => setNewTariff(prev => ({...prev, name: e.target.value}))}
              placeholder="Ex: Aeroporto, Centro, Noturna..."
              className="w-full bg-blue-800 text-white p-3 rounded-lg border border-blue-600 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-blue-200 text-sm mb-2">Descrição</label>
            <input
              type="text"
              value={newTariff.description}
              onChange={(e) => setNewTariff(prev => ({...prev, description: e.target.value}))}
              placeholder="Descrição opcional da tarifa"
              className="w-full bg-blue-800 text-white p-3 rounded-lg border border-blue-600 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-blue-200 text-sm mb-2">Bandeirada inicial (€)</label>
            <input
              type="number"
              step="0.10"
              value={newTariff.initialFare}
              onChange={(e) => setNewTariff(prev => ({...prev, initialFare: e.target.value}))}
              placeholder="4.50"
              className="w-full bg-blue-800 text-white p-3 rounded-lg border border-blue-600 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-blue-200 text-sm mb-2">Por quilômetro (€)</label>
            <input
              type="number"
              step="0.10"
              value={newTariff.perKmRate}
              onChange={(e) => setNewTariff(prev => ({...prev, perKmRate: e.target.value}))}
              placeholder="2.30"
              className="w-full bg-blue-800 text-white p-3 rounded-lg border border-blue-600 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-blue-200 text-sm mb-2">Por minuto (€)</label>
            <input
              type="number"
              step="0.10"
              value={newTariff.perMinuteRate}
              onChange={(e) => setNewTariff(prev => ({...prev, perMinuteRate: e.target.value}))}
              placeholder="0.50"
              className="w-full bg-blue-800 text-white p-3 rounded-lg border border-blue-600 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-blue-200 text-sm mb-2">Taxa noturna (multiplicador)</label>
            <input
              type="number"
              step="0.10"
              value={newTariff.nightSurcharge}
              onChange={(e) => setNewTariff(prev => ({...prev, nightSurcharge: e.target.value}))}
              placeholder="1.20"
              className="w-full bg-blue-800 text-white p-3 rounded-lg border border-blue-600 focus:border-blue-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowAddTariffModal(false)}
            className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={addTariff}
            disabled={newTariff.name.trim() === ''}
            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )

  const renderMapView = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header estilo Waze */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={() => setShowMap(false)}
            className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-2"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-2">
            <Navigation className="w-5 h-5 text-white" />
            <span className="text-sm font-medium">Navegando</span>
          </div>
        </div>

        {/* Informações do destino */}
        {destination && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-3">
            <div className="flex items-center space-x-3">
              <div className="bg-green-500 rounded-full p-2">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">Destino</p>
                <p className="text-blue-100 text-xs truncate">{destination.address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Métricas da corrida em linha */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-white">€ {fare.toFixed(2)}</div>
            <div className="text-blue-100 text-xs">Valor</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">{formatTime(time)}</div>
            <div className="text-blue-100 text-xs">Tempo</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">{distance.toFixed(2)} km</div>
            <div className="text-blue-100 text-xs">Distância</div>
          </div>
        </div>
      </div>

      {/* Mapa estilo Waze */}
      <div className="flex-1 relative">
        <div className="w-full h-full">
          {userLocation && (
            <MapComponent 
              center={userLocation}
              routePoints={routePoints}
              destination={destination}
              zoom={16}
              wazeStyle={true}
            />
          )}
        </div>

        {/* Status overlay */}
        <div className="absolute top-4 left-4 right-4">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium shadow-lg ${
            isPaused ? 'bg-yellow-500 text-yellow-900' : 'bg-green-500 text-green-900'
          }`}>
            <div className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></div>
            {isPaused ? 'Corrida Pausada' : 'Corrida em Andamento'}
          </div>
        </div>
      </div>

      {/* Controles estilo Waze */}
      <div className="p-4 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700">
        <div className="flex gap-3">
          <button
            onClick={pauseMeter}
            className={`flex-1 py-4 rounded-2xl font-semibold flex items-center justify-center transition-all shadow-lg ${
              isPaused 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
            }`}
          >
            <Pause className="w-6 h-6 mr-2" />
            {isPaused ? 'Continuar' : 'Pausar'}
          </button>
          <button
            onClick={stopMeter}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center shadow-lg"
          >
            <Square className="w-6 h-6 mr-2" />
            Finalizar
          </button>
        </div>
      </div>
    </div>
  )

  const renderMeterView = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white p-4">
      {/* Logo e Header */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center space-x-3">
            <div className="bg-blue-500 rounded-full p-2">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{appName}</h1>
              <p className="text-blue-200 text-sm">Serviço Profissional</p>
            </div>
          </div>
        </div>
      </div>

      {/* Campo de busca de endereço */}
      <div className="w-full max-w-md mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-blue-300" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Para onde vamos? Digite o endereço..."
            className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 pl-10 pr-4 py-4 rounded-2xl border border-white/20 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
          {isSearching && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-300"></div>
            </div>
          )}
        </div>

        {/* Resultados da busca */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => selectDestination(result)}
                className="w-full text-left p-3 hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
              >
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-blue-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {result.display_name.split(',')[0]}
                    </p>
                    <p className="text-blue-200 text-xs truncate">
                      {result.display_name}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Display Principal */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-blue-300 mb-2">
            € {fare.toFixed(2)}
          </div>
          <div className="text-blue-200 text-sm">Valor da corrida</div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-blue-300 mr-2" />
              <span className="text-lg font-semibold">{formatTime(time)}</span>
            </div>
            <div className="text-blue-200 text-sm">Tempo</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <MapPin className="w-5 h-5 text-blue-300 mr-2" />
              <span className="text-lg font-semibold">{distance.toFixed(2)} km</span>
            </div>
            <div className="text-blue-200 text-sm">Distância</div>
          </div>
        </div>

        {/* Status */}
        <div className="text-center mb-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            isRunning ? (isPaused ? 'bg-yellow-900 text-yellow-400' : 'bg-blue-900 text-blue-300') : 'bg-gray-800 text-gray-400'
          }`}>
            {isRunning ? (isPaused ? 'Pausado' : 'Em andamento') : 'Parado'}
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="w-full max-w-md mb-8">
        {!isRunning ? (
          <div className="space-y-4">
            <p className="text-center text-blue-200 text-sm mb-4">
              Digite um endereço acima para iniciar a navegação
            </p>
            <button
              onClick={startMeter}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 rounded-2xl font-semibold text-lg flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            >
              <Play className="w-6 h-6 mr-2" />
              Iniciar Taxímetro
            </button>
          </div>
        ) : (
          <div className="flex gap-3 mb-4">
            <button
              onClick={pauseMeter}
              className="flex-1 bg-yellow-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center"
            >
              <Pause className="w-5 h-5 mr-2" />
              {isPaused ? 'Continuar' : 'Pausar'}
            </button>
            <button
              onClick={stopMeter}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center"
            >
              <Square className="w-5 h-5 mr-2" />
              Parar
            </button>
          </div>
        )}

        <button
          onClick={() => setCurrentView('tariffs')}
          className="w-full bg-white/10 backdrop-blur-sm text-white py-3 rounded-xl font-semibold border border-white/20"
        >
          Gerir Tarifas Personalizadas
        </button>
      </div>

      {/* Informações */}
      <div className="w-full max-w-md text-center text-blue-200 text-sm mb-8">
        <p>Digite um endereço para navegar até o destino e calcular o valor da corrida automaticamente.</p>
      </div>

      {/* Navegação Inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-900/90 backdrop-blur-sm border-t border-blue-700">
        <div className="flex justify-around py-3">
          <button 
            className={`flex flex-col items-center ${currentView === 'meter' ? 'text-blue-300' : 'text-blue-400'}`}
            onClick={() => setCurrentView('meter')}
          >
            <Car className="w-6 h-6 mb-1" />
            <span className="text-xs">Passeios</span>
          </button>
          <button 
            className={`flex flex-col items-center ${currentView === 'history' ? 'text-blue-300' : 'text-blue-400'}`}
            onClick={() => setCurrentView('history')}
          >
            <History className="w-6 h-6 mb-1" />
            <span className="text-xs">Histórico</span>
          </button>
          <button 
            className={`flex flex-col items-center ${currentView === 'settings' ? 'text-blue-300' : 'text-blue-400'}`}
            onClick={() => setCurrentView('settings')}
          >
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-xs">Configurações</span>
          </button>
        </div>
      </div>
    </div>
  )

  const renderTariffsView = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-blue-700">
        <button 
          onClick={() => setCurrentView('meter')}
          className="mr-4"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg font-semibold">Gerir Tarifas Personalizadas</h1>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-4">
        {/* Botão de adicionar tarifa */}
        <button
          onClick={() => setShowAddTariffModal(true)}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center mb-6 shadow-lg"
        >
          <Plus className="w-6 h-6 mr-2" />
          Adicionar Nova Tarifa
        </button>

        {/* Lista de tarifas */}
        <div className="space-y-4 mb-20">
          {customTariffs.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
              <p className="text-blue-200 text-lg mb-2">Nenhuma tarifa personalizada</p>
              <p className="text-blue-300 text-sm">
                Crie suas próprias tarifas para diferentes tipos de corrida
              </p>
            </div>
          ) : (
            customTariffs.map((tariff) => (
              <div key={tariff.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 relative">
                <button
                  onClick={() => deleteTariff(tariff.id)}
                  className="absolute top-3 right-3 text-red-400 hover:text-red-300 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="pr-8">
                  <h3 className="font-semibold text-white mb-1">{tariff.name}</h3>
                  {tariff.description && (
                    <p className="text-blue-200 text-sm mb-3">{tariff.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-300">Bandeirada:</span>
                      <span className="text-white ml-2">€ {tariff.initialFare.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-blue-300">Por km:</span>
                      <span className="text-white ml-2">€ {tariff.perKmRate.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-blue-300">Por min:</span>
                      <span className="text-white ml-2">€ {tariff.perMinuteRate.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-blue-300">Taxa noturna:</span>
                      <span className="text-white ml-2">{tariff.nightSurcharge.toFixed(2)}x</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modais */}
      {showAddTariffModal && renderAddTariffModal()}

      {/* Navegação Inferior */}
      <div className="bg-blue-900/90 backdrop-blur-sm border-t border-blue-700">
        <div className="flex justify-around py-3">
          <button 
            className={`flex flex-col items-center ${currentView === 'meter' ? 'text-blue-300' : 'text-blue-400'}`}
            onClick={() => setCurrentView('meter')}
          >
            <Car className="w-6 h-6 mb-1" />
            <span className="text-xs">Passeios</span>
          </button>
          <button 
            className={`flex flex-col items-center ${currentView === 'history' ? 'text-blue-300' : 'text-blue-400'}`}
            onClick={() => setCurrentView('history')}
          >
            <History className="w-6 h-6 mb-1" />
            <span className="text-xs">Histórico</span>
          </button>
          <button 
            className={`flex flex-col items-center ${currentView === 'settings' ? 'text-blue-300' : 'text-blue-400'}`}
            onClick={() => setCurrentView('settings')}
          >
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-xs">Configurações</span>
          </button>
        </div>
      </div>
    </div>
  )

  const renderHistoryView = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white p-4">
      {/* Header com botão de lixeira */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Histórico de Corridas</h1>
        {rideHistory.length > 0 && (
          <button
            onClick={() => {
              setSelectedRide(null)
              setShowDeleteModal(true)
            }}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-400 p-2 rounded-xl transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="space-y-4 mb-20">
        {rideHistory.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
            <p className="text-blue-200 text-lg mb-2">Nenhuma corrida registrada</p>
            <p className="text-blue-300 text-sm">
              Suas corridas aparecerão aqui após serem finalizadas
            </p>
          </div>
        ) : (
          rideHistory.map((ride) => (
            <div key={ride.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 relative">
              <button
                onClick={() => {
                  setSelectedRide(ride.id)
                  setShowDeleteModal(true)
                }}
                className="absolute top-3 right-3 text-red-400 hover:text-red-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex justify-between items-start mb-2 pr-8">
                <div>
                  <p className="font-semibold">Corrida #{ride.id.toString().slice(-3)}</p>
                  <p className="text-blue-200 text-sm">{ride.date}, {ride.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-300 font-semibold">€ {ride.total}</p>
                  {parseFloat(ride.tip) > 0 && (
                    <p className="text-green-400 text-xs">+€ {ride.tip} gorjeta</p>
                  )}
                </div>
              </div>
              <div className="text-sm text-blue-200 mb-2">
                <p>Tempo: {ride.duration} • Distância: {ride.distance} km</p>
                <p>Corrida: € {ride.fare} • Total: € {ride.total}</p>
              </div>
              {ride.destination && (
                <div className="text-xs text-blue-300 bg-blue-800/30 rounded-lg p-2">
                  <span className="font-medium">Destino: </span>
                  <span className="truncate">{ride.destination}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal de confirmação */}
      {showDeleteModal && renderDeleteModal()}

      {/* Navegação Inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-900/90 backdrop-blur-sm border-t border-blue-700">
        <div className="flex justify-around py-3">
          <button 
            className={`flex flex-col items-center ${currentView === 'meter' ? 'text-blue-300' : 'text-blue-400'}`}
            onClick={() => setCurrentView('meter')}
          >
            <Car className="w-6 h-6 mb-1" />
            <span className="text-xs">Passeios</span>
          </button>
          <button 
            className={`flex flex-col items-center ${currentView === 'history' ? 'text-blue-300' : 'text-blue-400'}`}
            onClick={() => setCurrentView('history')}
          >
            <History className="w-6 h-6 mb-1" />
            <span className="text-xs">Histórico</span>
          </button>
          <button 
            className={`flex flex-col items-center ${currentView === 'settings' ? 'text-blue-300' : 'text-blue-400'}`}
            onClick={() => setCurrentView('settings')}
          >
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-xs">Configurações</span>
          </button>
        </div>
      </div>
    </div>
  )

  const renderSettingsView = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white p-4">
      <h1 className="text-xl font-semibold mb-6">Configurações</h1>
      
      <div className="space-y-4 mb-20">
        {/* Seção Aplicativo - Simplificada com apenas botão de editar nome */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <h3 className="font-semibold mb-4">Aplicativo</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-white font-medium">Nome da Interface</span>
                <p className="text-blue-200 text-sm">{appName}</p>
              </div>
              <button 
                onClick={() => {
                  setTempAppName(appName)
                  setShowEditNameModal(true)
                }}
                className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center space-x-1 text-sm hover:bg-blue-400 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Editar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Seção de Download do App */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <h3 className="font-semibold mb-4 flex items-center">
            <Smartphone className="w-5 h-5 mr-2" />
            Baixar Aplicativo Móvel
          </h3>
          
          {/* Detecção automática do dispositivo */}
          <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-lg p-3 mb-4 border border-cyan-500/30">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-cyan-300 text-sm font-medium">
                {deviceType === 'ios' ? '📱 iPhone/iPad detectado' : 
                 deviceType === 'android' ? '🤖 Android detectado' : 
                 '💻 Acesse pelo celular para download automático'}
              </span>
            </div>
            <p className="text-blue-200 text-xs">
              {deviceType === 'desktop' 
                ? 'Abra este link no seu celular para baixar automaticamente'
                : 'Clique no botão abaixo para baixar a versão compatível'
              }
            </p>
          </div>

          {/* Botão de download automático */}
          <button 
            onClick={handleAutoDownload}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 px-4 rounded-xl font-semibold flex items-center justify-center mb-4 hover:from-green-400 hover:to-emerald-400 transition-all shadow-lg"
          >
            <Download className="w-6 h-6 mr-3" />
            <div className="text-left">
              <div className="text-base font-bold">
                {deviceType === 'ios' ? 'Baixar para iOS' : 
                 deviceType === 'android' ? 'Baixar para Android' : 
                 'Download Inteligente'}
              </div>
              <div className="text-xs text-green-100">
                {deviceType === 'ios' ? 'App Store - Compatível com seu iPhone' : 
                 deviceType === 'android' ? 'Google Play - Compatível com seu Android' : 
                 'Detecta seu dispositivo automaticamente'}
              </div>
            </div>
          </button>

          {/* Opções manuais */}
          <div className="space-y-2">
            <p className="text-blue-300 text-xs text-center mb-3">Ou escolha manualmente:</p>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Botão iOS */}
              <button 
                onClick={() => window.open('https://apps.apple.com/app/taxi-meter-pro', '_blank')}
                className="bg-gradient-to-r from-gray-700 to-gray-600 text-white py-3 px-3 rounded-lg font-medium flex items-center justify-center hover:from-gray-600 hover:to-gray-500 transition-all text-sm"
              >
                <Phone className="w-4 h-4 mr-2" />
                iOS
              </button>

              {/* Botão Android */}
              <button 
                onClick={() => window.open('https://play.google.com/store/apps/details?id=com.taximeter.pro', '_blank')}
                className="bg-gradient-to-r from-green-600 to-green-500 text-white py-3 px-3 rounded-lg font-medium flex items-center justify-center hover:from-green-500 hover:to-green-400 transition-all text-sm"
              >
                <Globe className="w-4 h-4 mr-2" />
                Android
              </button>
            </div>
          </div>

          {/* Informação adicional */}
          <div className="bg-blue-800/30 rounded-lg p-3 mt-4">
            <p className="text-blue-200 text-xs text-center">
              ✨ O app móvel oferece GPS melhorado, modo offline e sincronização automática
            </p>
          </div>
        </div>
      </div>

      {/* Modal para editar nome */}
      {showEditNameModal && renderEditNameModal()}

      {/* Navegação Inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-900/90 backdrop-blur-sm border-t border-blue-700">
        <div className="flex justify-around py-3">
          <button 
            className={`flex flex-col items-center ${currentView === 'meter' ? 'text-blue-300' : 'text-blue-400'}`}
            onClick={() => setCurrentView('meter')}
          >
            <Car className="w-6 h-6 mb-1" />
            <span className="text-xs">Passeios</span>
          </button>
          <button 
            className={`flex flex-col items-center ${currentView === 'history' ? 'text-blue-300' : 'text-blue-400'}`}
            onClick={() => setCurrentView('history')}
          >
            <History className="w-6 h-6 mb-1" />
            <span className="text-xs">Histórico</span>
          </button>
          <button 
            className={`flex flex-col items-center ${currentView === 'settings' ? 'text-blue-300' : 'text-blue-400'}`}
            onClick={() => setCurrentView('settings')}
          >
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-xs">Configurações</span>
          </button>
        </div>
      </div>
    </div>
  )

  const renderEditTariffsView = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-blue-700">
        <button 
          onClick={() => setCurrentView('settings')}
          className="mr-4"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg font-semibold">Editar Tarifas</h1>
      </div>

      {/* Formulário */}
      <div className="flex-1 p-4">
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <label className="block text-blue-200 text-sm mb-2">Bandeirada inicial (€)</label>
            <input 
              type="number" 
              step="0.10"
              value={tariffSettings.initialFare}
              onChange={(e) => setTariffSettings(prev => ({...prev, initialFare: parseFloat(e.target.value) || 0}))}
              className="w-full bg-blue-800 text-white p-3 rounded-lg border border-blue-600 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <label className="block text-blue-200 text-sm mb-2">Por quilômetro (€)</label>
            <input 
              type="number" 
              step="0.10"
              value={tariffSettings.perKmRate}
              onChange={(e) => setTariffSettings(prev => ({...prev, perKmRate: parseFloat(e.target.value) || 0}))}
              className="w-full bg-blue-800 text-white p-3 rounded-lg border border-blue-600 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <label className="block text-blue-200 text-sm mb-2">Por minuto (€)</label>
            <input 
              type="number" 
              step="0.10"
              value={tariffSettings.perMinuteRate}
              onChange={(e) => setTariffSettings(prev => ({...prev, perMinuteRate: parseFloat(e.target.value) || 0}))}
              className="w-full bg-blue-800 text-white p-3 rounded-lg border border-blue-600 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <label className="block text-blue-200 text-sm mb-2">Taxa noturna (multiplicador)</label>
            <input 
              type="number" 
              step="0.10"
              value={tariffSettings.nightSurcharge}
              onChange={(e) => setTariffSettings(prev => ({...prev, nightSurcharge: parseFloat(e.target.value) || 0}))}
              className="w-full bg-blue-800 text-white p-3 rounded-lg border border-blue-600 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <button 
            onClick={() => setCurrentView('settings')}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  )

  // Se o mapa deve ser mostrado
  if (showMap) {
    return renderMapView()
  }

  // Renderização condicional baseada na view atual
  switch (currentView) {
    case 'tariffs':
      return renderTariffsView()
    case 'editTariffs':
      return renderEditTariffsView()
    case 'history':
      return renderHistoryView()
    case 'settings':
      return renderSettingsView()
    default:
      return (
        <>
          {renderMeterView()}
          {/* Modais */}
          {showPaymentModal && renderPaymentModal()}
          {showCustomTipModal && renderCustomTipModal()}
        </>
      )
  }
}