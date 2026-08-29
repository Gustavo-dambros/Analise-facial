import { useState, useEffect, useRef } from 'react';
import { Camera, Save, CheckCircle2, User, Mail, Sparkles, LogOut, Key, Trash2 } from 'lucide-react';
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
import { Link } from 'react-router-dom';

const GENDER_OPTIONS = ['Masculino', 'Feminino', 'Neutro'];
const STYLE_OPTIONS = [
  'Harmonia Facial',
  'Simetria e Proporcao',
  'Estilo Pessoal',
  'Pre-Procedure',
  'Autoconhecimento',
];

export default function ProfilePage() {
  const { user, profile, token, signOut, refreshProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Conta: mudar/excluir
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

  // Regra de negocio: o perfil so pode ser alterado 1 vez a cada 3 meses.
  const COOLDOWN_DAYS = 90;
  const lastChange = profile?.last_profile_change_at ? new Date(profile.last_profile_change_at) : null;
  const nextChangeAt = lastChange ? new Date(lastChange.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000) : null;
  const isLocked = !!nextChangeAt && nextChangeAt > new Date();

  const handleEdit = () => {
    setError(null);
    setSaved(false);
  };

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
    if (!user?.id || isLocked) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      let pictureUrl = profilePicture;

      // Upload new file to Storage if one was selected
      if (profilePictureFile) {
        pictureUrl = await uploadAvatar(profilePictureFile);
      }

      // Update profile via FastAPI
      await updateProfile({
        full_name: fullName || null,
        profile_picture: pictureUrl || null,
        gender: gender || null,
        age: age ? Number(age) : null,
        style_objective: styleObjective || null,
      });

      setProfilePicture(pictureUrl);
      setProfilePictureFile(null);
      setSaved(true);
      await refreshProfile(token);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const handleChangePassword = () => navigate('/dashboard/change-password');

  const handleSwitchAccount = async () => {
    setLoading(true);
    try {
      await signOut();
      navigate('/login');
    } catch {
      setLoading(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteStep(1);
    setConfirmText('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => setShowDeleteModal(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== user?.email) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
      await signOut();
      navigate('/login');
    } catch (e) {
      setDeleteError(e?.message || 'Erro ao apagar a conta. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

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
              <Button
                type="button"
                variant="outline"
                onClick={handleEdit}
                disabled={isLocked}
                className="gap-2"
              >
              <User className="w-4 h-4" />
              Editar Informações
            </Button>
          </div>
        </FadeIn>

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

        {isLocked && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            Você só pode alterar seu perfil a cada 3 meses. Próxima alteração disponível em {nextChangeAt.toLocaleDateString('pt-BR')}.
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
                          <AvatarImage src={profilePicture} alt={fullName || 'Perfil'} />
                          <AvatarFallback className="bg-brand-secondary text-brand-accent">
                            <User className="w-8 h-8 sm:w-10 sm:h-10" />
                          </AvatarFallback>
                        </Avatar>
                         <button
                           type="button"
                           onClick={() => !isLocked && fileInputRef.current?.click()}
                           disabled={isLocked}
                           className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-accent text-background flex items-center justify-center hover:bg-brand-accent/90 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                         >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
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
                  <CardDescription>Informações básicas do seu perfil</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FieldGroup>
                    <Field orientation="vertical">
                      <FieldContent>
                        <FieldLabel>Nome Completo</FieldLabel>
                         <Input
                           placeholder="Seu nome completo"
                           value={fullName}
                           onChange={(e) => setFullName(e.target.value)}
                           maxLength={255}
                           disabled={isLocked}
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
                             disabled={isLocked}
                           />
                          <FieldDescription>Anos</FieldDescription>
                        </FieldContent>
                      </Field>

                      <Field orientation="vertical">
                        <FieldContent>
                          <FieldLabel>Gênero</FieldLabel>
                           <select
                             value={gender}
                             onChange={(e) => setGender(e.target.value)}
                             disabled={isLocked}
                             className="flex h-10 w-full rounded-xl border border-neutral-800 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40 focus-visible:border-brand-accent/30 transition-colors appearance-none disabled:opacity-50"
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
                  <div className="flex flex-wrap gap-2">
                    {STYLE_OPTIONS.map((opt) => (
                         <button
                           key={opt}
                           type="button"
                           onClick={() => setStyleObjective(styleObjective === opt ? '' : opt)}
                           disabled={isLocked}
                           className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          styleObjective === opt
                            ? 'bg-brand-accent text-background shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                            : 'bg-white/5 text-text-secondary border border-border hover:border-brand-accent/40 hover:text-text-primary'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* Save button */}
          <FadeIn delay={0.4}>
            <div className="mt-6 sm:mt-8 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={saving}
                className="gap-2"
              >
                Cancelar
              </Button>
               <Button
                 type="submit"
                 disabled={saving || isLocked}
                 size="lg"
                 className="gap-2 px-6 sm:px-8"
               >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Perfil'}
              </Button>
            </div>
          </FadeIn>
        </form>

        {/* Logout Section */}
        <FadeIn delay={0.5}>
          <div className="mt-8 sm:mt-10 pt-6 border-t border-border">
            <Card className="border-red-500/20">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Sair da Conta</h3>
                    <p className="text-xs text-text-muted mt-0.5">Você precisará fazer login novamente para acessar sua conta.</p>
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

        {/* Account management */}
        <FadeIn delay={0.6}>
          <div className="mt-6 sm:mt-8 flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleChangePassword}
              className="gap-2 justify-start"
            >
              <Key className="w-4 h-4" />
              Alterar senha
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSwitchAccount}
              disabled={loading}
              className="gap-2 justify-start"
            >
              <LogOut className="w-4 h-4" />
              Mudar conta
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={openDeleteModal}
              className="gap-2 justify-start text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              Apagar conta
            </Button>
          </div>
        </FadeIn>
      </div>

      {/* Modal de exclusao (confirmacao dupla) */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card-bg border border-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {deleteStep === 1 ? (
              <>
                <h3 className="text-lg font-bold text-text-primary">Apagar conta</h3>
                <p className="text-sm text-text-secondary mt-2">
                  Tem certeza? Esta ação é <b>irreversível</b> e remove permanentemente
                  seu perfil, suas análises e seu acesso. Não será possível recuperar os dados.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={closeDeleteModal}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteStep(2)}
                  >
                    Quero apagar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-text-primary">Confirmação final</h3>
                <p className="text-sm text-text-secondary mt-2">
                  Digite seu e-mail <b>{user?.email}</b> para confirmar a exclusão definitiva:
                </p>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={user?.email}
                  className="mt-3 w-full rounded-xl border border-neutral-800 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                />
                {deleteError && <p className="mt-2 text-xs text-red-400">{deleteError}</p>}
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={closeDeleteModal} disabled={deleting}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={confirmText !== user?.email || deleting}
                    onClick={handleDeleteAccount}
                  >
                    {deleting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Apagando...
                      </span>
                    ) : (
                      'Apagar permanentemente'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
