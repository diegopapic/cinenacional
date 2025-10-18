// src/app/efemerides/[[...date]]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Sparkles } from 'lucide-react';
import { Efemeride } from '@/types/home.types';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export default function EfemeridesPage() {
  const router = useRouter();
  const params = useParams();
  
  // Parsear fecha desde URL o usar hoy
  const parseDateFromParams = () => {
    if (params.date && Array.isArray(params.date) && params.date.length > 0) {
      const dateStr = params.date[0]; // "10-18"
      const [month, day] = dateStr.split('-').map(Number);
      
      // Validar
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { month, day };
      }
    }
    
    // Default: hoy
    const today = new Date();
    return {
      month: today.getMonth() + 1,
      day: today.getDate()
    };
  };

  const initialDate = parseDateFromParams();
  
  const [selectedDate, setSelectedDate] = useState<Date>(
    new Date(new Date().getFullYear(), initialDate.month - 1, initialDate.day)
  );
  const [tempMonth, setTempMonth] = useState<number>(initialDate.month);
  const [tempDay, setTempDay] = useState<number>(initialDate.day);
  const [efemerides, setEfemerides] = useState<Efemeride[]>([]);
  const [loading, setLoading] = useState(true);

  const month = selectedDate.getMonth() + 1;
  const day = selectedDate.getDate();

  // Fetch inicial y cuando cambia la URL
  useEffect(() => {
    const dateFromUrl = parseDateFromParams();
    fetchEfemerides(dateFromUrl.month, dateFromUrl.day);
  }, [params.date]);

  const fetchEfemerides = async (mes: number, dia: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/efemerides?month=${mes}&day=${dia}`);
      if (!response.ok) throw new Error('Error fetching data');
      const result = await response.json();
      setEfemerides(result.efemerides || []);
    } catch (error) {
      console.error('Error fetching efemérides:', error);
      setEfemerides([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    setTempMonth(newMonth);
    
    const maxDay = new Date(selectedDate.getFullYear(), newMonth, 0).getDate();
    if (tempDay > maxDay) {
      setTempDay(maxDay);
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDay = parseInt(e.target.value);
    setTempDay(newDay);
  };

  const handleSearch = () => {
    const newDate = new Date(selectedDate.getFullYear(), tempMonth - 1, tempDay);
    setSelectedDate(newDate);
    
    // Formatear fecha para URL: MM-DD (con padding de ceros)
    const monthStr = String(tempMonth).padStart(2, '0');
    const dayStr = String(tempDay).padStart(2, '0');
    
    // Navegar a la nueva URL
    router.push(`/efemerides/${monthStr}-${dayStr}`);
  };

  const handleToday = () => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    
    setSelectedDate(today);
    setTempMonth(todayMonth);
    setTempDay(todayDay);
    
    // Navegar a /efemerides (sin parámetros = hoy)
    router.push('/efemerides');
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInCurrentMonth = getDaysInMonth(tempMonth, selectedDate.getFullYear());
  const dayOptions = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);

  // Ordenar efemérides por años (más antiguo primero = más años)
  const efemeridesOrdenadas = [...efemerides].sort((a, b) => {
    const añosA = parseInt(a.hace.match(/\d+/)?.[0] || '0');
    const añosB = parseInt(b.hace.match(/\d+/)?.[0] || '0');
    return añosB - añosA; // Más años primero (más antiguo)
  });

  const hasEvents = efemerides.length > 0;

  const renderEfemeridesCard = (efemeride: Efemeride) => {
    const isPelicula = efemeride.tipo === 'pelicula';
    const imageUrl = isPelicula ? efemeride.posterUrl : efemeride.photoUrl;
    const linkHref = isPelicula ? `/pelicula/${efemeride.slug}` : `/persona/${efemeride.slug}`;
    
    // Determinar el verbo según el tipo de evento
    let verbo = '';
    if (efemeride.tipoEvento === 'estreno') verbo = 'se estrenaba';
    else if (efemeride.tipoEvento === 'inicio_rodaje') verbo = 'empezaba el rodaje de';
    else if (efemeride.tipoEvento === 'fin_rodaje') verbo = 'terminaba el rodaje de';
    else if (efemeride.tipoEvento === 'nacimiento') verbo = 'nacía';
    else if (efemeride.tipoEvento === 'muerte') verbo = 'moría';

    // Extraer el año del evento
    const fechaObj = typeof efemeride.fecha === 'string' 
      ? new Date(efemeride.fecha) 
      : efemeride.fecha;
    const añoEvento = fechaObj.getFullYear();

    return (
      <div
        key={efemeride.id}
        className="flex gap-6 p-6 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-all"
      >
        {/* Imagen */}
        <Link href={linkHref} className="flex-shrink-0 group">
          <div className={`relative ${isPelicula ? 'w-32 h-48 rounded-lg' : 'w-32 h-32 rounded-full'} bg-gray-800 overflow-hidden`}>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={efemeride.titulo || 'Imagen'}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="128px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar className="w-12 h-12 text-gray-600" />
              </div>
            )}
          </div>
        </Link>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          {/* ... de YYYY verbo */}
          <p className="text-gray-400 text-sm mb-2">
            ... de {añoEvento} {verbo}
          </p>

          {/* Título/Nombre */}
          <Link href={linkHref}>
            <h3 className="text-white text-xl font-semibold hover:text-blue-400 transition-colors mb-1">
              {efemeride.titulo}
            </h3>
          </Link>

          {/* Director (solo para películas) */}
          {isPelicula && efemeride.director && efemeride.directorSlug && (
            <Link 
              href={`/personas/${efemeride.directorSlug}`}
              className="text-gray-400 text-sm hover:text-gray-300 transition-colors"
            >
              de {efemeride.director}
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-6">
            {/* Título */}
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Efemérides del {day} de {MONTHS[month - 1]}
              </h1>
            </div>

            {/* Selector de fecha */}
            <div className="flex flex-wrap gap-3 items-end">
              {/* Día */}
              <div className="flex-shrink-0 w-20">
                <label className="block text-xs text-gray-400 mb-1.5">Día</label>
                <select
                  value={tempDay}
                  onChange={handleDayChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {dayOptions.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mes */}
              <div className="flex-grow min-w-[140px] max-w-[200px]">
                <label className="block text-xs text-gray-400 mb-1.5">Mes</label>
                <select
                  value={tempMonth}
                  onChange={handleMonthChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {MONTHS.map((monthName, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {monthName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Buscar
                </button>

                <button
                  onClick={handleToday}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all flex items-center gap-2"
                  title="Volver a la fecha de hoy"
                >
                  <Sparkles className="w-4 h-4" />
                  Hoy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de efemérides */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Encabezado "Un X de X..." */}
        {!loading && hasEvents && (
          <h2 className="text-2xl font-bold text-white mb-8">
            Un {day} de {MONTHS[month - 1]}...
          </h2>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-6 p-6 bg-gray-900/50 rounded-lg border border-gray-800 animate-pulse">
                <div className="w-32 h-48 bg-gray-800 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-800 rounded w-1/4" />
                  <div className="h-6 bg-gray-800 rounded w-3/4" />
                  <div className="h-4 bg-gray-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasEvents ? (
          <div className="text-center py-16">
            <div className="text-gray-400 text-lg mb-2">
              No hay efemérides registradas para esta fecha
            </div>
            <p className="text-gray-500 text-sm">
              Probá con otra fecha o volvé a hoy para ver si hay efemérides
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {efemeridesOrdenadas.map(efemeride => renderEfemeridesCard(efemeride))}
          </div>
        )}
      </div>
    </div>
  );
}