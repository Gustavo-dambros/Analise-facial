import { Seo } from '@/lib/seo'
export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Seo title="Política de Privacidade" description="Como tratamos seus dados pessoais e biométricos no FaceMax, conforme a LGPD." canonical="/privacidade" />
      <h1 className="text-2xl font-bold text-text-primary">Política de Privacidade — v1.0 (03/09/2026)</h1>
      <div className="mt-6 space-y-4 text-sm text-text-secondary leading-relaxed">
        <p>Controladora: FaceMax — DPO: dpo@facemax.pro — Suporte: suporte@facemax.pro</p>
        <h2 className="font-semibold text-text-primary">1. Dados e finalidade</h2>
        <p>Nome, e-mail, idade, gênero, objetivo e fotos faciais/corporais para avaliação estética por profissional. Fotos são dado sensível (Art. 11) e só tratadas com seu consentimento específico no envio.</p>
        <h2 className="font-semibold text-text-primary">2. Base legal</h2>
        <p>Consentimento (Art. 7, I e Art. 11). Tratamento 100% humano, sem IA. Sem transferência internacional.</p>
        <h2 className="font-semibold text-text-primary">3. Retenção</h2>
        <p>Fotos em bucket privado (URL assinada) até 30 dias após laudo ou até exclusão da conta. Demais dados enquanto a conta existir.</p>
        <h2 className="font-semibold text-text-primary">4. Seus direitos (Art. 18)</h2>
        <p>Acesse, corrija ou elimine via /dashboard/profile — Exportar e Apagar conta removem Storage, pagamentos e análises. Revogue o consentimento a qualquer momento.</p>
        <h2 className="font-semibold text-text-primary">5. Cookies</h2>
        <p>Usamos apenas essenciais (Supabase Auth). Veja o banner de cookies para aceitar/recusar.</p>
      </div>
    </div>
  )
}
