import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, CheckCircle2, XCircle } from 'lucide-react';

export default function WaitingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, checked, error
  const [email, setEmail] = useState('');

  const attempted = useRef(false);

  useEffect(() => {
    // Get email from search params if provided
    const emailFromParams = searchParams.get('email');
    if (emailFromParams) {
      setEmail(emailFromParams);
    }

    const supabase = createClient();
    let cancelled = false;

    const afterCheck = (user) => {
      if (cancelled) return;
      if (user?.email_confirmed_at) {
        setStatus('checked');
        navigate('/login');
      } else {
        setStatus('loading');
      }
    };

    const init = async () => {
      // If the confirmation e-mail pointed to our domain with token_hash + type
      // (recommended setup to avoid e-mail scanners consuming the one-time
      // token), verify it here. Otherwise the session may already be present
      // via the URL hash (redirect_to flow).
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      if (tokenHash && type && !attempted.current) {
        attempted.current = true;
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          setStatus('error');
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      afterCheck(user);
    };

    init();

    // Set up listener for auth state changes (covers redirect_to hash flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'USER_CREATED' || event === 'SIGNED_IN') {
          afterCheck(session?.user);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate, searchParams]);

  if (status === 'checked') {
    return null; // Already redirected
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm">
          <Card className="overflow-hidden bg-card-bg border-border">
            <CardContent className="p-5 sm:p-8">
              <div className="flex flex-col items-center text-center gap-4">
                <XCircle className="w-14 h-14 text-red-400" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                    Erro ao verificar e-mail
                  </h1>
                  <p className="text-sm text-text-secondary mt-2">
                    Tente solicitar o link novamente.
                  </p>
                </div>
                <Link
                  to="/signup"
                  className="underline underline-offset-4 text-brand-accent hover:text-brand-accent/80 text-sm"
                >
                  Solicitar novo link
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state - shown initially or while checking
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden bg-card-bg border-border">
          <CardContent className="p-5 sm:p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <Mail className="w-12 h-12 text-brand-accent" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                  Aguardando confirmação
                </h1>
                <p className="text-sm text-text-secondary mt-2">
                  Enviamos um e-mail de confirmação para {email || 'seu e-mail'}. 
                  Por favor, verifique sua caixa de entrada e a pasta de spam.
                </p>
              </div>
              {email && (
                <p className="text-xs text-text-secondary">
                  Não recebeu o e-mail? <Link to="/signup" className="text-brand-accent">
                    Solicitar novo link
                  </Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}