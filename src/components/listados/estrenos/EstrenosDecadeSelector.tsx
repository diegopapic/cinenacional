// src/components/listados/estrenos/EstrenosDecadeSelector.tsx
'use client';

import { DecadePeriod } from '@/lib/estrenos/estrenosTypes';
import { generateDecades } from '@/lib/estrenos/estrenosUtils';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface EstrenosDecadeSelectorProps {
  value: DecadePeriod;
  onChange: (period: DecadePeriod) => void;
}

export default function EstrenosDecadeSelector({ value, onChange }: EstrenosDecadeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const decades = generateDecades();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);
  
  // ✅ Cerrar dropdown al hacer clic fuera - CORREGIDO
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      // Usar setTimeout para evitar que el evento se dispare inmediatamente
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  useEffect(() => {
    function handleScroll() {
      if (isOpen) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isOpen]);
  
  const getCurrentLabel = () => {
    if (value === 'all') return 'Todos';
    if (value === 'upcoming') return 'Próximos';
    
    const decade = decades.find(d => d.id === value);
    return decade ? decade.label : 'Seleccionar';
  };
  
  // ✅ Mejorado con logs y event handling
  const handleSelect = (period: DecadePeriod) => {
    console.log('🎯 Selecting period:', period);
    onChange(period);
    setIsOpen(false);
  };
  
  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors min-w-[140px] justify-between"
      >
        <span className="font-medium">{getCurrentLabel()}</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {mounted && isOpen && dropdownPosition.top > 0 && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed bg-gray-800 rounded-lg shadow-xl min-w-[140px] max-h-[400px] overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 9999
          }}
        >
          {/* All */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect('all');
            }}
            className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors first:rounded-t-lg ${
              value === 'all' ? 'bg-gray-700 text-orange-400' : 'text-white'
            }`}
          >
            Todos
          </button>
          
          {/* Upcoming */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect('upcoming');
            }}
            className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors ${
              value === 'upcoming' ? 'bg-gray-700 text-orange-400' : 'text-white'
            }`}
          >
            Próximos
          </button>
          
          <div className="border-t border-gray-700 my-1" />
          
          {/* Décadas */}
          {decades.map((decade) => (
            <button
              key={decade.id}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(decade.id);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors last:rounded-b-lg ${
                value === decade.id ? 'bg-gray-700 text-orange-400' : 'text-white'
              }`}
            >
              {decade.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}