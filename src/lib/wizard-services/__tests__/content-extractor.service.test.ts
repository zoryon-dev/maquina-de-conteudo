/**
 * Testes content-extractor.service
 *
 * Cobertura:
 *  - link → Firecrawl retorna briefing markdown (source=firecrawl)
 *  - youtube → Apify retorna briefing com header TRANSCRICAO (source=apify)
 *  - keyword/theme/insight → pass-through (source=direct)
 *  - graceful degradation quando Firecrawl falha
 *  - consolidateSeeds com múltiplas seeds + separadores
 *  - consolidateSeeds usa value quando briefing ausente
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const extractFromUrlMock = vi.fn();
const transcribeYouTubeMock = vi.fn();

vi.mock("../firecrawl.service", () => ({
  extractFromUrl: (...args: unknown[]) => extractFromUrlMock(...args),
}));

vi.mock("../apify.service", () => ({
  transcribeYouTube: (...args: unknown[]) => transcribeYouTubeMock(...args),
  // Stub simplificado — o real formata um bloco rico; aqui só garantimos
  // que o header "TRANSCRICAO:" esteja presente e que o texto apareça.
  formatYouTubeForPrompt: (x: { transcription: string }) =>
    `TRANSCRICAO: ${x.transcription}`,
}));

import {
  extractSeedAsBriefing,
  consolidateSeeds,
} from "../content-extractor.service";

describe("extractSeedAsBriefing", () => {
  beforeEach(() => {
    extractFromUrlMock.mockReset();
    transcribeYouTubeMock.mockReset();
  });

  it("link → chama firecrawl, retorna briefing markdown", async () => {
    extractFromUrlMock.mockResolvedValue({
      success: true,
      data: {
        sourceUrl: "https://x.com",
        content: "# Title\n\nContent",
        metadata: { title: "Title", author: "Autor" },
      },
    });
    const result = await extractSeedAsBriefing({
      type: "link",
      url: "https://x.com",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.briefing).toContain("Content");
    expect(result.data.metadata.source).toBe("firecrawl");
    expect(result.data.metadata.title).toBe("Title");
    expect(result.data.metadata.author).toBe("Autor");
  });

  it("youtube → chama apify transcribe + formatter", async () => {
    transcribeYouTubeMock.mockResolvedValue({
      success: true,
      data: {
        sourceUrl: "https://youtube.com/watch?v=abc",
        transcription: "hello world",
        metadata: { title: "Video", channelName: "Channel" },
      },
    });
    const result = await extractSeedAsBriefing({
      type: "youtube",
      url: "https://youtube.com/watch?v=abc",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.briefing).toContain("TRANSCRICAO:");
    expect(result.data.briefing).toContain("hello world");
    expect(result.data.metadata.source).toBe("apify");
    expect(result.data.metadata.author).toBe("Channel");
  });

  it("keyword → pass-through", async () => {
    const r = await extractSeedAsBriefing({
      type: "keyword",
      value: "SEO técnico",
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.briefing).toBe("SEO técnico");
    expect(r.data.metadata.source).toBe("direct");
  });

  it("theme → pass-through", async () => {
    const r = await extractSeedAsBriefing({
      type: "theme",
      value: "marketing digital",
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.briefing).toBe("marketing digital");
    expect(r.data.metadata.source).toBe("direct");
  });

  it("insight → pass-through", async () => {
    const r = await extractSeedAsBriefing({
      type: "insight",
      value: "confiança vira comoditização",
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.briefing).toBe("confiança vira comoditização");
    expect(r.data.metadata.source).toBe("direct");
  });

  it("graceful degradation quando firecrawl falha (success=false)", async () => {
    extractFromUrlMock.mockResolvedValue({ success: false, error: "API down" });
    const r = await extractSeedAsBriefing({
      type: "link",
      url: "https://x.com",
    });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error).toContain("API down");
  });

  it("graceful degradation quando firecrawl retorna data=null", async () => {
    extractFromUrlMock.mockResolvedValue({ success: true, data: null });
    const r = await extractSeedAsBriefing({
      type: "link",
      url: "https://x.com",
    });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error).toMatch(/indisponível|não retornou/i);
  });

  it("graceful degradation quando apify retorna data=null", async () => {
    transcribeYouTubeMock.mockResolvedValue({ success: true, data: null });
    const r = await extractSeedAsBriefing({
      type: "youtube",
      url: "https://youtube.com/watch?v=abc",
    });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error).toMatch(/indisponível|não retornou/i);
  });

  describe("min length validation (C4)", () => {
    it("link com content vazio → success: false", async () => {
      extractFromUrlMock.mockResolvedValue({
        success: true,
        data: {
          sourceUrl: "https://x.com",
          content: "",
          metadata: {},
        },
      });
      const r = await extractSeedAsBriefing({
        type: "link",
        url: "https://x.com",
      });
      expect(r.success).toBe(false);
      if (r.success) return;
      expect(r.error).toMatch(/curto|vazio|short|empty/i);
    });

    it("link com content muito curto (<50 chars) → success: false", async () => {
      extractFromUrlMock.mockResolvedValue({
        success: true,
        data: {
          sourceUrl: "https://x.com",
          content: "tiny",
          metadata: {},
        },
      });
      const r = await extractSeedAsBriefing({
        type: "link",
        url: "https://x.com",
      });
      expect(r.success).toBe(false);
    });

    it("youtube com transcrição vazia → success: false", async () => {
      transcribeYouTubeMock.mockResolvedValue({
        success: true,
        data: {
          sourceUrl: "https://youtube.com/watch?v=abc",
          transcription: "",
          metadata: { title: "Vid" },
        },
      });
      const r = await extractSeedAsBriefing({
        type: "youtube",
        url: "https://youtube.com/watch?v=abc",
      });
      expect(r.success).toBe(false);
    });

    it("keyword muito curto → success: false", async () => {
      const r = await extractSeedAsBriefing({
        type: "keyword",
        value: "x",
      });
      expect(r.success).toBe(false);
    });

    it("theme muito curto → success: false", async () => {
      const r = await extractSeedAsBriefing({
        type: "theme",
        value: "a",
      });
      expect(r.success).toBe(false);
    });
  });
});

describe("consolidateSeeds", () => {
  it("consolida múltiplas seeds com separadores explícitos", () => {
    const out = consolidateSeeds([
      { type: "link", value: "https://x.com", briefing: "Artigo A" },
      { type: "youtube", value: "https://yt.com/abc", briefing: "Transcrição B" },
      { type: "theme", value: "marketing" },
    ]);
    expect(out).toContain("### FONTE 1 (link)");
    expect(out).toContain("Artigo A");
    expect(out).toContain("### FONTE 2 (youtube)");
    expect(out).toContain("Transcrição B");
    expect(out).toContain("### FONTE 3 (theme)");
    expect(out).toContain("marketing");
    // 3 seeds → 2 separadores "---" → split gera 3 pedaços
    expect(out.split("---").length).toBe(3);
  });

  it("usa value quando briefing ausente", () => {
    const out = consolidateSeeds([{ type: "keyword", value: "SEO" }]);
    expect(out).toContain("SEO");
    expect(out).toContain("### FONTE 1 (keyword)");
  });

  it("seed única não adiciona separadores", () => {
    const out = consolidateSeeds([
      { type: "theme", value: "tema", briefing: "briefing" },
    ]);
    expect(out.split("---").length).toBe(1);
    expect(out).toContain("briefing");
  });

  it("array vazio retorna string vazia", () => {
    expect(consolidateSeeds([])).toBe("");
  });
});
