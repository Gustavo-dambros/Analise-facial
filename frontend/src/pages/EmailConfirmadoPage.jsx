import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function EmailConfirmadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden bg-card-bg border-border">
          <CardContent className="p-5 sm:p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <CheckCircle2 className="w-14 h-14 text-green-400" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                  E-mail confirmado com sucesso!
                </h1>
                <p className="text-sm text-text-secondary mt-2">
                  Sua conta foi ativada. Agora você já pode acessar a plataforma.
                </p>
              </div>
              <Link to="/login" className="w-full">
                <Button className="w-full h-11 bg-brand-accent text-background font-semibold hover:opacity-90 rounded-xl">
                  Ir para o Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
