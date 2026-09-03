# BACKUP — 2026-09-03

**Commit de backup salvo antes da finalização do pagamento.**

- **Status funcional:** Login, cadastro, verificação por e-mail, dashboard, análise facial, terços faciais (100% soma inteira), gráficos proporcionais, cards responsivos, GEO/SEO, `checkout-simulation` com 3 planos, `free:0 bloqueado` para envio, cotas `plan_monthly:1, plan_annual:2, plan_black:4` via COUNT — **100% funcionais**.
- **Apenas pendente:** Integração financeira Mercado Pago (TEST). Estrutura já preparada:
  - `backend/app/core/config.py` + `backend/.env.example` com `MERCADOPAGO_*`
  - `backend/app/models/payment.py` + `alembic/versions/9a1b2c3d4e5f` com `mp_payment_id/preference_id/plan_type`
  - `backend/app/services/payment_service.py` (SDK `mercadopago>=2.2.0`, `create_preference` com `external_reference`, `validate_webhook_signature` x-signature/x-request-id, `process_webhook` aprovado → `profiles.plan`)
  - `backend/app/api/v1/endpoints/payments.py` + `router.py` com `POST /create`, `POST /create-preference`, `POST /webhook`, `GET /{id}/status`
  - `frontend` com `VITE_MERCADOPAGO_PUBLIC_KEY` (Brick) pronto, mas `ACCESS_TOKEN/WEBHOOK_SECRET` só em `.env` local/Render Secrets (não commitado).
- **Como retomar pagamento:**
  1. Preencher `backend/.env` com `TEST-XXXX` + `MERCADOPAGO_NOTIFICATION_URL=https://facemax.pro/api/v1/payments/webhook`
  2. `alembic upgrade head` e `npm run build` + `uvicorn --reload`
  3. Testar `POST /api/v1/payments/create-preference → init_point` + webhook `x-signature` → `profiles.plan` + cotas.
- **Segurança:** `.env` desversionado (`.gitignore`), `payment not implemented` isolado neste commit para restore `git checkout <hash>` ou `git tag backup-2026-09-03-pre-pagamento`.

> Backup intencional — restaurar com `git checkout backup-2026-09-03-pre-pagamento` dispara estado estável sem cobrança.
