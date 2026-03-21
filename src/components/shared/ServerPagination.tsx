// src/components/shared/ServerPagination.tsx
// Link-based pagination for Server Components (no client JS needed).

import Link from 'next/link'
import { buildPageNumbers } from '@/lib/shared/listUtils'

interface ServerPaginationProps {
  currentPage: number
  totalPages: number
  /** Function that builds the href for a given page number */
  buildHref: (page: number) => string
  className?: string
}

export default function ServerPagination({
  currentPage,
  totalPages,
  buildHref,
  className = '',
}: ServerPaginationProps) {
  if (totalPages <= 1) return null

  const pageNumbers = buildPageNumbers(currentPage, totalPages)

  return (
    <nav className={`mt-10 flex items-center justify-center gap-1 ${className}`}>
      {/* Prev */}
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/40 transition-colors hover:text-accent"
        >
          &#8249;
        </Link>
      ) : (
        <span className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/40 opacity-30">
          &#8249;
        </span>
      )}

      {/* Page numbers */}
      {pageNumbers.map((item, i) =>
        item === '...' ? (
          <span
            key={`ellipsis-${i}`}
            className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/30"
          >
            ...
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item as number)}
            className={`flex h-8 w-8 items-center justify-center text-[12px] transition-colors ${
              item === currentPage
                ? 'border border-accent/40 text-accent'
                : 'text-muted-foreground/40 hover:text-accent'
            }`}
          >
            {item}
          </Link>
        )
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/40 transition-colors hover:text-accent"
        >
          &#8250;
        </Link>
      ) : (
        <span className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/40 opacity-30">
          &#8250;
        </span>
      )}
    </nav>
  )
}
