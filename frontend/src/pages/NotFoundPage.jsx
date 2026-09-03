import { Link } from 'react-router-dom'
import { Seo } from '@/lib/seo'
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <Seo title="Página não encontrada" noindex canonical="/404" />
      <h1 className="text-6xl font-bold text-brand-accent">404</h1>
      <p className="text-text-secondary mt-2">Página não encontrada.</p>
      <Link to="/" className="mt-6 px-6 py-3 rounded-xl bg-brand-accent text-background font-semibold">Voltar à Home</Link>
    </div>
  )
}
