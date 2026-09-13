// Apple UI Design System – Verified: 8pt Grid, SF Typography, Material-Depth, Natural Spring Motion
import { useState, useEffect, useRef } from 'react';
import { Camera, Save, CheckCircle2, User, Mail, Sparkles, LogOut, Key, Trash2, ShieldCheck, Loader2, Crown, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { getProfile, updateProfile, deleteAccount } from '@/lib/api';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Field, FieldLabel, FieldContent, FieldDescription, FieldGroup } from '@/components/ui/field';
import { FadeIn, ScaleIn } from '@/components/ui/page-transition';
import { motion } from 'framer-motion';
import { PLANS, resolveCurrentPlan } from '@/lib/plans';
import { useNavigate } from 'react-router-dom';

const GENDER_OPTIONS = ['Masculino', 'Feminino', 'Neutro'];
const STYLE_OPTIONS = ['Harmonia Facial','Simetria e Proporcao','Estilo Pessoal','Pre-Procedure','Autoconhecimento'];

export default function ProfilePage() {
  const { user, profile, token, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [styleObjective, setStyleObjective] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureFile, setProfilePictureFile] = useState(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || '');
    setGender(profile.gender || '');
    setAge(profile.age?.toString() || '');
    setStyleObjective(profile.style_objective || '');
    setProfilePicture(profile.profile_picture || null);
  }, [profile]);

  const COOLDOWN_DAYS = 90;
  const lastChange = profile?.last_profile_change_at ? new Date(profile.last_profile_change_at) : null;
  const nextChangeAt = lastChange ? new Date(lastChange.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000) : null;
  const isLocked = !!nextChangeAt && nextChangeAt > new Date();

  const currentPlanId = resolveCurrentPlan(profile || user);
  const currentPlan = currentPlanId ? PLANS[currentPlanId] : null;
  const isFree = !currentPlanId;

  const handleCancelEdit = () => {
    setError(null);
    setProfilePictureFile(null);
    if (profile) {
      setFullName(profile.full_name || '');
      setGender(profile.gender || '');
      setAge(profile.age?.toString() || '');
      setStyleObjective(profile.style_objective || '');
      setProfilePicture(profile.profile_picture || null);
    }
  };

  function handlePhotoUpload(file) {
    if (!file) return;
    setProfilePictureFile(file);
    const reader = new FileReader();
    reader.onload = () => setProfilePicture(reader.result);
    reader.readAsDataURL(file);
  }

  async function uploadAvatar(file) {
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });
    if (error) throw new Error(`Falha no upload: ${error.message}`);
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    return urlData.publicUrl;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!user?.id || isLocked) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      let pictureUrl = profilePicture;
      if (profilePictureFile) pictureUrl = await uploadAvatar(profilePictureFile);
      await updateProfile({ full_name: fullName || null, profile_picture: pictureUrl || null, gender: gender || null, age: age ? Number(age) : null, style_objective: styleObjective || null });
      setProfilePicture(pictureUrl); setProfilePictureFile(null); setSaved(true);
      await refreshProfile(token);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  const openDeleteModal = () => { setDeleteStep(1); setConfirmText(''); setDeleteError(''); setShowDeleteModal(true); };
  const closeDeleteModal = () => setShowDeleteModal(false);
  const handleDeleteAccount = async () => {
    if (confirmText !== user?.email) return;
    setDeleting(true); setDeleteError('');
    try { await deleteAccount(); await signOut(); } catch (e) { setDeleteError(e?.message || 'Erro ao apagar.'); } finally { setDeleting(false); }
  };

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted" style={{ letterSpacing: '-0.011em' }}>Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 md:pl-4 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Header — 8pt, SF tracking */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-text-primary" style={{ letterSpacing: '-0.022em', lineHeight: 1.2 }}>Meu Perfil</h1>
              <p className="text-[13px] text-text-muted mt-1" style={{ letterSpacing: '-0.011em' }}>Gerencie suas informações pessoais</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-accent" />
              <span>Dados protegidos • LGPD</span>
            </div>
          </div>
        </FadeIn>

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.25,0.1,0.25,1] }} className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" /> {error}
          </motion.div>
        )}
        {saved && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: [0.4,0,0.2,1.4] }} className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Perfil salvo com sucesso!
          </motion.div>
        )}
        {isLocked && (
          <div className="mb-4 p-3 rounded-xl apple-material border border-amber-500/20 text-amber-300 text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /> Próxima alteração em {nextChangeAt.toLocaleDateString('pt-BR')} (a cada 90 dias)
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Card — glass + 20 radius + staggered */}
          <ScaleIn delay={0.05}>
            <Card className="overflow-hidden apple-card apple-material-gold">
              <CardContent className="p-0">
                <div className="relative">
                  <div className="h-24 sm:h-28 bg-gradient-to-r from-brand-accent/20 via-brand-accent/10 to-transparent" />
                  <div className="px-4 sm:px-6 -mt-12 pb-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                      <div className="relative group">
                        <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-card-bg ring-1 ring-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                          <AvatarImage src={profilePicture} alt={fullName || 'Perfil'} className="object-cover" />
                          <AvatarFallback className="bg-brand-secondary text-brand-accent"><User className="w-10 h-10" /></AvatarFallback>
                        </Avatar>
                        <button type="button" onClick={() => !isLocked && fileInputRef.current?.click()} disabled={isLocked} className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-brand-accent text-background flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:scale-[1.02] active:scale-[0.96] apple-transition apple-focus disabled:opacity-40">
                          <Camera className="w-4 h-4" />
                        </button>
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handlePhotoUpload(e.target.files?.[0])} />
                      </div>
                      <div className="flex-1 text-center sm:text-left min-w-0 pb-1">
                        <h2 className="text-base sm:text-lg font-semibold text-text-primary truncate" style={{ letterSpacing: '-0.011em' }}>{fullName || 'Sem nome'}</h2>
                        <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                          <Mail className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <p className="text-xs sm:text-sm text-text-muted truncate">{user?.email}</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                          {profile.role && <Badge variant="default" className="apple-badge">{profile.role === 'professional' ? 'Profissional' : profile.role === 'admin' ? 'Admin' : 'Cliente'}</Badge>}
                          {isFree ? (
                            <Badge variant="secondary" className="apple-badge bg-white/5 border-white/10 text-text-muted">Plano Free — sem envios</Badge>
                          ) : (
                            <Badge className="apple-badge bg-brand-accent text-background border-0"><Crown className="w-3 h-3 mr-1" />{currentPlan.name}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScaleIn>

          {/* Plano — Apple card 20, 8pt, material */}
          <ScaleIn delay={0.08}>
            <Card className="apple-card apple-material-gold overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-brand-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-[15px] font-semibold" style={{ letterSpacing: '-0.022em' }}>Plano Atual</CardTitle>
                    <CardDescription className="text-[13px]" style={{ letterSpacing: '-0.011em' }}>
                      {isFree ? 'Você está no plano gratuito' : `Assinatura ativa • ${currentPlan.period}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isFree ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-text-primary" style={{ letterSpacing: '-0.022em' }}>Free</span>
                      <span className="text-sm text-text-muted">— 0 envios/mês</span>
                    </div>
                    <p className="text-[13px] text-text-secondary leading-relaxed" style={{ letterSpacing: '-0.011em' }}>Login e cadastro são gratuitos. Para enviar avaliações, escolha um plano.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="rounded-xl bg-white/[0.04] border border-border p-3">
                        <p className="font-semibold text-text-primary">Essencial</p><p className="text-text-muted">R$ 24,90/mes • 2 envios</p>
                      </div>
                      <div className="rounded-xl bg-brand-accent/10 border border-brand-accent/20 p-3">
                        <p className="font-semibold text-brand-accent">Continua</p><p className="text-text-muted">R$ 184/ano • 4/mes</p>
                      </div>
                      <div className="rounded-xl bg-white/[0.04] border border-border p-3">
                        <p className="font-semibold text-text-primary">Lite Estetica</p><p className="text-text-muted">R$ 54,90/mes • 6/mes</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => navigate('/checkout-simulation')} className="h-11 px-6 rounded-xl bg-brand-accent text-background font-semibold apple-button apple-focus gap-2">
                        <Zap className="w-4 h-4" /> Ver planos e assinar
                      </Button>
                      <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-11 px-6 rounded-xl apple-focus">Continuar no dashboard</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-text-primary" style={{ letterSpacing: '-0.011em' }}>{currentPlan.name}</p>
                        <p className="text-[11px] text-text-muted">{currentPlan.benefits[0]}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-text-muted text-xs">R$ </span><span className="text-xl font-bold text-text-primary" style={{ letterSpacing: '-0.022em' }}>{currentPlan.price}</span><span className="text-text-muted text-xs"> / {currentPlan.period}</span>
                      </div>
                    </div>
                    {currentPlan.tag && <Badge className="apple-badge bg-brand-accent/15 text-brand-accent border-brand-accent/20">{currentPlan.tag}</Badge>}
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => navigate('/checkout-simulation')} variant="outline" className="h-11 px-6 rounded-xl apple-focus">Trocar plano</Button>
                      <Button onClick={() => navigate('/dashboard')} className="h-11 px-6 rounded-xl bg-brand-accent text-background apple-button apple-focus">Ir para análises</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </ScaleIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Dados Pessoais */}
            <FadeIn delay={0.1}>
              <Card className="apple-card h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-[15px] font-semibold" style={{ letterSpacing: '-0.022em' }}>Dados Pessoais</CardTitle>
                  <CardDescription className="text-[13px]" style={{ letterSpacing: '-0.011em' }}>Informações básicas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FieldGroup className="gap-4">
                    <Field orientation="vertical">
                      <FieldContent>
                        <FieldLabel className="text-[13px]">Nome Completo</FieldLabel>
                        <Input placeholder="Seu nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={255} disabled={isLocked} className="h-11 rounded-xl apple-focus" />
                      </FieldContent>
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field orientation="vertical">
                        <FieldContent>
                          <FieldLabel className="text-[13px]">Idade</FieldLabel>
                          <Input type="number" min="1" max="120" placeholder="28" value={age} onChange={(e) => setAge(e.target.value)} disabled={isLocked} className="h-11 rounded-xl apple-focus" />
                          <FieldDescription className="text-[11px]">Anos</FieldDescription>
                        </FieldContent>
                      </Field>
                      <Field orientation="vertical">
                        <FieldContent>
                          <FieldLabel className="text-[13px]">Gênero</FieldLabel>
                          <select value={gender} onChange={(e) => setGender(e.target.value)} disabled={isLocked} className="flex h-11 w-full rounded-xl border border-border bg-[#0a0a0a] px-4 text-[13px] text-white apple-focus apple-transition disabled:opacity-50">
                            <option value="" className="bg-[#0a0a0a]">Selecione</option>
                            {GENDER_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-[#0a0a0a]">{opt}</option>)}
                          </select>
                        </FieldContent>
                      </Field>
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>
            </FadeIn>

            {/* Objetivo */}
            <FadeIn delay={0.15}>
              <Card className="apple-card h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-accent" />
                    <CardTitle className="text-[15px] font-semibold" style={{ letterSpacing: '-0.022em' }}>Objetivo de Estilo</CardTitle>
                  </div>
                  <CardDescription className="text-[13px]">Selecione seu principal objetivo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_OPTIONS.map(opt => (
                      <button key={opt} type="button" onClick={() => setStyleObjective(styleObjective === opt ? '' : opt)} disabled={isLocked} className={`h-8 px-4 rounded-full text-[13px] font-medium apple-transition apple-focus apple-badge ${styleObjective === opt ? 'bg-brand-accent text-background shadow-[0_4px_12px_rgba(0,0,0,0.1)]' : 'bg-white/[0.06] text-text-secondary border border-white/10 hover:border-brand-accent/30 hover:text-text-primary'} disabled:opacity-40`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* Save — 44px, 8pt */}
          <FadeIn delay={0.2}>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={saving} className="h-11 px-6 rounded-xl apple-focus apple-transition">Cancelar</Button>
              <Button type="submit" disabled={saving || isLocked} className="h-11 px-8 rounded-xl bg-brand-accent text-background font-semibold apple-button apple-focus gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar Perfil</>}
              </Button>
            </div>
          </FadeIn>
        </form>

        {/* Conta — cards com material */}
        <FadeIn delay={0.3}>
          <div className="mt-8 grid gap-4">
            <Card className="apple-card apple-material">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-[13px] font-semibold text-text-primary" style={{ letterSpacing: '-0.011em' }}>Sair da Conta</h3>
                  <p className="text-[11px] text-text-muted mt-1">Você precisará fazer login novamente.</p>
                </div>
                <Button type="button" variant="outline" onClick={signOut} className="h-11 px-6 rounded-xl gap-2 border-red-500/20 text-red-400 hover:bg-red-500/10 apple-focus">
                  <LogOut className="w-4 h-4" /> Sair
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button type="button" variant="outline" onClick={() => window.location.href='/dashboard/change-password'} className="h-11 rounded-xl gap-2 justify-start apple-focus">
                <Key className="w-4 h-4" /> Alterar senha
              </Button>
              <Button type="button" variant="outline" onClick={async () => { await signOut(); window.location.href='/login'; }} className="h-11 rounded-xl gap-2 justify-start apple-focus">
                <LogOut className="w-4 h-4" /> Mudar conta
              </Button>
              <Button type="button" variant="outline" onClick={openDeleteModal} className="h-11 rounded-xl gap-2 justify-start text-red-400 border-red-500/30 hover:bg-red-500/10 apple-focus">
                <Trash2 className="w-4 h-4" /> Apagar conta
              </Button>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Modal — spring pop */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[20px] p-4" onClick={closeDeleteModal}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: [0.4,0,0.2,1.4] }} className="w-full max-w-md rounded-[20px] apple-material-gold p-6 apple-card" onClick={(e) => e.stopPropagation()}>
            {deleteStep === 1 ? (
              <>
                <h3 className="text-[17px] font-semibold text-text-primary" style={{ letterSpacing: '-0.022em' }}>Apagar conta</h3>
                <p className="text-[13px] text-text-secondary mt-2 leading-relaxed" style={{ letterSpacing: '-0.011em' }}>Tem certeza? Esta ação é <b>irreversível</b> e remove perfil, análises e acesso.</p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={closeDeleteModal} className="h-11 rounded-xl">Cancelar</Button>
                  <Button variant="destructive" onClick={() => setDeleteStep(2)} className="h-11 rounded-xl">Quero apagar</Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-[17px] font-semibold" style={{ letterSpacing: '-0.022em' }}>Confirmação final</h3>
                <p className="text-[13px] text-text-secondary mt-2">Digite <b>{user?.email}</b> para confirmar:</p>
                <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={user?.email} className="mt-3 w-full h-11 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-[13px] text-white apple-focus" />
                {deleteError && <p className="mt-2 text-xs text-red-400">{deleteError}</p>}
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={closeDeleteModal} disabled={deleting} className="h-11 rounded-xl">Cancelar</Button>
                  <Button variant="destructive" disabled={confirmText !== user?.email || deleting} onClick={handleDeleteAccount} className="h-11 rounded-xl">
                    {deleting ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Apagando...</span> : 'Apagar permanentemente'}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
