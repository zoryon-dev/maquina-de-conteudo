# Setup de Admin — Autorização `/settings/brand`

## Por que existe

A UI `/settings/brand` (editar identidade, voz, audiência, oferta, conteúdo da marca Zoryon) está **protegida por `isAdmin` guard** nas 4 server actions (`getBrandForEditAction`, `updateBrandSectionAction`, `listBrandVersionsAction`, `restoreBrandVersionAction`).

Esse guard foi adicionado no PR3 review fix (commit `97bf665`) porque brand é **global** — qualquer user logado poderia sobrescrever a marca de todos os outros.

## Como funciona

`src/lib/auth/admin.ts`:

```ts
const adminUserIds = (process.env.ADMIN_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)

export function isAdmin(userId: string): boolean {
  return adminUserIds.includes(userId)
}
```

Lê a env var `ADMIN_USER_IDS` (CSV de Clerk user IDs). Se vazio → **ninguém é admin** → UI sempre retorna `"Forbidden"`.

## Passo a passo para habilitar

### 1. Descobrir seu Clerk user ID

Opção A — no Clerk Dashboard:
1. Acesse [dashboard.clerk.com](https://dashboard.clerk.com)
2. Selecione o app → Users
3. Clique no seu usuário
4. Copie o `user_id` (começa com `user_`)

Opção B — via DB:
```sql
SELECT id, email FROM users WHERE email = 'seu@email.com';
```
O `id` é o Clerk user ID.

### 2. Setar em desenvolvimento local

Em `.env.local` (raiz do projeto):
```bash
ADMIN_USER_IDS=user_2abc123def456
```

Múltiplos admins separados por vírgula:
```bash
ADMIN_USER_IDS=user_2abc123def,user_3xyz789ghi
```

Reiniciar o dev server depois de editar `.env.local`.

### 3. Setar em produção (Vercel)

Via Dashboard:
1. Vercel → Project → Settings → Environment Variables
2. Nova variável:
   - Name: `ADMIN_USER_IDS`
   - Value: `user_2abc123def456` (ou CSV)
   - Environments: Production (+ Preview se quiser)
3. Save → redeploy automático

Via CLI:
```bash
vercel env add ADMIN_USER_IDS production
# cola o valor quando pedido
vercel --prod
```

### 4. Validar

Após setar + reiniciar:
1. Faça login no app
2. Acesse `/settings` → aba **Marca**
3. Deve carregar o form de identidade. Se vir "Forbidden" → userId não bate.

## Debugging

**Erro "Forbidden" mesmo com env setada**:
- Confirme userId exato (sem espaços, sem aspas no `.env.local`)
- Reinicie dev server (`npm run dev` reinicia, env reload automático)
- Verifique que `.env.local` não está no `.gitignore` sendo ignorado por acidente

**Erro "Não autenticado"**:
- Deslogado. Faça login via `/sign-in`.

**Brand não carrega (`"Marca Zoryon não encontrada"`)**:
- Seed não rodou. Rode `npm run brand:seed:zoryon` com `DATABASE_URL` setada.

## Riscos e mitigação

- **Sem `ADMIN_USER_IDS` → ninguém edita marca**: default seguro (fail closed)
- **Com admin errado**: verifique formato do user ID (`user_xxx`, não email)
- **Admin demitido / acesso revogado**: remova o userId da env var + redeploy
