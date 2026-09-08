import { Seo } from '@/lib/seo'
export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Seo title="Termos de Uso" description="Regras de uso do FaceMax." canonical="/termos" />
      <h1 className="text-2xl font-bold text-text-primary">Termos de Uso — v1.0 (03/09/2026)</h1>
      <div className="mt-6 space-y-4 text-sm text-text-secondary leading-relaxed">
        <p>1. Serviço destinado a maiores de 18 anos, de cunho estético, sem substituir orientação médica.</p>
        <p>2. Fotos são armazenadas em bucket privado e excluídas pós-laudo, salvo consentimento para histórico.</p>
        <p>3. Você é responsável pela conta e por enviar fotos suas, com consentimento.</p>
        <p>4. Planos e cotas descritos em /checkout-simulation; pagamento via Mercado Pago.</p>
      </div>
    </div>
  )
}
