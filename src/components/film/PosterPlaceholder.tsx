/**
 * Elegant placeholder for missing film posters.
 * Renders a subtle film-frame icon on a dark gradient background.
 * Accepts className to control sizing from the parent container.
 */
export function PosterPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-b from-border/20 via-background to-border/10 ${className ?? ""}`}
    >
      {/* Minimal film-frame icon */}
      <svg
        viewBox="0 0 40 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-[38%] w-[38%] opacity-[0.08]"
      >
        {/* Outer frame */}
        <rect
          x="1"
          y="1"
          width="38"
          height="50"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        {/* Sprocket holes left */}
        <rect x="3.5" y="5" width="3" height="4" rx="0.5" fill="currentColor" />
        <rect x="3.5" y="13" width="3" height="4" rx="0.5" fill="currentColor" />
        <rect x="3.5" y="21" width="3" height="4" rx="0.5" fill="currentColor" />
        <rect x="3.5" y="29" width="3" height="4" rx="0.5" fill="currentColor" />
        <rect x="3.5" y="37" width="3" height="4" rx="0.5" fill="currentColor" />
        <rect x="3.5" y="45" width="3" height="4" rx="0.5" fill="currentColor" />
        {/* Sprocket holes right */}
        <rect x="33.5" y="5" width="3" height="4" rx="0.5" fill="currentColor" />
        <rect x="33.5" y="13" width="3" height="4" rx="0.5" fill="currentColor" />
        <rect x="33.5" y="21" width="3" height="4" rx="0.5" fill="currentColor" />
        <rect x="33.5" y="29" width="3" height="4" rx="0.5" fill="currentColor" />
        <rect x="33.5" y="37" width="3" height="4" rx="0.5" fill="currentColor" />
        <rect x="33.5" y="45" width="3" height="4" rx="0.5" fill="currentColor" />
        {/* Inner frame (the "image" area) */}
        <rect
          x="9"
          y="5"
          width="22"
          height="42"
          rx="1"
          stroke="currentColor"
          strokeWidth="0.8"
        />
      </svg>
    </div>
  )
}
