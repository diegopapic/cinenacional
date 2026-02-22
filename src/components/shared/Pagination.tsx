'use client';

import { buildPageNumbers } from '@/lib/shared/listUtils';

// Re-export para mantener compatibilidad con importaciones existentes
export { buildPageNumbers };

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  return (
    <nav className={`mt-10 flex items-center justify-center gap-1 ${className}`}>
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/40 transition-colors hover:text-accent disabled:opacity-30"
      >
        &#8249;
      </button>

      {/* Números de página */}
      {pageNumbers.map((item, i) =>
        item === '...' ? (
          <span
            key={`ellipsis-${i}`}
            className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/30"
          >
            ...
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item as number)}
            className={`flex h-8 w-8 items-center justify-center text-[12px] transition-colors ${
              item === currentPage
                ? 'border border-accent/40 text-accent'
                : 'text-muted-foreground/40 hover:text-accent'
            }`}
          >
            {item}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/40 transition-colors hover:text-accent disabled:opacity-30"
      >
        &#8250;
      </button>
    </nav>
  );
}
