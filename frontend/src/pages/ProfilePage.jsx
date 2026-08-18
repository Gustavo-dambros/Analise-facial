import { useState, useEffect, useRef, useMemo } from 'react';
import { Camera, Save, CheckCircle2, User, Mail, Sparkles, Lock, Pencil, X, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Field, FieldLabel, FieldContent, FieldDescription, FieldGroup } from '@/components/ui/field';
import { FadeIn, ScaleIn } from '@/components/ui/page-transition';
import { Link } from 'react-router-dom';

const GENDER_OPTIONS = ['Masculino', 'Feminino', 'Neutro'];
const STYLE_OPTIONS = [
  'Harmonia Facial',
  'Simetria e Proporcao',
  'Estilo Pessoal',
  'Pre-Procedure',
  'Autoconhecimento',
];
const EDIT_COOLDOWN_DAYS = 30;

function daysUntilEdit(lastEditAt) {
  if (!lastEditAt) return 0;
  const last = new Date(lastEditAt);
  const next = new Date(last.getTime() + EDIT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  if (now >= next) return 0;
  const diffMs = next.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatNextEditDate(lastEditAt) {
  const last = new Date(lastEditAt);
  const next = new Date(last.getTime() + EDIT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  return next.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function ProfileField({ label, value, emptyText }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-sm text-text-primary">{value || emptyText || '--'}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const fileInputRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [styleObjective, setStyleObjective] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureFile, setProfilePictureFile] = useState(null);

  const cooldownDays = useMemo(() => daysUntilEdit(profile?.last_profile_edit_at), [profile]);
  const canEdit = cooldownDays === 0;

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || '');
    setGender(profile.gender || '');
    setAge(profile.age?.toString() || '');
    setStyleObjective(profile.style_objective || '');
    setProfilePicture(profile.avatar_url || null);
  }, [profile]);

  function handleStartEdit() {
    if (!canEdit) return;
    setEditing(true);
    setError(null);
    setSaved(false);
  }

  function handleCancelEdit() {
    setEditing(false);
    setError(null);
    setProfilePictureFile(null);
    if (profile) {
      setFullName(profile.full_name || '');
      setGender(profile.gender || '');
      setAge(profile.age?.toString() || '');
      setStyleObjective(profile.style_objective || '');
      setProfilePicture(profile.avatar_url || null);
    }
  }

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

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (error) throw new Error(`Falha no upload: ${error.message}`);

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    return urlData.publicUrl;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!user?.id || !canEdit) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const supabase = createClient();

      let pictureUrl = profilePicture;

      // Upload new file to Storage if one was selected
      if (profilePictureFile) {
        pictureUrl = await uploadAvatar(profilePictureFile);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName || null,
          gender: gender || null,
          age: age ? Number(age) : null,
          style_objective: styleObjective || null,
          avatar_url: pictureUrl || null,
          last_profile_edit_at: new Date().toISOString(),
        });

      if (updateError) throw new Error(updateError.message);
      setProfilePicture(pictureUrl);
      setProfilePictureFile(null);
      setSaved(true);
      setEditing(false);
      refreshProfile(user.id);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 md:pl-4">
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h1 className="text-lg font-bold tracking-tight text-text-primary font-alpino">Meu Perfil</h1>
            {!editing && (
              canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleStartEdit}
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Alterar Informacoes
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-yellow-400">
                  <Lock className="w-3.5 h-3.5" />
                  Bloqueado por 30 dias
                </div>
              )
            )}
          </div>
        </FadeIn>

        {/* Edit restriction banner */}
        {!canEdit && !editing && (
          <FadeIn>
            <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
              <Lock className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-400">Perfil bloqueado para edicao</p>
                <p className="text-xs text-yellow-400/70 mt-1">
                  Voce so pode editar seu perfil a cada 30 dias. Proxima edicao disponivel em:{' '}
                  <span className="font-semibold text-yellow-400">{formatNextEditDate(profile.last_profile_edit_at)}</span>
                  {' '}({cooldownDays} {cooldownDays === 1 ? 'dia' : 'dias'}).
                </p>
              </div>
            </div>
          </FadeIn>
        )}

        {/* Feedback messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            {error}
          </div>
        )}
        {saved && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Perfil salvo com sucesso!
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Header card with avatar */}
          <ScaleIn delay={0.1}>
            <Card className="mb-6 sm:mb-8 overflow-visible">
              <CardContent className="p-0">
                <div className="relative">
                  <div className="h-20 sm:h-24 rounded-t-lg bg-gradient-to-r from-brand-accent/20 via-brand-accent/10 to-transparent" />

                  <div className="px-4 sm:px-6 -mt-10 sm:-mt-12 pb-5">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                      <div className="relative group">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-card-bg ring-2 ring-brand-accent/30">
                          <AvatarImage src={editing ? profilePicture : (profile.avatar_url || profilePicture)} alt={fullName || 'Perfil'} />
                          <AvatarFallback className="bg-brand-secondary text-brand-accent">
                            <User className="w-8 h-8 sm:w-10 sm:h-10" />
                          </AvatarFallback>
                        </Avatar>
                        {editing && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-accent text-background flex items-center justify-center hover:bg-brand-accent/90 transition-all shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                        />
                      </div>

                      <div className="flex-1 text-center sm:text-left pb-1">
                        <h2 className="text-base sm:text-lg font-bold text-text-primary">
                          {fullName || 'Sem nome'}
                        </h2>
                        <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                          <Mail className="w-3.5 h-3.5 text-text-muted" />
                          <p className="text-xs sm:text-sm text-text-muted">{user?.email}</p>
                        </div>
                        {profile.role && (
                          <Badge variant="default" className="mt-2">
                            {profile.role === 'professional' ? 'Profissional' : profile.role === 'admin' ? 'Admin' : 'Cliente'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScaleIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Left column: Personal data */}
            <FadeIn delay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-alpino">Dados Pessoais</CardTitle>
                  <CardDescription>Informacoes basicas do seu perfil</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {editing ? (
                    <FieldGroup>
                      <Field orientation="vertical">
                        <FieldContent>
                          <FieldLabel>Nome Completo</FieldLabel>
                          <Input
                            placeholder="Seu nome completo"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                          />
                        </FieldContent>
                      </Field>

                      <div className="grid grid-cols-2 gap-4">
                        <Field orientation="vertical">
                          <FieldContent>
                            <FieldLabel>Idade</FieldLabel>
                            <Input
                              type="number"
                              min="1"
                              max="120"
                              placeholder="Ex: 28"
                              value={age}
                              onChange={(e) => setAge(e.target.value)}
                            />
                            <FieldDescription>Anos</FieldDescription>
                          </FieldContent>
                        </Field>

                        <Field orientation="vertical">
                          <FieldContent>
                            <FieldLabel>Genero</FieldLabel>
                            <select
                              value={gender}
                              onChange={(e) => setGender(e.target.value)}
                              className="flex h-10 w-full rounded-xl border border-neutral-800 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40 focus-visible:border-brand-accent/30 transition-colors appearance-none"
                            >
                              <option value="" className="bg-[#0a0a0a] text-neutral-400">Selecione</option>
                              {GENDER_OPTIONS.map((opt) => (
                                <option key={opt} value={opt} className="bg-[#0a0a0a] text-white">{opt}</option>
                              ))}
                            </select>
                          </FieldContent>
                        </Field>
                      </div>
                    </FieldGroup>
                  ) : (
                    <div className="space-y-4">
                      <ProfileField label="Nome Completo" value={profile.full_name} emptyText="Sem nome" />
                      <div className="grid grid-cols-2 gap-4">
                        <ProfileField label="Idade" value={profile.age ? `${profile.age} anos` : null} />
                        <ProfileField label="Genero" value={profile.gender} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeIn>

            {/* Right column: Style objective */}
            <FadeIn delay={0.3}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-accent" />
                    <CardTitle className="text-base font-alpino">Objetivo de Estilo</CardTitle>
                  </div>
                  <CardDescription>Selecione o seu principal objetivo</CardDescription>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="flex flex-wrap gap-2">
                      {STYLE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setStyleObjective(styleObjective === opt ? '' : opt)}
                          className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                            styleObjective === opt
                              ? 'bg-brand-accent text-background shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                              : 'bg-white/5 text-text-secondary border border-border hover:border-brand-accent/40 hover:text-text-primary'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <ProfileField label="Objetivo" value={profile.style_objective} emptyText="Nao definido" />
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* Action buttons */}
          {editing && (
            <FadeIn delay={0.4}>
              <div className="mt-6 sm:mt-8 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  size="lg"
                  className="gap-2 px-6 sm:px-8"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Perfil'}
                </Button>
              </div>
            </FadeIn>
          )}
        </form>

        {/* Security Section */}
        <FadeIn delay={0.5}>
          <div className="mt-8 sm:mt-10 pt-6 border-t border-border">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-accent" />
                  <CardTitle className="text-base font-alpino">Seguranca</CardTitle>
                </div>
                <CardDescription>Gerencie sua senha e a seguranca da conta</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">Alterar senha</h3>
                    <p className="text-xs text-text-muted mt-0.5">Recomendamos alterar sua senha periodicamente.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="gap-2 shrink-0"
                  >
                    <Link to="/dashboard/change-password">
                      <Lock className="w-4 h-4" />
                      Mudar senha
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </FadeIn>

        {/* Logout Section */}
        <FadeIn delay={0.6}>
          <div className="mt-8 sm:mt-10 pt-6 border-t border-border">
            <Card className="border-red-500/20">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Sair da Conta</h3>
                    <p className="text-xs text-text-muted mt-0.5">Voce precisara fazer login novamente para acessar sua conta.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={signOut}
                    className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-400 shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
