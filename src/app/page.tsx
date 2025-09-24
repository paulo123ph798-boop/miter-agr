'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, Settings, History, Car, MapPin, Clock, DollarSign, Plus, ArrowLeft, Plane, Edit, Trash2, X, CreditCard, Percent } from 'lucide-react'
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
  const [showAirportInfo, setShowAirportInfo] = useState(false)
  
  // Estados para pagamento e gorjetas
  const [selectedTipPercentage, setSelectedTipPercentage] = useState(0)
  const [customTipPercentages, setCustomTipPercentages] = useState([0, 10, 15, 20])
  const [tempCustomTips, setTempCustomTips] = useState([0, 10, 15, 20])
  const [finalFare, setFinalFare] = useState(0)
  const [tipAmount, setTipAmount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  
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
    setShowAirportInfo(true)
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
    setShowAirportInfo(false)
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
        total: totalAmount.toFixed(2)
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

  // Modal de pagamento
  const renderPaymentModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-blue-900 rounded-2xl p-6 w-full max-w-md border border-blue-700 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <CreditCard className="w-12 h-12 text-blue-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Pagamento da Corrida</h3>
          <div className="text-3xl font-bold text-blue-300 mb-2">€ {finalFare.toFixed(2)}</div>
          <p className="text-blue-200 text-sm">Valor total da viagem</p>
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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white">
      {/* Header do Mapa com informações do aeroporto */}
      <div className="flex items-center justify-between p-4 border-b border-blue-700">
        <button 
          onClick={() => setShowMap(false)}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
          <span>Voltar</span>
        </button>
        <h1 className="text-lg font-semibold">Corrida em Andamento</h1>
        <div className="w-6"></div>
      </div>

      {/* Banner do Aeroporto - Aparece quando a corrida inicia */}
      {showAirportInfo && (
        <div className="p-4 bg-gradient-to-r from-blue-600 to-cyan-500 border-b border-blue-700">
          <div className="flex items-center justify-center space-x-3">
            <div className="bg-white/20 rounded-full p-3">
              <Plane className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">Aeroporto Humberto Delgado</h2>
              <p className="text-blue-100 text-sm">Serviço Oficial de Táxi • Corrida Iniciada</p>
            </div>
          </div>
        </div>
      )}

      {/* Informações da Corrida */}
      <div className="p-4 bg-blue-800/50">
        <div className="flex justify-between items-center mb-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-300">€ {fare.toFixed(2)}</div>
            <div className="text-blue-200 text-sm">Valor</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{formatTime(time)}</div>
            <div className="text-blue-200 text-sm">Tempo</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{distance.toFixed(2)} km</div>
            <div className="text-blue-200 text-sm">Distância</div>
          </div>
        </div>
        
        {/* Status */}
        <div className="text-center">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            isPaused ? 'bg-yellow-900 text-yellow-400' : 'bg-green-900 text-green-400'
          }`}>
            {isPaused ? 'Pausado' : 'Em andamento'}
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 p-4">
        <div className="w-full h-full rounded-xl overflow-hidden">
          {userLocation && (
            <MapComponent 
              center={userLocation}
              routePoints={routePoints}
              zoom={15}
            />
          )}
        </div>
      </div>

      {/* Controles */}
      <div className="p-4 bg-blue-900/90 border-t border-blue-700">
        <div className="flex gap-3">
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
            Finalizar
          </button>
        </div>
      </div>
    </div>
  )

  const renderMeterView = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white p-4">
      {/* Logo e Parceria com Aeroporto */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center space-x-3">
            <div className="bg-blue-500 rounded-full p-2">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Aeroporto Humberto Delgado</h1>
              <p className="text-blue-200 text-sm">Serviço Oficial de Táxi</p>
            </div>
          </div>
        </div>
        
        {/* Banner de Parceria */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Plane className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-medium">Tarifa Especial Aeroporto</span>
            </div>
            <span className="text-white text-xs bg-white/20 px-2 py-1 rounded-full">-15%</span>
          </div>
        </div>
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
          <button
            onClick={startMeter}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 rounded-2xl font-semibold text-lg flex items-center justify-center mb-4 shadow-lg hover:shadow-xl transition-all"
          >
            <Play className="w-6 h-6 mr-2" />
            Iniciar Taxímetro
          </button>
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
          className="w-full bg-white/10 backdrop-blur-sm text-white py-3 rounded-xl font-semibold mb-2 border border-white/20"
        >
          Gerir Tarifas Personalizadas
        </button>

        <button className="w-full bg-white/10 backdrop-blur-sm text-white py-3 rounded-xl font-semibold flex items-center justify-center border border-white/20">
          <Plus className="w-5 h-5 mr-2" />
          Adicionar parada
        </button>
      </div>

      {/* Informações */}
      <div className="w-full max-w-md text-center text-blue-200 text-sm mb-8">
        <p>Use este taxímetro para calcular o valor das suas corridas de forma precisa e profissional.</p>
      </div>

      {/* Navegação Inferior - SEM FROTA */}
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

      {/* Navegação Inferior - SEM FROTA */}
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
              <div className="text-sm text-blue-200">
                <p>Tempo: {ride.duration} • Distância: {ride.distance} km</p>
                <p>Corrida: € {ride.fare} • Total: € {ride.total}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de confirmação */}
      {showDeleteModal && renderDeleteModal()}

      {/* Navegação Inferior - SEM FROTA */}
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
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Tarifas</h3>
            <button 
              onClick={() => setCurrentView('editTariffs')}
              className="bg-blue-500 text-white px-3 py-1 rounded-lg flex items-center space-x-1 text-sm"
            >
              <Edit className="w-4 h-4" />
              <span>Editar</span>
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-blue-200">Bandeirada inicial</span>
              <span>€ {tariffSettings.initialFare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-200">Por quilômetro</span>
              <span>€ {tariffSettings.perKmRate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-200">Por minuto</span>
              <span>€ {tariffSettings.perMinuteRate.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <h3 className="font-semibold mb-4">Aplicativo</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-blue-200">Modo escuro</span>
              <div className="w-12 h-6 bg-blue-400 rounded-full"></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-200">Som</span>
              <div className="w-12 h-6 bg-blue-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação Inferior - SEM FROTA */}
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