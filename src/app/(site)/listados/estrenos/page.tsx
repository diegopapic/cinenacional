import { redirect } from 'next/navigation'

export default function EstrenosPage() {
  redirect(`/listados/estrenos/${new Date().getFullYear()}`)
}
