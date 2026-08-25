/**
 * Mapeamento centralizado de mensagens de erro amigáveis
 * Evita exibir "[object Object]", "Failed to fetch", códigos técnicos, etc.
 */

// Mensagens padrão para erros conhecidos do backend (FastAPI + Supabase)
export const ERROR_MESSAGES = {
  // Erros de autenticação/autorização
  'Email ou senha incorretos.': 'E-mail ou senha incorretos. Verifique suas credenciais.',
  'Invalid credentials': 'E-mail ou senha incorretos. Verifique suas credenciais.',
  'Incorrect password': 'E-mail ou senha incorretos. Verifique suas credenciais.',
  'User not found': 'E-mail ou senha incorretos. Verifique suas credenciais.',
  'Email not confirmed': 'Por favor, confirme seu e-mail antes de fazer login.',
  'Email não confirmado': 'Por favor, confirme seu e-mail antes de fazer login.',
  'Por favor, confirme seu e-mail antes de fazer login.': 'Por favor, confirme seu e-mail antes de fazer login.',
  'Email already registered': 'Este e-mail já está cadastrado. Tente fazer login.',
  'Email ja cadastrado': 'Este e-mail já está cadastrado. Tente fazer login.',
  'Email já cadastrado': 'Este e-mail já está cadastrado. Tente fazer login.',
  'User already registered': 'Este e-mail já está cadastrado. Tente fazer login.',
  'Weak password': 'A senha é muito fraca. Use pelo menos 8 caracteres com letras e números.',
  'Senha fraca': 'A senha é muito fraca. Use pelo menos 8 caracteres com letras e números.',
  'Invalid email': 'E-mail inválido. Verifique o formato.',
  'E-mail invalido': 'E-mail inválido. Verifique o formato.',
  'E-mail inválido': 'E-mail inválido. Verifique o formato.',
  'Too many requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'Muitas tentativas': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'Rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'Token expired': 'Sessão expirada. Faça login novamente.',
  'Token expirado': 'Sessão expirada. Faça login novamente.',
  'Invalid token': 'Link inválido ou expirado. Solicite um novo.',
  'Token invalido': 'Link inválido ou expirado. Solicite um novo.',
  'Token inválido': 'Link inválido ou expirado. Solicite um novo.',
  'Expired token': 'Link expirado. Solicite um novo e-mail de verificação.',
  'Verification token expired': 'Token de verificação expirado. Solicite um novo envio.',
  'User not verified': 'Conta não verificada. Confirme seu e-mail primeiro.',
  'Account disabled': 'Conta desativada. Entre em contato com o suporte.',
  'Conta desativada': 'Conta desativada. Entre em contato com o suporte.',
  'Unauthorized': 'Não autorizado. Faça login novamente.',
  'Forbidden': 'Acesso negado.',

  // Erros de rede/conexão
  'Failed to fetch': 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
  'NetworkError': 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
  'Network Error': 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
  'Network request failed': 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
  'Connection refused': 'Servidor indisponível no momento. Tente novamente em instantes.',
  'ECONNREFUSED': 'Servidor indisponível no momento. Tente novamente em instantes.',
  'Timeout': 'A requisição demorou muito. Verifique sua conexão e tente novamente.',
  'ETIMEDOUT': 'A requisição demorou muito. Verifique sua conexão e tente novamente.',
  'DNS error': 'Não foi possível resolver o endereço do servidor. Verifique sua internet.',
  'ENOTFOUND': 'Não foi possível resolver o endereço do servidor. Verifique sua internet.',

  // Erros de servidor
  'Internal Server Error': 'Erro interno do servidor. Nossa equipe foi notificada. Tente novamente mais tarde.',
  '500': 'Erro interno do servidor. Nossa equipe foi notificada. Tente novamente mais tarde.',
  '502': 'Servidor temporariamente indisponível. Tente novamente em instantes.',
  '503': 'Serviço indisponível no momento. Tente novamente mais tarde.',
  '504': 'Tempo de resposta do servidor esgotado. Tente novamente.',

  // Erros de validação
  'Validation error': 'Dados inválidos. Verifique os campos e tente novamente.',
  'Erro de validacao': 'Dados inválidos. Verifique os campos e tente novamente.',
  'Erro de validação': 'Dados inválidos. Verifique os campos e tente novamente.',
  'Field required': 'Preencha todos os campos obrigatórios.',
  'Campo obrigatorio': 'Preencha todos os campos obrigatórios.',
  'Campo obrigatório': 'Preencha todos os campos obrigatórios.',
};

/**
 * Normaliza qualquer erro para uma mensagem amigável ao usuário
 * @param {Error|string|object|unknown} error - Erro capturado
 * @returns {string} Mensagem amigável
 */
export function getFriendlyErrorMessage(error) {
  // Se já é string, usa direto
  if (typeof error === 'string') {
    const msg = error.trim();
    // Tenta achar mapeamento exato
    if (ERROR_MESSAGES[msg]) return ERROR_MESSAGES[msg];
    // Tenta achar por substring (case-insensitive)
    const lower = msg.toLowerCase();
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
      if (lower.includes(key.toLowerCase())) return value;
    }
    // Se não achou, retorna a string original se parecer amigável
    if (msg.length > 0 && msg.length < 200 && !msg.startsWith('{') && !msg.includes('object')) {
      return msg;
    }
    return 'Ocorreu um erro inesperado. Tente novamente.';
  }

  // Se é Error object
  if (error instanceof Error) {
    return getFriendlyErrorMessage(error.message);
  }

  // Se é objeto (response do fetch, axios, etc.)
  if (error && typeof error === 'object') {
    // Tenta extrair message/detail de estruturas comuns
    const candidates = [
      error?.message,
      error?.detail,
      error?.error,
      error?.error?.message,
      error?.response?.data?.detail,
      error?.response?.data?.message,
      error?.response?.data?.error,
      error?.data?.detail,
      error?.data?.message,
      error?.data?.error,
      JSON.stringify(error),
    ].filter(Boolean);

    for (const candidate of candidates) {
      const msg = getFriendlyErrorMessage(candidate);
      if (msg !== 'Ocorreu um erro inesperado. Tente novamente.') {
        return msg;
      }
    }

    // Se chegou aqui, é um objeto genérico "[object Object]"
    return 'Ocorreu um erro inesperado. Tente novamente.';
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}

/**
 * Wrapper para fetch que captura erros de rede e normaliza
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<any>}
 */
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (err) {
    // Erro de rede (CORS, offline, DNS, etc.)
    throw new Error(getFriendlyErrorMessage(err));
  }
}

/**
 * Hook para usar mensagens de erro padronizadas em componentes
 */
export function useErrorHandler() {
  const handleError = (error, fallback = 'Ocorreu um erro inesperado. Tente novamente.') => {
    return getFriendlyErrorMessage(error) || fallback;
  };
  return { handleError };
}