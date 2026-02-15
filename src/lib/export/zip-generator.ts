/**
 * ZIP Generator Utility
 *
 * Gera arquivos ZIP a partir de um array de imagens (URLs ou Blobs).
 * Usado para "Download All" no Creative Studio e "Export All" no Visual Studio.
 */

import JSZip from "jszip";

// ============================================================================
// TYPES
// ============================================================================

export interface ZipEntry {
  /** Nome do arquivo dentro do ZIP (ex: "slide-01.png") */
  name: string;
  /** URL da imagem para download, ou Blob direto */
  url?: string;
  /** Blob direto (alternativa a URL) */
  blob?: Blob;
}

// ============================================================================
// ZIP GENERATION
// ============================================================================

/**
 * Gera um arquivo ZIP a partir de um array de entradas.
 * Faz fetch de cada URL e adiciona ao ZIP.
 * Entradas com erros de download sao ignoradas (com warning no console).
 *
 * @param entries - Array de objetos com nome e URL ou Blob
 * @returns Blob do arquivo ZIP gerado
 * @throws Error se nenhuma entrada foi adicionada ao ZIP
 */
export async function generateZip(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  let addedCount = 0;

  for (const entry of entries) {
    try {
      let data: Blob;

      if (entry.blob) {
        data = entry.blob;
      } else if (entry.url) {
        const response = await fetch(entry.url);
        if (!response.ok) {
          console.warn(
            `[zip-generator] Falha ao baixar "${entry.name}": HTTP ${response.status}`
          );
          continue;
        }
        data = await response.blob();
      } else {
        console.warn(
          `[zip-generator] Entrada "${entry.name}" sem URL ou Blob, ignorando`
        );
        continue;
      }

      zip.file(entry.name, data);
      addedCount++;
    } catch (error) {
      console.warn(
        `[zip-generator] Erro ao processar "${entry.name}":`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (addedCount === 0) {
    throw new Error("Nenhuma imagem foi adicionada ao ZIP");
  }

  return zip.generateAsync({ type: "blob" });
}

// ============================================================================
// DOWNLOAD HELPER
// ============================================================================

/**
 * Gera um ZIP e dispara o download no navegador.
 *
 * @param entries - Array de objetos com nome e URL ou Blob
 * @param filename - Nome do arquivo ZIP (ex: "creative-studio-123456.zip")
 */
export async function downloadZip(
  entries: ZipEntry[],
  filename: string
): Promise<void> {
  const blob = await generateZip(entries);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
