import { useState, useEffect } from 'react'
export default function CookieBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const v = localStorage.getItem('cookie_consent')
    if (!v) setShow(true)
  }, [])
  if (!show) return null
  const accept = () => { localStorage.setItem('cookie_consent', 'accepted'); setShow(false) }
  const reject = () => { localStorage.setItem('cookie_consent', 'rejected'); setShow(false) }
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-3xl mx-auto rounded-2xl bg-card-bg border border-border p-4 flex flex-col sm:flex-row items-center gap-3">
        <p className="text-xs text-text-secondary flex-1">Usamos cookies essenciais (Supabase Auth) e, se aceito, analytics. Veja nossa <a href="/privacidade" className="underline text-brand-accent">Política</a>.</p>
        <div className="flex gap-2 shrink-0">
          <button onClick={reject} className="h-9 px-4 rounded-full border border-border text-xs">Recusar</button>
          <button onClick={accept} className="h-9 px-4 rounded-full bg-brand-accent text-background text-xs font-semibold">Aceitar</button>
        </div>
      </div>
    </div>
  )
}
