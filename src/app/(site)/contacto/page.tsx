import type { Metadata } from 'next'
import { Mail, Instagram, X } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contacto — cinenacional.com',
  description: 'Contactá a cinenacional.com para consultas, correcciones o sugerencias sobre el cine argentino.',
  alternates: { canonical: 'https://cinenacional.com/contacto' },
}

export default function ContactoPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-8 md:py-16">
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        Contacto
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground/80 md:text-[15px]">
        Si encontraste información incorrecta, querés sugerir una corrección o tenés alguna
        consulta sobre <strong>cinenacional.com</strong>, podés contactarnos por los siguientes medios:
      </p>

      <div className="mt-8 flex flex-col gap-5">
        <a
          href="mailto:info@cinenacional.com"
          className="flex items-center gap-4 rounded-sm border border-border/20 px-5 py-4 transition-colors hover:border-accent/30 hover:bg-muted/10"
        >
          <Mail className="h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-[14px] font-medium text-foreground/90">Email</p>
            <p className="text-[13px] text-muted-foreground/60">info@cinenacional.com</p>
          </div>
        </a>

        <a
          href="https://x.com/cinenacional"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-sm border border-border/20 px-5 py-4 transition-colors hover:border-accent/30 hover:bg-muted/10"
        >
          <X className="h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-[14px] font-medium text-foreground/90">X (Twitter)</p>
            <p className="text-[13px] text-muted-foreground/60">@cinenacional</p>
          </div>
        </a>

        <a
          href="https://instagram.com/cinenacional"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-sm border border-border/20 px-5 py-4 transition-colors hover:border-accent/30 hover:bg-muted/10"
        >
          <Instagram className="h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-[14px] font-medium text-foreground/90">Instagram</p>
            <p className="text-[13px] text-muted-foreground/60">@cinenacional</p>
          </div>
        </a>
      </div>
    </div>
  )
}
