# Guia de Contribuição

## Commits (Conventional Commits)

Use o padrão de commits convencionais:

```
<tipo>(<escopo>): <descrição>

[opcional: corpo]

[opcional: footer]
```

### Tipos Permitidos

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `feat` | Nova funcionalidade | `feat(chat): adiciona modo escuro` |
| `fix` | Correção de bug | `fix(auth): corrige redirect no login` |
| `refactor` | Refatoração de código | `refactor(db): melhora queries de mensagens` |
| `docs` | Alteração em documentação | `docs: atualiza README com novas instruções` |
| `style` | Formatação, ponto e vírgula, etc | `style: ajusta indentação` |
| `test` | Adiciona ou altera testes | `test(api): adiciona testes de integração` |
| `chore` | Dependências, configs | `chore: atualiza Next.js para v15` |

### Exemplos Completos

```bash
feat(library): adiciona filtro por status nos itens

Implementa sistema de filtros na biblioteca permitindo
visualizar apenas itens com status draft, scheduled ou published.

Closes #123
```

```bash
fix(chat): corrige bug de scroll automático

O scroll não era executado ao receber novas mensagens.
Agora usa useEffect com dependency array correto.
```

## Branches

### Estrutura Principal
```
main        # Produção
develop     # Desenvolvimento
```

### Branches de Feature
```
feat/nome-da-feature    # Nova funcionalidade
fix/nome-do-bug         # Correção de bug
refactor/nome           # Refatoração
```

### Workflow

1. Crie branch a partir de `develop`
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/minha-feature
   ```

2. Faça commits com mensagens claras
   ```bash
   git add .
   git commit -m "feat: adiciona nova funcionalidade"
   ```

3. Push e abra PR
   ```bash
   git push origin feat/minha-feature
   ```

## Padrões de Código

### Nomes de Arquivos

| Tipo | Formato | Exemplo |
|------|---------|---------|
| Componentes React | `kebab-case.tsx` | `message-item.tsx` |
| Hooks | `use-kebab-case.ts` | `use-chat.ts` |
| Utilitários | `kebab-case.ts` | `format-date.ts` |
| Types | `kebab-case.ts` | `chat-types.ts` |
| Server Actions | `kebab-case.ts` | `chat-actions.ts` |

### Estrutura de Componentes

```typescript
// 1. Imports (externos → internos)
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 2. Types/Interfaces
type Props = {
  title: string;
  onAction: () => void;
  variant?: 'primary' | 'secondary';
};

// 3. Component
export function ComponentName({ title, onAction, variant = 'primary' }: Props) {
  // 4. Hooks (sempre no topo)
  const [state, setState] = useState(null);
  useEffect(() => {
    // effect
  }, []);

  // 5. Handlers/Funções auxiliares
  const handleClick = () => {
    onAction();
  };

  // 6. Derived values
  const isDisabled = !state;

  // 7. Render (return)
  return (
    <div className={cn('base-class', variant === 'primary' && 'primary-class')}>
      <h2>{title}</h2>
      <button onClick={handleClick} disabled={isDisabled}>
        Action
      </button>
    </div>
  );
}
```

### Comentários

```typescript
// ✅ BOM - Explica o "porquê"
// Delay necessário para animação do sidebar completar antes do redirect
await delay(300);

// ❌ RUIM - Explica o óbvio
// Incrementa o contador
counter++;
```

## Pull Requests

### Template de PR

```markdown
## Descrição
Breve descrição do que foi feito.

## Tipo de Mudança
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Docs
- [ ] Outro

## Mudanças
- Lista das principais mudanças

## Testes
- [ ] Testei manualmente
- [ ] Adicionei testes automatizados

## Screenshots (se aplicável)
<!-- Adicione screenshots antes/depois -->

## Checklist
- [ ] Segui os padrões de código
- [ ] Commits com mensagens claras
- [ ] Atualizei documentação se necessário
- [ ] Sem conflitos para merge
```

## Code Review

### Ao revisar código:
1. **Funcionalidade**: O código faz o que propõe?
2. **Legibilidade**: Está claro e bem documentado?
3. **Performance**: Há gargalos óbvios?
4. **Segurança**: Há vulnerabilidades?
5. **Testes**: Está coberto por testes?

### Ao receber feedback:
1. Leia com atenção
2. Pergunte se não entender
3. Discuta se discordar
4. Agradeça pelo tempo

## Documentação

### Quando atualizar docs:
- Mudou arquitetura → atualize `CLAUDE.md`
- Mudou padrão de código → atualize `.claude/skills/`
- Nova funcionalidade → atualize `README.md`
- Mudou schema → atualize `.context/agents/neon-database-specialist.md`

## Ambiente

### Variáveis de Ambiente

Nunca commite:
- API keys
- Secrets
- Dados pessoais

Use `.env.local` para desenvolvimento e `.env.example` para template:

```env
# .env.example (commitável)
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=sk-or-...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```
