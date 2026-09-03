import { Seo, jsonLdFAQ } from '@/lib/seo'
const faqs = [
  { q: 'Como funciona a análise?', a: 'Envie 3 fotos (frontal, perfil esquerdo e direito). Nossa IA + especialista avalia terços, simetria e visagismo.' },
  { q: 'Meus dados são seguros?', a: 'Sim — fotos criptografadas, bucket privado, acesso só com seu login.' },
  { q: 'Quanto custa?', a: 'Plano Free gratuito, Pro a partir de R$ 29,90.' },
]
export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Seo title="FAQ" description="Dúvidas frequentes sobre FaceMax — análise facial, privacidade e planos." canonical="/faq" jsonLd={jsonLdFAQ(faqs)} />
      <h1 className="text-3xl font-bold text-text-primary">FAQ</h1>
      <div className="mt-8 space-y-6">
        {faqs.map(f => (
          <div key={f.q} className="border border-border rounded-xl p-4 bg-card-bg">
            <h2 className="font-semibold text-text-primary">{f.q}</h2>
            <p className="text-text-secondary text-sm mt-2">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
