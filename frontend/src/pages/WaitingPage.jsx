import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function WaitingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, checked, error
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Get email from search params if provided
    const emailFromParams = searchParams.get('email');
    if (emailFromParams) {
      setEmail(emailFromParams);
    }

    const supabase = createClient();

    // Check if the user's email is confirmed
    const checkVerification = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          setStatus('error');
          return;
        }
        if (user?.email_confirmed_at) {
          setStatus('checked');
          navigate('/login');
          return;
        }
        // User not confirmed yet, keep loading
        setStatus('loading');
      } catch (err) {
        setStatus('error');
      }
    };

    checkVerification();

    // Set up listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'USER_CREATED' || event === 'SIGNED_IN') {
          // Check user metadata for email confirmation
          if (session?.user?.email_confirmed_at) {
            setStatus('checked');
            navigate('/login');
          } else {
            setStatus('loading');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

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
                  to="/forgot-password"
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
              <Loader2 className="w-12 h-12 text-brand-accent animate-spin" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                  Aguardando confirmação
                </h1>
                <p className="text-sm text-text-secondary mt-2">
                  Enviamos um e-mail de confirmação para {email || 'seu e-mail'}. 
                  Por favor, verifique sua caixa de entrada.
                </p>
              </div>
              {email && (
                <p className="text-xs text-text-secondary">
                  Não recebeu o e-mail? <Link to="/forgot-password" className="text-brand-accent">
                    Solicitar novo link
                  </Link>
                </p>
              )}
              <Button
                disabled={true}
                className="w-full h-11 bg-brand-accent/20 text-brand-accent/50 font-semibold rounded-xl mt-4"
              >
                Enviando...
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}