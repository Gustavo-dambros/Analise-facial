/// <reference types="vite/types/importMeta.d.ts" />
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Cliente Supabase compartilhado (singleton). Em um SPA (Vite) todas as telas
// devem usar a MESMA instancia para que o estado de sessao (access_token) seja
// compartilhado. Instancias separadas faziam o getSession() retornar nulo no
// api.js apos o login, enviando requisicoes sem Authorization -> 401.
let _client = null

export function createClient() {
  if (!_client) {
    _client = createSupabaseClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
  }
  return _client
}
