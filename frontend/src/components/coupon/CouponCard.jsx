import { useEffect, useState } from 'react';
import { Ticket, Loader2, CheckCircle2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { redeemCoupon, getMyCoupons } from '@/lib/api';

/**
 * Cartão de resgate de cupom promocional.
 * Ex: EXPOCEEP — libera 1 avaliação gratuita, válido somente até 12/10/2026.
 */
export default function CouponCard() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [status, setStatus] = useState({ redemptions: [], bonus_analyses: 0 });

  async function loadStatus() {
    try {
      const data = await getMyCoupons();
      setStatus(data);
    } catch {
      // Silencioso: seção de cupom não pode quebrar a página
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => { loadStatus(); }, []);

  const hasBonus = (status.bonus_analyses || 0) > 0;

  async function handleRedeem(e) {
    e?.preventDefault?.();
    const normalized = (code || '').trim().toUpperCase();
    if (!normalized || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await redeemCoupon(normalized);
      setSuccess(res.message || `Cupom ${res.code} aplicado! Você ganhou ${res.granted_analyses} avaliação gratuita.`);
      setCode('');
      await loadStatus();
      try { window.dispatchEvent(new CustomEvent('coupon:redeemed', { detail: res })); } catch {}
    } catch (err) {
      setError(err?.message || 'Não foi possível resgatar o cupom.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="apple-card apple-material-gold overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-brand-accent" />
          </div>
          <div>
            <CardTitle className="text-[15px] font-semibold" style={{ letterSpacing: '-0.022em' }}>
              Cupom Promocional
            </CardTitle>
            <CardDescription className="text-[13px]" style={{ letterSpacing: '-0.011em' }}>
              Tem um cupom? Resgate e ganhe avaliações gratuitas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {fetching ? (
          <div className="flex items-center gap-2 text-[13px] text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Verificando seus cupons...
          </div>
        ) : hasBonus ? (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
            <PartyPopper className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[13px]">
              <p className="text-emerald-300 font-semibold">
                Você tem {status.bonus_analyses} {status.bonus_analyses === 1 ? 'avaliação gratuita' : 'avaliações gratuitas'} de cupom!
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {status.redemptions.map((r) => (
                  <Badge key={r.code} className="apple-badge bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
                    {r.code} • +{r.granted_analyses}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[13px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" /> {error}
          </div>
        )}

        {!hasBonus && !success && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Digite seu cupom (ex: EXPOCEEP)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRedeem(); } }}
              maxLength={32}
              className="h-11 rounded-xl apple-focus uppercase"
              autoComplete="off"
            />
            <Button
              type="button"
              onClick={handleRedeem}
              disabled={loading || !code.trim()}
              className="h-11 px-6 rounded-xl bg-brand-accent text-background font-semibold apple-button apple-focus gap-2 shrink-0"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resgatando...</> : <><Ticket className="w-4 h-4" /> Resgatar</>}
            </Button>
          </div>
        )}

        <p className="text-[11px] text-text-muted">
          O cupom <span className="font-semibold text-text-secondary">EXPOCEEP</span> libera 1 avaliação gratuita e vale somente até segunda-feira, 12/10. Um resgate por conta.
        </p>
      </CardContent>
    </Card>
  );
}
