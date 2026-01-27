# Wizard: Migração para Templates HTML Estáticos

> **Data**: Janeiro 2026
> **Status**: ✅ Implementado
> **Commit**: `78ceb11`

## Resumo

Migração do sistema de templates de geração de imagens de **JS/JSON dinâmicos** para **arquivos HTML estáticos**, facilitando customização visual e manutenção.

## Antes (JS/JSON Dinâmicos)

```javascript
// .context/wizard-prompts/prompt-carrosel.js
function generateCarouselHtml(params) {
  const { title, content, cta } = params;
  return `
    <!DOCTYPE html>
    <html>
      <style>
        /* CSS gerado dinamicamente */
      </style>
      <body>
        <h1>${title}</h1>
        <p>${content}</p>
        <button>${cta}</button>
      </body>
    </html>
  `;
}
```

**Problemas:**
- Não dava para preview visual no navegador
- Edição de CSS em strings JavaScript era trabalhosa
- Difícil versionar mudanças visuais
- Arquivos JS monolíticos com múltiplas funções

## Depois (HTML Estáticos)

```html
<!-- .context/wizard-prompts/dark-mode.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* CSS inline para compatibilidade ScreenshotOne */
    body {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #ffffff;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .container {
      max-width: 1080px;
      margin: 0 auto;
      padding: 60px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>{{title}}</h1>
    <p>{{content}}</p>
    <div class="cta">{{cta}}</div>
  </div>
</body>
</html>
```

## Arquivos Removidos

```bash
# Legacy JS files
.context/wizard-prompts/prompt-carrosel.js
.context/wizard-prompts/prompt-sintetizer.js
.context/wizard-prompts/prp-img.js
.context/wizard-prompts/ptp-video.js

# Legacy JSON models
.context/wizard-prompts/model-carrossel.json
.context/wizard-prompts/model-post-simples.json

# Legacy documentation
.context/wizard-prompts/prompts-expandidos-narrativas.md
.context/wizard-prompts/prompts-originais-completos.md
.context/wizard-prompts/exemplo-resultado-narrativa.md
```

## Novos Templates

| Arquivo | Descrição | Uso |
|---------|-----------|-----|
| `dark-mode.html` | Fundo escuro + tipografia clara | Posts noturnos, tech |
| `white-mode.html` | Fundo claro + tipografia escura | Posts diurnos, corporativos |
| `superheadline.html` | Foco em headline impactante | Anúncios, promoções |
| `twitter.html` | Formatado para Twitter/X | Threads, posts textuais |

## Benefícios

1. **Preview Imediato**: Abra o HTML diretamente no navegador para ver o resultado
2. **Edição Visual**: Edite CSS em `<style>` tags com syntax highlighting
3. **Versionamento Git**: Mudas visuais são rastreáveis como código
4. **Fácil Extensão**: Para adicionar template, crie novo arquivo `.html`
5. **Separação de Concerns**: Templates visuais separados da lógica de negócio

## Integração com ScreenshotOne

O serviço `screenshotone.service.ts` lê os arquivos HTML e substitui os placeholders:

```typescript
// src/lib/wizard-services/screenshotone.service.ts
async function generateFromStaticTemplate(
  templateName: 'dark-mode' | 'white-mode' | 'superheadline' | 'twitter',
  params: { title: string; content: string; cta: string }
) {
  const templatePath = `.context/wizard-prompts/${templateName}.html`;
  let html = await fs.readFile(templatePath, 'utf-8');

  // Substituir placeholders
  html = html.replace('{{title}}', params.title);
  html = html.replace('{{content}}', params.content);
  html = html.replace('{{cta}}', params.cta);

  // Enviar para ScreenshotOne
  return await screenshotOneClient.generateImage({ html });
}
```

## Padrão de Placeholders

| Placeholder | Descrição |
|-------------|-----------|
| `{{title}}` | Título principal |
| `{{content}}` | Conteúdo do corpo |
| `{{cta}}` | Call-to-action |
| `{{author}}` | Autor/brand (opcional) |
| `{{date}}` | Data (opcional) |

## Próximos Passos

- [ ] Adicionar mais templates estáticos
- [ ] Criar template builder visual (no-code)
- [ ] Adicionar suporte a imagens de fundo
- [ ] Implementar tema por plataforma (Instagram, LinkedIn, etc.)

## Referências

- Documentação do Wizard: `.context/docs/development-plan/dev-wizard.md`
- Arquitetura: `.context/docs/architecture.md`
- Padrões: `.serena/memories/wizard-patterns.md`
