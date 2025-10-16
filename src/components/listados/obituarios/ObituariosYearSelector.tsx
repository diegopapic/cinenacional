// src/components/listados/obituarios/ObituariosYearSelector.tsx
'use client';

import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ObituariosYearSelectorProps {
  availableYears: number[];
  selectedYear: number;
  onChange: (year: number) => void;
}

export default function ObituariosYearSelector({ 
  availableYears, 
  selectedYear, 
  onChange 
}: ObituariosYearSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
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
  
  // Cerrar dropdown al hacer clic fuera
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
  
  const handleSelect = (year: number) => {
    onChange(year);
    setIsOpen(false);
  };
  
  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors min-w-[140px] justify-between"
      >
        <span className="font-medium">{selectedYear}</span>
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
          {availableYears.map((year) => (
            <button
              key={year}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(year);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                year === selectedYear ? 'bg-gray-700 text-orange-400' : 'text-white'
              }`}
            >
              {year}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}