import Link from "next/link"

interface FilmReviewContentProps {
  headline: string
  lead?: string
  author: string
  authorHref?: string
  publication: string
  publicationHref?: string
  date: string
  body: string
}

export function FilmReviewContent({
  headline,
  lead,
  author,
  authorHref,
  publication,
  publicationHref,
  date,
  body,
}: FilmReviewContentProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 md:py-12 lg:px-6 lg:py-16">
      {/* Header */}
      <header className="mb-8 border-b border-border/10 pb-8 md:mb-12 md:pb-12">
        <h1 className="font-serif text-2xl leading-tight tracking-tight text-foreground md:text-3xl lg:text-4xl">
          {headline}
        </h1>

        {lead && (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground/70 md:mt-6 md:text-lg">
            {lead}
          </p>
        )}

        {/* Byline */}
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground/60 md:mt-8">
          <span>
            Por{" "}
            {authorHref ? (
              <Link
                href={authorHref}
                className="text-foreground/70 transition-colors hover:text-accent"
              >
                {author}
              </Link>
            ) : (
              <span className="text-foreground/70">{author}</span>
            )}
          </span>
          <span className="text-muted-foreground/30" aria-hidden="true">
            |
          </span>
          <span>
            {publicationHref ? (
              <Link
                href={publicationHref}
                className="text-foreground/70 transition-colors hover:text-accent"
              >
                {publication}
              </Link>
            ) : (
              <span className="text-foreground/70">{publication}</span>
            )}
          </span>
          <span className="text-muted-foreground/30" aria-hidden="true">
            |
          </span>
          <time className="text-muted-foreground/50">{date}</time>
        </div>
      </header>

      {/* Body */}
      <div
        className="prose prose-invert max-w-none
          prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-muted-foreground/80 prose-p:mb-5
          md:prose-p:text-base md:prose-p:leading-[1.85] md:prose-p:mb-6
          prose-headings:font-serif prose-headings:text-foreground prose-headings:tracking-tight
          prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
          md:prose-h2:text-2xl md:prose-h2:mt-12 md:prose-h2:mb-5
          prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
          md:prose-h3:text-xl md:prose-h3:mt-10 md:prose-h3:mb-4
          prose-strong:text-foreground/90
          prose-em:text-foreground/70
          prose-a:text-accent prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </article>
  )
}
