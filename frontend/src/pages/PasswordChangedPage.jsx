import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Mail, Loader2 } from 'lucide-react';

export default function PasswordChangedPage() {
  const { signOut, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      signOut();
    }
  }, [signOut, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden bg-card-bg border-border">
          <CardContent className="p-5 sm:p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Senha alterada com sucesso!</h1>
                <p className="text-sm text-text-secondary mt-2">
                  Enviamos um e-mail de confirmação. Acesse o link no e-mail para entrar.
                </p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full gap-2"
              >
                <Mail className="w-4 h-4" />
                Ir para Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}