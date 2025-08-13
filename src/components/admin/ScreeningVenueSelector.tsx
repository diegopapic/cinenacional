// src/components/admin/ScreeningVenueSelector.tsx - VERSIÓN SIMPLIFICADA
'use client'

import { useState, useEffect } from 'react'
import { X, Search, Building, Globe, Tv, Film } from 'lucide-react'

interface ScreeningVenue {
    id: number
    name: string
    type: string
    city?: string
    isActive: boolean
}

interface ScreeningVenueSelectorProps {
    selectedVenueIds: number[]  // Solo IDs
    onChange: (venueIds: number[]) => void
    releaseDate?: string  // Fecha de estreno de la película
}

const venueTypeIcons = {
    CINEMA: Building,
    STREAMING: Globe,
    TV_CHANNEL: Tv,
    OTHER: Film
}

const venueTypeLabels = {
    CINEMA: 'Cine',
    STREAMING: 'Streaming',
    TV_CHANNEL: 'Canal de TV',
    OTHER: 'Otro'
}

export default function ScreeningVenueSelector({
    selectedVenueIds,
    onChange,
    releaseDate
}: ScreeningVenueSelectorProps) {
    const [venues, setVenues] = useState<ScreeningVenue[]>([])
    const [filteredVenues, setFilteredVenues] = useState<ScreeningVenue[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [loading, setLoading] = useState(false)

    // Cargar todas las pantallas activas
    useEffect(() => {
        fetchVenues()
    }, [])

    const fetchVenues = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/screening-venues?isActive=true&limit=100')
            const data = await response.json()
            setVenues(data.venues || [])
            setFilteredVenues(data.venues || [])
        } catch (error) {
            console.error('Error loading screening venues:', error)
            setVenues([])
            setFilteredVenues([])
        } finally {
            setLoading(false)
        }
    }

    // Filtrar pantallas según búsqueda
    useEffect(() => {
        if (searchTerm) {
            const filtered = venues.filter(venue =>
                venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                venueTypeLabels[venue.type as keyof typeof venueTypeLabels]?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            setFilteredVenues(filtered)
        } else {
            setFilteredVenues(venues)
        }
    }, [searchTerm, venues])

    // Agregar pantalla
    const addVenue = (venueId: number) => {
        if (!selectedVenueIds.includes(venueId)) {
            onChange([...selectedVenueIds, venueId])
        }
        setSearchTerm('')
        setShowDropdown(false)
    }

    // Eliminar pantalla
    const removeVenue = (venueId: number) => {
        onChange(selectedVenueIds.filter(id => id !== venueId))
    }

    // Obtener venue por ID
    const getVenueById = (id: number) => venues.find(v => v.id === id)

    // Agrupar pantallas por tipo
    const groupedVenues = filteredVenues.reduce((groups, venue) => {
        const type = venue.type || 'OTHER'
        if (!groups[type]) groups[type] = []
        groups[type].push(venue)
        return groups
    }, {} as Record<string, ScreeningVenue[]>)

    return (
        <div className="space-y-3">
            {/* Pantallas seleccionadas */}
            {selectedVenueIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedVenueIds.map(venueId => {
                        const venue = getVenueById(venueId)
                        if (!venue) return null

                        const Icon = venueTypeIcons[venue.type as keyof typeof venueTypeIcons] || Film

                        return (
                            <span
                                key={venueId}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                            >
                                <Icon className="w-3 h-3" />
                                {venue.name}
                                {venue.city && (
                                    <span className="text-xs opacity-75">({venue.city})</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeVenue(venueId)}
                                    className="ml-1 hover:text-blue-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )
                    })}
                </div>
            )}

            {/* Buscador */}
            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar pantalla de estreno..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                </div>

                {/* Dropdown */}
                {showDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">Cargando...</div>
                        ) : Object.entries(groupedVenues).length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                {searchTerm ? 'No se encontraron pantallas' : 'No hay pantallas disponibles'}
                            </div>
                        ) : (
                            Object.entries(groupedVenues).map(([type, venuesInType]) => (
                                <div key={type}>
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                                        {venueTypeLabels[type as keyof typeof venueTypeLabels]}
                                    </div>
                                    {venuesInType.map((venue) => {
                                        const Icon = venueTypeIcons[venue.type as keyof typeof venueTypeIcons] || Film
                                        const isSelected = selectedVenueIds.includes(venue.id)

                                        return (
                                            <button
                                                key={venue.id}
                                                type="button"
                                                onClick={() => !isSelected && addVenue(venue.id)}
                                                disabled={isSelected}
                                                className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 ${isSelected ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-900">{venue.name}</span>
                                                {venue.city && (
                                                    <span className="text-xs text-gray-500">- {venue.city}</span>
                                                )}
                                                {isSelected && (
                                                    <span className="ml-auto text-xs text-gray-500">Ya agregada</span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Click fuera para cerrar */}
            {showDropdown && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowDropdown(false)}
                />
            )}
        </div>
    )
}