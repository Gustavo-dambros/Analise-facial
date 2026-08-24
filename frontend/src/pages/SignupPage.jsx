import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, X, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';

const GENDER_OPTIONS = ['Masculino', 'Feminino', 'Neutro'];
const STYLE_OPTIONS = [
  'Harmonia Facial',
  'Simetria e Proporcao',
  'Estilo Pessoal',
  'Pre-Procedure',
  'Autoconhecimento',
];

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [styleObjective, setStyleObjective] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsModalTab, setTermsModalTab] = useState('terms');
  const [showConsentError, setShowConsentError] = useState(false);

  useEffect(() => {
    if (error || successMessage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error, successMessage]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setShowConsentError(false);

    if (!acceptedTerms) {
      setShowConsentError(true);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData(e.target);
      const email = formData.get('email');
      const password = formData.get('password');
      const confirmPassword = formData.get('confirm-password');

      if (password !== confirmPassword) {
        setError('As senhas nao coincidem');
        setLoading(false);
        return;
      }

      const result = await signUp(email, password, fullName);

      if (result.success) {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
if (session?.user) {
            await supabase.from('profiles').upsert({
              id: session.user.id,
              full_name: fullName,
              gender: gender || '',
              age: age ? Number(age) : null,
              style_objective: styleObjective || '',
            });

            // Always go to waiting page to check email confirmation
            navigate('/waiting');
          } else {
            setSuccessMessage(result.message || 'Conta criada! Verifique seu email para ativar.');
          }
      } else {
        setError(result.error);
      }
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden bg-card-bg border-border">
          <CardContent className="p-5 sm:p-8">
            <form className="flex flex-col gap-4" onSubmit={handleSignup}>
              <div className="flex flex-col items-center text-center">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Criar conta</h1>
                <p className="text-sm text-text-secondary mt-1">Preencha os dados para comecar</p>
              </div>
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center flex flex-col items-center gap-3">
                  <Mail className="w-8 h-8" />
                  <div>
                    <p className="font-semibold text-green-300">{successMessage}</p>
                    <p className="text-green-400/70 text-xs mt-1">
                      Verifique sua caixa de entrada e a pasta de spam. O link de confirmacao expira em 24 horas.
                    </p>
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="full-name" className="text-text-secondary text-sm">Nome Completo</Label>
                <Input
                  id="full-name"
                  name="full-name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-text-secondary text-sm">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-text-secondary text-sm">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimo 8 caracteres"
                  required
                  minLength={8}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password" className="text-text-secondary text-sm">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  placeholder="Repita a senha"
                  required
                  minLength={8}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-text-secondary text-sm">Idade</Label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Ex: 28"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-text-secondary text-sm">Genero</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-text-secondary text-sm">Objetivo de Estilo</Label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setStyleObjective(styleObjective === opt ? '' : opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        styleObjective === opt
                          ? 'bg-brand-accent text-background'
                          : 'bg-white/5 text-text-secondary border border-neutral-800 hover:border-brand-accent/40'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => {
                        setAcceptedTerms(e.target.checked);
                        setShowConsentError(false);
                      }}
                      className="sr-only peer"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                      acceptedTerms
                        ? 'bg-brand-accent border-brand-accent'
                        : showConsentError
                          ? 'border-red-400 bg-red-500/10'
                          : 'border-border bg-white/[0.02] group-hover:border-brand-accent/50'
                    }`}>
                      {acceptedTerms && (
                        <Check className="w-3 h-3 text-background" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    Li e concordo com os{' '}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setTermsModalTab('terms'); setShowTermsModal(true); }}
                      className="text-brand-accent hover:text-brand-accent/80 underline underline-offset-2 font-medium"
                    >
                      Termos de Uso
                    </button>
                    {' '}e{' '}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setTermsModalTab('privacy'); setShowTermsModal(true); }}
                      className="text-brand-accent hover:text-brand-accent/80 underline underline-offset-2 font-medium"
                    >
                      Politica de Privacidade
                    </button>
                  </span>
                </label>
                {showConsentError && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5 ml-8">
                    <span className="w-1 h-1 rounded-full bg-red-400" />
                    Voce precisa aceitar os termos para criar sua conta
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-brand-accent text-background font-semibold hover:opacity-90 rounded-xl"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando conta...
                  </span>
                ) : 'Criar conta'}
              </Button>
              <div className="text-center text-sm text-text-secondary">
                Ja tem uma conta?{' '}
                <Link to="/login" className="underline underline-offset-4 text-brand-accent hover:text-brand-accent/80">
                  Entrar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>

    {/* Terms Modal */}
    {showTermsModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="w-full max-w-lg bg-[#141414] border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-accent" />
              <h2 className="text-base font-bold text-white">Documentos Legais</h2>
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setTermsModalTab('terms')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                termsModalTab === 'terms'
                  ? 'text-brand-accent border-b-2 border-brand-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Termos de Uso
            </button>
            <button
              onClick={() => setTermsModalTab('privacy')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                termsModalTab === 'privacy'
                  ? 'text-brand-accent border-b-2 border-brand-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Politica de Privacidade
            </button>
          </div>

          {/* Content */}
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            {termsModalTab === 'terms' ? (
              <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
                <h3 className="text-base font-semibold text-text-primary">Termos de Uso</h3>
                <p>
                  Ao utilizar o FaceMax, voce concorda com os seguintes termos:
                </p>
                <div>
                  <h4 className="font-semibold text-text-primary mb-1">1. Servico</h4>
                  <p>
                    O FaceMax oferece analises esteticas faciais e corporais realizadas por profissionais especializados, 
                    auxiliadas por inteligencia artificial. O servico e destinado a maiores de 18 anos.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary mb-1">2. Uso das Fotos</h4>
                  <p>
                    Suas fotos sao armazenadas de forma segura e privada no nosso servidor (Supabase Storage). 
                    Elas sao utilizadas exclusivamente para a realizacao da analise estetica solicitada e nao sao 
                    compartilhadas com terceiros.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary mb-1">3. Responsabilidades</h4>
                  <p>
                    Voce e responsavel por manter a seguranca da sua conta e por todas as atividades realizadas 
                    nela. As recomendacoes fornecidas sao de cunho estetico e nao substituem orientacao medica.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary mb-1">4. Propriedade Intelectual</h4>
                  <p>
                    Todo o conteudo do FaceMax, incluindo textos, graficos e codigo, e protegido por direitos 
                    autorais e nao pode ser reproduzido sem autorizacao.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
                <h3 className="text-base font-semibold text-text-primary">Politica de Privacidade</h3>
                <p>
                  Sua privacidade e importante para nós. Esta politica descreve como coletamos, usamos e protegemos seus dados.
                </p>
                <div>
                  <h4 className="font-semibold text-text-primary mb-1">1. Dados Coletados</h4>
                  <p>
                    Coletamos: nome, email, idade, genero, objetivo de estilo, fotos enviadas para analise e dados de uso da plataforma.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary mb-1">2. Uso das Fotos</h4>
                  <p>
                    Suas fotos faciais e corporais sao armazenadas em bucket privado no Supabase Storage e sao acessiveis 
                    apenas por voce e pelos profissionais autorizados a realizar sua analise. As fotos nunca sao vendidas, 
                    compartilhadas ou utilizadas para treinamento de IA.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary mb-1">3. Conformidade com a LGPD</h4>
                  <p>
                    Em conformidade com a Lei Geral de Protecao de Dados (Lei 13.709/2018), voce tem direito a:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Acesso aos seus dados pessoais</li>
                    <li>Correcao de dados incompletos ou desatualizados</li>
                    <li>Eliminacao dos dados pessoais tratados com seu consentimento</li>
                    <li>Revogacao do consentimento a qualquer momento</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary mb-1">4. Seguranca</h4>
                  <p>
                    Utilizamos criptografia em transito (HTTPS) e acesso restrito aos dados. Suas fotos nunca sao 
                    armazenadas em formato de texto puro (base64) no banco de dados.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary mb-1">5. Contato</h4>
                  <p>
                    Para exercer seus direitos ou esclarecer duvidas, entre em contato: suporte@facemax.com.br
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <button
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2.5 rounded-xl bg-brand-accent text-background font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
