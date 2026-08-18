export const API_BASE = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1');

/**
 * Trata erros de resposta da API, incluindo rate limiting (429).
 * Lanca Error com mensagem amigavel ao usuario.
 */
async function handleApiError(response) {
  const body = await response.json().catch(() => ({}));

  if (response.status === 429) {
    const retryAfter = body.retry_after || 60;
    const minutes = Math.ceil(retryAfter / 60);
    throw new Error(
      `Limite de requisicoes atingido. Tente novamente em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`
    );
  }

  throw new Error(body.detail || 'Erro na requisicao');
}

/**
 * Envia 1 foto frontal para analise via IA.
 * POST /api/v1/analyze/
 *
 * @param {string} photoFront - Base64 da foto frontal
 * @param {string} token      - JWT de autenticacao
 * @returns {Promise<Object>} - Resultado da analise
 */
export async function analyzeWithAI(photoFront, token) {
  const response = await fetch(`${API_BASE}/analyze/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      photo_front: photoFront,
    }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Detecta o rosto na imagem e retorna a versao recortada.
 * POST /api/v1/analysis/detect-face
 *
 * @param {string} base64Image - data:image/...;base64,...
 * @param {string} token      - JWT de autenticacao (Supabase ou FastAPI)
 * @returns {Promise<string>} - data:image/jpeg;base64,... (cropped)
 */
export async function detectFace(base64Image, token) {
  const response = await fetch(`${API_BASE}/analysis/detect-face`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data = await response.json();
  return data.cropped_image;
}

/**
 * Create a Mercado Pago payment (PIX or Checkout Pro).
 * POST /api/v1/payments/create
 *
 * @param {object} params - { planId, amount, paymentMethod, successUrl, pendingUrl }
 * @param {string} token - JWT de autenticacao
 * @returns {Promise<object>} - Payment creation response
 */
export async function createPayment(params, token) {
  const response = await fetch(`${API_BASE}/payments/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      plan_id: params.planId,
      amount: params.amount,
      payment_method: params.paymentMethod,
      success_url: params.successUrl,
      pending_url: params.pendingUrl,
    }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Poll payment status.
 * GET /api/v1/payments/{paymentId}/status
 *
 * @param {string} paymentId - Internal payment ID
 * @param {string} token - JWT
 * @returns {Promise<object>} - Payment status response
 */
export async function getPaymentStatus(paymentId, token) {
  const response = await fetch(`${API_BASE}/payments/${paymentId}/status`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}
