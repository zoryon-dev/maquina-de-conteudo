/**
 * Creative Studio — Templates
 *
 * 8 templates pré-prontos com {{variáveis}} substituíveis.
 * Cada template gera um prompt estruturado para geração de imagem.
 */

import type { Template } from "./types";

export const CREATIVE_TEMPLATES: Template[] = [
  {
    slug: "quote-card",
    name: "Card de Citação",
    category: "quote",
    description: "Imagem com frase de impacto sobre fundo visual",
    promptTemplate:
      'Create a visually stunning quote card image. The quote is: "{{quote}}". Author: {{author}}. Style: elegant typography on a {{background}} background. The text should be clearly readable and the design should feel premium and shareable on social media.',
    variables: [
      {
        key: "quote",
        label: "Frase",
        type: "textarea",
        placeholder: "A frase de impacto...",
        required: true,
      },
      {
        key: "author",
        label: "Autor",
        type: "text",
        placeholder: "Nome do autor",
      },
      {
        key: "background",
        label: "Fundo",
        type: "select",
        options: [
          "dark gradient",
          "nature landscape",
          "abstract geometric",
          "blurred city",
          "solid dark",
        ],
      },
    ],
    defaultFormat: "1:1",
    textConfigTemplate: {
      fontFamily: "Playfair Display",
      fontSize: 36,
      fontWeight: "bold",
      textAlign: "center",
      position: "center",
      textColor: "#ffffff",
    },
  },
  {
    slug: "before-after",
    name: "Antes & Depois",
    category: "before_after",
    description: "Split visual mostrando transformação",
    promptTemplate:
      "Create a split-screen before and after comparison image. LEFT side (before): {{before}}. RIGHT side (after): {{after}}. Topic: {{topic}}. Clear visual divide in the middle, dramatic difference between both sides. Professional and impactful.",
    variables: [
      {
        key: "topic",
        label: "Tema",
        type: "text",
        placeholder: "Ex: Produtividade",
        required: true,
      },
      {
        key: "before",
        label: "Antes (visual)",
        type: "text",
        placeholder: "Descreva o cenário 'antes'",
        required: true,
      },
      {
        key: "after",
        label: "Depois (visual)",
        type: "text",
        placeholder: "Descreva o cenário 'depois'",
        required: true,
      },
    ],
    defaultFormat: "1:1",
  },
  {
    slug: "stat-highlight",
    name: "Destaque de Estatística",
    category: "stats",
    description: "Número grande com contexto visual",
    promptTemplate:
      'Create a bold statistical highlight image. The main number is "{{number}}" with the label "{{label}}". Context: {{context}}. Design should make the number the hero element with supporting visuals that reinforce the data point. Modern infographic style.',
    variables: [
      {
        key: "number",
        label: "Número/Stat",
        type: "text",
        placeholder: "Ex: 73%",
        required: true,
      },
      {
        key: "label",
        label: "Legenda",
        type: "text",
        placeholder: "Ex: dos empreendedores falham no 1º ano",
        required: true,
      },
      {
        key: "context",
        label: "Contexto visual",
        type: "text",
        placeholder: "Ex: ambiente de escritório",
      },
    ],
    defaultFormat: "1:1",
    textConfigTemplate: {
      fontFamily: "Montserrat",
      fontSize: 72,
      fontWeight: "black",
      textAlign: "center",
      position: "center",
      textColor: "#a3e635",
    },
  },
  {
    slug: "tip-card",
    name: "Card de Dica",
    category: "tip",
    description: "Dica prática com visual atrativo",
    promptTemplate:
      'Create an engaging tip card image. Title: "{{title}}". The tip: "{{tip}}". Visual style: clean, modern, educational. Include visual elements that represent the concept. The design should be informative yet eye-catching for social media.',
    variables: [
      {
        key: "title",
        label: "Título",
        type: "text",
        placeholder: "Ex: Dica #7",
        required: true,
      },
      {
        key: "tip",
        label: "A dica",
        type: "textarea",
        placeholder: "Descreva a dica...",
        required: true,
      },
    ],
    defaultFormat: "3:4",
    textConfigTemplate: {
      fontFamily: "Inter",
      fontSize: 32,
      fontWeight: "bold",
      textAlign: "left",
      position: "bottom-left",
      textColor: "#ffffff",
    },
  },
  {
    slug: "testimonial",
    name: "Depoimento",
    category: "testimonial",
    description: "Visual de depoimento/social proof",
    promptTemplate:
      'Create a testimonial/social proof image. Quote: "{{testimonial}}". Person: {{person}}. Create an authentic, trustworthy design with the testimonial text prominently displayed. Warm, inviting aesthetic that builds trust. Include visual elements suggesting credibility.',
    variables: [
      {
        key: "testimonial",
        label: "Depoimento",
        type: "textarea",
        placeholder: "O que a pessoa disse...",
        required: true,
      },
      {
        key: "person",
        label: "Pessoa",
        type: "text",
        placeholder: "Nome e cargo",
        required: true,
      },
    ],
    defaultFormat: "1:1",
  },
  {
    slug: "announcement",
    name: "Anúncio",
    category: "announcement",
    description: "Visual de anúncio ou lançamento",
    promptTemplate:
      'Create an exciting announcement image. Headline: "{{headline}}". Details: {{details}}. Create a celebratory, attention-grabbing design. Bold typography, dynamic composition. The design should convey excitement and importance.',
    variables: [
      {
        key: "headline",
        label: "Título do anúncio",
        type: "text",
        placeholder: "Ex: Novo curso disponível!",
        required: true,
      },
      {
        key: "details",
        label: "Detalhes",
        type: "textarea",
        placeholder: "Informações adicionais...",
      },
    ],
    defaultFormat: "1:1",
    textConfigTemplate: {
      fontFamily: "Montserrat",
      fontSize: 48,
      fontWeight: "black",
      textAlign: "center",
      position: "center",
      textColor: "#ffffff",
      textTransform: "uppercase",
    },
  },
  {
    slug: "comparison",
    name: "Comparação",
    category: "comparison",
    description: "Visual de comparação lado a lado",
    promptTemplate:
      'Create a comparison image showing "{{optionA}}" vs "{{optionB}}". Topic: {{topic}}. Split design with clear visual distinction between both options. Professional infographic style with contrasting colors for each side.',
    variables: [
      {
        key: "topic",
        label: "Tema",
        type: "text",
        placeholder: "Ex: Marketing orgânico vs pago",
        required: true,
      },
      {
        key: "optionA",
        label: "Opção A",
        type: "text",
        placeholder: "Primeiro item",
        required: true,
      },
      {
        key: "optionB",
        label: "Opção B",
        type: "text",
        placeholder: "Segundo item",
        required: true,
      },
    ],
    defaultFormat: "1:1",
  },
  {
    slug: "carousel-cover",
    name: "Capa de Carrossel",
    category: "cover",
    description: "Capa impactante para carrossel",
    promptTemplate:
      'Create a powerful carousel cover image. Title: "{{title}}". Subtitle: {{subtitle}}. The design should immediately grab attention and make people want to swipe. Bold, clean typography with a visually striking background. Include a subtle "swipe" indicator element.',
    variables: [
      {
        key: "title",
        label: "Título",
        type: "text",
        placeholder: "Ex: 7 erros que te impedem de crescer",
        required: true,
      },
      {
        key: "subtitle",
        label: "Subtítulo",
        type: "text",
        placeholder: "Ex: (e como evitar cada um)",
      },
    ],
    defaultFormat: "3:4",
    textConfigTemplate: {
      fontFamily: "Montserrat",
      fontSize: 44,
      fontWeight: "black",
      textAlign: "center",
      position: "center",
      textColor: "#ffffff",
    },
  },
];

export function getTemplateBySlug(slug: string): Template | undefined {
  return CREATIVE_TEMPLATES.find((t) => t.slug === slug);
}

export function getTemplatesByCategory(category: string): Template[] {
  return CREATIVE_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Substitui {{variáveis}} em um template com valores fornecidos.
 */
export function fillTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}
