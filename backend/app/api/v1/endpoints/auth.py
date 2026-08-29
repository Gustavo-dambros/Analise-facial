from fastapi import APIRouter

router = APIRouter()

# A autenticacao (cadastro, login, confirmacao de e-mail e reset de senha) e
# feita diretamente no Supabase a partir do frontend. O backend apenas valida o
# JWT do Supabase (ver app.core.security.get_current_user) nas rotas protegidas.
