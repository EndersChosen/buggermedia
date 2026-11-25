'use client';

/**
 * Extract text from a PDF in the browser with pdf.js.
 *
 * Used for rule books too large to upload (Vercel caps request bodies at
 * 4.5 MB). Scanned PDFs have no text layer and come back (nearly) empty.
 */
export async function extractPdfText(file: File, onProgress?: (page: number, total: number) => void): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      onProgress?.(i, doc.numPages);
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items) {
        if ('str' in item) {
          text += item.str;
          text += item.hasEOL ? '\n' : ' ';
        }
      }
      pages.push(text.replace(/[ \t]+/g, ' ').trim());
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return pages
    .map((t, i) => `--- Page ${i + 1} ---\n${t}`)
    .join('\n\n')
    .trim();
}
