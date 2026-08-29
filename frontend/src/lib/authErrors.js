// Traduz mensagens de erro da Auth API do Supabase para português amigável.
export function translateAuthError(message = '') {
  const m = String(message).toLowerCase();

  // Sessão / token
  if (
    m.includes('session missing') ||
    m.includes('session expired') ||
    m.includes('jwt expired') ||
    m.includes('invalid token') ||
    m.includes('refresh token') ||
    m.includes('not authenticated') ||
    m.includes('unauthenticated') ||
    m.includes('auth session')
  ) {
    return 'Sua sessão expirou. Faça login novamente.';
  }

  // Reautenticação exigida
  if (m.includes('reauthenticate') || m.includes('for security purposes')) {
    return 'Faça login novamente para alterar a senha.';
  }

  // Complexidade / tamanho da senha
  if (m.includes('should contain') || (m.includes('letter') && m.includes('number'))) {
    return 'A senha deve conter pelo menos uma letra e um número.';
  }
  if (m.includes('at least') && m.includes('character')) {
    return 'A senha deve ter pelo menos 8 caracteres.';
  }
  if (m.includes('weak password') || m.includes('too weak')) {
    return 'A senha é muito fraca. Use pelo menos 8 caracteres com letras e números.';
  }
  if (m.includes('same as the old') || m.includes('different from')) {
    return 'A nova senha deve ser diferente da senha atual.';
  }

  return 'Não foi possível alterar a senha. Tente novamente.';
}
