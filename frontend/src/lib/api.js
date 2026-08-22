/**
 * API Client para FastAPI Backend (Render)
 * 
 * Configuração centralizada de chamadas HTTP com:
 * - Base URL via VITE_API_URL
 * - Tratamento de erros padronizado
 * - Headers de autorização (Bearer token) do localStorage
 */

/**
 * Base da API FastAPI.
 * Aceita VITE_API_URL com ou sem o sufixo "/api/v1" (normalizado abaixo).
 * Sanitiza aspas/espaços e exige protocolo http(s) — caso contrário usa o
 * fallback de produção. Sem isso uma env var mal formatada gera URLs
 * relativas (ex: https://facemax.pro/https://facemax-api.onrender.com/...).
 */
const DEFAULT_API_URL = 'https://facemax-api.onrender.com';

function resolveApiBase() {
  const raw = (import.meta.env.VITE_API_URL || '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '');

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : DEFAULT_API_URL;
  return withProtocol.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
}

export const API_BASE = resolveApiBase();

const TOKEN_KEY = 'facemax_access_token';

/**
 * Obtém o token de acesso salvo no localStorage
 */
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Salva o token de acesso no localStorage
 */
export function setToken(token) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove o token de acesso do localStorage
 */
export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Cria headers padrão com Content-Type e Authorization (se token existir)
 */
function authHeaders(includeContentType = true) {
  const headers = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Faz o parse seguro do corpo da resposta JSON.
 * Retorna {} para corpo vazio (ex: HTTP 204) ou JSON inválido,
 * evitando "JSON.parse: unexpected end of data".
 */
export async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * Trata erros de resposta da API, incluindo rate limiting (429).
 * Lança Error com mensagem amigável ao usuário.
 */
async function handleApiError(response) {
  const body = await parseJsonSafe(response);

  if (response.status === 429) {
    const retryAfter = body.retry_after || 60;
    const minutes = Math.ceil(retryAfter / 60);
    throw new Error(
      `Limite de requisições atingido. Tente novamente em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`
    );
  }

  if (response.status === 401) {
    // Token expirado ou inválido — limpa e força logout
    clearToken();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  throw new Error(body.detail || 'Erro na requisição');
}

/**
 * Função genérica para requisições autenticadas
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(options.body instanceof FormData ? false : true),
      ...options.headers,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  // Para 204 No Content, retorna null
  if (response.status === 204) {
    return null;
  }

  return parseJsonSafe(response);
}

/**
 * Registra um novo usuário
 * POST /api/v1/auth/register
 */
export async function register(email, password, fullName) {
  const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return parseJsonSafe(response);
}

/**
 * Login do usuário
 * POST /api/v1/auth/login
 * Retorna { access_token, token_type }
 */
export async function login(email, password) {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data = await parseJsonSafe(response);
  if (data.access_token) {
    setToken(data.access_token);
  }
  return data;
}

/**
 * Confirma o e-mail do usuário com o token recebido por e-mail
 * GET /api/v1/auth/verificar-email/{token}
 * Retorna { message }
 */
export async function verifyEmail(token) {
  const response = await fetch(
    `${API_BASE}/api/v1/auth/verificar-email/${encodeURIComponent(token)}`,
  );

  if (!response.ok) {
    await handleApiError(response);
  }

  return parseJsonSafe(response);
}

/**
 * Reenvia o e-mail de verificação
 * POST /api/v1/auth/reenviar-confirmacao
 * Retorna { message } — resposta genérica para evitar enumeração de e-mails
 */
export async function resendConfirmation(email) {
  const response = await fetch(`${API_BASE}/api/v1/auth/reenviar-confirmacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return parseJsonSafe(response);
}

/**
 * Solicita link de recuperação de senha
 * POST /api/v1/auth/esqueci-senha
 */
export async function forgotPassword(email) {
  const response = await fetch(`${API_BASE}/api/v1/auth/esqueci-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return parseJsonSafe(response);
}

/**
 * Redefine a senha usando o token JWT recebido por e-mail
 * POST /api/v1/auth/redefinir-senha
 * Retorna { message }
 */
export async function resetPassword(token, novaSenha) {
  const response = await fetch(`${API_BASE}/api/v1/auth/redefinir-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, nova_senha: novaSenha }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return parseJsonSafe(response);
}

/**
 * Altera a senha do usuário autenticado (fluxo logado)
 * POST /api/v1/auth/alterar-senha
 * Retorna { message }
 */
export async function changePassword(novaSenha) {
  return apiFetch('/api/v1/auth/alterar-senha', {
    method: 'POST',
    body: JSON.stringify({ nova_senha: novaSenha }),
  });
}

/**
 * Obtém o perfil do usuário autenticado
 * GET /api/v1/profile/
 */
export async function getProfile() {
  return apiFetch('/api/v1/profile/');
}

/**
 * Atualiza o perfil do usuário autenticado
 * PUT /api/v1/profile/
 */
export async function updateProfile(data) {
  return apiFetch('/api/v1/profile/', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Envia foto frontal para análise via IA
 * POST /api/v1/analyze/
 */
export async function analyzeWithAI(photoFront) {
  return apiFetch('/api/v1/analyze/', {
    method: 'POST',
    body: JSON.stringify({ photo_front: photoFront }),
  });
}

/**
 * Detecta o rosto na imagem e retorna a versão recortada
 * POST /api/v1/analysis/detect-face
 */
export async function detectFace(base64Image) {
  return apiFetch('/api/v1/analysis/detect-face', {
    method: 'POST',
    body: JSON.stringify({ image: base64Image }),
  });
}

/**
 * Cria um pagamento Mercado Pago (PIX ou Checkout Pro)
 * POST /api/v1/payments/create
 */
export async function createPayment(params) {
  return apiFetch('/api/v1/payments/create', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: params.planId,
      amount: params.amount,
      payment_method: params.paymentMethod,
      success_url: params.successUrl,
      pending_url: params.pendingUrl,
    }),
  });
}

/**
 * Consulta status do pagamento
 * GET /api/v1/payments/{paymentId}/status
 */
export async function getPaymentStatus(paymentId) {
  return apiFetch(`/api/v1/payments/${paymentId}/status`);
}

/**
 * Obtém histórico de análises do usuário
 * GET /api/v1/analyze/history
 */
export async function getAnalysisHistory() {
  return apiFetch('/api/v1/analyze/history');
}

/**
 * Logout — limpa token local
 */
export function logout() {
  clearToken();
}

/**
 * Verifica se o usuário está autenticado (tem token salvo)
 */
export function isAuthenticated() {
  return !!getToken();
}