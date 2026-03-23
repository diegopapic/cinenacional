// src/app/listados/obituarios/page.tsx — Redirect to current year
import { redirect } from 'next/navigation'

export default function ObituariosPage() {
  const currentYear = new Date().getFullYear()
  redirect(`/listados/obituarios/${currentYear}`)
}
