import pdf from 'pdf-parse';
// OCR imports commented out - OCR is temporarily disabled
// import Tesseract, { createWorker } from 'tesseract.js';
// import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
// import { createCanvas } from 'canvas';
// import path from 'path';

// Configure pdf.js worker
// pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.entry');

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
  };
  usedOCR?: boolean;
}

/**
 * Extracts text content from a PDF buffer using OCR (for image-based PDFs)
 * TEMPORARILY DISABLED - OCR functionality is currently disabled
 */
/*
async function extractTextWithOCR(pdfBuffer: Buffer): Promise<string> {
  console.log('Image-based PDF detected. Using OCR...');

  let worker: Tesseract.Worker | null = null;

  try {
    console.log('Initializing Tesseract worker...');

    // Create and initialize Tesseract worker
    // Use simpler configuration without explicit paths
    worker = await createWorker({
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
        } else if (m.status) {
          console.log(`OCR status: ${m.status}`);
        }
      },
    });

    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    console.log('Tesseract worker initialized successfully');

    // Load PDF with pdfjs
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = Math.min(pdfDocument.numPages, 10); // Limit to 10 pages
    let allText = '';

    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        console.log(`OCR processing page ${pageNum}/${numPages}...`);

        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR

        // Create canvas
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        // Render PDF page to canvas
        await page.render({
          canvasContext: context as any,
          viewport: viewport,
        }).promise;

        // Get image buffer
        const imageBuffer = canvas.toBuffer('image/png');

        // Run OCR on the rendered page
        const { data } = await worker.recognize(imageBuffer);

        allText += data.text + '\n\n';

        console.log(`Page ${pageNum} OCR complete. Extracted ${data.text.length} characters.`);
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
      }
    }

    console.log(`OCR complete. Total extracted: ${allText.length} characters.`);
    return allText.trim();
  } catch (error) {
    throw new Error(
      `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    // Clean up worker
    if (worker) {
      await worker.terminate();
    }
  }
}

/**
 * Extracts text content from a PDF buffer
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer
): Promise<PDFExtractionResult> {
  try {
    // First, try normal PDF text extraction
    const data = await pdf(pdfBuffer);
    const extractedText = data.text.trim();

    // Check if we got meaningful text
    if (extractedText.length >= 100) {
      // Text-based PDF with sufficient content
      return {
        text: extractedText,
        pageCount: data.numpages,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
        },
        usedOCR: false,
      };
    }

    // Text extraction yielded little/no text - likely image-based PDF
    console.log('PDF text extraction yielded insufficient text.');
    console.log('This appears to be an image-based (scanned) PDF.');

    // TODO: OCR support is temporarily disabled due to Tesseract.js compatibility issues
    // in serverless environments. Re-enable once fixed.
    throw new Error(
      'This PDF appears to be image-based (scanned). ' +
      'Please upload a text-based PDF or use OCR software to convert it first. ' +
      'OCR support is coming soon!'
    );

    // Temporarily disabled OCR - uncomment once Tesseract.js worker issues are resolved
    // const ocrText = await extractTextWithOCR(pdfBuffer);
    // return {
    //   text: ocrText,
    //   pageCount: data.numpages,
    //   metadata: {
    //     title: data.info?.Title,
    //     author: data.info?.Author,
    //     subject: data.info?.Subject,
    //   },
    //   usedOCR: true,
    // };
  } catch (error) {
    throw new Error(
      `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validates if PDF text extraction was successful
 */
export function validatePDFText(text: string): {
  isValid: boolean;
  error?: string;
} {
  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      error: 'PDF appears to be empty or contains no extractable text',
    };
  }

  if (text.length < 100) {
    return {
      isValid: false,
      error: 'PDF text is too short (less than 100 characters). OCR may have failed.',
    };
  }

  return { isValid: true };
}

/**
 * Downloads PDF from URL and returns buffer
 */
export async function downloadPDF(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    throw new Error(
      `PDF download failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
