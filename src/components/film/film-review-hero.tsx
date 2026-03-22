import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface FilmReviewHeroProps {
  title: string
  year: number
  posterSrc: string
  heroSrc: string
  director: string
  directorHref: string
  filmHref: string
}

export function FilmReviewHero({
  title,
  year,
  posterSrc,
  heroSrc,
  director,
  directorHref,
  filmHref,
}: FilmReviewHeroProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Background image */}
      <Image
        src={heroSrc}
        alt=""
        fill
        className="object-cover object-center"
        priority
        sizes="100vw"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/95 to-background/70" />
      <div className="absolute inset-0 bg-linear-to-r from-background/90 via-background/70 to-transparent" />

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 py-6 md:py-10 lg:px-6 lg:py-12">
        {/* Back link */}
        <Link
          href={filmHref}
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground/50 transition-colors hover:text-accent md:mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a la película
        </Link>

        {/* Poster + info row */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Poster */}
          <Link href={filmHref} className="group shrink-0">
            <div className="relative aspect-2/3 w-20 overflow-hidden shadow-xl shadow-black/40 transition-transform duration-300 group-hover:scale-[1.02] md:w-28 lg:w-32">
              <Image
                src={posterSrc}
                alt={`Afiche de ${title}`}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 80px, (max-width: 1024px) 112px, 128px"
              />
            </div>
          </Link>

          {/* Film info */}
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">
              Crítica de
            </p>
            <h2 className="font-serif text-xl leading-tight tracking-tight text-foreground md:text-2xl lg:text-3xl">
              <Link
                href={filmHref}
                className="transition-colors hover:text-accent"
              >
                {title}
              </Link>
              <span className="ml-2 text-muted-foreground/50">({year})</span>
            </h2>
            <p className="text-[13px] text-muted-foreground/60 md:text-sm">
              Dir.{" "}
              <Link
                href={directorHref}
                className="text-foreground/70 transition-colors hover:text-accent"
              >
                {director}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
