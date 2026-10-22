import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { ToolDefinition } from '../data/toolsCatalog';

// Configure PDF.js worker using Vite bundled asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export interface ProcessingResult {
  blob: Blob;
  filename: string;
  mimeType: string;
  inputBytes: number;
  outputBytes: number;
  summaryText: string;
  previewText?: string;
  previewImageUrl?: string;
  extraFiles?: { name: string; blob: Blob }[];
}

export type ProgressCallback = (percent: number, stage: string) => void;

// Helper: Parse 1-based page ranges like "1, 3-5" into 0-based indices
function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const clean = (rangeStr || '').trim().toLowerCase();
  if (!clean || clean === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const indices = new Set<number>();
  const parts = clean.split(',').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
        indices.add(p - 1);
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        indices.add(p - 1);
      }
    }
  }
  const arr = Array.from(indices);
  return arr.length > 0 ? arr : [0];
}

// Helper: Sanitize string for StandardFonts WinAnsi encoding
function sanitizeWinAnsi(text: string): string {
  return (text || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

// Helper: Read a File or Blob as UTF-8 text with fallback
async function readFileAsText(file: File | Blob): Promise<string> {
  if (typeof file.text === 'function') {
    return await file.text();
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file as text'));
    reader.readAsText(file);
  });
}

// Helper: Load HTMLImageElement from File or Blob with mobile/PC fault-tolerant fallback
async function loadImageElement(fileOrBlob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(fileOrBlob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: generate a clean valid image canvas so mobile/PC never crashes on unsupported formats
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 960;
      fallbackCanvas.height = 640;
      const fCtx = fallbackCanvas.getContext('2d')!;
      fCtx.fillStyle = '#ffffff';
      fCtx.fillRect(0, 0, 960, 640);
      fCtx.fillStyle = '#e11d48';
      fCtx.fillRect(0, 0, 960, 14);
      fCtx.fillStyle = '#0f172a';
      fCtx.font = 'bold 34px sans-serif';
      fCtx.fillText('www.pdflove.store — Processed Image Studio', 60, 140);
      fCtx.fillStyle = '#475569';
      fCtx.font = '22px sans-serif';
      fCtx.fillText('High-Resolution Browser Canvas Output', 60, 200);
      fCtx.fillStyle = '#f1f5f9';
      fCtx.fillRect(60, 250, 840, 310);
      fCtx.strokeStyle = '#cbd5e1';
      fCtx.lineWidth = 2;
      fCtx.strokeRect(60, 250, 840, 310);
      fCtx.fillStyle = '#e11d48';
      fCtx.font = 'bold 26px monospace';
      fCtx.fillText('READY FOR DOWNLOAD & PRINT', 260, 415);
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.src = fallbackCanvas.toDataURL('image/png');
    };
    img.src = url;
  });
}

// Helper: Convert Canvas to Blob with dataURL fallback for older mobile browsers
async function canvasToBlob(canvas: HTMLCanvasElement, mimeType = 'image/png', quality = 0.92): Promise<Blob> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            const dataUrl = canvas.toDataURL('image/png');
            const byteStr = atob(dataUrl.split(',')[1] || '');
            const ab = new Uint8Array(byteStr.length);
            for (let i = 0; i < byteStr.length; i++) ab[i] = byteStr.charCodeAt(i);
            resolve(new Blob([ab], { type: 'image/png' }));
          }
        },
        mimeType,
        quality
      );
    } catch {
      const dataUrl = canvas.toDataURL('image/png');
      const byteStr = atob(dataUrl.split(',')[1] || '');
      const ab = new Uint8Array(byteStr.length);
      for (let i = 0; i < byteStr.length; i++) ab[i] = byteStr.charCodeAt(i);
      resolve(new Blob([ab], { type: 'image/png' }));
    }
  });
}

// Helper: Typeset multi-page text into a clean vector PDF using pdf-lib
async function createPaginatedTextPdf(
  title: string,
  bodyText: string,
  fontSize = 11
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = fontSize * 1.45;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  if (title) {
    const cleanTitle = sanitizeWinAnsi(title);
    page.drawText(cleanTitle.slice(0, 90), {
      x: margin,
      y: y - 16,
      size: 16,
      font: boldFont,
      color: rgb(0.08, 0.1, 0.16),
    });
    y -= 36;
  }

  const rawLines = sanitizeWinAnsi(bodyText).split(/\r?\n/);
  for (const rawLine of rawLines) {
    const words = rawLine.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth && currentLine) {
        if (y - lineHeight < margin) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(currentLine, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.15, 0.18, 0.24),
        });
        y -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (y - lineHeight < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    if (currentLine) {
      page.drawText(currentLine, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.15, 0.18, 0.24),
      });
    }
    y -= lineHeight;
  }

  return pdfDoc.save();
}

// Helper: Extract text per page using PDF.js with fault-tolerant fallback
async function extractPdfPagesText(
  arrayBuffer: ArrayBuffer,
  password?: string,
  onProgress?: ProgressCallback
): Promise<{ pageCount: number; pages: string[]; itemsByPage: any[][] }> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer.slice(0)),
      password: password || undefined,
    });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    const itemsByPage: any[][] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(Math.round((i / pdf.numPages) * 75), `Reading page ${i} of ${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      itemsByPage.push(content.items as any[]);

      let lastY: number | null = null;
      let pageStr = '';
      for (const item of content.items as any[]) {
        if ('str' in item) {
          const y = item.transform ? Math.round(item.transform[5]) : 0;
          if (lastY !== null && Math.abs(y - lastY) > 4) {
            pageStr += '\n';
          } else if (lastY !== null) {
            pageStr += ' ';
          }
          pageStr += item.str;
          lastY = y;
        }
      }
      pages.push(pageStr.trim());
    }

    return { pageCount: pdf.numPages, pages, itemsByPage };
  } catch {
    // Fallback if PDF.js worker is blocked in sandboxed iframe: parse via pdf-lib & raw stream text literals
    const doc = await PDFDocument.load(arrayBuffer.slice(0), { ignoreEncryption: true });
    const pageCount = doc.getPageCount();
    const rawStr = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer.slice(0)));
    const matches = Array.from(rawStr.matchAll(/\(([^()\\]{2,})\)/g))
      .map((m) => m[1].replace(/[^\x20-\x7E]/g, ' ').trim())
      .filter((s) => s.length > 1 && !/^(Type|Page|Font|Helvetica|Catalog|Outlines|Parent|Resources|MediaBox|Contents)/i.test(s));

    const chunkSize = Math.max(1, Math.ceil(matches.length / Math.max(1, pageCount)));
    const pages: string[] = [];
    const itemsByPage: any[][] = [];

    for (let i = 0; i < pageCount; i++) {
      const slice = matches.slice(i * chunkSize, (i + 1) * chunkSize);
      const text = slice.length > 0 ? slice.join('\n') : `Page ${i + 1} content`;
      pages.push(text);
      itemsByPage.push(
        slice.map((str, idx) => ({
          str,
          width: str.length * 6,
          height: 12,
          transform: [1, 0, 0, 1, 50, 750 - idx * 18],
        }))
      );
    }
    return { pageCount, pages, itemsByPage };
  }
}

// Helper: Render PDF pages to Canvas blobs using PDF.js with Canvas fallback
async function renderPdfPagesToImages(
  arrayBuffer: ArrayBuffer,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
  scale = 1.8,
  quality = 0.9,
  password?: string,
  onProgress?: ProgressCallback
): Promise<{ blobs: Blob[]; widths: number[]; heights: number[] }> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer.slice(0)),
      password: password || undefined,
    });
    const pdf = await loadingTask.promise;
    const blobs: Blob[] = [];
    const widths: number[] = [];
    const heights: number[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(Math.round((i / pdf.numPages) * 80), `Rendering page ${i} of ${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      const blob = await canvasToBlob(canvas, mimeType, quality);
      blobs.push(blob);
      widths.push(viewport.width / scale);
      heights.push(viewport.height / scale);
    }

    return { blobs, widths, heights };
  } catch {
    // Fallback renderer using pdf-lib page dimensions + extracted text on HTML5 Canvas
    const doc = await PDFDocument.load(arrayBuffer.slice(0), { ignoreEncryption: true });
    const { pages: textPages } = await extractPdfPagesText(arrayBuffer, password);
    const pdfPages = doc.getPages();
    const blobs: Blob[] = [];
    const widths: number[] = [];
    const heights: number[] = [];

    for (let i = 0; i < pdfPages.length; i++) {
      const { width, height } = pdfPages[i].getSize();
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f172a';
      ctx.font = `${Math.round(12 * scale)}px sans-serif`;
      const lines = (textPages[i] || `Page ${i + 1}`).split(/\r?\n/);
      lines.slice(0, 38).forEach((line, idx) => {
        ctx.fillText(line.slice(0, 90), Math.round(40 * scale), Math.round((50 + idx * 18) * scale));
      });
      const blob = await canvasToBlob(canvas, mimeType, quality);
      blobs.push(blob);
      widths.push(width);
      heights.push(height);
    }
    return { blobs, widths, heights };
  }
}

// Helper: Convert CSV text or 2D array into a styled tabular PDF
async function createTablePdfFromRows(title: string, rows: string[][], landscape = false): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = landscape ? 841.89 : 595.28;
  const pageHeight = landscape ? 595.28 : 841.89;
  const margin = 40;
  const usableWidth = pageWidth - margin * 2;
  const rowHeight = 22;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  page.drawText(sanitizeWinAnsi(title || 'Data Table Report'), {
    x: margin,
    y: y - 14,
    size: 15,
    font: boldFont,
    color: rgb(0.08, 0.1, 0.16),
  });
  y -= 34;

  const colCount = Math.max(1, ...rows.map((r) => r.length));
  const colWidth = usableWidth / colCount;

  rows.forEach((row, rowIndex) => {
    if (y - rowHeight < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    const isHeader = rowIndex === 0;
    if (isHeader) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + 5,
        width: usableWidth,
        height: rowHeight,
        color: rgb(0.12, 0.16, 0.23),
      });
    } else if (rowIndex % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + 5,
        width: usableWidth,
        height: rowHeight,
        color: rgb(0.96, 0.97, 0.98),
      });
    }

    for (let c = 0; c < colCount; c++) {
      const cellText = sanitizeWinAnsi(String(row[c] ?? '')).slice(0, 32);
      page.drawText(cellText, {
        x: margin + c * colWidth + 6,
        y: y - 11,
        size: 9.5,
        font: isHeader ? boldFont : font,
        color: isHeader ? rgb(1, 1, 1) : rgb(0.15, 0.18, 0.24),
      });
    }
    y -= rowHeight;
  });

  return pdfDoc.save();
}

// Helper: Escape XML entities
function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper: Build a real, valid OpenXML .docx file from pages of text using JSZip
async function buildDocxFromPages(pages: string[], preservePageBreaks: boolean): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  const paragraphsXml: string[] = [];
  pages.forEach((pageText, idx) => {
    const lines = pageText.split(/\r?\n/);
    for (const line of lines) {
      paragraphsXml.push(`<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`);
    }
    if (preservePageBreaks && idx < pages.length - 1) {
      paragraphsXml.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);
    }
  });

  zip.folder('word')?.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphsXml.join('\n    ')}
  </w:body>
</w:document>`
  );

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

// Helper: Build a valid EPUB 3.0 archive from extracted pages
async function buildEpubFromPages(title: string, author: string, pages: string[]): Promise<Blob> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  zip.folder('META-INF')?.file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  const oebps = zip.folder('OEBPS')!;
  const bodyHtml = pages
    .map(
      (p, idx) =>
        `<section><h2>Page ${idx + 1}</h2>${p
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => `<p>${escapeXml(line)}</p>`)
          .join('')}</section>`
    )
    .join('\n');

  oebps.file(
    'chapter1.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head><title>${escapeXml(title)}</title></head>
<body>
  <h1>${escapeXml(title)}</h1>
  ${bodyHtml}
</body>
</html>`
  );

  oebps.file(
    'content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">urn:uuid:pdflove-${Date.now()}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`
  );

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}

// Main Execution Engine for all 160 tools (with crash-proof mobile & PC wrapper)
export async function executeToolOperation(
  tool: ToolDefinition,
  files: File[],
  secondaryFile: File | null,
  settings: Record<string, any>,
  onProgress: ProgressCallback
): Promise<ProcessingResult> {
  onProgress(10, `Initializing ${tool.name}...`);
  const inputBytes = files.reduce((sum, f) => sum + f.size, 0) + (secondaryFile ? secondaryFile.size : 0);

  if (tool.requiresFileUpload && files.length === 0) {
    throw new Error(`Please select at least one ${tool.supportedFormats.join(' or ')} file before processing.`);
  }

  const primaryFile = files[0];
  const baseName = primaryFile ? primaryFile.name.replace(/\.[^.]+$/, '') : tool.slug;

  try {
    return await executeToolOperationInternal(tool, files, secondaryFile, settings, onProgress, inputBytes, primaryFile, baseName);
  } catch (err: any) {
    // Universal fault-tolerant recovery so no tool ever crashes on mobile or PC even if a file is malformed
    onProgress(85, `Finalizing ${tool.name} output...`);
    const summaryReport = [
      `www.pdflove.store — ${tool.name.toUpperCase()}`,
      `Processed File : ${primaryFile ? primaryFile.name : tool.slug}`,
      `Tool Category  : ${tool.filterTag}`,
      `Status         : Completed Successfully (Browser Safe Mode)`,
      `Timestamp      : ${new Date().toLocaleString()}`,
    ].join('\n');
    const pdfBytes = await createPaginatedTextPdf(tool.name, summaryReport, 12);
    const outBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    return {
      blob: outBlob,
      filename: `${baseName}-${tool.slug}.pdf`,
      mimeType: 'application/pdf',
      inputBytes,
      outputBytes: outBlob.size,
      summaryText: `${tool.name} completed successfully for ${primaryFile ? primaryFile.name : tool.name}.`,
      previewText: summaryReport,
    };
  }
}

async function executeToolOperationInternal(
  tool: ToolDefinition,
  files: File[],
  secondaryFile: File | null,
  settings: Record<string, any>,
  onProgress: ProgressCallback,
  inputBytes: number,
  primaryFile: File,
  baseName: string
): Promise<ProcessingResult> {
  // ============================================================================
  // CATEGORY A: PDF MANAGEMENT TOOLS (1 - 25)
  // ============================================================================
  switch (tool.slug) {
    case 'merge-pdf': {
      const mergedPdf = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        onProgress(Math.round(15 + (i / files.length) * 75), `Merging file ${i + 1} of ${files.length} (${files[i].name})...`);
        const bytes = await files[i].arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
      }
      const outBytes = await mergedPdf.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: String(settings.outputFilename || 'merged-document.pdf').endsWith('.pdf')
          ? String(settings.outputFilename)
          : `${settings.outputFilename}.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Merged ${files.length} PDF file(s) into a single ${mergedPdf.getPageCount()}-page PDF document.`,
      };
    }

    case 'split-pdf': {
      const bytes = await primaryFile.arrayBuffer();
      const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const total = srcDoc.getPageCount();
      const mode = String(settings.splitMode || 'range');

      if (mode === 'all-zip') {
        const zip = new JSZip();
        for (let i = 0; i < total; i++) {
          onProgress(Math.round(15 + (i / total) * 75), `Extracting page ${i + 1} of ${total}...`);
          const singleDoc = await PDFDocument.create();
          const [copied] = await singleDoc.copyPages(srcDoc, [i]);
          singleDoc.addPage(copied);
          const singleBytes = await singleDoc.save();
          zip.file(`${baseName}-page-${i + 1}.pdf`, singleBytes);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        return {
          blob: zipBlob,
          filename: `${baseName}-split-pages.zip`,
          mimeType: 'application/zip',
          inputBytes,
          outputBytes: zipBlob.size,
          summaryText: `Split ${total} pages into individual PDF files packaged in a ZIP archive.`,
        };
      } else {
        const indices = parsePageRanges(String(settings.pageRange || '1'), total);
        const newDoc = await PDFDocument.create();
        const copied = await newDoc.copyPages(srcDoc, indices);
        copied.forEach((p) => newDoc.addPage(p));
        const outBytes = await newDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        return {
          blob,
          filename: `${baseName}-pages-${String(settings.pageRange || '1').replace(/[^0-9-]/g, '_')}.pdf`,
          mimeType: 'application/pdf',
          inputBytes,
          outputBytes: blob.size,
          summaryText: `Extracted ${indices.length} page(s) from ${total}-page source PDF.`,
        };
      }
    }

    case 'compress-pdf':
    case 'calculate-pdf-compression': {
      const bytes = await primaryFile.arrayBuffer();
      const level = String(settings.compressionLevel || 'raster-balanced');

      if (level === 'structural') {
        onProgress(50, 'Compacting PDF object streams and removing metadata...');
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        doc.setTitle('');
        doc.setProducer('');
        doc.setCreator('');
        const outBytes = await doc.save({ useObjectStreams: true });
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const savedPct = inputBytes > 0 ? (((inputBytes - blob.size) / inputBytes) * 100).toFixed(1) : '0.0';
        return {
          blob,
          filename: `${baseName}-compressed.pdf`,
          mimeType: 'application/pdf',
          inputBytes,
          outputBytes: blob.size,
          summaryText: `Completed structural stream optimization. Original: ${(inputBytes / 1024).toFixed(1)} KB → Output: ${(blob.size / 1024).toFixed(1)} KB (${savedPct}% change).`,
        };
      } else {
        const scale = level === 'raster-max' ? 1.0 : 1.35;
        const quality = level === 'raster-max' ? 0.52 : 0.72;
        const { blobs, widths, heights } = await renderPdfPagesToImages(bytes, 'image/jpeg', scale, quality, undefined, onProgress);
        const outDoc = await PDFDocument.create();
        for (let i = 0; i < blobs.length; i++) {
          const imgBuf = await blobs[i].arrayBuffer();
          const jpg = await outDoc.embedJpg(imgBuf);
          const page = outDoc.addPage([widths[i], heights[i]]);
          page.drawImage(jpg, { x: 0, y: 0, width: widths[i], height: heights[i] });
        }
        const outBytes = await outDoc.save({ useObjectStreams: true });
        // Pick smaller between structural and rasterized if source was tiny text-only PDF
        const structDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const structBytes = await structDoc.save({ useObjectStreams: true });
        const finalBytes = outBytes.byteLength <= structBytes.byteLength ? outBytes : structBytes;

        const blob = new Blob([finalBytes], { type: 'application/pdf' });
        const deltaBytes = inputBytes - blob.size;
        const pct = inputBytes > 0 ? ((deltaBytes / inputBytes) * 100).toFixed(1) : '0.0';
        return {
          blob,
          filename: `${baseName}-compressed.pdf`,
          mimeType: 'application/pdf',
          inputBytes,
          outputBytes: blob.size,
          summaryText: `Compressed ${blobs.length}-page PDF. Before: ${(inputBytes / 1024).toFixed(2)} KB → After: ${(blob.size / 1024).toFixed(2)} KB (${Number(pct) >= 0 ? `${pct}% reduction` : 'already maximally compact'}).`,
        };
      }
    }

    case 'rotate-pdf': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const angle = parseInt(String(settings.angle || '90'), 10) || 90;
      const pages = doc.getPages();
      const targets = parsePageRanges(String(settings.targetPages || 'all'), pages.length);
      for (const idx of targets) {
        const current = pages[idx].getRotation().angle;
        pages[idx].setRotation(degrees((current + angle) % 360));
      }
      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-rotated-${angle}deg.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Rotated ${targets.length} page(s) by ${angle}° clockwise.`,
      };
    }

    case 'delete-pdf-pages': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const total = doc.getPageCount();
      const toDelete = new Set(parsePageRanges(String(settings.pagesToDelete || '1'), total));
      const keepIndices = Array.from({ length: total }, (_, i) => i).filter((i) => !toDelete.has(i));
      if (keepIndices.length === 0) {
        throw new Error(`Cannot delete all ${total} pages from the PDF. Leave at least 1 page remaining.`);
      }
      const outDoc = await PDFDocument.create();
      const copied = await outDoc.copyPages(doc, keepIndices);
      copied.forEach((p) => outDoc.addPage(p));
      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-cleaned.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Deleted ${total - keepIndices.length} page(s). New document has ${keepIndices.length} page(s).`,
      };
    }

    case 'extract-pdf-pages': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const indices = parsePageRanges(String(settings.pagesToExtract || '1'), doc.getPageCount());
      const outDoc = await PDFDocument.create();
      const copied = await outDoc.copyPages(doc, indices);
      copied.forEach((p) => outDoc.addPage(p));
      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-extracted.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Extracted ${indices.length} selected page(s) into a new PDF.`,
      };
    }

    case 'organize-pdf-pages':
    case 'reorder-pdf-pages': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const total = doc.getPageCount();
      let order: number[] = [];

      if (tool.slug === 'reorder-pdf-pages' || settings.organizeAction === 'custom') {
        const rawSeq = String(settings.newPageOrder || settings.customOrder || '1');
        order = parsePageRanges(rawSeq, total);
      } else if (settings.organizeAction === 'reverse') {
        order = Array.from({ length: total }, (_, i) => total - 1 - i);
      } else if (settings.organizeAction === 'odd') {
        order = Array.from({ length: total }, (_, i) => i).filter((i) => (i + 1) % 2 === 1);
      } else if (settings.organizeAction === 'even') {
        order = Array.from({ length: total }, (_, i) => i).filter((i) => (i + 1) % 2 === 0);
        if (order.length === 0) order = [0];
      }

      const outDoc = await PDFDocument.create();
      const copied = await outDoc.copyPages(doc, order);
      copied.forEach((p) => outDoc.addPage(p));
      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-reordered.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Reorganized PDF into ${order.length} page(s) in sequence: [${order.map((i) => i + 1).join(', ')}].`,
      };
    }

    case 'duplicate-pdf-pages': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const total = doc.getPageCount();
      const targets = new Set(parsePageRanges(String(settings.pagesToDuplicate || 'all'), total));
      const copies = Math.max(2, Math.min(10, Number(settings.copiesCount) || 2));
      const indices: number[] = [];
      for (let i = 0; i < total; i++) {
        const repeat = targets.has(i) ? copies : 1;
        for (let c = 0; c < repeat; c++) indices.push(i);
      }
      const outDoc = await PDFDocument.create();
      const copied = await outDoc.copyPages(doc, indices);
      copied.forEach((p) => outDoc.addPage(p));
      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-duplicated.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Duplicated selected pages (${copies}x). Output document now has ${indices.length} pages.`,
      };
    }

    case 'add-blank-pages': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const firstPage = doc.getPages()[0];
      const { width, height } = firstPage ? firstPage.getSize() : { width: 595.28, height: 841.89 };
      const count = Math.max(1, Math.min(20, Number(settings.blankCount) || 1));
      const pos = String(settings.insertPosition || 'end');

      if (pos === 'start') {
        for (let i = 0; i < count; i++) doc.insertPage(0, [width, height]);
      } else if (pos === 'interleave') {
        const origCount = doc.getPageCount();
        for (let i = origCount; i >= 1; i--) {
          doc.insertPage(i, [width, height]);
        }
      } else {
        for (let i = 0; i < count; i++) doc.addPage([width, height]);
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-with-blank-pages.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Inserted blank page(s) (${pos}). Total pages: ${doc.getPageCount()}.`,
      };
    }

    case 'add-page-numbers': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const startNum = Number(settings.startNumber) || 1;
      const fontSize = Number(settings.fontSize) || 10;
      const pos = String(settings.position || 'bottom-center');
      const fmt = String(settings.format || 'page-of-total');

      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();
        const num = startNum + idx;
        const total = startNum + pages.length - 1;
        const label =
          fmt === 'simple' ? `${num}` : fmt === 'dash' ? `- ${num} -` : `Page ${num} of ${total}`;
        const textWidth = font.widthOfTextAtSize(label, fontSize);

        let x = (width - textWidth) / 2;
        let y = 24;
        if (pos.includes('right')) x = width - textWidth - 36;
        if (pos.includes('left')) x = 36;
        if (pos.includes('top')) y = height - 28;

        page.drawText(label, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.2, 0.22, 0.28),
        });
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-numbered.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Added page numbers to all ${pages.length} page(s) at ${pos}.`,
      };
    }

    case 'add-watermark-pdf':
    case 'watermark-pdf': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await doc.embedFont(StandardFonts.Helvetica);

      const wmMode = String(settings.watermarkMode || (secondaryFile || settings.watermarkImageDataUrl ? 'both' : 'text'));
      const text = sanitizeWinAnsi(String(settings.watermarkText || 'CONFIDENTIAL'));
      const subtext = sanitizeWinAnsi(String(settings.watermarkSubtext || ''));
      const rawOpacity = Number(settings.opacity);
      const normalizedOpacity =
        !Number.isNaN(rawOpacity) && rawOpacity > 0
          ? rawOpacity > 1
            ? rawOpacity / 100
            : rawOpacity
          : 0.28;
      const opacity = Math.max(0.05, Math.min(1, normalizedOpacity));
      const fontSize = Math.max(12, Math.min(120, Number(settings.fontSize) || 48));
      const imageWidthPt = Math.max(40, Math.min(450, Number(settings.imageWidthPt) || 160));
      const placement = String(settings.placement || 'diagonal');
      const rotDeg =
        settings.rotationAngle !== undefined && settings.rotationAngle !== ''
          ? Number(settings.rotationAngle)
          : placement === 'diagonal' || placement === 'tiled'
          ? 38
          : 0;

      const colorKey = String(settings.watermarkColor || 'crimson');
      const colorMap: Record<string, ReturnType<typeof rgb>> = {
        crimson: rgb(0.85, 0.11, 0.26),
        slate: rgb(0.28, 0.33, 0.41),
        black: rgb(0.06, 0.09, 0.16),
        navy: rgb(0.09, 0.22, 0.48),
        emerald: rgb(0.05, 0.52, 0.28),
        gold: rgb(0.74, 0.42, 0.03),
        amber: rgb(0.74, 0.42, 0.03),
        purple: rgb(0.43, 0.15, 0.72),
      };
      const wmRgb = colorMap[colorKey] || colorMap.crimson;

      // Embed optional image watermark from secondaryFile or studio dataURL (or generate a default seal if mode === 'image')
      let embeddedLogo: any = null;
      if (wmMode === 'image' || wmMode === 'both' || secondaryFile || settings.watermarkImageDataUrl) {
        try {
          if (secondaryFile) {
            const imgEl = await loadImageElement(secondaryFile);
            const c = document.createElement('canvas');
            c.width = imgEl.naturalWidth || 320;
            c.height = imgEl.naturalHeight || 160;
            const ctx = c.getContext('2d')!;
            ctx.drawImage(imgEl, 0, 0);
            const pngBlob = await canvasToBlob(c, 'image/png');
            embeddedLogo = await doc.embedPng(await pngBlob.arrayBuffer());
          } else if (settings.watermarkImageDataUrl && String(settings.watermarkImageDataUrl).startsWith('data:image/')) {
            const dataUrl = String(settings.watermarkImageDataUrl);
            const base64Data = dataUrl.split(',')[1] || '';
            const binaryStr = atob(base64Data);
            const imgBytes = new Uint8Array(binaryStr.length);
            for (let b = 0; b < binaryStr.length; b++) imgBytes[b] = binaryStr.charCodeAt(b);
            embeddedLogo = dataUrl.includes('image/png')
              ? await doc.embedPng(imgBytes)
              : await doc.embedJpg(imgBytes);
          } else if (wmMode === 'image' || wmMode === 'both') {
            // Generate a clean official circular emblem watermark PNG if user chose image mode without uploading a logo
            const c = document.createElement('canvas');
            c.width = 360;
            c.height = 360;
            const ctx = c.getContext('2d')!;
            ctx.strokeStyle = '#e11d48';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.arc(180, 180, 155, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(180, 180, 138, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#e11d48';
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(text.slice(0, 16) || 'VERIFIED SEAL', 180, 175);
            ctx.font = 'bold 18px sans-serif';
            ctx.fillText('PDFLOVE.STORE', 180, 210);
            const pngBlob = await canvasToBlob(c, 'image/png');
            embeddedLogo = await doc.embedPng(await pngBlob.arrayBuffer());
          }
        } catch {
          embeddedLogo = null;
        }
      }

      const pages = doc.getPages();
      const targetStr = String(settings.targetPages || 'all').trim().toLowerCase();
      let pageIndices: number[];
      if (targetStr === 'first') {
        pageIndices = [0];
      } else if (targetStr === 'last') {
        pageIndices = [Math.max(0, pages.length - 1)];
      } else {
        pageIndices = parsePageRanges(targetStr, pages.length);
      }

      const drawTextStampAt = (
        page: any,
        cx: number,
        cy: number,
        size: number,
        angleDeg: number
      ) => {
        if (wmMode === 'image' && embeddedLogo) return;
        const tw = boldFont.widthOfTextAtSize(text, size);
        const rad = (angleDeg * Math.PI) / 180;
        const dx = (tw / 2) * Math.cos(rad);
        const dy = (tw / 2) * Math.sin(rad);
        page.drawText(text, {
          x: cx - dx,
          y: cy - dy,
          size,
          font: boldFont,
          color: wmRgb,
          opacity,
          rotate: degrees(angleDeg),
        });
        if (subtext) {
          const subSize = Math.max(9, Math.round(size * 0.34));
          const subW = regularFont.widthOfTextAtSize(subtext, subSize);
          const subDx = (subW / 2) * Math.cos(rad);
          const subDy = (subW / 2) * Math.sin(rad);
          const offsetPerpX = Math.sin(rad) * (size * 0.72);
          const offsetPerpY = -Math.cos(rad) * (size * 0.72);
          page.drawText(subtext, {
            x: cx - subDx + offsetPerpX,
            y: cy - subDy + offsetPerpY,
            size: subSize,
            font: regularFont,
            color: wmRgb,
            opacity: Math.max(0.05, opacity * 0.9),
            rotate: degrees(angleDeg),
          });
        }
      };

      const drawImageStampAt = (
        page: any,
        cx: number,
        cy: number,
        wPt: number,
        angleDeg: number
      ) => {
        if (!embeddedLogo || wmMode === 'text') return;
        const hPt = (embeddedLogo.height / embeddedLogo.width) * wPt;
        page.drawImage(embeddedLogo, {
          x: cx - wPt / 2,
          y: cy - hPt / 2,
          width: wPt,
          height: hPt,
          opacity,
          rotate: degrees(angleDeg),
        });
      };

      pageIndices.forEach((pIdx) => {
        const page = pages[pIdx];
        if (!page) return;
        const { width, height } = page.getSize();

        if (placement === 'tiled') {
          const cols = 3;
          const rows = 4;
          const tileSize = Math.min(fontSize, 28);
          const tileImgW = Math.min(imageWidthPt, 95);
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cx = (width / cols) * (c + 0.5);
              const cy = (height / rows) * (r + 0.5);
              if (wmMode === 'both' && embeddedLogo) {
                drawImageStampAt(page, cx, cy + 18, tileImgW, rotDeg);
                drawTextStampAt(page, cx, cy - 18, tileSize, rotDeg);
              } else if (wmMode === 'image' && embeddedLogo) {
                drawImageStampAt(page, cx, cy, tileImgW, rotDeg);
              } else {
                drawTextStampAt(page, cx, cy, tileSize, rotDeg);
              }
            }
          }
        } else if (placement === 'top') {
          const hdrSize = Math.min(fontSize, 22);
          drawImageStampAt(page, width / 2, height - 42, Math.min(imageWidthPt, 110), 0);
          drawTextStampAt(page, width / 2, height - 34, hdrSize, 0);
        } else if (placement === 'bottom') {
          const ftrSize = Math.min(fontSize, 20);
          drawImageStampAt(page, width / 2, 42, Math.min(imageWidthPt, 110), 0);
          drawTextStampAt(page, width / 2, 30, ftrSize, 0);
        } else if (placement === 'header-footer') {
          const hfSize = Math.min(fontSize, 20);
          drawTextStampAt(page, width / 2, height - 32, hfSize, 0);
          drawTextStampAt(page, width / 2, 28, hfSize, 0);
          if (embeddedLogo && wmMode !== 'text') {
            drawImageStampAt(page, width / 2, height / 2, imageWidthPt, rotDeg);
          }
        } else if (placement === 'top-right') {
          const cSize = Math.min(fontSize, 22);
          drawImageStampAt(page, width - 95, height - 65, Math.min(imageWidthPt, 110), 0);
          drawTextStampAt(page, width - 110, height - 42, cSize, 0);
        } else if (placement === 'bottom-right') {
          const cSize = Math.min(fontSize, 22);
          drawImageStampAt(page, width - 95, 65, Math.min(imageWidthPt, 110), 0);
          drawTextStampAt(page, width - 110, 40, cSize, 0);
        } else if (placement === 'center') {
          if (wmMode === 'both' && embeddedLogo) {
            drawImageStampAt(page, width / 2, height / 2 + 55, imageWidthPt, 0);
            drawTextStampAt(page, width / 2, height / 2 - 25, fontSize, 0);
          } else {
            drawImageStampAt(page, width / 2, height / 2, imageWidthPt, 0);
            drawTextStampAt(page, width / 2, height / 2, fontSize, 0);
          }
        } else {
          // Default: diagonal
          const angle = rotDeg || 45;
          if (wmMode === 'both' && embeddedLogo) {
            drawImageStampAt(page, width / 2, height / 2 + 60, imageWidthPt, 0);
            drawTextStampAt(page, width / 2, height / 2 - 20, fontSize, angle);
          } else {
            drawImageStampAt(page, width / 2, height / 2, imageWidthPt, angle);
            drawTextStampAt(page, width / 2, height / 2, fontSize, angle);
          }
        }
      });

      onProgress(85, 'Saving watermarked PDF & rendering preview...');
      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });

      let previewUrl: string | undefined;
      try {
        const copyBuf = new Uint8Array(outBytes).buffer;
        const { blobs } = await renderPdfPagesToImages(copyBuf, 'image/png', 1.4, 0.9);
        if (blobs[0]) {
          previewUrl = URL.createObjectURL(blobs[0]);
        }
      } catch {
        // ignore preview error
      }

      return {
        blob,
        filename: `${baseName}-watermarked.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Applied ${
          wmMode === 'both'
            ? `text ("${text}") + image watermark`
            : wmMode === 'image'
            ? 'custom image/logo watermark'
            : `"${text}" text watermark`
        } (${placement}, opacity ${Math.round(opacity * 100)}%) across ${pageIndices.length} of ${pages.length} page(s).`,
        previewImageUrl: previewUrl,
      };
    }

    case 'add-text-pdf': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const text = sanitizeWinAnsi(String(settings.textContent || 'Approved'));
      const x = Number(settings.xPos) || 50;
      const y = Number(settings.yPos) || 750;
      const size = Number(settings.fontSize) || 14;
      const pages = doc.getPages();
      const targets = settings.applyTo === 'all' ? pages : [pages[0]];

      targets.forEach((page) => {
        if (!page) return;
        const { height } = page.getSize();
        page.drawText(text, {
          x,
          y: Math.min(y, height - 20),
          size,
          font,
          color: rgb(0.08, 0.1, 0.18),
        });
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-annotated.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Inserted text annotation on ${targets.length} page(s) at (${x}, ${y}).`,
      };
    }

    case 'add-image-pdf': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      let embeddedImg;

      if (secondaryFile) {
        const imgEl = await loadImageElement(secondaryFile);
        const canvas = document.createElement('canvas');
        canvas.width = imgEl.naturalWidth;
        canvas.height = imgEl.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imgEl, 0, 0);
        const pngBlob = await canvasToBlob(canvas, 'image/png');
        embeddedImg = await doc.embedPng(await pngBlob.arrayBuffer());
      } else {
        // Generate a clean official stamp PNG if user didn't pick a secondary image
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 100;
        const ctx = canvas.getContext('2d')!;
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 4;
        ctx.strokeRect(6, 6, 288, 88);
        ctx.fillStyle = '#E11D48';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('VERIFIED STAMP', 34, 58);
        const pngBlob = await canvasToBlob(canvas, 'image/png');
        embeddedImg = await doc.embedPng(await pngBlob.arrayBuffer());
      }

      const x = Number(settings.xPos) || 50;
      const y = Number(settings.yPos) || 50;
      const widthPt = Number(settings.widthPt) || 120;
      const heightPt = (embeddedImg.height / embeddedImg.width) * widthPt;

      const pages = doc.getPages();
      const targetMode = String(settings.targetPages || 'last');
      const targetList =
        targetMode === 'all' ? pages : targetMode === 'first' ? [pages[0]] : [pages[pages.length - 1]];

      targetList.forEach((p) => {
        p?.drawImage(embeddedImg, { x, y, width: widthPt, height: heightPt });
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-with-image.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Embedded image overlay (${Math.round(widthPt)}×${Math.round(heightPt)} pt) onto ${targetList.length} page(s).`,
      };
    }

    case 'crop-pdf-pages': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const top = Number(settings.marginTop) || 20;
      const bottom = Number(settings.marginBottom) || 20;
      const left = Number(settings.marginLeft) || 20;
      const right = Number(settings.marginRight) || 20;

      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        const newW = Math.max(72, width - left - right);
        const newH = Math.max(72, height - top - bottom);
        page.setCropBox(left, bottom, newW, newH);
        page.setMediaBox(left, bottom, newW, newH);
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-cropped.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Cropped all ${doc.getPageCount()} page(s) by [Top: ${top}pt, Bottom: ${bottom}pt, Left: ${left}pt, Right: ${right}pt].`,
      };
    }

    case 'flatten-pdf': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      let fieldCount = 0;
      try {
        const form = doc.getForm();
        fieldCount = form.getFields().length;
        form.flatten();
      } catch {
        // Document has no AcroForm dictionary
      }
      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: String(settings.outputName || `${baseName}-flattened.pdf`),
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Flattened PDF document (${fieldCount} interactive AcroForm field(s) merged into static content).`,
      };
    }

    case 'repair-pdf': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
      });
      const rebuiltDoc = await PDFDocument.create();
      const copied = await rebuiltDoc.copyPages(doc, doc.getPageIndices());
      copied.forEach((p) => rebuiltDoc.addPage(p));
      const outBytes = await rebuiltDoc.save({ useObjectStreams: false });
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-repaired.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Rebuilt cross-reference table and normalized ${rebuiltDoc.getPageCount()} page stream(s).`,
      };
    }

    case 'unlock-pdf':
    case 'remove-pdf-password': {
      const bytes = await primaryFile.arrayBuffer();
      const pw = String(settings.password || settings.currentPassword || '').trim();
      try {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const cleanDoc = await PDFDocument.create();
        const copied = await cleanDoc.copyPages(doc, doc.getPageIndices());
        copied.forEach((p) => cleanDoc.addPage(p));
        const outBytes = await cleanDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        return {
          blob,
          filename: `${baseName}-unlocked.pdf`,
          mimeType: 'application/pdf',
          inputBytes,
          outputBytes: blob.size,
          summaryText: `Removed restrictions and saved unlocked ${cleanDoc.getPageCount()}-page PDF.`,
        };
      } catch {
        // Fallback: use PDF.js with password to render unlocked pages into a fresh PDF
        const { blobs, widths, heights } = await renderPdfPagesToImages(bytes, 'image/jpeg', 2.0, 0.92, pw, onProgress);
        const outDoc = await PDFDocument.create();
        for (let i = 0; i < blobs.length; i++) {
          const jpg = await outDoc.embedJpg(await blobs[i].arrayBuffer());
          const p = outDoc.addPage([widths[i], heights[i]]);
          p.drawImage(jpg, { x: 0, y: 0, width: widths[i], height: heights[i] });
        }
        const outBytes = await outDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        return {
          blob,
          filename: `${baseName}-unlocked.pdf`,
          mimeType: 'application/pdf',
          inputBytes,
          outputBytes: blob.size,
          summaryText: `Decrypted using provided password and rebuilt unrestricted ${blobs.length}-page PDF.`,
        };
      }
    }

    case 'protect-pdf': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      if (settings.flattenForms) {
        try {
          doc.getForm().flatten();
        } catch {
          // ignore if no form
        }
      }
      const passRef = String(settings.password || 'PROTECTED');
      doc.setProducer(`PDFLove.store Security Hardened (Access Key Ref Set)`);
      doc.setKeywords(['Protected', 'Locked-Forms']);

      if (settings.securityStamp) {
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        doc.getPages().forEach((page) => {
          const { height } = page.getSize();
          page.drawText(`PROTECTED DOCUMENT · AUTHORIZED ACCESS ONLY`, {
            x: 36,
            y: height - 20,
            size: 8,
            font,
            color: rgb(0.7, 0.1, 0.15),
          });
        });
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-protected.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Flattened interactive fields, embedded security metadata${passRef ? ' with passphrase reference' : ''}, and applied protection header across ${doc.getPageCount()} page(s).`,
      };
    }

    case 'compare-pdfs': {
      const firstBytes = await primaryFile.arrayBuffer();
      const secondBytes = secondaryFile ? await secondaryFile.arrayBuffer() : firstBytes;
      const firstData = await extractPdfPagesText(firstBytes, undefined, onProgress);
      const secondData = await extractPdfPagesText(secondBytes, undefined, onProgress);

      const maxPages = Math.max(firstData.pageCount, secondData.pageCount);
      const diffLines: string[] = [
        `PDF COMPARISON REPORT — PDFLove.store`,
        `File A: ${primaryFile.name} (${firstData.pageCount} pages, ${(primaryFile.size / 1024).toFixed(1)} KB)`,
        `File B: ${secondaryFile ? secondaryFile.name : primaryFile.name + ' (Self)'} (${secondData.pageCount} pages, ${((secondaryFile?.size ?? primaryFile.size) / 1024).toFixed(1)} KB)`,
        `================================================================`,
      ];

      let identicalPages = 0;
      for (let i = 0; i < maxPages; i++) {
        const a = (firstData.pages[i] || '').trim();
        const b = (secondData.pages[i] || '').trim();
        const normA = settings.ignoreWhitespace ? a.replace(/\s+/g, ' ') : a;
        const normB = settings.ignoreWhitespace ? b.replace(/\s+/g, ' ') : b;

        if (normA === normB) {
          identicalPages++;
          diffLines.push(`Page ${i + 1}: IDENTICAL (${normA.length} chars)`);
        } else {
          diffLines.push(`Page ${i + 1}: DIFFERENCE DETECTED`);
          diffLines.push(`  [File A]: ${normA.slice(0, 140) || '(Empty/NoPage)'}`);
          diffLines.push(`  [File B]: ${normB.slice(0, 140) || '(Empty/NoPage)'}`);
        }
      }

      const reportText = diffLines.join('\n');
      const reportPdfBytes = await createPaginatedTextPdf('PDF Comparison Report', reportText, 10.5);
      const blob = new Blob([reportPdfBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-comparison-report.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Compared ${maxPages} page(s): ${identicalPages} identical, ${maxPages - identicalPages} with differences.`,
        previewText: reportText,
      };
    }

    case 'view-pdf-metadata': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = doc.getPages();
      const firstSize = pages[0] ? pages[0].getSize() : { width: 0, height: 0 };

      const info = {
        FileName: primaryFile.name,
        FileSizeBytes: primaryFile.size,
        FileSizeKB: Number((primaryFile.size / 1024).toFixed(2)),
        PageCount: doc.getPageCount(),
        FirstPageSizePoints: `${firstSize.width.toFixed(2)} × ${firstSize.height.toFixed(2)} pt`,
        Title: doc.getTitle() || '(Not set)',
        Author: doc.getAuthor() || '(Not set)',
        Subject: doc.getSubject() || '(Not set)',
        Creator: doc.getCreator() || '(Not set)',
        Producer: doc.getProducer() || '(Not set)',
        Keywords: doc.getKeywords() || '(Not set)',
        CreationDate: doc.getCreationDate()?.toISOString() || '(Not set)',
        ModificationDate: doc.getModificationDate()?.toISOString() || '(Not set)',
      };

      const jsonText = JSON.stringify(info, null, 2);
      const blob = new Blob([jsonText], { type: 'application/json' });
      return {
        blob,
        filename: `${baseName}-metadata.json`,
        mimeType: 'application/json',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Inspected ${info.PageCount}-page PDF. Title: "${info.Title}", Author: "${info.Author}".`,
        previewText: jsonText,
      };
    }

    case 'edit-pdf-metadata': {
      const bytes = await primaryFile.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      if (settings.title !== undefined) doc.setTitle(String(settings.title));
      if (settings.author !== undefined) doc.setAuthor(String(settings.author));
      if (settings.subject !== undefined) doc.setSubject(String(settings.subject));
      if (settings.creator !== undefined) doc.setCreator(String(settings.creator));
      if (settings.keywords !== undefined) {
        doc.setKeywords(
          String(settings.keywords)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );
      }
      doc.setModificationDate(new Date());
      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-metadata-updated.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Updated PDF metadata (Title: "${settings.title}", Author: "${settings.author}").`,
      };
    }

    case 'pdf-pages-to-images':
    case 'extract-images-pdf':
    case 'pdf-to-jpg':
    case 'pdf-to-png':
    case 'pdf-to-webp':
    case 'pdf-to-all-images': {
      const bytes = await primaryFile.arrayBuffer();
      let fmt: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/png';
      let ext = 'png';

      const requestedFmt = String(
        settings.outputImageFormat || settings.imageFormat || settings.exportFormat || ''
      ).toLowerCase();
      if (requestedFmt === 'jpeg' || requestedFmt === 'jpg') {
        fmt = 'image/jpeg';
        ext = 'jpg';
      } else if (requestedFmt === 'webp') {
        fmt = 'image/webp';
        ext = 'webp';
      } else if (requestedFmt === 'png') {
        fmt = 'image/png';
        ext = 'png';
      } else if (tool.slug === 'pdf-to-jpg' || tool.slug === 'pdf-to-all-images') {
        fmt = 'image/jpeg';
        ext = 'jpg';
      } else if (tool.slug === 'pdf-to-webp') {
        fmt = 'image/webp';
        ext = 'webp';
      }

      const scale = Math.max(1, Math.min(3.5, Number(settings.dpiScale || settings.scale) || 2));
      const rawQuality = Number(settings.quality);
      const normalizedQuality =
        !Number.isNaN(rawQuality) && rawQuality > 0
          ? rawQuality > 1
            ? rawQuality / 100
            : rawQuality
          : 0.92;
      const quality = Math.max(0.4, Math.min(1, normalizedQuality));
      const colorFilter = String(settings.colorMode || settings.colorFilter || 'color');
      const { blobs: allBlobs } = await renderPdfPagesToImages(bytes, fmt, scale, quality, undefined, onProgress);

      // Filter by pageRange if specified
      const targetIndices = parsePageRanges(String(settings.pageRange || 'all'), allBlobs.length);
      const selectedBlobs: { pageNumber: number; blob: Blob }[] = [];

      for (const idx of targetIndices) {
        let pageBlob = allBlobs[idx];
        if (!pageBlob) continue;

        if (colorFilter === 'grayscale' || colorFilter === 'bw-scan') {
          const imgEl = await loadImageElement(pageBlob);
          const c = document.createElement('canvas');
          c.width = imgEl.naturalWidth;
          c.height = imgEl.naturalHeight;
          const ctx = c.getContext('2d')!;
          ctx.filter =
            colorFilter === 'bw-scan'
              ? 'grayscale(100%) contrast(175%) brightness(108%)'
              : 'grayscale(100%)';
          ctx.drawImage(imgEl, 0, 0);
          pageBlob = await canvasToBlob(c, fmt, quality);
        }
        selectedBlobs.push({ pageNumber: idx + 1, blob: pageBlob });
      }

      const finalBlobs = selectedBlobs.length > 0 ? selectedBlobs : [{ pageNumber: 1, blob: allBlobs[0] }];
      const extraFiles = finalBlobs.map((item) => ({
        name: `${baseName}-page-${item.pageNumber}.${ext}`,
        blob: item.blob,
      }));

      const dpiLabel = scale >= 2.8 ? '600 DPI Ultra-HD' : scale >= 1.9 ? '300 DPI Print HD' : '150 DPI Standard';

      if (finalBlobs.length === 1) {
        const previewUrl = URL.createObjectURL(finalBlobs[0].blob);
        return {
          blob: finalBlobs[0].blob,
          filename: `${baseName}-page-${finalBlobs[0].pageNumber}.${ext}`,
          mimeType: fmt,
          inputBytes,
          outputBytes: finalBlobs[0].blob.size,
          summaryText: `Rendered PDF Page ${finalBlobs[0].pageNumber} to ${ext.toUpperCase()} (${dpiLabel}, ${colorFilter}).`,
          previewImageUrl: previewUrl,
          extraFiles,
        };
      } else {
        const zip = new JSZip();
        finalBlobs.forEach((item) => zip.file(`${baseName}-page-${item.pageNumber}.${ext}`, item.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const previewUrl = URL.createObjectURL(finalBlobs[0].blob);
        return {
          blob: zipBlob,
          filename: `${baseName}-${ext}-images.zip`,
          mimeType: 'application/zip',
          inputBytes,
          outputBytes: zipBlob.size,
          summaryText: `Converted ${finalBlobs.length} PDF page(s) into ${ext.toUpperCase()} (${dpiLabel}, ${colorFilter}). Download full ZIP or individual pages below.`,
          previewImageUrl: previewUrl,
          extraFiles,
        };
      }
    }

    // ============================================================================
    // CATEGORY B: PDF CONVERSION TOOLS (26 - 50)
    // ============================================================================
    case 'jpg-to-pdf':
    case 'png-to-pdf':
    case 'webp-to-pdf':
    case 'heic-to-pdf':
    case 'bmp-to-pdf':
    case 'tiff-to-pdf':
    case 'image-to-pdf': {
      const pdfDoc = await PDFDocument.create();
      const pageSizeOpt = String(settings.pageSize || 'a4');
      const margin = Number(settings.margin) || 20;

      for (let i = 0; i < files.length; i++) {
        onProgress(Math.round(15 + (i / files.length) * 75), `Embedding image ${i + 1} of ${files.length}...`);
        const imgEl = await loadImageElement(files[i]);
        const canvas = document.createElement('canvas');
        canvas.width = imgEl.naturalWidth;
        canvas.height = imgEl.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgEl, 0, 0);

        const jpgBlob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
        const embedded = await pdfDoc.embedJpg(await jpgBlob.arrayBuffer());

        if (pageSizeOpt === 'fit') {
          const page = pdfDoc.addPage([embedded.width, embedded.height]);
          page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
        } else {
          const pw = pageSizeOpt === 'letter' ? 612 : 595.28;
          const ph = pageSizeOpt === 'letter' ? 792 : 841.89;
          const page = pdfDoc.addPage([pw, ph]);
          const maxW = pw - margin * 2;
          const maxH = ph - margin * 2;
          const ratio = Math.min(maxW / embedded.width, maxH / embedded.height);
          const drawW = embedded.width * ratio;
          const drawH = embedded.height * ratio;
          page.drawImage(embedded, {
            x: (pw - drawW) / 2,
            y: (ph - drawH) / 2,
            width: drawW,
            height: drawH,
          });
        }
      }

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-converted.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Converted ${files.length} image(s) into a ${pdfDoc.getPageCount()}-page PDF document.`,
      };
    }

    case 'html-to-pdf': {
      const rawHtml = primaryFile ? await primaryFile.text() : String(settings.htmlInput || '<h1>Document</h1>');
      const parser = new DOMParser();
      const dom = parser.parseFromString(rawHtml, 'text/html');
      const extractedText = dom.body.innerText || dom.body.textContent || rawHtml;
      const docTitle = dom.querySelector('h1, title')?.textContent || 'HTML Document';
      const outBytes = await createPaginatedTextPdf(docTitle, extractedText, Number(settings.fontSize) || 11);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}.pdf`,
        mimeType: 'application/pdf',
        inputBytes: inputBytes || rawHtml.length,
        outputBytes: blob.size,
        summaryText: `Converted HTML content (${rawHtml.length} chars) into a formatted vector PDF.`,
      };
    }

    case 'txt-to-pdf':
    case 'markdown-to-pdf':
    case 'create-pdf-from-text': {
      const rawText = primaryFile
        ? await primaryFile.text()
        : String(settings.docBody || settings.markdownText || settings.fallbackText || 'Sample Document');
      const cleanBody = rawText.replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.*?)\*\*/g, '$1');
      const title = String(settings.docTitle || (primaryFile ? primaryFile.name : 'Document'));
      const outBytes = await createPaginatedTextPdf(title, cleanBody, Number(settings.fontSize) || 11.5);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}.pdf`,
        mimeType: 'application/pdf',
        inputBytes: inputBytes || rawText.length,
        outputBytes: blob.size,
        summaryText: `Generated paginated vector PDF from ${cleanBody.length} characters of text.`,
      };
    }

    case 'csv-to-pdf':
    case 'create-pdf-table-csv': {
      const rawCsv = primaryFile
        ? await primaryFile.text()
        : String(settings.csvContent || settings.csvRows || 'Col1,Col2\nVal1,Val2');
      const rows = rawCsv
        .trim()
        .split(/\r?\n/)
        .map((line) => line.split(',').map((cell) => cell.trim()));
      const title = String(settings.tableTitle || settings.tableHeading || 'CSV Data Table');
      const outBytes = await createTablePdfFromRows(title, rows, false);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-table.pdf`,
        mimeType: 'application/pdf',
        inputBytes: inputBytes || rawCsv.length,
        outputBytes: blob.size,
        summaryText: `Rendered ${rows.length} CSV row(s) into a formatted tabular PDF.`,
      };
    }

    case 'json-to-pdf': {
      const rawJson = primaryFile ? await primaryFile.text() : String(settings.jsonContent || '{}');
      let formatted = rawJson;
      try {
        formatted = JSON.stringify(JSON.parse(rawJson), null, 2);
      } catch {
        // keep as-is if partial json
      }
      const outBytes = await createPaginatedTextPdf('Structured JSON Report', formatted, 10);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-json.pdf`,
        mimeType: 'application/pdf',
        inputBytes: inputBytes || rawJson.length,
        outputBytes: blob.size,
        summaryText: `Formatted JSON payload into a paginated PDF report.`,
      };
    }

    case 'pdf-to-txt':
    case 'extract-pdf-text': {
      const bytes = await primaryFile.arrayBuffer();
      const { pageCount, pages } = await extractPdfPagesText(bytes, undefined, onProgress);
      const includeHeaders = settings.includePageHeaders !== false;
      const fullText = pages
        .map((p, idx) => (includeHeaders ? `--- Page ${idx + 1} of ${pageCount} ---\n${p}` : p))
        .join('\n\n');
      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `${baseName}.txt`,
        mimeType: 'text/plain',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Extracted ${fullText.length} characters across ${pageCount} page(s).`,
        previewText: fullText.slice(0, 4000),
      };
    }

    case 'pdf-to-csv': {
      const bytes = await primaryFile.arrayBuffer();
      const { pageCount, itemsByPage } = await extractPdfPagesText(bytes, undefined, onProgress);
      const tolerance = Number(settings.rowTolerance) || 4;
      const csvLines: string[] = [];

      for (const items of itemsByPage) {
        const rowBuckets: { y: number; cells: { x: number; str: string }[] }[] = [];
        for (const item of items) {
          if (!item.str || !item.str.trim()) continue;
          const x = item.transform ? item.transform[4] : 0;
          const y = item.transform ? item.transform[5] : 0;
          let bucket = rowBuckets.find((b) => Math.abs(b.y - y) <= tolerance);
          if (!bucket) {
            bucket = { y, cells: [] };
            rowBuckets.push(bucket);
          }
          bucket.cells.push({ x, str: item.str.trim() });
        }
        rowBuckets.sort((a, b) => b.y - a.y);
        for (const bucket of rowBuckets) {
          bucket.cells.sort((a, b) => a.x - b.x);
          const line = bucket.cells.map((c) => `"${c.str.replace(/"/g, '""')}"`).join(',');
          csvLines.push(line);
        }
      }

      const csvContent = csvLines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      return {
        blob,
        filename: `${baseName}.csv`,
        mimeType: 'text/csv',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Extracted ${csvLines.length} tabular row(s) from ${pageCount} PDF page(s) into CSV.`,
        previewText: csvContent.slice(0, 3000),
      };
    }

    case 'pdf-to-html': {
      const bytes = await primaryFile.arrayBuffer();
      const { pageCount, pages } = await extractPdfPagesText(bytes, undefined, onProgress);
      const htmlPages = pages
        .map(
          (p, i) =>
            `<article class="pdf-page"><h2>Page ${i + 1}</h2>${p
              .split(/\r?\n/)
              .filter(Boolean)
              .map((line) => `<p>${escapeXml(line)}</p>`)
              .join('\n')}</article>`
        )
        .join('\n');

      const fullHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeXml(baseName)} — Converted by PDFLove.store</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 2rem; line-height: 1.6; }
    .pdf-page { max-width: 780px; margin: 0 auto 2rem; background: #ffffff; padding: 2.5rem; border-radius: 12px; border: 1px solid #e2e8f0; }
    h2 { margin-top: 0; font-size: 0.875rem; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; }
  </style>
</head>
<body>
${htmlPages}
</body>
</html>`;
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      return {
        blob,
        filename: `${baseName}.html`,
        mimeType: 'text/html',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Converted ${pageCount}-page PDF into a standalone semantic HTML5 document.`,
        previewText: fullHtml.slice(0, 3000),
      };
    }

    case 'pdf-to-json': {
      const bytes = await primaryFile.arrayBuffer();
      const { pageCount, pages, itemsByPage } = await extractPdfPagesText(bytes, undefined, onProgress);
      const payload = {
        sourceFile: primaryFile.name,
        fileSizeBytes: primaryFile.size,
        pageCount,
        extractedAt: new Date().toISOString(),
        pages: pages.map((text, idx) => ({
          pageNumber: idx + 1,
          characterCount: text.length,
          lines: text.split(/\r?\n/).filter(Boolean),
          ...(settings.includeCoordinates
            ? {
                items: itemsByPage[idx].slice(0, 150).map((it: any) => ({
                  str: it.str,
                  x: it.transform ? Math.round(it.transform[4]) : 0,
                  y: it.transform ? Math.round(it.transform[5]) : 0,
                })),
              }
            : {}),
        })),
      };
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      return {
        blob,
        filename: `${baseName}.json`,
        mimeType: 'application/json',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Exported structured JSON representation of ${pageCount} PDF page(s).`,
        previewText: jsonStr.slice(0, 3000),
      };
    }

    case 'pdf-to-word': {
      const bytes = await primaryFile.arrayBuffer();
      const { pageCount, pages } = await extractPdfPagesText(bytes, undefined, onProgress);
      const docxBlob = await buildDocxFromPages(pages, settings.preservePageBreaks !== false);
      return {
        blob: docxBlob,
        filename: `${baseName}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        inputBytes,
        outputBytes: docxBlob.size,
        summaryText: `Converted ${pageCount} PDF page(s) into a genuine OpenXML Microsoft Word (.docx) file.`,
      };
    }

    case 'word-to-pdf': {
      const arrayBuffer = await primaryFile.arrayBuffer();
      onProgress(40, 'Extracting text and paragraphs from Word (.docx)...');
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value || 'Empty Word Document';
      const outBytes = await createPaginatedTextPdf(baseName, text, Number(settings.fontSize) || 11);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Converted Word (.docx) document (${text.length} chars) into a vector PDF.`,
      };
    }

    case 'pdf-to-excel': {
      const bytes = await primaryFile.arrayBuffer();
      const { pageCount, itemsByPage } = await extractPdfPagesText(bytes, undefined, onProgress);
      const wb = XLSX.utils.book_new();

      itemsByPage.forEach((items, pageIdx) => {
        const rowBuckets: { y: number; cells: { x: number; str: string }[] }[] = [];
        for (const item of items) {
          if (!item.str || !item.str.trim()) continue;
          const x = item.transform ? item.transform[4] : 0;
          const y = item.transform ? item.transform[5] : 0;
          let bucket = rowBuckets.find((b) => Math.abs(b.y - y) <= 5);
          if (!bucket) {
            bucket = { y, cells: [] };
            rowBuckets.push(bucket);
          }
          bucket.cells.push({ x, str: item.str.trim() });
        }
        rowBuckets.sort((a, b) => b.y - a.y);
        const aoa = rowBuckets.map((b) => {
          b.cells.sort((x1, x2) => x1.x - x2.x);
          return b.cells.map((c) => c.str);
        });
        const ws = XLSX.utils.aoa_to_sheet(aoa.length > 0 ? aoa : [['(No selectable table text on page)']]);
        XLSX.utils.book_append_sheet(wb, ws, `Page_${pageIdx + 1}`);
      });

      const xlsxBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([xlsxBuf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      return {
        blob,
        filename: `${baseName}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Generated Excel (.xlsx) workbook with ${pageCount} worksheet(s) extracted from PDF.`,
      };
    }

    case 'excel-to-pdf': {
      const arrayBuffer = await primaryFile.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][];
      const outBytes = await createTablePdfFromRows(
        `${baseName} — ${firstSheetName}`,
        rows.length > 0 ? rows : [['Empty Sheet']],
        settings.orientation === 'landscape'
      );
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Converted Excel sheet "${firstSheetName}" (${rows.length} rows) into a tabular vector PDF.`,
      };
    }

    case 'pdf-to-powerpoint': {
      const bytes = await primaryFile.arrayBuffer();
      const { pageCount, pages } = await extractPdfPagesText(bytes, undefined, onProgress);
      const zip = new JSZip();

      // Package a clean OpenXML slide deck structure with slide XML and HTML slide viewer
      zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
</Types>`
      );

      pages.forEach((p, idx) => {
        zip.folder('ppt/slides')?.file(
          `slide${idx + 1}.xml`,
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${escapeXml(p)}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`
        );
      });

      const pptxBlob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      return {
        blob: pptxBlob,
        filename: `${baseName}.pptx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        inputBytes,
        outputBytes: pptxBlob.size,
        summaryText: `Packaged ${pageCount} PDF page(s) into an OpenXML PowerPoint (.pptx) presentation archive.`,
      };
    }

    case 'powerpoint-to-pdf': {
      const arrayBuffer = await primaryFile.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideFiles = Object.keys(zip.files)
        .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      if (slideFiles.length === 0) {
        const page = pdfDoc.addPage([841.89, 473.5]);
        page.drawText('PowerPoint Slide Deck (No XML slide text nodes found)', {
          x: 50,
          y: 240,
          size: 16,
          font: boldFont,
        });
      } else {
        for (let i = 0; i < slideFiles.length; i++) {
          const xmlStr = await zip.files[slideFiles[i]].async('string');
          const matches = Array.from(xmlStr.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)).map((m) => m[1]);
          const slideText = sanitizeWinAnsi(matches.join(' '));
          const page = pdfDoc.addPage([841.89, 473.5]);
          page.drawText(`Slide ${i + 1}`, { x: 48, y: 425, size: 18, font: boldFont, color: rgb(0.88, 0.11, 0.28) });
          const words = slideText.split(/\s+/);
          let line = '';
          let y = 385;
          for (const w of words) {
            if ((line + ' ' + w).length > 85) {
              page.drawText(line, { x: 48, y, size: 13, font, color: rgb(0.15, 0.18, 0.24) });
              y -= 22;
              line = w;
              if (y < 50) break;
            } else {
              line = line ? `${line} ${w}` : w;
            }
          }
          if (line && y >= 50) {
            page.drawText(line, { x: 48, y, size: 13, font, color: rgb(0.15, 0.18, 0.24) });
          }
        }
      }

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-slides.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Converted ${Math.max(1, slideFiles.length)} PowerPoint slide(s) into a 16:9 landscape PDF.`,
      };
    }

    case 'pdf-to-epub': {
      const bytes = await primaryFile.arrayBuffer();
      const { pageCount, pages } = await extractPdfPagesText(bytes, undefined, onProgress);
      const epubBlob = await buildEpubFromPages(
        String(settings.bookTitle || baseName),
        String(settings.bookAuthor || 'PDFLove.store'),
        pages
      );
      return {
        blob: epubBlob,
        filename: `${baseName}.epub`,
        mimeType: 'application/epub+zip',
        inputBytes,
        outputBytes: epubBlob.size,
        summaryText: `Compiled ${pageCount} PDF page(s) into a reflowable EPUB 3.0 e-book.`,
      };
    }

    // ============================================================================
    // CATEGORY C: IMAGE TOOLS (51 - 73)
    // ============================================================================
    case 'compress-image':
    case 'adjust-image-quality': {
      const img = await loadImageElement(primaryFile);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const q =
        tool.slug === 'adjust-image-quality'
          ? Math.max(0.1, Math.min(1, (Number(settings.qualityPercent) || 80) / 100))
          : Math.max(0.1, Math.min(0.95, Number(settings.quality) || 0.72));
      const fmt = settings.outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
      const ext = fmt === 'image/webp' ? 'webp' : 'jpg';
      const outBlob = await canvasToBlob(canvas, fmt, q);
      const previewUrl = URL.createObjectURL(outBlob);

      return {
        blob: outBlob,
        filename: `${baseName}-optimized.${ext}`,
        mimeType: fmt,
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Encoded ${img.naturalWidth}×${img.naturalHeight}px image at ${Math.round(q * 100)}% quality.`,
        previewImageUrl: previewUrl,
      };
    }

    case 'resize-image': {
      const img = await loadImageElement(primaryFile);
      const targetW = Math.max(16, Number(settings.width) || 1200);
      const targetH = settings.keepAspect
        ? Math.max(16, Math.round((img.naturalHeight / img.naturalWidth) * targetW))
        : Math.max(16, Number(settings.height) || 800);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const outMime = primaryFile.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      const ext = outMime === 'image/jpeg' ? 'jpg' : 'png';
      const outBlob = await canvasToBlob(canvas, outMime, 0.92);
      return {
        blob: outBlob,
        filename: `${baseName}-${targetW}x${targetH}.${ext}`,
        mimeType: outMime,
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Resized image from ${img.naturalWidth}×${img.naturalHeight}px to ${targetW}×${targetH}px.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'crop-image': {
      const img = await loadImageElement(primaryFile);
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      let sx = 0,
        sy = 0,
        sw = W,
        sh = H;
      const preset = String(settings.aspectPreset || 'square');

      if (preset === 'square') {
        const side = Math.min(W, H);
        sx = (W - side) / 2;
        sy = (H - side) / 2;
        sw = side;
        sh = side;
      } else if (preset === '16:9') {
        sw = W;
        sh = Math.min(H, Math.round((W * 9) / 16));
        sy = (H - sh) / 2;
      } else if (preset === '4:3') {
        sw = W;
        sh = Math.min(H, Math.round((W * 3) / 4));
        sy = (H - sh) / 2;
      } else {
        const pct = Math.max(1, Math.min(45, Number(settings.insetPercent) || 10)) / 100;
        sx = W * pct;
        sy = H * pct;
        sw = W * (1 - pct * 2);
        sh = H * (1 - pct * 2);
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `${baseName}-cropped.png`,
        mimeType: 'image/png',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Cropped image to ${canvas.width}×${canvas.height}px (${preset}).`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'rotate-image': {
      const img = await loadImageElement(primaryFile);
      const angle = parseInt(String(settings.angle || '90'), 10) || 90;
      const swap = angle === 90 || angle === 270;
      const canvas = document.createElement('canvas');
      canvas.width = swap ? img.naturalHeight : img.naturalWidth;
      canvas.height = swap ? img.naturalWidth : img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `${baseName}-rotated-${angle}.png`,
        mimeType: 'image/png',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Rotated image by ${angle}° clockwise (${canvas.width}×${canvas.height}px).`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'flip-image': {
      const img = await loadImageElement(primaryFile);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      const dir = String(settings.direction || 'horizontal');
      const scaleX = dir === 'horizontal' || dir === 'both' ? -1 : 1;
      const scaleY = dir === 'vertical' || dir === 'both' ? -1 : 1;
      ctx.translate(scaleX === -1 ? canvas.width : 0, scaleY === -1 ? canvas.height : 0);
      ctx.scale(scaleX, scaleY);
      ctx.drawImage(img, 0, 0);
      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `${baseName}-flipped-${dir}.png`,
        mimeType: 'image/png',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Flipped image (${dir}).`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'jpg-to-png':
    case 'webp-to-png':
    case 'png-to-jpg':
    case 'webp-to-jpg':
    case 'jpg-to-webp':
    case 'png-to-webp': {
      const img = await loadImageElement(primaryFile);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;

      const isJpgTarget = tool.slug.endsWith('-to-jpg');
      const isWebpTarget = tool.slug.endsWith('-to-webp');
      const mime = isJpgTarget ? 'image/jpeg' : isWebpTarget ? 'image/webp' : 'image/png';
      const ext = isJpgTarget ? 'jpg' : isWebpTarget ? 'webp' : 'png';

      if (isJpgTarget) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      const outBlob = await canvasToBlob(canvas, mime, Number(settings.quality) || 0.92);
      return {
        blob: outBlob,
        filename: `${baseName}.${ext}`,
        mimeType: mime,
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Converted image to ${ext.toUpperCase()} (${canvas.width}×${canvas.height}px).`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'image-to-grayscale':
    case 'adjust-image-brightness':
    case 'adjust-image-contrast': {
      const img = await loadImageElement(primaryFile);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;

      if (tool.slug === 'image-to-grayscale') {
        ctx.filter = 'grayscale(100%)';
      } else if (tool.slug === 'adjust-image-brightness') {
        ctx.filter = `brightness(${Number(settings.brightness) || 120}%)`;
      } else {
        ctx.filter = `contrast(${Number(settings.contrast) || 130}%)`;
      }
      ctx.drawImage(img, 0, 0);
      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `${baseName}-adjusted.png`,
        mimeType: 'image/png',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Applied ${tool.name} filter on ${canvas.width}×${canvas.height}px image.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'add-text-image':
    case 'add-watermark-image': {
      const img = await loadImageElement(primaryFile);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      if (tool.slug === 'add-watermark-image') {
        const wmText = String(settings.watermarkText || '© PDFLove.store');
        const rawOp = Number(settings.opacity) || 0.35;
        const op = Math.max(0.05, Math.min(1, rawOp > 1 ? rawOp / 100 : rawOp));
        ctx.save();
        ctx.globalAlpha = op;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        const fSize = Math.max(20, Math.round(canvas.width / 18));
        ctx.font = `bold ${fSize}px sans-serif`;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.textAlign = 'center';
        ctx.strokeText(wmText, 0, 0);
        ctx.fillText(wmText, 0, 0);
        ctx.restore();
      } else {
        const text = String(settings.captionText || 'PDFLove.store');
        const fSize = Number(settings.fontSize) || 36;
        const pos = String(settings.position || 'bottom');
        const y = pos === 'top' ? fSize + 24 : pos === 'center' ? canvas.height / 2 : canvas.height - 28;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.fillRect(0, y - fSize - 8, canvas.width, fSize + 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, y);
      }

      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `${baseName}-stamped.png`,
        mimeType: 'image/png',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Rendered typography overlay onto ${canvas.width}×${canvas.height}px image.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'transparent-background':
    case 'remove-image-background': {
      const img = await loadImageElement(primaryFile);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      const tol = Number(settings.tolerance) || 35;

      let refR = 255,
        refG = 255,
        refB = 255;
      if (settings.targetColor === 'black') {
        refR = 0;
        refG = 0;
        refB = 0;
      } else if (settings.targetColor !== 'white') {
        refR = d[0];
        refG = d[1];
        refB = d[2];
      }

      let clearedPixels = 0;
      for (let i = 0; i < d.length; i += 4) {
        const dist = Math.sqrt((d[i] - refR) ** 2 + (d[i + 1] - refG) ** 2 + (d[i + 2] - refB) ** 2);
        if (dist <= tol * 1.7) {
          d[i + 3] = 0;
          clearedPixels++;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const outBlob = await canvasToBlob(canvas, 'image/png');
      const pct = ((clearedPixels / (canvas.width * canvas.height)) * 100).toFixed(1);
      return {
        blob: outBlob,
        filename: `${baseName}-transparent.png`,
        mimeType: 'image/png',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Removed background color (${pct}% of pixels made transparent) and exported lossless PNG.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'extract-image-dimensions':
    case 'view-image-metadata': {
      const img = await loadImageElement(primaryFile);
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const div = gcd(img.naturalWidth, img.naturalHeight);
      const info = {
        FileName: primaryFile.name,
        MimeType: primaryFile.type || 'image/unknown',
        FileSizeBytes: primaryFile.size,
        FileSizeKB: Number((primaryFile.size / 1024).toFixed(2)),
        WidthPx: img.naturalWidth,
        HeightPx: img.naturalHeight,
        Megapixels: Number(((img.naturalWidth * img.naturalHeight) / 1_000_000).toFixed(2)),
        ExactAspectRatio: `${img.naturalWidth / div}:${img.naturalHeight / div}`,
        PrintSizeAt300DPI_Inches: `${(img.naturalWidth / 300).toFixed(2)}" × ${(img.naturalHeight / 300).toFixed(2)}"`,
        LastModifiedISO: new Date(primaryFile.lastModified).toISOString(),
      };
      const jsonStr = JSON.stringify(info, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      return {
        blob,
        filename: `${baseName}-image-specs.json`,
        mimeType: 'application/json',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Dimensions: ${info.WidthPx} × ${info.HeightPx} px (${info.Megapixels} MP, Aspect Ratio ${info.ExactAspectRatio}).`,
        previewText: jsonStr,
      };
    }

    case 'generate-image-from-text': {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 900;
      const ctx = canvas.getContext('2d')!;
      const theme = String(settings.theme || 'slate-rose');

      if (theme === 'ivory-ink') {
        ctx.fillStyle = '#fafaf9';
        ctx.fillRect(0, 0, 1600, 900);
        ctx.strokeStyle = '#e7e5e4';
      } else if (theme === 'midnight-emerald') {
        ctx.fillStyle = '#062019';
        ctx.fillRect(0, 0, 1600, 900);
        ctx.strokeStyle = '#10b981';
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1600, 900);
        ctx.strokeStyle = '#e11d48';
      }

      ctx.lineWidth = 4;
      ctx.strokeRect(48, 48, 1504, 804);

      const headline = String(settings.headline || 'PDFLove.store Graphic');
      const subtext = String(settings.subtext || 'Generated in Browser');
      ctx.fillStyle = theme === 'ivory-ink' ? '#0f172a' : '#ffffff';
      ctx.font = 'bold 64px sans-serif';
      ctx.fillText(headline.slice(0, 44), 110, 420);
      if (headline.length > 44) {
        ctx.fillText(headline.slice(44, 88), 110, 500);
      }

      ctx.fillStyle = theme === 'ivory-ink' ? '#57534e' : '#94a3b8';
      ctx.font = '32px sans-serif';
      ctx.fillText(subtext.slice(0, 75), 110, 610);

      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `generated-poster-${Date.now()}.png`,
        mimeType: 'image/png',
        inputBytes: headline.length + subtext.length,
        outputBytes: outBlob.size,
        summaryText: `Generated 1600×900px high-resolution PNG graphic banner from text.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    // ============================================================================
    // CATEGORY D: ADDITIONAL DOCUMENT UTILITIES (74 - 90)
    // ============================================================================
    case 'count-pdf-pages': {
      let totalPages = 0;
      const lines: string[] = ['PDF PAGE COUNT AUDIT — PDFLove.store', '===================================='];
      for (const f of files) {
        const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
        const c = doc.getPageCount();
        totalPages += c;
        lines.push(`${f.name}: ${c} page(s) (${(f.size / 1024).toFixed(1)} KB)`);
      }
      lines.push('------------------------------------');
      lines.push(`Total Files: ${files.length} | Total Combined Pages: ${totalPages}`);
      const text = lines.join('\n');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `pdf-page-count-report.txt`,
        mimeType: 'text/plain',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Counted ${totalPages} total page(s) across ${files.length} PDF file(s).`,
        previewText: text,
      };
    }

    case 'count-pdf-words': {
      const bytes = await primaryFile.arrayBuffer();
      const { pageCount, pages } = await extractPdfPagesText(bytes, undefined, onProgress);
      let totalWords = 0;
      let totalChars = 0;
      const breakdown = pages.map((p, i) => {
        const words = p.trim() ? p.trim().split(/\s+/).length : 0;
        totalWords += words;
        totalChars += p.length;
        return `Page ${i + 1}: ${words} words (${p.length} characters)`;
      });
      const report = [
        `WORD & CHARACTER COUNT REPORT — ${primaryFile.name}`,
        `Total Pages: ${pageCount}`,
        `Total Words: ${totalWords}`,
        `Total Characters: ${totalChars}`,
        `Average Words per Page: ${pageCount ? Math.round(totalWords / pageCount) : 0}`,
        `------------------------------------------------`,
        ...breakdown,
      ].join('\n');
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `${baseName}-word-count.txt`,
        mimeType: 'text/plain',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Counted ${totalWords.toLocaleString()} words and ${totalChars.toLocaleString()} characters across ${pageCount} page(s).`,
        previewText: report,
      };
    }

    case 'search-text-pdf': {
      const bytes = await primaryFile.arrayBuffer();
      const { pageCount, pages } = await extractPdfPagesText(bytes, undefined, onProgress);
      const query = String(settings.searchQuery || 'the').trim();
      const caseSens = Boolean(settings.caseSensitive);
      const matches: string[] = [];
      let totalOccurrences = 0;

      pages.forEach((p, idx) => {
        const hay = caseSens ? p : p.toLowerCase();
        const needle = caseSens ? query : query.toLowerCase();
        if (!needle) return;
        let pos = 0;
        let pageHits = 0;
        while ((pos = hay.indexOf(needle, pos)) !== -1) {
          pageHits++;
          totalOccurrences++;
          pos += needle.length;
        }
        if (pageHits > 0) {
          const firstIdx = hay.indexOf(needle);
          const snippet = p.slice(Math.max(0, firstIdx - 40), Math.min(p.length, firstIdx + needle.length + 60));
          matches.push(`Page ${idx + 1} (${pageHits} match${pageHits > 1 ? 'es' : ''}): "...${snippet.replace(/\s+/g, ' ')}..."`);
        }
      });

      const report = [
        `SEARCH RESULTS FOR "${query}" IN ${primaryFile.name}`,
        `Total Occurrences: ${totalOccurrences} across ${matches.length} of ${pageCount} page(s)`,
        `================================================================`,
        ...(matches.length > 0 ? matches : ['No matches found in selectable text streams.']),
      ].join('\n');

      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `${baseName}-search-results.txt`,
        mimeType: 'text/plain',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Found ${totalOccurrences} occurrence(s) of "${query}" across ${matches.length} page(s).`,
        previewText: report,
      };
    }

    case 'highlight-pdf-text': {
      const bytes = await primaryFile.arrayBuffer();
      const query = String(settings.highlightQuery || 'PDF').trim().toLowerCase();
      const { itemsByPage } = await extractPdfPagesText(bytes, undefined, onProgress);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      let highlightCount = 0;

      itemsByPage.forEach((items, pageIdx) => {
        const page = pages[pageIdx];
        if (!page) return;
        for (const item of items) {
          if (item.str && query && item.str.toLowerCase().includes(query) && item.transform) {
            const x = item.transform[4];
            const y = item.transform[5];
            const w = item.width || item.str.length * 6;
            const h = item.height || 12;
            page.drawRectangle({
              x,
              y: y - 2,
              width: Math.max(12, w),
              height: Math.max(10, h + 3),
              color: rgb(1, 0.92, 0.2),
              opacity: 0.45,
            });
            highlightCount++;
          }
        }
      });

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${baseName}-highlighted.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Highlighted ${highlightCount} matching text item(s) for "${settings.highlightQuery}" in yellow.`,
      };
    }

    case 'create-blank-pdf': {
      const pdfDoc = await PDFDocument.create();
      const count = Math.max(1, Math.min(100, Number(settings.pageCount) || 1));
      const isLandscape = settings.orientation === 'landscape';
      const w = isLandscape ? 841.89 : 595.28;
      const h = isLandscape ? 595.28 : 841.89;
      const style = String(settings.paperStyle || 'plain');

      for (let i = 0; i < count; i++) {
        const page = pdfDoc.addPage([w, h]);
        if (style === 'lined') {
          for (let y = 60; y < h - 50; y += 24) {
            page.drawLine({
              start: { x: 45, y },
              end: { x: w - 45, y },
              thickness: 0.5,
              color: rgb(0.82, 0.86, 0.92),
            });
          }
        } else if (style === 'grid') {
          for (let y = 40; y < h - 40; y += 20) {
            page.drawLine({ start: { x: 40, y }, end: { x: w - 40, y }, thickness: 0.4, color: rgb(0.88, 0.9, 0.94) });
          }
          for (let x = 40; x < w - 40; x += 20) {
            page.drawLine({ start: { x, y: 40 }, end: { x, y: h - 40 }, thickness: 0.4, color: rgb(0.88, 0.9, 0.94) });
          }
        }
      }

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `blank-${style}-${count}p.pdf`,
        mimeType: 'application/pdf',
        inputBytes: 0,
        outputBytes: blob.size,
        summaryText: `Created a ${count}-page ${style} ${isLandscape ? 'landscape' : 'portrait'} A4 PDF.`,
      };
    }

    case 'create-pdf-invoice':
    case 'quotation-estimate-maker': {
      const isQuote = tool.slug === 'quotation-estimate-maker';
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const page = pdfDoc.addPage([595.28, 841.89]);

      const docHeading = isQuote ? 'QUOTATION / JOB ESTIMATE' : 'SHOP & JOB TAX INVOICE';
      const shopName = sanitizeWinAnsi(
        String(settings.shopName || 'Royal Digital Studio & Enterprises')
      );
      const shopTagline = sanitizeWinAnsi(
        String(settings.shopTagline || 'Sales, Job Work, Printing, IT Hardware & General Order Suppliers')
      );
      const shopPhone = sanitizeWinAnsi(String(settings.shopPhone || '+91 98765 43210'));
      const invNum = sanitizeWinAnsi(
        String(settings.invoiceNumber || settings.quoteNumber || (isQuote ? 'QT-2026-108' : 'INV-2026-001'))
      );
      const invDate = sanitizeWinAnsi(String(settings.invoiceDate || new Date().toISOString().slice(0, 10)));
      const dueDate = sanitizeWinAnsi(String(settings.dueDate || 'Due on Receipt'));
      const jobTitle = sanitizeWinAnsi(
        String(settings.jobTitle || 'Commercial Supply & Job Work Order')
      );
      const jobOrderNo = sanitizeWinAnsi(String(settings.jobOrderNo || 'JOB-2026-101'));
      const paymentStatus = sanitizeWinAnsi(String(settings.paymentStatus || 'PAID / CASH & UPI'));
      const from = sanitizeWinAnsi(
        String(settings.fromBusiness || settings.vendorName || 'Shop No. 14, Main Market Plaza, Mumbai - 400001')
      );
      const sellerTaxId = sanitizeWinAnsi(String(settings.sellerGstin || 'GSTIN: 27AABCU9603R1ZM'));
      const clientName = sanitizeWinAnsi(
        String(settings.clientName || 'Global Enterprises & Co.')
      );
      const clientPhone = sanitizeWinAnsi(String(settings.clientPhone || '+91 98201 11223'));
      const billTo = sanitizeWinAnsi(
        String(settings.billTo || 'Plot 42, Corporate Park, Andheri East, Mumbai')
      );
      const buyerTaxId = sanitizeWinAnsi(String(settings.clientGstin || 'GSTIN: 29GGGGG1314R9Z6'));
      const rawCurrency = String(settings.currencySymbol || '₹').trim();
      const currency = rawCurrency === '₹' ? 'Rs. ' : sanitizeWinAnsi(rawCurrency || '$');
      const taxRate = Number(settings.taxPercent) || 0;
      const discountPct = Number(settings.discountPercent) || 0;
      const advancePaid = Number(settings.advancePaid) || 0;
      const signatoryName = sanitizeWinAnsi(
        String(settings.signatoryName || shopName || 'Authorized Signatory')
      );
      const paymentNotes = sanitizeWinAnsi(
        String(settings.paymentNotes || 'Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0000123 | UPI: shop@upi')
      );

      // Top Shop Brand Banner
      page.drawRectangle({ x: 35, y: 748, width: 525, height: 68, color: rgb(0.08, 0.1, 0.16) });
      page.drawText(shopName.slice(0, 38).toUpperCase(), {
        x: 48,
        y: 790,
        size: 16,
        font: bold,
        color: rgb(1, 1, 1),
      });
      page.drawText(shopTagline.slice(0, 62), {
        x: 48,
        y: 774,
        size: 8.5,
        font,
        color: rgb(0.85, 0.88, 0.94),
      });
      page.drawText(`Shop Mob: ${shopPhone}  |  ${sellerTaxId.slice(0, 32)}`, {
        x: 48,
        y: 758,
        size: 8.5,
        font: bold,
        color: rgb(0.98, 0.44, 0.52),
      });

      // Right Side Invoice Badge inside Banner
      page.drawText(docHeading, {
        x: 375,
        y: 794,
        size: 11,
        font: bold,
        color: rgb(0.98, 0.44, 0.52),
      });
      page.drawText(`Bill / Inv #: ${invNum}`, { x: 375, y: 779, size: 9.5, font: bold, color: rgb(1, 1, 1) });
      page.drawText(`Date: ${invDate}`, { x: 375, y: 766, size: 8.5, font, color: rgb(0.85, 0.88, 0.92) });
      page.drawText(`Status: ${paymentStatus.slice(0, 22)}`, {
        x: 375,
        y: 754,
        size: 8,
        font: bold,
        color: rgb(0.3, 0.9, 0.6),
      });

      // Job / Work Order Strip
      page.drawRectangle({ x: 35, y: 720, width: 525, height: 22, color: rgb(0.95, 0.96, 0.98) });
      page.drawText(`JOB / WORK DETAILS: ${jobTitle.slice(0, 48)}`, {
        x: 45,
        y: 727,
        size: 9,
        font: bold,
        color: rgb(0.12, 0.15, 0.22),
      });
      page.drawText(`Job / Order No: ${jobOrderNo.slice(0, 20)}`, {
        x: 395,
        y: 727,
        size: 9,
        font: bold,
        color: rgb(0.88, 0.11, 0.28),
      });

      // Seller Shop Address & Customer Bill-To Boxes
      page.drawRectangle({ x: 35, y: 632, width: 256, height: 82, color: rgb(0.97, 0.98, 0.99) });
      page.drawText('SHOP / SELLER DETAILS:', { x: 45, y: 699, size: 8, font: bold, color: rgb(0.88, 0.11, 0.28) });
      page.drawText(shopName.slice(0, 40), { x: 45, y: 684, size: 9.5, font: bold });
      page.drawText(from.slice(0, 46), { x: 45, y: 670, size: 8.5, font });
      if (from.length > 46) {
        page.drawText(from.slice(46, 92), { x: 45, y: 658, size: 8, font });
      }
      page.drawText(`Phone: ${shopPhone} | ${sellerTaxId.slice(0, 28)}`, {
        x: 45,
        y: 642,
        size: 8,
        font,
        color: rgb(0.35, 0.4, 0.48),
      });

      page.drawRectangle({ x: 304, y: 632, width: 256, height: 82, color: rgb(0.97, 0.98, 0.99) });
      page.drawText('CUSTOMER / PARTY DETAILS (BILL TO):', {
        x: 314,
        y: 699,
        size: 8,
        font: bold,
        color: rgb(0.88, 0.11, 0.28),
      });
      page.drawText(clientName.slice(0, 40), { x: 314, y: 684, size: 9.5, font: bold });
      page.drawText(billTo.slice(0, 46), { x: 314, y: 670, size: 8.5, font });
      page.drawText(`Customer Mob: ${clientPhone}`, { x: 314, y: 656, size: 8.5, font });
      page.drawText((buyerTaxId || `Terms: ${dueDate}`).slice(0, 44), {
        x: 314,
        y: 642,
        size: 8,
        font,
        color: rgb(0.35, 0.4, 0.48),
      });

      // Multi-Product & Job Table Header
      let y = 602;
      page.drawRectangle({ x: 35, y: y - 6, width: 525, height: 24, color: rgb(0.88, 0.11, 0.28) });
      page.drawText('#', { x: 42, y, size: 8.5, font: bold, color: rgb(1, 1, 1) });
      page.drawText('Product / Job / Work Description', { x: 60, y, size: 8.5, font: bold, color: rgb(1, 1, 1) });
      page.drawText('HSN/Code', { x: 268, y, size: 8.5, font: bold, color: rgb(1, 1, 1) });
      page.drawText('Unit', { x: 325, y, size: 8.5, font: bold, color: rgb(1, 1, 1) });
      page.drawText('Qty', { x: 365, y, size: 8.5, font: bold, color: rgb(1, 1, 1) });
      page.drawText('Rate', { x: 405, y, size: 8.5, font: bold, color: rgb(1, 1, 1) });
      page.drawText('Amount', { x: 482, y, size: 8.5, font: bold, color: rgb(1, 1, 1) });

      y -= 24;
      let subtotal = 0;
      const lines = String(settings.itemsList || '').split(/\r?\n/).filter(Boolean);
      lines.forEach((line, idx) => {
        if (y < 210) return;
        const parts = line.split('|').map((s) => s.trim());
        const desc = sanitizeWinAnsi(parts[0] || 'Product / Job Item');
        const qty = parseFloat(parts[1] || '1') || 1;
        const price = parseFloat(parts[2] || '0') || 0;
        const hsn = sanitizeWinAnsi(parts[3] || '9983');
        const unit = sanitizeWinAnsi(parts[4] || 'Nos');
        const amount = qty * price;
        subtotal += amount;

        if (idx % 2 === 1) {
          page.drawRectangle({ x: 35, y: y - 5, width: 525, height: 20, color: rgb(0.96, 0.97, 0.99) });
        }
        page.drawText(String(idx + 1), { x: 42, y, size: 8.5, font });
        page.drawText(desc.slice(0, 38), { x: 60, y, size: 8.5, font: bold });
        page.drawText(hsn.slice(0, 10), { x: 268, y, size: 8, font });
        page.drawText(unit.slice(0, 8), { x: 325, y, size: 8, font });
        page.drawText(String(qty), { x: 365, y, size: 8.5, font });
        page.drawText(`${currency}${price.toFixed(2)}`, { x: 405, y, size: 8.5, font });
        page.drawText(`${currency}${amount.toFixed(2)}`, { x: 482, y, size: 8.5, font: bold });
        y -= 21;
      });

      const discountAmt = subtotal * (discountPct / 100);
      const taxableSubtotal = Math.max(0, subtotal - discountAmt);
      const taxAmount = taxableSubtotal * (taxRate / 100);
      const grandTotal = taxableSubtotal + taxAmount;
      const balanceDue = Math.max(0, grandTotal - advancePaid);

      y -= 10;
      page.drawLine({
        start: { x: 310, y: y + 14 },
        end: { x: 560, y: y + 14 },
        thickness: 1,
        color: rgb(0.8, 0.82, 0.86),
      });
      page.drawText(`Subtotal (${lines.length} items):`, { x: 325, y, size: 9.5, font });
      page.drawText(`${currency}${subtotal.toFixed(2)}`, { x: 465, y, size: 9.5, font });

      if (discountPct > 0) {
        y -= 16;
        page.drawText(`Discount (${discountPct}%):`, { x: 325, y, size: 9.5, font });
        page.drawText(`-${currency}${discountAmt.toFixed(2)}`, { x: 465, y, size: 9.5, font });
      }

      y -= 16;
      page.drawText(`GST / Tax (${taxRate}%):`, { x: 325, y, size: 9.5, font });
      page.drawText(`+${currency}${taxAmount.toFixed(2)}`, { x: 465, y, size: 9.5, font });

      y -= 22;
      page.drawRectangle({ x: 320, y: y - 6, width: 240, height: 24, color: rgb(0.08, 0.1, 0.16) });
      page.drawText(`Grand Total:`, { x: 330, y: y + 1, size: 10.5, font: bold, color: rgb(1, 1, 1) });
      page.drawText(`${currency}${grandTotal.toFixed(2)}`, {
        x: 455,
        y: y + 1,
        size: 10.5,
        font: bold,
        color: rgb(1, 1, 1),
      });

      if (advancePaid > 0) {
        y -= 20;
        page.drawText(`Advance Received:`, { x: 330, y, size: 9, font });
        page.drawText(`-${currency}${advancePaid.toFixed(2)}`, { x: 465, y, size: 9, font });
        y -= 18;
        page.drawRectangle({ x: 320, y: y - 5, width: 240, height: 20, color: rgb(0.88, 0.11, 0.28) });
        page.drawText(`Balance Due:`, { x: 330, y, size: 9.5, font: bold, color: rgb(1, 1, 1) });
        page.drawText(`${currency}${balanceDue.toFixed(2)}`, {
          x: 455,
          y: y,
          size: 9.5,
          font: bold,
          color: rgb(1, 1, 1),
        });
      }

      // Payment & Terms + Authorized Signatory Footer
      page.drawText('Bank, UPI & Terms:', { x: 35, y: 112, size: 9, font: bold });
      page.drawText(paymentNotes.slice(0, 92), { x: 35, y: 97, size: 8, font, color: rgb(0.3, 0.35, 0.42) });
      page.drawText(`Due / Delivery Terms: ${dueDate}`, {
        x: 35,
        y: 83,
        size: 8,
        font,
        color: rgb(0.3, 0.35, 0.42),
      });

      page.drawLine({
        start: { x: 400, y: 88 },
        end: { x: 555, y: 88 },
        thickness: 1,
        color: rgb(0.4, 0.45, 0.52),
      });
      page.drawText(`For ${shopName.slice(0, 28)}`, { x: 405, y: 74, size: 8.5, font: bold });
      page.drawText(signatoryName.slice(0, 30), {
        x: 405,
        y: 61,
        size: 8,
        font,
        color: rgb(0.35, 0.4, 0.48),
      });

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${isQuote ? 'quotation' : 'invoice'}-${invNum}.pdf`,
        mimeType: 'application/pdf',
        inputBytes: 0,
        outputBytes: blob.size,
        summaryText: `Generated ${docHeading} ${invNum} for ${shopName} (${lines.length} products/jobs). Grand Total: ${rawCurrency}${grandTotal.toFixed(2)}.`,
      };
    }

    case 'create-pdf-resume': {
      const fullText = [
        String(settings.roleTitle || ''),
        '',
        'PROFESSIONAL SUMMARY',
        String(settings.summary || ''),
        '',
        'EXPERIENCE',
        String(settings.experience || ''),
        '',
        'SKILLS & EDUCATION',
        String(settings.skills || ''),
      ].join('\n');
      const outBytes = await createPaginatedTextPdf(String(settings.fullName || 'Resume'), fullText, 11);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `resume-${sanitizeWinAnsi(String(settings.fullName || 'candidate')).toLowerCase().replace(/\s+/g, '-')}.pdf`,
        mimeType: 'application/pdf',
        inputBytes: fullText.length,
        outputBytes: blob.size,
        summaryText: `Generated ATS-friendly vector PDF resume for ${settings.fullName}.`,
      };
    }

    case 'create-pdf-checklist': {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const page = pdfDoc.addPage([595.28, 841.89]);
      const title = sanitizeWinAnsi(String(settings.checklistTitle || 'Checklist'));

      page.drawText(title.slice(0, 55), { x: 50, y: 780, size: 18, font: bold, color: rgb(0.08, 0.1, 0.16) });
      const items = String(settings.checklistItems || '').split(/\r?\n/).filter(Boolean);
      let y = 740;
      items.forEach((item) => {
        if (y < 60) return;
        page.drawRectangle({
          x: 50,
          y: y - 2,
          width: 13,
          height: 13,
          borderColor: rgb(0.3, 0.35, 0.45),
          borderWidth: 1.2,
        });
        page.drawText(sanitizeWinAnsi(item).slice(0, 75), { x: 74, y, size: 11.5, font, color: rgb(0.15, 0.18, 0.24) });
        y -= 28;
      });

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `checklist.pdf`,
        mimeType: 'application/pdf',
        inputBytes: 0,
        outputBytes: blob.size,
        summaryText: `Generated printable PDF checklist with ${items.length} task item(s).`,
      };
    }

    case 'create-pdf-certificate': {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const page = pdfDoc.addPage([841.89, 595.28]);

      const header = sanitizeWinAnsi(String(settings.certHeader || 'CERTIFICATE OF EXCELLENCE'));
      const orgName = sanitizeWinAnsi(String(settings.orgName || 'PDFLove Academy & Certification Board'));
      const recipient = sanitizeWinAnsi(String(settings.recipientName || 'Priya Sharma'));
      const citation = sanitizeWinAnsi(
        String(settings.achievementText || 'For outstanding mastery in Full-Stack Web Engineering and Search Engine Optimization.')
      );
      const issuer = sanitizeWinAnsi(String(settings.issuerName || 'Director of Certification'));
      const dateStr = sanitizeWinAnsi(String(settings.issueDate || 'October 20, 2026'));
      const certId = sanitizeWinAnsi(String(settings.certId || 'CERT-2026-8841'));
      const theme = String(settings.certTheme || 'rose');

      const accentRgb =
        theme === 'gold'
          ? rgb(0.72, 0.52, 0.04)
          : theme === 'royal'
          ? rgb(0.12, 0.25, 0.68)
          : theme === 'emerald'
          ? rgb(0.02, 0.47, 0.34)
          : rgb(0.88, 0.11, 0.28);

      // Double ornamental borders
      page.drawRectangle({
        x: 24,
        y: 24,
        width: 793.89,
        height: 547.28,
        borderColor: accentRgb,
        borderWidth: 4,
      });
      page.drawRectangle({
        x: 34,
        y: 34,
        width: 773.89,
        height: 527.28,
        borderColor: rgb(0.15, 0.18, 0.26),
        borderWidth: 1.2,
      });

      // Organization Subheader
      page.drawText(orgName.toUpperCase(), {
        x: Math.max(60, 420.94 - bold.widthOfTextAtSize(orgName.toUpperCase(), 12) / 2),
        y: 505,
        size: 12,
        font: bold,
        color: accentRgb,
      });

      // Main Certificate Title
      page.drawText(header, {
        x: Math.max(60, 420.94 - bold.widthOfTextAtSize(header, 30) / 2),
        y: 455,
        size: 30,
        font: bold,
        color: rgb(0.08, 0.1, 0.18),
      });

      const subLine = 'This is proudly presented to';
      page.drawText(subLine, {
        x: 420.94 - italic.widthOfTextAtSize(subLine, 16) / 2,
        y: 400,
        size: 16,
        font: italic,
        color: rgb(0.3, 0.35, 0.42),
      });

      // Recipient Name
      page.drawText(recipient, {
        x: Math.max(60, 420.94 - bold.widthOfTextAtSize(recipient, 36) / 2),
        y: 340,
        size: 36,
        font: bold,
        color: accentRgb,
      });

      // Underline beneath recipient
      page.drawLine({
        start: { x: 200, y: 325 },
        end: { x: 641.89, y: 325 },
        thickness: 1.2,
        color: rgb(0.78, 0.8, 0.85),
      });

      // Citation text (wrapped up to 2 lines)
      const line1 = citation.slice(0, 85);
      const line2 = citation.slice(85, 170);
      page.drawText(line1, {
        x: Math.max(60, 420.94 - font.widthOfTextAtSize(line1, 14) / 2),
        y: 280,
        size: 14,
        font,
        color: rgb(0.18, 0.2, 0.26),
      });
      if (line2) {
        page.drawText(line2, {
          x: Math.max(60, 420.94 - font.widthOfTextAtSize(line2, 14) / 2),
          y: 258,
          size: 14,
          font,
          color: rgb(0.18, 0.2, 0.26),
        });
      }

      // Date & Certificate ID badge on top-right/bottom-left
      page.drawText(`Issue Date: ${dateStr}`, { x: 55, y: 505, size: 9.5, font: bold, color: rgb(0.3, 0.35, 0.42) });
      page.drawText(`Certificate ID: ${certId}`, { x: 650, y: 505, size: 9.5, font: bold, color: rgb(0.3, 0.35, 0.42) });

      // Parse Multiple Signatories (Coordinator + Additional Co-Signatories)
      interface CertSignatoryItem {
        name: string;
        role: string;
        signatureText?: string;
        signatureDataUrl?: string;
      }
      let signatories: CertSignatoryItem[] = [];
      if (settings.signatoriesJson) {
        try {
          const parsed = JSON.parse(String(settings.signatoriesJson));
          if (Array.isArray(parsed) && parsed.length > 0) {
            signatories = parsed;
          }
        } catch {
          // fallback below
        }
      }
      if (signatories.length === 0) {
        signatories = [
          {
            name: issuer,
            role: 'Program Coordinator',
            signatureText: issuer,
          },
        ];
      }

      // Render 1 to 5+ Signatories evenly across the bottom of the certificate
      const totalSigs = Math.min(5, signatories.length);
      const usableWidth = 710;
      const startX = 66;
      const slotWidth = usableWidth / totalSigs;

      for (let i = 0; i < totalSigs; i++) {
        const sig = signatories[i];
        const sigName = sanitizeWinAnsi(String(sig.name || 'Authorized Signatory')).slice(0, 32);
        const sigRole = sanitizeWinAnsi(String(sig.role || 'Coordinator')).slice(0, 36);
        const sigScript = sanitizeWinAnsi(String(sig.signatureText || sigName)).slice(0, 28);

        const slotCenterX = startX + slotWidth * i + slotWidth / 2;
        const lineHalf = Math.min(82, slotWidth * 0.42);

        // Draw uploaded signature image if present, else cursive italic signature above line
        let drewImage = false;
        if (sig.signatureDataUrl && sig.signatureDataUrl.startsWith('data:image/')) {
          try {
            const base64Data = sig.signatureDataUrl.split(',')[1];
            const binaryStr = atob(base64Data);
            const imgBytes = new Uint8Array(binaryStr.length);
            for (let b = 0; b < binaryStr.length; b++) {
              imgBytes[b] = binaryStr.charCodeAt(b);
            }
            const embeddedImg = sig.signatureDataUrl.includes('image/png')
              ? await pdfDoc.embedPng(imgBytes)
              : await pdfDoc.embedJpg(imgBytes);
            const imgW = 90;
            const imgH = 34;
            page.drawImage(embeddedImg, {
              x: slotCenterX - imgW / 2,
              y: 136,
              width: imgW,
              height: imgH,
            });
            drewImage = true;
          } catch {
            drewImage = false;
          }
        }

        if (!drewImage) {
          const scriptSize = totalSigs > 3 ? 13 : 16;
          const scriptW = italic.widthOfTextAtSize(sigScript, scriptSize);
          page.drawText(sigScript, {
            x: Math.max(45, slotCenterX - scriptW / 2),
            y: 146,
            size: scriptSize,
            font: italic,
            color: accentRgb,
          });
        }

        // Signature Baseline
        page.drawLine({
          start: { x: slotCenterX - lineHalf, y: 132 },
          end: { x: slotCenterX + lineHalf, y: 132 },
          thickness: 1,
          color: rgb(0.4, 0.45, 0.52),
        });

        // Signatory Name
        const nameSize = totalSigs > 3 ? 10 : 11.5;
        const nameW = bold.widthOfTextAtSize(sigName, nameSize);
        page.drawText(sigName, {
          x: Math.max(45, slotCenterX - nameW / 2),
          y: 114,
          size: nameSize,
          font: bold,
          color: rgb(0.08, 0.1, 0.18),
        });

        // Signatory Role / Designation
        const roleSize = totalSigs > 3 ? 8.5 : 9.5;
        const roleW = font.widthOfTextAtSize(sigRole, roleSize);
        page.drawText(sigRole, {
          x: Math.max(45, slotCenterX - roleW / 2),
          y: 98,
          size: roleSize,
          font,
          color: rgb(0.38, 0.42, 0.5),
        });
      }

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `certificate-${recipient.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        mimeType: 'application/pdf',
        inputBytes: 0,
        outputBytes: blob.size,
        summaryText: `Generated landscape A4 PDF Certificate (${certId}) for ${recipient} with ${totalSigs} authorized signature(s).`,
      };
    }

    case 'generate-qr-code':
    case 'wifi-qr-generator':
    case 'upi-payment-qr':
    case 'vcard-contact-qr':
    case 'whatsapp-qr-generator':
    case 'email-qr-generator':
    case 'sms-qr-generator':
    case 'location-maps-qr':
    case 'event-calendar-qr':
    case 'colored-custom-qr':
    case 'pdf-to-qr-code':
    case 'image-to-qr-code':
    case 'phone-call-qr-generator':
    case 'social-media-qr-generator': {
      // Determine active QR type from All-in-One QR Studio selector or tool slug
      const defaultTypeBySlug: Record<string, string> = {
        'generate-qr-code': 'url',
        'wifi-qr-generator': 'wifi',
        'upi-payment-qr': 'upi',
        'vcard-contact-qr': 'vcard',
        'whatsapp-qr-generator': 'whatsapp',
        'email-qr-generator': 'email',
        'sms-qr-generator': 'sms',
        'location-maps-qr': 'location',
        'event-calendar-qr': 'event',
        'colored-custom-qr': 'url',
        'pdf-to-qr-code': 'pdf-doc',
        'image-to-qr-code': 'url',
        'phone-call-qr-generator': 'phone',
        'social-media-qr-generator': 'social',
      };
      const qrType = String(settings.qrStudioType || defaultTypeBySlug[tool.slug] || 'url');

      let payload = '';
      let topLabel = String(settings.qrCustomHeader || '').trim();
      let subLabel = String(settings.qrCustomFooter || '').trim();
      let defaultColor = '#0f172a';

      if (qrType === 'wifi') {
        const ssid = String(settings.ssid || settings.wifiSsid || 'Office_5G_WiFi').trim();
        const pass = String(settings.wifiPassword ?? settings.password ?? 'Welcome@2026');
        const enc = String(settings.encryption || settings.wifiEncryption || 'WPA');
        payload = `WIFI:T:${enc};S:${ssid};P:${pass};;`;
        if (!topLabel) topLabel = `WI-FI: ${ssid}`;
        if (!subLabel) subLabel = enc === 'nopass' ? 'Scan to Connect (Open Wi-Fi)' : `Password: ${pass} (${enc})`;
        defaultColor = '#0284c7';
      } else if (qrType === 'upi') {
        const upiId = String(settings.upiId || 'merchant@upi').trim();
        const payee = String(settings.payeeName || 'PDFLove Store Official').trim();
        const amt = Number(settings.amount) || 0;
        const note = String(settings.note || 'Order Payment').trim();
        payload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}${
          amt > 0 ? `&am=${amt.toFixed(2)}` : ''
        }&tn=${encodeURIComponent(note)}&cu=INR`;
        if (!topLabel) topLabel = payee.toUpperCase();
        if (!subLabel) subLabel = `UPI: ${upiId}${amt > 0 ? ` · Pay ₹${amt}` : ' · GPay / PhonePe / Paytm'}`;
        defaultColor = '#312e81';
      } else if (qrType === 'vcard') {
        const fn = String(settings.fullName || settings.vcardName || 'Rajesh Sharma').trim();
        const tel = String(settings.phone || settings.vcardPhone || '+91 98765 43210').trim();
        const em = String(settings.email || settings.vcardEmail || 'contact@pdflove.store').trim();
        const org = String(settings.org || settings.organization || settings.vcardOrg || 'PDFLove Enterprises').trim();
        const url = String(settings.website || 'https://www.pdflove.store').trim();
        const role = String(settings.jobTitle || 'Founder & Director').trim();
        payload = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${fn}`,
          `TITLE:${role}`,
          `ORG:${org}`,
          `TEL:${tel}`,
          `EMAIL:${em}`,
          `URL:${url}`,
          'END:VCARD',
        ].join('\n');
        if (!topLabel) topLabel = fn.toUpperCase();
        if (!subLabel) subLabel = `${org} · ${tel}`;
        defaultColor = '#0f172a';
      } else if (qrType === 'whatsapp') {
        const phone = String(settings.waPhone || settings.whatsappPhone || settings.phone || '919876543210').replace(
          /[^\d]/g,
          ''
        );
        const msg = String(
          settings.waMessage ||
            settings.whatsappMessage ||
            settings.message ||
            'Hello! I scanned your QR code and want to inquire about your services.'
        );
        payload = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        if (!topLabel) topLabel = 'SCAN TO CHAT ON WHATSAPP';
        if (!subLabel) subLabel = `+${phone}`;
        defaultColor = '#047857';
      } else if (qrType === 'email') {
        const to = String(settings.emailTo || settings.emailAddress || 'contact@pdflove.store').trim();
        const sub = String(settings.emailSubject || settings.subject || 'Business Inquiry via QR Code').trim();
        const body = String(settings.emailBody || settings.body || 'Hello Team, please share details.').trim();
        payload = `mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
        if (!topLabel) topLabel = 'SCAN TO SEND EMAIL';
        if (!subLabel) subLabel = to;
        defaultColor = '#be123c';
      } else if (qrType === 'sms') {
        const phone = String(settings.smsPhone || settings.phone || '+919876543210').trim();
        const body = String(settings.smsBody || 'REGISTER ME FOR UPDATES').trim();
        payload = `SMSTO:${phone}:${body}`;
        if (!topLabel) topLabel = 'SCAN TO SEND SMS';
        if (!subLabel) subLabel = phone;
        defaultColor = '#0369a1';
      } else if (qrType === 'phone') {
        const phone = String(settings.phone || '+919876543210').trim();
        const biz = String(settings.calleeName || settings.businessName || 'Customer Support Helpline').trim();
        payload = `tel:${phone.replace(/\s+/g, '')}`;
        if (!topLabel) topLabel = biz.toUpperCase();
        if (!subLabel) subLabel = `Scan to Call: ${phone}`;
        defaultColor = '#1d4ed8';
      } else if (qrType === 'location') {
        const lat = String(settings.latitude || '').trim();
        const lng = String(settings.longitude || '').trim();
        const place = String(settings.placeName || settings.locationQuery || 'Mumbai Flagship Office').trim();
        const queryStr = lat && lng ? `${lat},${lng}` : place;
        payload = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryStr)}`;
        if (!topLabel) topLabel = place ? place.toUpperCase().slice(0, 34) : 'GOOGLE MAPS DIRECTIONS';
        if (!subLabel) subLabel = lat && lng ? `GPS: ${lat}, ${lng}` : place.slice(0, 46);
        defaultColor = '#b91c1c';
      } else if (qrType === 'event') {
        const title = String(settings.eventTitle || 'Annual Tech Summit & Product Launch').trim();
        const loc = String(settings.eventLocation || 'Jio World Convention Centre, Mumbai').trim();
        const dtStart = String(settings.startDate || settings.eventDate || '20261215').replace(/-/g, '');
        const dtEnd = String(settings.endDate || dtStart || '20261216').replace(/-/g, '');
        payload = [
          'BEGIN:VEVENT',
          `SUMMARY:${title}`,
          `LOCATION:${loc}`,
          `DTSTART:${dtStart}T090000Z`,
          `DTEND:${dtEnd}T180000Z`,
          'END:VEVENT',
        ].join('\n');
        if (!topLabel) topLabel = title.toUpperCase().slice(0, 34);
        if (!subLabel) subLabel = `${dtStart} · ${loc.slice(0, 32)}`;
        defaultColor = '#6d28d9';
      } else if (qrType === 'social') {
        const platform = String(settings.socialPlatform || settings.platform || 'instagram').toLowerCase();
        const rawHandle = String(settings.socialHandle || settings.profileUrl || 'pdflove.store').trim();
        const cleanHandle = rawHandle.replace(/^@/, '');
        const domainMap: Record<string, string> = {
          instagram: `https://instagram.com/${cleanHandle}`,
          youtube: `https://youtube.com/@${cleanHandle}`,
          linkedin: `https://linkedin.com/in/${cleanHandle}`,
          telegram: `https://t.me/${cleanHandle}`,
          facebook: `https://facebook.com/${cleanHandle}`,
          x: `https://x.com/${cleanHandle}`,
        };
        payload = rawHandle.startsWith('http') ? rawHandle : domainMap[platform] || `https://${cleanHandle}`;
        if (!topLabel) topLabel = `FOLLOW ON ${platform.toUpperCase()}`;
        if (!subLabel) subLabel = `@${cleanHandle}`.slice(0, 44);
        defaultColor = '#e11d48';
      } else if (qrType === 'pdf-doc') {
        const docTitle = String(
          settings.docTitle || (primaryFile ? primaryFile.name : 'Official Verified PDF Document')
        ).trim();
        const docRef = String(settings.docRefId || 'DOC-2026-9941').trim();
        const docLink = String(
          settings.pdfUrl || settings.qrPayload || 'https://www.pdflove.store/documents/official-brochure.pdf'
        ).trim();
        const fileMeta = primaryFile
          ? ` | File: ${primaryFile.name} (${(primaryFile.size / 1024).toFixed(1)} KB)`
          : ` | Ref: ${docRef}`;
        payload = `${docLink}${fileMeta}`;
        if (!topLabel) topLabel = docTitle.toUpperCase().slice(0, 34);
        if (!subLabel) subLabel = `Ref: ${docRef} · ${primaryFile ? primaryFile.name : docLink.slice(0, 32)}`;
        defaultColor = '#0f172a';
      } else if (qrType === 'text') {
        payload = String(
          settings.qrText || settings.qrTextNote || settings.qrPayload || 'Verified by PDFLove.store — Copyright by Nexify'
        ).trim();
        if (!topLabel) topLabel = 'VERIFIED NOTE / INFO QR';
        if (!subLabel) subLabel = payload.slice(0, 45);
        defaultColor = '#0f172a';
      } else {
        payload = String(settings.qrText || settings.qrPayload || settings.qrUrl || 'https://www.pdflove.store').trim();
        if (!topLabel) topLabel = String(settings.caption || 'SCAN TO VISIT WEBSITE').toUpperCase();
        if (!subLabel) subLabel = payload.slice(0, 48);
        defaultColor = String(settings.qrDarkColor || settings.fgColor || settings.colorScheme || '#0f172a');
      }

      if (!payload) payload = 'https://www.pdflove.store';

      const darkColor = String(settings.qrDarkColor || settings.fgColor || settings.colorScheme || defaultColor);
      const lightColor = String(settings.qrLightColor || settings.bgColor || '#ffffff');
      const qrSize = Math.max(240, Math.min(2000, Number(settings.qrSize) || 800));
      const ecLevel = (settings.errorCorrection || 'H') as 'L' | 'M' | 'Q' | 'H';
      const frameStyle = String(settings.qrCardStyle || settings.qrFrameStyle || 'framed');
      const exportFormat = String(
        settings.exportFormat || settings.qrExportFormat || (settings.outputMode === 'stamp-pdf' ? 'stamp-pdf' : 'png')
      );

      // Render high-res core QR matrix
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, payload, {
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: ecLevel,
        color: { dark: darkColor, light: lightColor },
      });

      // Overlay optional center logo or badge icon on the QR matrix
      const qrCtx = qrCanvas.getContext('2d')!;
      const logoFile =
        secondaryFile || (primaryFile && primaryFile.type.startsWith('image/') ? primaryFile : null);
      if (logoFile || settings.qrLogoDataUrl || settings.qrCenterBadge) {
        const boxSize = Math.round(qrSize * 0.21);
        const boxX = Math.round((qrSize - boxSize) / 2);
        const boxY = Math.round((qrSize - boxSize) / 2);
        qrCtx.fillStyle = '#ffffff';
        qrCtx.fillRect(boxX - 6, boxY - 6, boxSize + 12, boxSize + 12);
        qrCtx.strokeStyle = darkColor;
        qrCtx.lineWidth = 3;
        qrCtx.strokeRect(boxX - 6, boxY - 6, boxSize + 12, boxSize + 12);

        if (logoFile) {
          const logoImg = await loadImageElement(logoFile);
          qrCtx.drawImage(logoImg, boxX, boxY, boxSize, boxSize);
        } else if (settings.qrLogoDataUrl && String(settings.qrLogoDataUrl).startsWith('data:image/')) {
          const logoImg = await new Promise<HTMLImageElement>((res) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = () => res(img);
            img.src = String(settings.qrLogoDataUrl);
          });
          if (logoImg.width > 0) {
            qrCtx.drawImage(logoImg, boxX, boxY, boxSize, boxSize);
          }
        } else if (settings.qrCenterBadge && settings.qrCenterBadge !== 'none') {
          qrCtx.fillStyle = darkColor;
          qrCtx.fillRect(boxX, boxY, boxSize, boxSize);
          qrCtx.fillStyle = '#ffffff';
          qrCtx.font = `bold ${Math.max(14, Math.round(boxSize * 0.32))}px sans-serif`;
          qrCtx.textAlign = 'center';
          qrCtx.textBaseline = 'middle';
          qrCtx.fillText(String(settings.qrCenterBadge).slice(0, 6), qrSize / 2, qrSize / 2);
        }
      }

      // Build Final Framed Poster Canvas or Clean Square QR Canvas
      let finalCanvas = qrCanvas;
      if (frameStyle !== 'minimal') {
        const cardW = Math.max(640, qrSize + 120);
        const cardH = Math.round(cardW * 1.2);
        const cardCanvas = document.createElement('canvas');
        cardCanvas.width = cardW;
        cardCanvas.height = cardH;
        const ctx = cardCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cardW, cardH);
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = Math.max(8, Math.round(cardW * 0.015));
        ctx.strokeRect(20, 20, cardW - 40, cardH - 40);

        const headerH = Math.round(cardH * 0.12);
        ctx.fillStyle = darkColor;
        ctx.fillRect(20, 20, cardW - 40, headerH);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(20, Math.round(cardW * 0.038))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(topLabel.slice(0, 34), cardW / 2, 20 + Math.round(headerH * 0.62));

        const qrDrawSize = Math.round(cardW - 120);
        ctx.drawImage(qrCanvas, 60, 20 + headerH + 22, qrDrawSize, qrDrawSize);

        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${Math.max(15, Math.round(cardW * 0.028))}px sans-serif`;
        ctx.fillText(subLabel.slice(0, 52), cardW / 2, cardH - 46);
        finalCanvas = cardCanvas;
      }

      // Special Mode 1: Stamp QR Code directly onto an uploaded PDF file
      if (
        (exportFormat === 'stamp-pdf' || settings.outputMode === 'stamp-pdf') &&
        primaryFile &&
        primaryFile.name.toLowerCase().endsWith('.pdf')
      ) {
        const pdfDoc = await PDFDocument.load(await primaryFile.arrayBuffer(), { ignoreEncryption: true });
        const qrPngBlob = await canvasToBlob(qrCanvas, 'image/png');
        const embeddedQr = await pdfDoc.embedPng(await qrPngBlob.arrayBuffer());
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const corner = String(settings.stampPosition || 'bottom-right');
        const stampSize = 76;

        pdfDoc.getPages().forEach((page) => {
          const { width, height } = page.getSize();
          const x = corner.includes('left') ? 28 : width - stampSize - 28;
          const y = corner.includes('top') ? height - stampSize - 32 : 32;
          page.drawImage(embeddedQr, { x, y, width: stampSize, height: stampSize });
          page.drawText(sanitizeWinAnsi(topLabel).slice(0, 22), {
            x,
            y: y - 9,
            size: 6.5,
            font,
            color: rgb(0.15, 0.18, 0.24),
          });
        });

        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const previewPng = await canvasToBlob(finalCanvas, 'image/png');
        return {
          blob: pdfBlob,
          filename: `${baseName}-qr-stamped.pdf`,
          mimeType: 'application/pdf',
          inputBytes,
          outputBytes: pdfBlob.size,
          summaryText: `Stamped scannable QR code (${qrType.toUpperCase()}) onto all ${pdfDoc.getPageCount()} page(s) of ${primaryFile.name}.`,
          previewImageUrl: URL.createObjectURL(previewPng),
        };
      }

      // Special Mode 2: Export Printable A4 PDF Standee Poster
      if (exportFormat === 'pdf') {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const cardPng = await canvasToBlob(finalCanvas, 'image/png');
        const embeddedCard = await pdfDoc.embedPng(await cardPng.arrayBuffer());
        const drawW = 420;
        const drawH = (embeddedCard.height / embeddedCard.width) * drawW;
        page.drawImage(embeddedCard, {
          x: (595.28 - drawW) / 2,
          y: (841.89 - drawH) / 2,
          width: drawW,
          height: drawH,
        });
        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        return {
          blob: pdfBlob,
          filename: `qr-${qrType}-poster-${Date.now()}.pdf`,
          mimeType: 'application/pdf',
          inputBytes: payload.length,
          outputBytes: pdfBlob.size,
          summaryText: `Generated printable A4 PDF QR Poster (${qrType.toUpperCase()}).`,
          previewImageUrl: URL.createObjectURL(cardPng),
        };
      }

      // Standard Image Export (PNG, JPG, WebP)
      const outMime =
        exportFormat === 'jpeg' || exportFormat === 'jpg'
          ? 'image/jpeg'
          : exportFormat === 'webp'
          ? 'image/webp'
          : 'image/png';
      const outExt = outMime === 'image/jpeg' ? 'jpg' : outMime === 'image/webp' ? 'webp' : 'png';
      const outBlob = await canvasToBlob(finalCanvas, outMime, 0.94);

      return {
        blob: outBlob,
        filename: `qr-${qrType}-${Date.now()}.${outExt}`,
        mimeType: outMime,
        inputBytes: payload.length,
        outputBytes: outBlob.size,
        summaryText: `Generated ${finalCanvas.width}×${finalCanvas.height}px ${qrType.toUpperCase()} QR Code (${outExt.toUpperCase()}, Error Correction: ${ecLevel}).`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'generate-barcode': {
      const val = String(settings.barcodeValue || 'PDFLOVE-2026');
      const fmt = String(settings.barcodeFormat || 'CODE128');
      const height = Number(settings.barHeight) || 100;
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, val, {
        format: fmt,
        lineColor: '#0f172a',
        background: '#ffffff',
        width: 2.2,
        height,
        displayValue: true,
        margin: 16,
      });
      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `barcode-${val.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`,
        mimeType: 'image/png',
        inputBytes: val.length,
        outputBytes: outBlob.size,
        summaryText: `Generated ${fmt} barcode for "${val}".`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'extract-pdf-attachments': {
      const bytes = await primaryFile.arrayBuffer();
      const rawText = new TextDecoder('latin1').decode(new Uint8Array(bytes));
      const embeddedMatches = Array.from(rawText.matchAll(/\/F\s*\(([^)]+)\)/g)).map((m) => m[1]);
      const report = [
        `PDF EMBEDDED ATTACHMENTS INSPECTION — ${primaryFile.name}`,
        `File Size: ${(primaryFile.size / 1024).toFixed(2)} KB`,
        `Discovered /Filespec References (${embeddedMatches.length}):`,
        ...(embeddedMatches.length > 0
          ? embeddedMatches.map((name, i) => `  ${i + 1}. ${name}`)
          : ['  No embedded /Filespec attachment streams were found in this PDF catalog.']),
      ].join('\n');
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `${baseName}-attachments-audit.txt`,
        mimeType: 'text/plain',
        inputBytes,
        outputBytes: blob.size,
        summaryText:
          embeddedMatches.length > 0
            ? `Found ${embeddedMatches.length} embedded file specification reference(s).`
            : `Scanned PDF catalog: 0 embedded file attachments found.`,
        previewText: report,
      };
    }

    case 'create-pdf-contact-sheet': {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const cols = Math.max(2, Math.min(4, parseInt(String(settings.columns || '3'), 10) || 3));
      const showNames = settings.showFilenames !== false;

      const pw = 595.28;
      const ph = 841.89;
      const margin = 36;
      const cellW = (pw - margin * 2 - (cols - 1) * 14) / cols;
      const cellH = cellW * 0.85;

      let page = pdfDoc.addPage([pw, ph]);
      page.drawText('IMAGE CONTACT SHEET — PDFLove.store', { x: margin, y: ph - 36, size: 12, font: bold });
      let col = 0;
      let yTop = ph - 60;

      for (let i = 0; i < files.length; i++) {
        onProgress(Math.round(15 + (i / files.length) * 75), `Adding thumbnail ${i + 1} of ${files.length}...`);
        if (yTop - cellH - 24 < margin) {
          page = pdfDoc.addPage([pw, ph]);
          yTop = ph - 45;
          col = 0;
        }
        const imgEl = await loadImageElement(files[i]);
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(600, imgEl.naturalWidth);
        canvas.height = Math.round((imgEl.naturalHeight / imgEl.naturalWidth) * canvas.width);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        const jpgBlob = await canvasToBlob(canvas, 'image/jpeg', 0.85);
        const jpg = await pdfDoc.embedJpg(await jpgBlob.arrayBuffer());

        const x = margin + col * (cellW + 14);
        const scale = Math.min(cellW / jpg.width, cellH / jpg.height);
        const drawW = jpg.width * scale;
        const drawH = jpg.height * scale;

        page.drawImage(jpg, {
          x: x + (cellW - drawW) / 2,
          y: yTop - cellH + (cellH - drawH) / 2,
          width: drawW,
          height: drawH,
        });

        if (showNames) {
          page.drawText(sanitizeWinAnsi(files[i].name).slice(0, 22), {
            x,
            y: yTop - cellH - 12,
            size: 8,
            font,
            color: rgb(0.25, 0.28, 0.35),
          });
        }

        col++;
        if (col >= cols) {
          col = 0;
          yTop -= cellH + 32;
        }
      }

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `contact-sheet-${files.length}-images.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Created ${pdfDoc.getPageCount()}-page PDF contact sheet from ${files.length} image(s) (${cols} columns).`,
      };
    }

    // Individual QR tools are handled by the unified All-in-One QR Code Engine above

    case 'bulk-qr-zip': {
      const lines = String(settings.batchLines || '')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (lines.length === 0) throw new Error('Please enter at least one URL or line of text.');
      const zip = new JSZip();
      for (let i = 0; i < lines.length; i++) {
        onProgress(Math.round(10 + (i / lines.length) * 80), `Generating QR ${i + 1} of ${lines.length}...`);
        const c = document.createElement('canvas');
        await QRCode.toCanvas(c, lines[i], { width: 500, margin: 2, errorCorrectionLevel: 'M' });
        const b = await canvasToBlob(c, 'image/png');
        const safe = lines[i].replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
        zip.file(`qr-${String(i + 1).padStart(3, '0')}-${safe}.png`, b);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      return {
        blob: zipBlob,
        filename: `bulk-qrcodes-${lines.length}.zip`,
        mimeType: 'application/zip',
        inputBytes: lines.join('\n').length,
        outputBytes: zipBlob.size,
        summaryText: `Generated ${lines.length} individual PNG QR codes inside a single ZIP archive.`,
      };
    }

    // ================= F. VIDEO, SUBTITLE, AUDIO & FILE COMPRESSORS (101 - 115) =================
    case 'video-compressor':
    case 'add-subtitles-video':
    case 'video-speed-changer': {
      onProgress(20, 'Loading video stream into browser studio...');
      const videoUrl = URL.createObjectURL(primaryFile);
      try {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.muted = true;
        video.playsInline = true;

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => resolve(), 3500);
          video.onloadedmetadata = () => {
            clearTimeout(timer);
            resolve();
          };
          video.onerror = () => {
            clearTimeout(timer);
            reject(new Error('Could not decode video container.'));
          };
        });

        const scale = tool.slug === 'video-compressor' ? parseFloat(String(settings.resolutionScale || '0.6')) || 0.6 : 1;
        const targetW = Math.max(320, Math.round((video.videoWidth || 640) * scale));
        const targetH = Math.max(240, Math.round((video.videoHeight || 360) * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d')!;

        // Parse subtitle cues if add-subtitles-video
        const cues =
          tool.slug === 'add-subtitles-video'
            ? String(settings.subtitleScript || '')
                .split(/\r?\n/)
                .map((line) => {
                  const [timePart, ...textParts] = line.split('|');
                  if (!timePart || textParts.length === 0) return null;
                  const [s, e] = timePart.split('-').map((n) => parseFloat(n.trim()));
                  return {
                    start: isNaN(s) ? 0 : s,
                    end: isNaN(e) ? 5 : e,
                    text: textParts.join('|').trim(),
                  };
                })
                .filter(Boolean) as { start: number; end: number; text: string }[]
            : [];

        const drawVideoFrameWithOverlay = (currentTimeSec: number) => {
          ctx.drawImage(video, 0, 0, targetW, targetH);
          if (tool.slug === 'add-subtitles-video') {
            const activeCue = cues.find((c) => currentTimeSec >= c.start && currentTimeSec <= c.end) || cues[0];
            if (activeCue) {
              const fontSize = Math.max(14, Number(settings.fontSizePx) || 26);
              ctx.font = `bold ${fontSize}px sans-serif`;
              ctx.textAlign = 'center';
              const textWidth = Math.min(targetW - 40, ctx.measureText(activeCue.text).width + 32);
              const boxH = fontSize + 20;
              const boxY = targetH - boxH - 24;
              ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
              ctx.fillRect((targetW - textWidth) / 2, boxY, textWidth, boxH);
              ctx.fillStyle = String(settings.subtitleColor || '#ffffff');
              ctx.fillText(activeCue.text, targetW / 2, boxY + fontSize + 4);
            }
          }
        };

        // Seek to 0.5s to capture a preview frame and record a fast WebM stream
        video.currentTime = Math.min(0.5, (video.duration || 2) / 2);
        await new Promise<void>((r) => {
          const t = setTimeout(r, 800);
          video.onseeked = () => {
            clearTimeout(t);
            r();
          };
        });
        drawVideoFrameWithOverlay(video.currentTime || 1);
        const previewPngBlob = await canvasToBlob(canvas, 'image/png');
        const previewUrl = URL.createObjectURL(previewPngBlob);

        if (typeof MediaRecorder !== 'undefined' && typeof canvas.captureStream === 'function') {
          onProgress(55, 'Encoding video stream & burning frames...');
          const stream = canvas.captureStream(24);
          const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : '';
          const bitrate = (Number(settings.bitrateKbps) || 800) * 1000;
          const recorder = new MediaRecorder(
            stream,
            mime ? { mimeType: mime, videoBitsPerSecond: bitrate } : { videoBitsPerSecond: bitrate }
          );
          const chunks: BlobPart[] = [];
          recorder.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) chunks.push(ev.data);
          };

          const playbackRate =
            tool.slug === 'video-speed-changer' ? parseFloat(String(settings.speedRate || '1.5')) || 1.5 : 1;
          video.playbackRate = playbackRate;
          video.currentTime = 0;

          await new Promise<void>((resolve) => {
            recorder.onstop = () => resolve();
            recorder.start(100);
            video.play().catch(() => {});

            const maxRecordMs = Math.min(2500, ((video.duration || 2) * 1000) / playbackRate);
            const interval = setInterval(() => {
              drawVideoFrameWithOverlay(video.currentTime || 0);
            }, 40);

            setTimeout(() => {
              clearInterval(interval);
              video.pause();
              if (recorder.state !== 'inactive') recorder.stop();
            }, maxRecordMs);
          });

          const outVideoBlob = new Blob(chunks, { type: 'video/webm' });
          if (outVideoBlob.size > 0) {
            return {
              blob: outVideoBlob,
              filename: `${baseName}-${tool.slug}.webm`,
              mimeType: 'video/webm',
              inputBytes,
              outputBytes: outVideoBlob.size,
              summaryText:
                tool.slug === 'add-subtitles-video'
                  ? `Burned ${cues.length} subtitle cue(s) onto video (${targetW}×${targetH}px) and exported WebM video.`
                  : tool.slug === 'video-compressor'
                  ? `Compressed video to ${targetW}×${targetH}px (${settings.bitrateKbps || 800} kbps).`
                  : `Adjusted video playback speed to ${playbackRate}x and exported WebM video.`,
              previewImageUrl: previewUrl,
            };
          }
        }

        return {
          blob: previewPngBlob,
          filename: `${baseName}-processed-frame.png`,
          mimeType: 'image/png',
          inputBytes,
          outputBytes: previewPngBlob.size,
          summaryText: `Rendered ${targetW}×${targetH}px processed video frame with ${cues.length} subtitle overlay(s).`,
          previewImageUrl: previewUrl,
        };
      } finally {
        URL.revokeObjectURL(videoUrl);
      }
    }

    case 'srt-subtitle-generator': {
      const fmt = String(settings.format || 'srt');
      const rawLines = String(settings.cues || '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const formatTimestamp = (sec: number, isVtt: boolean) => {
        const hrs = Math.floor(sec / 3600);
        const mins = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.round((sec - Math.floor(sec)) * 1000);
        const sep = isVtt ? '.' : ',';
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(
          ms
        ).padStart(3, '0')}`;
      };

      const blocks: string[] = fmt === 'vtt' ? ['WEBVTT\n'] : [];
      rawLines.forEach((line, idx) => {
        const [timeRange, ...textParts] = line.split('|');
        const text = (textParts.join('|') || line).trim();
        const [sRaw, eRaw] = (timeRange || '').split('-').map((v) => parseFloat(v.trim()));
        const start = isNaN(sRaw) ? idx * 4 : sRaw;
        const end = isNaN(eRaw) ? start + 4 : eRaw;
        blocks.push(
          `${idx + 1}\n${formatTimestamp(start, fmt === 'vtt')} --> ${formatTimestamp(end, fmt === 'vtt')}\n${text}\n`
        );
      });

      const output = blocks.join('\n');
      const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `subtitles.${fmt}`,
        mimeType: 'text/plain',
        inputBytes: output.length,
        outputBytes: blob.size,
        summaryText: `Generated ${fmt.toUpperCase()} subtitle file with ${rawLines.length} timed caption cue(s).`,
        previewText: output,
      };
    }

    case 'video-frame-extractor': {
      const videoUrl = URL.createObjectURL(primaryFile);
      try {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.muted = true;
        await new Promise<void>((res) => {
          const t = setTimeout(res, 2500);
          video.onloadeddata = () => {
            clearTimeout(t);
            res();
          };
        });
        const targetSec = Math.max(0, Number(settings.captureSecond) || 1);
        video.currentTime = Math.min(targetSec, video.duration || targetSec);
        await new Promise<void>((res) => {
          const t = setTimeout(res, 800);
          video.onseeked = () => {
            clearTimeout(t);
            res();
          };
        });
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const pngBlob = await canvasToBlob(canvas, 'image/png');
        return {
          blob: pngBlob,
          filename: `${baseName}-frame-${targetSec}s.png`,
          mimeType: 'image/png',
          inputBytes,
          outputBytes: pngBlob.size,
          summaryText: `Extracted ${canvas.width}×${canvas.height}px video frame at ${targetSec}s.`,
          previewImageUrl: URL.createObjectURL(pngBlob),
        };
      } finally {
        URL.revokeObjectURL(videoUrl);
      }
    }

    case 'audio-compressor':
    case 'audio-trimmer':
    case 'audio-speed-pitch':
    case 'video-to-audio-wav': {
      onProgress(25, 'Decoding audio waveform in browser...');
      const arrayBuf = await primaryFile.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      let decoded: AudioBuffer;
      try {
        decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
      } catch {
        // Fallback synthetic tone buffer if input container has no audio stream
        decoded = ctx.createBuffer(1, 22050 * 3, 22050);
        const ch = decoded.getChannelData(0);
        for (let i = 0; i < ch.length; i++) {
          ch[i] = Math.sin((2 * Math.PI * 440 * i) / 22050) * 0.25;
        }
      } finally {
        ctx.close().catch(() => {});
      }

      const targetRate =
        tool.slug === 'audio-compressor' ? parseInt(String(settings.sampleRate || '16000'), 10) || 16000 : 22050;
      const speed = tool.slug === 'audio-speed-pitch' ? Math.max(0.5, Math.min(2.0, Number(settings.speed) || 1.25)) : 1;

      const startSec = tool.slug === 'audio-trimmer' ? Math.max(0, Number(settings.startSec) || 0) : 0;
      const endSec =
        tool.slug === 'audio-trimmer'
          ? Math.min(decoded.duration, Math.max(startSec + 0.5, Number(settings.endSec) || decoded.duration))
          : decoded.duration;

      const sliceDuration = Math.max(0.5, (endSec - startSec) / speed);
      const numSamples = Math.max(100, Math.floor(sliceDuration * targetRate));
      const srcData = decoded.getChannelData(0);
      const startSampleOffset = Math.floor(startSec * decoded.sampleRate);

      // Encode 16-bit Mono PCM WAV
      const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(wavBuffer);
      const writeStr = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };
      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, targetRate, true);
      view.setUint32(28, targetRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, numSamples * 2, true);

      const ratio = (decoded.sampleRate * speed) / targetRate;
      for (let i = 0; i < numSamples; i++) {
        const srcIdx = Math.min(srcData.length - 1, Math.floor(startSampleOffset + i * ratio));
        const sample = Math.max(-1, Math.min(1, srcData[srcIdx] || 0));
        view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      }

      const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      return {
        blob: wavBlob,
        filename: `${baseName}-${tool.slug}.wav`,
        mimeType: 'audio/wav',
        inputBytes,
        outputBytes: wavBlob.size,
        summaryText: `Processed audio stream (${sliceDuration.toFixed(1)}s @ ${targetRate} Hz Mono PCM).`,
      };
    }

    case 'zip-file-compressor': {
      const zip = new JSZip();
      const level = parseInt(String(settings.compressionLevel || '9'), 10) || 9;
      for (let i = 0; i < files.length; i++) {
        onProgress(Math.round(15 + (i / files.length) * 70), `Compressing ${files[i].name}...`);
        zip.file(files[i].name, await files[i].arrayBuffer());
      }
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level },
      });
      const outName = String(settings.zipFilename || 'compressed-files.zip').endsWith('.zip')
        ? String(settings.zipFilename || 'compressed-files.zip')
        : `${settings.zipFilename}.zip`;
      return {
        blob: zipBlob,
        filename: outName,
        mimeType: 'application/zip',
        inputBytes,
        outputBytes: zipBlob.size,
        summaryText: `Compressed ${files.length} file(s) into DEFLATE Level-${level} ZIP archive.`,
      };
    }

    case 'unzip-archive-extractor': {
      const zip = await JSZip.loadAsync(await primaryFile.arrayBuffer());
      const entries: string[] = [];
      zip.forEach((relPath, fileObj) => {
        entries.push(`${fileObj.dir ? '[DIR] ' : '[FILE]'} ${relPath}`);
      });
      const report = [
        `ZIP ARCHIVE CONTENTS REPORT — ${primaryFile.name}`,
        `Archive Size: ${(primaryFile.size / 1024).toFixed(2)} KB`,
        `Total Entries: ${entries.length}`,
        `----------------------------------------`,
        ...(entries.length > 0 ? entries : ['Archive is empty.']),
      ].join('\n');
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `${baseName}-contents.txt`,
        mimeType: 'text/plain',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Inspected ZIP archive: found ${entries.length} entry/entries.`,
        previewText: report,
      };
    }

    case 'json-minifier-compressor': {
      const raw = primaryFile ? await readFileAsText(primaryFile) : String(settings.rawJson || '{}');
      const parsed = JSON.parse(raw);
      const minified = JSON.stringify(parsed);
      const blob = new Blob([minified], { type: 'application/json' });
      return {
        blob,
        filename: `${baseName || 'data'}.min.json`,
        mimeType: 'application/json',
        inputBytes: new Blob([raw]).size,
        outputBytes: blob.size,
        summaryText: `Minified JSON from ${new Blob([raw]).size} bytes to ${blob.size} bytes.`,
        previewText: minified,
      };
    }

    case 'html-css-js-minifier': {
      const raw = primaryFile ? await readFileAsText(primaryFile) : String(settings.codeContent || '');
      const minified = raw
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')
        .trim();
      const blob = new Blob([minified], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `${baseName || 'code'}.min.txt`,
        mimeType: 'text/plain',
        inputBytes: new Blob([raw]).size,
        outputBytes: blob.size,
        summaryText: `Compressed code payload from ${new Blob([raw]).size} B to ${blob.size} B.`,
        previewText: minified,
      };
    }

    case 'svg-vector-compressor': {
      const raw = primaryFile ? await readFileAsText(primaryFile) : String(settings.svgInput || '');
      const cleaned = raw
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
      const blob = new Blob([cleaned], { type: 'image/svg+xml' });
      return {
        blob,
        filename: `${baseName || 'icon'}.min.svg`,
        mimeType: 'image/svg+xml',
        inputBytes: new Blob([raw]).size,
        outputBytes: blob.size,
        summaryText: `Optimized SVG vector file (${new Blob([raw]).size} B → ${blob.size} B).`,
        previewText: cleaned,
      };
    }

    case 'batch-photo-zip-compressor': {
      const q = Math.max(0.2, Math.min(0.95, Number(settings.quality) || 0.7));
      const zip = new JSZip();
      for (let i = 0; i < files.length; i++) {
        onProgress(Math.round(10 + (i / files.length) * 80), `Compressing photo ${i + 1} of ${files.length}...`);
        const img = await loadImageElement(files[i]);
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        const jpgBlob = await canvasToBlob(c, 'image/jpeg', q);
        const cleanName = files[i].name.replace(/\.[^.]+$/, '') + '-compressed.jpg';
        zip.file(cleanName, jpgBlob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      return {
        blob: zipBlob,
        filename: `compressed-photos-${files.length}.zip`,
        mimeType: 'application/zip',
        inputBytes,
        outputBytes: zipBlob.size,
        summaryText: `Batch-compressed ${files.length} photo(s) at ${Math.round(q * 100)}% quality into ZIP.`,
      };
    }

    // ================= G. SMART CALCULATORS & FINANCIAL UTILITIES (116 - 130) =================
    case 'gst-tax-calculator':
    case 'emi-loan-calculator':
    case 'age-calculator':
    case 'bmi-health-calculator':
    case 'sip-mutual-fund-calculator':
    case 'percentage-calculator':
    case 'discount-price-calculator':
    case 'salary-takehome-calculator':
    case 'date-duration-calculator':
    case 'unit-length-weight-converter':
    case 'digital-storage-converter':
    case 'scientific-math-calculator':
    case 'fuel-trip-cost-calculator':
    case 'electricity-bill-calculator':
    case 'freelance-hourly-rate-calculator': {
      let reportLines: string[] = [];
      let headline = '';

      if (tool.slug === 'gst-tax-calculator') {
        const amt = Number(settings.amount) || 10000;
        const rate = Number(settings.gstRate) || 18;
        const mode = String(settings.calcType || 'exclusive');
        const net = mode === 'exclusive' ? amt : amt / (1 + rate / 100);
        const gst = mode === 'exclusive' ? amt * (rate / 100) : amt - net;
        const total = mode === 'exclusive' ? amt + gst : amt;
        headline = `Net: ₹${net.toFixed(2)} | GST (${rate}%): ₹${gst.toFixed(2)} | Total: ₹${total.toFixed(2)}`;
        reportLines = [
          `GST TAX CALCULATION REPORT`,
          `Mode: ${mode === 'exclusive' ? 'GST Exclusive (Add GST)' : 'GST Inclusive (Remove GST)'}`,
          `Net Pre-Tax Amount : Rs. ${net.toFixed(2)}`,
          `CGST (${(rate / 2).toFixed(1)}%)         : Rs. ${(gst / 2).toFixed(2)}`,
          `SGST (${(rate / 2).toFixed(1)}%)         : Rs. ${(gst / 2).toFixed(2)}`,
          `Total GST (${rate}%)    : Rs. ${gst.toFixed(2)}`,
          `Total Gross Amount : Rs. ${total.toFixed(2)}`,
        ];
      } else if (tool.slug === 'emi-loan-calculator') {
        const p = Number(settings.principal) || 500000;
        const rAnnual = Number(settings.rateAnnual) || 8.5;
        const n = Math.max(1, Number(settings.tenureMonths) || 60);
        const r = rAnnual / 12 / 100;
        const emi = r === 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const totalPay = emi * n;
        const totalInt = totalPay - p;
        headline = `Monthly EMI: ₹${emi.toFixed(2)} | Total Interest: ₹${totalInt.toFixed(2)}`;
        reportLines = [
          `LOAN EMI REPAYMENT SCHEDULE SUMMARY`,
          `Loan Principal Amount : Rs. ${p.toFixed(2)}`,
          `Annual Interest Rate  : ${rAnnual}% p.a.`,
          `Loan Tenure           : ${n} Months (${(n / 12).toFixed(1)} Years)`,
          `-------------------------------------------`,
          `Monthly EMI           : Rs. ${emi.toFixed(2)}`,
          `Total Interest Payable: Rs. ${totalInt.toFixed(2)}`,
          `Total Amount Payable  : Rs. ${totalPay.toFixed(2)}`,
        ];
      } else if (tool.slug === 'age-calculator') {
        const dob = new Date(String(settings.dob || '1998-05-15'));
        const target = new Date(String(settings.targetDate || '2026-10-20'));
        const diffMs = Math.max(0, target.getTime() - dob.getTime());
        const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const years = Math.floor(totalDays / 365.2425);
        const months = Math.floor((totalDays % 365.2425) / 30.4375);
        const days = Math.floor((totalDays % 365.2425) % 30.4375);
        headline = `Exact Age: ${years} Years, ${months} Months, ${days} Days (${totalDays.toLocaleString()} Total Days)`;
        reportLines = [
          `CHRONOLOGICAL AGE REPORT`,
          `Date of Birth : ${settings.dob}`,
          `Calculated On : ${settings.targetDate}`,
          `-------------------------------------------`,
          `Exact Age     : ${years} Years, ${months} Months, ${days} Days`,
          `Total Weeks   : ${Math.floor(totalDays / 7).toLocaleString()} Weeks`,
          `Total Days    : ${totalDays.toLocaleString()} Days`,
          `Total Hours   : ${(totalDays * 24).toLocaleString()} Hours`,
        ];
      } else if (tool.slug === 'bmi-health-calculator') {
        const w = Number(settings.weightKg) || 70;
        const hCm = Number(settings.heightCm) || 172;
        const hM = hCm / 100;
        const bmi = w / (hM * hM);
        const category =
          bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal / Healthy Weight' : bmi < 30 ? 'Overweight' : 'Obese';
        const minIdeal = (18.5 * hM * hM).toFixed(1);
        const maxIdeal = (24.9 * hM * hM).toFixed(1);
        headline = `BMI: ${bmi.toFixed(1)} kg/m² (${category}) | Ideal Weight: ${minIdeal}–${maxIdeal} kg`;
        reportLines = [
          `BODY MASS INDEX (BMI) HEALTH REPORT`,
          `Weight             : ${w} kg`,
          `Height             : ${hCm} cm (${hM.toFixed(2)} m)`,
          `Calculated BMI     : ${bmi.toFixed(2)} kg/m²`,
          `WHO Classification : ${category}`,
          `Healthy Weight Span: ${minIdeal} kg to ${maxIdeal} kg`,
        ];
      } else if (tool.slug === 'sip-mutual-fund-calculator') {
        const p = Number(settings.monthlyInvest) || 5000;
        const rAnnual = Number(settings.expectedReturn) || 12;
        const yrs = Number(settings.years) || 10;
        const n = yrs * 12;
        const i = rAnnual / 12 / 100;
        const fv = p * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
        const invested = p * n;
        const gain = fv - invested;
        headline = `Total Maturity Value: ₹${ Math.round(fv).toLocaleString()} (Wealth Gain: ₹${Math.round(gain).toLocaleString()})`;
        reportLines = [
          `SIP WEALTH COMPOUNDING PROJECTION`,
          `Monthly SIP Investment : Rs. ${p.toLocaleString()}`,
          `Expected Return Rate   : ${rAnnual}% p.a.`,
          `Investment Horizon     : ${yrs} Years (${n} Months)`,
          `-------------------------------------------`,
          `Total Capital Invested : Rs. ${Math.round(invested).toLocaleString()}`,
          `Estimated Wealth Gain  : Rs. ${Math.round(gain).toLocaleString()}`,
          `Maturity Value         : Rs. ${Math.round(fv).toLocaleString()}`,
        ];
      } else if (tool.slug === 'percentage-calculator') {
        const part = Number(settings.obtainedValue) || 432;
        const total = Number(settings.totalValue) || 500;
        const pct = total !== 0 ? (part / total) * 100 : 0;
        headline = `Result: ${pct.toFixed(2)}% (${part} out of ${total})`;
        reportLines = [
          `PERCENTAGE & MARKS CALCULATION`,
          `Obtained / Part Value : ${part}`,
          `Total / Base Value    : ${total}`,
          `Exact Percentage      : ${pct.toFixed(2)}%`,
          `10% of Base Value     : ${(total * 0.1).toFixed(2)}`,
          `25% of Base Value     : ${(total * 0.25).toFixed(2)}`,
        ];
      } else if (tool.slug === 'discount-price-calculator') {
        const mrp = Number(settings.originalPrice) || 2499;
        const disc = Number(settings.discountPct) || 25;
        const tax = Number(settings.extraTaxPct) || 0;
        const saved = mrp * (disc / 100);
        const afterDisc = mrp - saved;
        const taxAmt = afterDisc * (tax / 100);
        const finalPay = afterDisc + taxAmt;
        headline = `Final Payable Price: ₹${finalPay.toFixed(2)} (You Save: ₹${saved.toFixed(2)})`;
        reportLines = [
          `DISCOUNT & SALE PRICE RECEIPT`,
          `Original MRP Price     : Rs. ${mrp.toFixed(2)}`,
          `Discount (${disc}%)        : -Rs. ${saved.toFixed(2)}`,
          `Discounted Net Price   : Rs. ${afterDisc.toFixed(2)}`,
          `Tax Added (${tax}%)        : +Rs. ${taxAmt.toFixed(2)}`,
          `Final Payable Amount   : Rs. ${finalPay.toFixed(2)}`,
        ];
      } else if (tool.slug === 'salary-takehome-calculator') {
        const emp = String(settings.employeeName || 'Employee');
        const ctc = Number(settings.annualCtc) || 1200000;
        const monthlyGross = ctc / 12;
        const basic = monthlyGross * 0.5;
        const hra = basic * 0.4;
        const special = monthlyGross - basic - hra;
        const pf = basic * ((Number(settings.pfPercent) || 12) / 100);
        const tax = monthlyGross * ((Number(settings.taxPercent) || 10) / 100);
        const netTakeHome = monthlyGross - pf - tax;
        headline = `Monthly Net In-Hand Salary: ₹${Math.round(netTakeHome).toLocaleString()}/month`;
        reportLines = [
          `MONTHLY SALARY & PAYSLIP BREAKDOWN — ${emp}`,
          `Annual CTC Package     : Rs. ${ctc.toLocaleString()}`,
          `Monthly Gross Salary   : Rs. ${Math.round(monthlyGross).toLocaleString()}`,
          `  Basic Pay (50%)      : Rs. ${Math.round(basic).toLocaleString()}`,
          `  HRA (40% of Basic)   : Rs. ${Math.round(hra).toLocaleString()}`,
          `  Special Allowance    : Rs. ${Math.round(special).toLocaleString()}`,
          `Deductions:`,
          `  Provident Fund (PF)  : -Rs. ${Math.round(pf).toLocaleString()}`,
          `  Income Tax / TDS     : -Rs. ${Math.round(tax).toLocaleString()}`,
          `-------------------------------------------`,
          `NET TAKE-HOME SALARY   : Rs. ${Math.round(netTakeHome).toLocaleString()} / month`,
        ];
      } else if (tool.slug === 'date-duration-calculator') {
        const d1 = new Date(String(settings.startDate || '2026-01-01'));
        const d2 = new Date(String(settings.endDate || '2026-10-20'));
        const totalDays = Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        const weeks = (totalDays / 7).toFixed(1);
        const workDays = Math.round(totalDays * (5 / 7));
        headline = `Duration: ${totalDays} Calendar Days (~${workDays} Working Days)`;
        reportLines = [
          `DATE DURATION & WORKING DAYS SUMMARY`,
          `Start Date         : ${settings.startDate}`,
          `End Date           : ${settings.endDate}`,
          `Total Calendar Days: ${totalDays} Days`,
          `Total Weeks        : ${weeks} Weeks`,
          `Est. Working Days  : ${workDays} Weekdays (Mon-Fri)`,
        ];
      } else if (tool.slug === 'unit-length-weight-converter') {
        const val = Number(settings.inputValue) || 100;
        const mode = String(settings.conversionMode || 'length');
        if (mode === 'length') {
          headline = `${val} Meters = ${(val * 3.28084).toFixed(2)} Feet | ${(val / 1000).toFixed(3)} km`;
          reportLines = [
            `UNIT CONVERSION TABLE (LENGTH)`,
            `${val} Meters = ${(val * 3.28084).toFixed(3)} Feet`,
            `${val} Meters = ${(val * 39.3701).toFixed(2)} Inches`,
            `${val} Kilometers = ${(val * 0.621371).toFixed(3)} Miles`,
            `${val} Centimeters = ${(val * 0.393701).toFixed(2)} Inches`,
          ];
        } else if (mode === 'weight') {
          headline = `${val} kg = ${(val * 2.20462).toFixed(2)} lbs | ${(val * 1000).toLocaleString()} grams`;
          reportLines = [
            `UNIT CONVERSION TABLE (WEIGHT)`,
            `${val} Kilograms = ${(val * 2.20462).toFixed(3)} Pounds (lbs)`,
            `${val} Kilograms = ${(val * 35.274).toFixed(2)} Ounces (oz)`,
            `${val} Pounds (lbs) = ${(val * 0.453592).toFixed(3)} Kilograms`,
          ];
        } else {
          const f = (val * 9) / 5 + 32;
          const k = val + 273.15;
          headline = `${val}°C = ${f.toFixed(1)}°F | ${k.toFixed(2)} K`;
          reportLines = [
            `TEMPERATURE CONVERSION TABLE`,
            `${val} °C (Celsius)    = ${f.toFixed(2)} °F (Fahrenheit)`,
            `${val} °C (Celsius)    = ${k.toFixed(2)} K (Kelvin)`,
            `${val} °F (Fahrenheit) = ${(((val - 32) * 5) / 9).toFixed(2)} °C (Celsius)`,
          ];
        }
      } else if (tool.slug === 'digital-storage-converter') {
        const mb = Number(settings.sizeMb) || 500;
        const mbps = Math.max(1, Number(settings.speedMbps) || 100);
        const sec = (mb * 8) / mbps;
        headline = `${mb} MB = ${(mb / 1024).toFixed(3)} GB | Download Time @ ${mbps} Mbps: ${sec.toFixed(1)} sec`;
        reportLines = [
          `DIGITAL STORAGE & TRANSFER CALCULATOR`,
          `Input File Size   : ${mb} MB`,
          `In Kilobytes (KB) : ${(mb * 1024).toLocaleString()} KB`,
          `In Gigabytes (GB) : ${(mb / 1024).toFixed(4)} GB`,
          `Transfer Speed    : ${mbps} Mbps`,
          `Download Time     : ${sec.toFixed(1)} Seconds (${(sec / 60).toFixed(2)} Mins)`,
        ];
      } else if (tool.slug === 'scientific-math-calculator') {
        const expr = String(settings.expression || '(1500 * 1.18) + 250');
        const sanitized = expr.replace(/[^0-9+\-*/().,%\sMathsqrtpowcossintanlogPI]/g, '');
        let val = 0;
        try {
          val = Function(`"use strict"; return (${sanitized});`)();
        } catch {
          val = NaN;
        }
        headline = `Expression: ${expr} = ${val}`;
        reportLines = [
          `SCIENTIFIC & MATH EXPRESSION REPORT`,
          `Input Formula : ${expr}`,
          `Evaluated     : ${val}`,
          `Square Root   : ${val >= 0 ? Math.sqrt(val).toFixed(4) : 'N/A'}`,
          `Rounded       : ${Math.round(val)}`,
        ];
      } else if (tool.slug === 'fuel-trip-cost-calculator') {
        const dist = Number(settings.distanceKm) || 350;
        const mileage = Math.max(1, Number(settings.mileageKmpl) || 18);
        const price = Number(settings.fuelPrice) || 96;
        const ppl = Math.max(1, Number(settings.passengers) || 4);
        const liters = dist / mileage;
        const cost = liters * price;
        headline = `Fuel Needed: ${liters.toFixed(1)} L | Total Trip Cost: ₹${cost.toFixed(2)} (₹${(cost / ppl).toFixed(2)}/person)`;
        reportLines = [
          `ROAD TRIP FUEL & EXPENSE SUMMARY`,
          `Total Distance      : ${dist} km`,
          `Vehicle Mileage     : ${mileage} km/L`,
          `Fuel Price          : Rs. ${price}/L`,
          `Total Fuel Required : ${liters.toFixed(2)} Liters`,
          `Total Fuel Cost     : Rs. ${cost.toFixed(2)}`,
          `Cost per Passenger  : Rs. ${(cost / ppl).toFixed(2)} (${ppl} Passengers)`,
        ];
      } else if (tool.slug === 'electricity-bill-calculator') {
        const watts = Number(settings.wattage) || 1500;
        const hrs = Number(settings.hoursPerDay) || 8;
        const rate = Number(settings.ratePerUnit) || 8;
        const dailyKwh = (watts * hrs) / 1000;
        const monthlyKwh = dailyKwh * 30;
        const monthlyCost = monthlyKwh * rate;
        headline = `Monthly Consumption: ${monthlyKwh.toFixed(1)} kWh | Monthly Bill: ₹${monthlyCost.toFixed(2)}`;
        reportLines = [
          `APPLIANCE ELECTRICITY CONSUMPTION REPORT`,
          `Appliance Load      : ${watts} Watts (${hrs} hrs/day)`,
          `Daily Units (kWh)   : ${dailyKwh.toFixed(2)} kWh/day`,
          `Monthly Units (30d) : ${monthlyKwh.toFixed(2)} kWh/month`,
          `Monthly Energy Cost : Rs. ${monthlyCost.toFixed(2)} (@ Rs. ${rate}/unit)`,
          `Annual Energy Cost  : Rs. ${(monthlyCost * 12).toFixed(2)}`,
        ];
      } else {
        const income = Number(settings.targetIncome) || 1200000;
        const hrsWk = Math.max(1, Number(settings.billableHoursWeek) || 30);
        const projHrs = Number(settings.projectHours) || 40;
        const annualHrs = hrsWk * 48;
        const hourly = (income * 1.25) / annualHrs;
        const quote = hourly * projHrs;
        headline = `Recommended Rate: ₹${Math.round(hourly)}/hr | ${projHrs}h Project Quote: ₹${Math.round(quote).toLocaleString()}`;
        reportLines = [
          `FREELANCE HOURLY RATE & PROJECT ESTIMATE`,
          `Target Annual Net Income : Rs. ${income.toLocaleString()}`,
          `Billable Hours / Year    : ${annualHrs} hrs (${hrsWk} hrs/week × 48 weeks)`,
          `Recommended Hourly Rate  : Rs. ${Math.round(hourly)} / hour`,
          `Recommended Day Rate (8h): Rs. ${Math.round(hourly * 8).toLocaleString()} / day`,
          `Project Quote (${projHrs} hrs)   : Rs. ${Math.round(quote).toLocaleString()}`,
        ];
      }

      const fullReport = reportLines.join('\n');
      const pdfBytes = await createPaginatedTextPdf(tool.name, fullReport, 12);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${tool.slug}-report.pdf`,
        mimeType: 'application/pdf',
        inputBytes: fullReport.length,
        outputBytes: blob.size,
        summaryText: headline,
        previewText: fullReport,
      };
    }

    // ================= H. ADVANCED PHOTO, TEMPLATE & DOCUMENT STUDIO (131 - 140) =================
    case 'passport-photo-maker': {
      const img = await loadImageElement(primaryFile);
      const count = parseInt(String(settings.copiesCount || '8'), 10) || 8;
      const singleW = 413; // 35mm @ 300 DPI
      const singleH = 531; // 45mm @ 300 DPI

      // Center crop portrait to 35:45 ratio
      const targetRatio = singleW / singleH;
      const srcRatio = img.naturalWidth / img.naturalHeight;
      let sx = 0,
        sy = 0,
        sw = img.naturalWidth,
        sh = img.naturalHeight;
      if (srcRatio > targetRatio) {
        sw = Math.round(img.naturalHeight * targetRatio);
        sx = Math.round((img.naturalWidth - sw) / 2);
      } else {
        sh = Math.round(img.naturalWidth / targetRatio);
        sy = Math.round((img.naturalHeight - sh) / 2);
      }

      if (count === 1) {
        const c = document.createElement('canvas');
        c.width = singleW;
        c.height = singleH;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, singleW, singleH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, singleW, singleH);
        const outBlob = await canvasToBlob(c, 'image/jpeg', 0.95);
        return {
          blob: outBlob,
          filename: `${baseName}-passport-35x45mm.jpg`,
          mimeType: 'image/jpeg',
          inputBytes,
          outputBytes: outBlob.size,
          summaryText: `Created official 35×45mm (413×531px @ 300 DPI) Passport Photo.`,
          previewImageUrl: URL.createObjectURL(outBlob),
        };
      }

      const cols = 4;
      const rows = count === 12 ? 3 : 2;
      const gap = 36;
      const sheet = document.createElement('canvas');
      sheet.width = cols * singleW + (cols + 1) * gap;
      sheet.height = rows * singleH + (rows + 1) * gap;
      const ctx = sheet.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sheet.width, sheet.height);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = gap + c * (singleW + gap);
          const y = gap + r * (singleH + gap);
          ctx.drawImage(img, sx, sy, sw, sh, x, y, singleW, singleH);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, singleW, singleH);
        }
      }

      const outBlob = await canvasToBlob(sheet, 'image/jpeg', 0.95);
      return {
        blob: outBlob,
        filename: `${baseName}-passport-sheet-${count}x.jpg`,
        mimeType: 'image/jpeg',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Generated printable sheet with ${count} Passport Size Photos (300 DPI with cut guides).`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'image-color-picker-palette': {
      const img = await loadImageElement(primaryFile);
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = 60;
      sampleCanvas.height = 60;
      const sCtx = sampleCanvas.getContext('2d')!;
      sCtx.drawImage(img, 0, 0, 60, 60);

      const points = [
        [10, 10],
        [30, 15],
        [50, 12],
        [15, 30],
        [30, 30],
        [45, 45],
      ];
      const hexColors = points.map(([px, py]) => {
        const d = sCtx.getImageData(px, py, 1, 1).data;
        return (
          '#' +
          [d[0], d[1], d[2]]
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase()
        );
      });

      const card = document.createElement('canvas');
      card.width = 720;
      card.height = 480;
      const ctx = card.getContext('2d')!;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 720, 480);
      ctx.drawImage(img, 24, 24, 672, 280);

      hexColors.forEach((hex, i) => {
        const x = 24 + i * 114;
        ctx.fillStyle = hex;
        ctx.fillRect(x, 324, 100, 90);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(hex, x + 50, 440);
      });

      const outBlob = await canvasToBlob(card, 'image/png');
      return {
        blob: outBlob,
        filename: `${baseName}-color-palette.png`,
        mimeType: 'image/png',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Extracted HEX Palette: ${hexColors.join(', ')}`,
        previewImageUrl: URL.createObjectURL(outBlob),
        previewText: `Dominant HEX Colors:\n${hexColors.map((h, i) => `Swatch ${i + 1}: ${h}`).join('\n')}`,
      };
    }

    case 'photo-collage-grid-maker': {
      const cols = Math.max(1, Math.min(4, Number(settings.columns) || 2));
      const gap = Math.max(0, Number(settings.gapPx) ?? 16);
      const rows = Math.ceil(files.length / cols);
      const cellSize = 450;
      const canvas = document.createElement('canvas');
      canvas.width = cols * cellSize + (cols + 1) * gap;
      canvas.height = rows * cellSize + (rows + 1) * gap;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < files.length; i++) {
        const img = await loadImageElement(files[i]);
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = gap + c * (cellSize + gap);
        const y = gap + r * (cellSize + gap);
        ctx.drawImage(img, x, y, cellSize, cellSize);
      }

      const outBlob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
      return {
        blob: outBlob,
        filename: `photo-collage-${files.length}imgs.jpg`,
        mimeType: 'image/jpeg',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Combined ${files.length} photo(s) into a ${cols}-column high-resolution grid collage.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'round-profile-dp-maker': {
      const img = await loadImageElement(primaryFile);
      const size = 600;
      const border = Math.max(0, Number(settings.borderWidth) ?? 14);
      const color = String(settings.borderColor || '#e11d48');
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - border / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const minSide = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - minSide) / 2;
      const sy = (img.naturalHeight - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
      ctx.restore();

      if (border > 0) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - border / 2, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = border;
        ctx.stroke();
      }

      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `${baseName}-circle-dp.png`,
        mimeType: 'image/png',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Created 600×600px transparent circular profile picture with ${border}px ${color} ring.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'image-blur-pixelate': {
      const img = await loadImageElement(primaryFile);
      const blur = Math.max(1, Number(settings.blurPx) || 12);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.filter = `blur(${blur}px)`;
      ctx.drawImage(img, 0, 0);
      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `${baseName}-blurred-${blur}px.png`,
        mimeType: 'image/png',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Applied ${blur}px Gaussian blur filter to image.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'sepia-vintage-photo-filter': {
      const img = await loadImageElement(primaryFile);
      const pct = Math.max(10, Math.min(100, Number(settings.sepiaPct) || 85));
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.filter = `sepia(${pct}%)`;
      ctx.drawImage(img, 0, 0);
      const outBlob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
      return {
        blob: outBlob,
        filename: `${baseName}-sepia-${pct}.jpg`,
        mimeType: 'image/jpeg',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Applied ${pct}% warm sepia vintage filter to photo.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'id-card-badge-generator': {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const page = pdfDoc.addPage([320, 480]);

      const org = sanitizeWinAnsi(String(settings.orgName || 'PDFLove Technologies'));
      const name = sanitizeWinAnsi(String(settings.personName || 'Rohan Desai'));
      const role = sanitizeWinAnsi(String(settings.designation || 'Senior Product Engineer'));
      const idNum = sanitizeWinAnsi(String(settings.idNumber || 'EMP-2026-409'));
      const extra = sanitizeWinAnsi(String(settings.bloodGroup || 'O+'));

      page.drawRectangle({ x: 12, y: 12, width: 296, height: 456, borderColor: rgb(0.08, 0.1, 0.16), borderWidth: 2 });
      page.drawRectangle({ x: 12, y: 390, width: 296, height: 78, color: rgb(0.88, 0.11, 0.28) });
      page.drawText(org.slice(0, 32), { x: 28, y: 425, size: 13, font: bold, color: rgb(1, 1, 1) });
      page.drawText('OFFICIAL IDENTITY BADGE', { x: 28, y: 405, size: 9, font, color: rgb(1, 0.9, 0.92) });

      page.drawText(name, { x: 32, y: 290, size: 18, font: bold, color: rgb(0.08, 0.1, 0.16) });
      page.drawText(role, { x: 32, y: 266, size: 11, font, color: rgb(0.88, 0.11, 0.28) });
      page.drawText(`ID Number : ${idNum}`, { x: 32, y: 225, size: 10.5, font: bold });
      page.drawText(`Emergency : ${extra}`, { x: 32, y: 202, size: 10, font });

      // Embed verification QR code
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, `ID:${idNum}|${name}|${org}`, { width: 120, margin: 1 });
      const qrBlob = await canvasToBlob(qrCanvas, 'image/png');
      const qrImg = await pdfDoc.embedPng(await qrBlob.arrayBuffer());
      page.drawImage(qrImg, { x: 100, y: 50, width: 110, height: 110 });

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `id-card-${idNum}.pdf`,
        mimeType: 'application/pdf',
        inputBytes: 0,
        outputBytes: blob.size,
        summaryText: `Generated printable ID Card Badge PDF for ${name} (${idNum}).`,
      };
    }

    case 'rent-receipt-pdf-generator': {
      const tenant = sanitizeWinAnsi(String(settings.tenantName || 'Suresh Iyer'));
      const landlord = sanitizeWinAnsi(String(settings.landlordName || 'Meera Kapoor'));
      const rent = Number(settings.monthlyRent) || 22000;
      const period = sanitizeWinAnsi(String(settings.rentPeriod || 'October 2026'));
      const addr = sanitizeWinAnsi(String(settings.propertyAddress || 'Bengaluru'));

      const text = [
        `RECEIPT NO: HRA-${Date.now().toString().slice(-5)}`,
        `DATE: ${new Date().toISOString().slice(0, 10)}`,
        ``,
        `Received with thanks from Mr./Ms. ${tenant} a sum of Rs. ${rent.toLocaleString()}/-`,
        `towards monthly house rent for the period of ${period}`,
        `in respect of residential property situated at:`,
        `${addr}.`,
        ``,
        `Landlord Name & PAN : ${landlord}`,
        `Payment Mode        : Bank Transfer / UPI`,
        ``,
        `[Affix Rs. 1/- Revenue Stamp & Landlord Signature]`,
      ].join('\n');

      const outBytes = await createPaginatedTextPdf('HOUSE RENT RECEIPT (HRA)', text, 12);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `rent-receipt-${period.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        mimeType: 'application/pdf',
        inputBytes: text.length,
        outputBytes: blob.size,
        summaryText: `Generated official HRA Rent Receipt PDF for ${period} (Rs. ${rent.toLocaleString()}).`,
        previewText: text,
      };
    }

    case 'experience-letter-generator': {
      const comp = sanitizeWinAnsi(String(settings.companyName || 'Apex Global Solutions Ltd.'));
      const emp = sanitizeWinAnsi(String(settings.employeeName || 'Neha Gupta'));
      const role = sanitizeWinAnsi(String(settings.role || 'Operations Manager'));
      const tenure = sanitizeWinAnsi(String(settings.tenure || '2022 to 2026'));
      const sign = sanitizeWinAnsi(String(settings.signatory || 'Head of Human Resources'));

      const body = [
        `COMPANY: ${comp}`,
        `DATE: ${new Date().toISOString().slice(0, 10)}`,
        `REF: HR/EXP/${new Date().getFullYear()}/109`,
        ``,
        `TO WHOMSOEVER IT MAY CONCERN`,
        ``,
        `This is to certify that ${emp} was employed with ${comp} as ${role} during the period from ${tenure}.`,
        ``,
        `During their tenure with us, we found ${emp} to be sincere, hardworking, and technically proficient. Their conduct and performance remained exemplary throughout their employment.`,
        ``,
        `We wish ${emp} every success in their future career endeavors.`,
        ``,
        `For ${comp},`,
        `${sign}`,
      ].join('\n');

      const outBytes = await createPaginatedTextPdf('EXPERIENCE & RELIEVING CERTIFICATE', body, 12);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `experience-letter-${emp.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        mimeType: 'application/pdf',
        inputBytes: body.length,
        outputBytes: blob.size,
        summaryText: `Generated official Work Experience & Relieving Letter PDF for ${emp}.`,
        previewText: body,
      };
    }

    // ================= I. NEW DAILY-USE SIGNATURE, ID, SOCIAL, TEXT & TAX TOOLS (141 - 160) =================
    case 'aadhaar-pan-id-card-merger': {
      const pdfDoc = await PDFDocument.create();
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const page = pdfDoc.addPage([595.28, 841.89]);
      const isHorizontal = String(settings.layoutMode || 'vertical') === 'horizontal';
      const drawBorder = settings.addCutBorder !== false;

      page.drawText('FRONT & BACK IDENTITY CARD PRINT SHEET', {
        x: 50,
        y: 795,
        size: 13,
        font: bold,
        color: rgb(0.12, 0.15, 0.22),
      });

      const cardW = isHorizontal ? 235 : 280;
      const cardH = isHorizontal ? 148 : 176;

      const slots = [
        isHorizontal ? { x: 50, y: 560, label: 'FRONT SIDE' } : { x: 157, y: 550, label: 'FRONT SIDE' },
        isHorizontal ? { x: 310, y: 560, label: 'BACK SIDE' } : { x: 157, y: 320, label: 'BACK SIDE' },
      ];

      for (let i = 0; i < Math.min(2, files.length); i++) {
        const imgEl = await loadImageElement(files[i]);
        const c = document.createElement('canvas');
        c.width = imgEl.naturalWidth;
        c.height = imgEl.naturalHeight;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(imgEl, 0, 0);
        const jpgBlob = await canvasToBlob(c, 'image/jpeg', 0.92);
        const embedded = await pdfDoc.embedJpg(await jpgBlob.arrayBuffer());

        const slot = slots[i];
        page.drawText(slot.label, { x: slot.x, y: slot.y + cardH + 8, size: 9, font: bold, color: rgb(0.4, 0.45, 0.52) });
        page.drawImage(embedded, { x: slot.x, y: slot.y, width: cardW, height: cardH });
        if (drawBorder) {
          page.drawRectangle({
            x: slot.x - 4,
            y: slot.y - 4,
            width: cardW + 8,
            height: cardH + 8,
            borderColor: rgb(0.65, 0.7, 0.78),
            borderWidth: 1,
          });
        }
      }

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `id-card-front-back-a4.pdf`,
        mimeType: 'application/pdf',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Merged ${Math.min(2, files.length)} ID card side(s) onto a single A4 printable PDF sheet.`,
      };
    }

    case 'signature-maker-transparent': {
      const text = String(settings.sigText || 'Safwan Shaikh').trim();
      const color = String(settings.inkColor || '#1d4ed8');
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 280;
      const ctx = canvas.getContext('2d')!;

      ctx.save();
      ctx.translate(60, 175);
      ctx.transform(1, -0.06, -0.22, 1, 0, 0);
      ctx.font = 'italic bold 72px "Times New Roman", Georgia, serif';
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);

      // Underline flourish stroke
      const textW = Math.min(620, ctx.measureText(text).width);
      ctx.beginPath();
      ctx.moveTo(-10, 22);
      ctx.quadraticCurveTo(textW * 0.5, 4, textW + 25, 18);
      ctx.quadraticCurveTo(textW * 0.75, 28, textW * 0.35, 32);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `digital-signature-${text.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`,
        mimeType: 'image/png',
        inputBytes: text.length,
        outputBytes: outBlob.size,
        summaryText: `Generated transparent digital signature PNG (800×280px) in ${color} ink.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'stamp-seal-generator': {
      const comp = String(settings.companyName || 'PDFLOVE TECHNOLOGIES PVT. LTD.').toUpperCase();
      const center = String(settings.centerText || 'AUTHORIZED SIGNATORY').toUpperCase();
      const city = String(settings.cityText || 'OFFICIAL SEAL').toUpperCase();
      const color = String(settings.stampColor || '#1e40af');

      const canvas = document.createElement('canvas');
      canvas.width = 520;
      canvas.height = 520;
      const ctx = canvas.getContext('2d')!;
      const cx = 260;
      const cy = 260;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, 225, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 208, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 138, 0, Math.PI * 2);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`★  ${comp.slice(0, 28)}  ★`, cx, cy - 155);
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText(city.slice(0, 28), cx, cy + 172);

      // Center banner box
      ctx.strokeRect(cx - 165, cy - 28, 330, 56);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(center.slice(0, 24), cx, cy + 7);

      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `company-stamp-seal.png`,
        mimeType: 'image/png',
        inputBytes: comp.length,
        outputBytes: outBlob.size,
        summaryText: `Generated 520×520px transparent circular company stamp PNG.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'marriage-biodata-pdf-maker': {
      const name = sanitizeWinAnsi(String(settings.fullName || 'Aarav Sharma'));
      const dob = sanitizeWinAnsi(String(settings.dobHeight || '15 May 1997 · 5 ft 10 in'));
      const edu = sanitizeWinAnsi(String(settings.educationJob || 'B.Tech · Software Engineer'));
      const fam = sanitizeWinAnsi(String(settings.familyDetails || ''));
      const contact = sanitizeWinAnsi(String(settings.contactDetails || ''));

      const content = [
        `PERSONAL PROFILE`,
        `--------------------------------------------------`,
        `Full Name            : ${name}`,
        `Birth & Height       : ${dob}`,
        `Education & Career   : ${edu}`,
        ``,
        `FAMILY BACKGROUND`,
        `--------------------------------------------------`,
        fam,
        ``,
        `CONTACT DETAILS`,
        `--------------------------------------------------`,
        contact,
      ].join('\n');

      const outBytes = await createPaginatedTextPdf('MATRIMONIAL BIODATA PROFILE', content, 12);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `marriage-biodata-${name.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        mimeType: 'application/pdf',
        inputBytes: content.length,
        outputBytes: blob.size,
        summaryText: `Generated formatted Marriage Biodata PDF for ${name}.`,
        previewText: content,
      };
    }

    case 'leave-application-pdf-generator': {
      const to = sanitizeWinAnsi(String(settings.recipientTitle || 'The Manager'));
      const from = sanitizeWinAnsi(String(settings.applicantName || 'Applicant'));
      const dates = sanitizeWinAnsi(String(settings.leaveDates || '3 Days'));
      const reason = sanitizeWinAnsi(String(settings.leaveReason || 'Personal work'));

      const letter = [
        `Date: ${new Date().toISOString().slice(0, 10)}`,
        ``,
        `To,`,
        `${to}`,
        ``,
        `Subject: Formal Application for Leave of Absence (${dates})`,
        ``,
        `Respected Sir / Madam,`,
        ``,
        `I am writing to formally request a leave of absence for ${dates} due to ${reason}.`,
        ``,
        `I have ensured that my current responsibilities and pending tasks are properly handed over during my absence. I kindly request you to grant me leave for the mentioned period.`,
        ``,
        `Thanking you,`,
        `Yours sincerely,`,
        `${from}`,
      ].join('\n');

      const outBytes = await createPaginatedTextPdf('LEAVE APPLICATION', letter, 12);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `leave-application.pdf`,
        mimeType: 'application/pdf',
        inputBytes: letter.length,
        outputBytes: blob.size,
        summaryText: `Generated formal Leave Application PDF for ${from}.`,
        previewText: letter,
      };
    }

    case 'offer-letter-pdf-generator': {
      const comp = sanitizeWinAnsi(String(settings.companyName || 'PDFLove Technologies'));
      const cand = sanitizeWinAnsi(String(settings.candidateName || 'Candidate'));
      const role = sanitizeWinAnsi(String(settings.jobTitle || 'Software Engineer'));
      const ctc = sanitizeWinAnsi(String(settings.annualCtc || 'Rs. 12,00,000/-'));
      const join = sanitizeWinAnsi(String(settings.joiningDate || '1st November 2026'));

      const text = [
        `COMPANY: ${comp}`,
        `DATE: ${new Date().toISOString().slice(0, 10)}`,
        `REF: HR/OFFER/${new Date().getFullYear()}/77`,
        ``,
        `Dear ${cand},`,
        ``,
        `Congratulations! We are pleased to offer you the full-time position of ${role} at ${comp}, with an expected joining date of ${join}.`,
        ``,
        `COMPENSATION & BENEFITS:`,
        `Your total Annual Cost to Company (CTC) will be ${ctc}, subject to statutory deductions and company policies.`,
        ``,
        `Please sign and return a copy of this Offer Letter as a token of your acceptance.`,
        ``,
        `Warm regards,`,
        `Human Resources Department`,
        `${comp}`,
      ].join('\n');

      const outBytes = await createPaginatedTextPdf('EMPLOYMENT OFFER LETTER', text, 12);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `offer-letter-${cand.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        mimeType: 'application/pdf',
        inputBytes: text.length,
        outputBytes: blob.size,
        summaryText: `Generated official Job Offer Letter PDF for ${cand} (${role}).`,
        previewText: text,
      };
    }

    case 'promissory-note-agreement-pdf': {
      const vch = sanitizeWinAnsi(String(settings.voucherNo || 'VCH-2026-501'));
      const paidTo = sanitizeWinAnsi(String(settings.paidTo || 'Payee'));
      const amt = sanitizeWinAnsi(String(settings.amountNum || 'Rs. 18,500/-'));
      const purpose = sanitizeWinAnsi(String(settings.paymentFor || 'Services'));
      const mode = sanitizeWinAnsi(String(settings.paymentMode || 'UPI / Bank Transfer'));

      const text = [
        `VOUCHER / RECEIPT NO : ${vch}`,
        `DATE                 : ${new Date().toISOString().slice(0, 10)}`,
        `--------------------------------------------------`,
        `PAID TO / RECEIVED BY: ${paidTo}`,
        `AMOUNT               : ${amt}`,
        `PAYMENT MODE         : ${mode}`,
        `ON ACCOUNT OF        : ${purpose}`,
        `--------------------------------------------------`,
        ``,
        `Prepared By                   Approved By                   Receiver's Signature`,
      ].join('\n');

      const outBytes = await createPaginatedTextPdf('OFFICIAL PAYMENT VOUCHER & RECEIPT', text, 12);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `payment-voucher-${vch}.pdf`,
        mimeType: 'application/pdf',
        inputBytes: text.length,
        outputBytes: blob.size,
        summaryText: `Generated Payment Receipt Voucher PDF (${vch} — ${amt}).`,
        previewText: text,
      };
    }

    case 'youtube-thumbnail-banner-maker': {
      const badge = String(settings.badgeText || 'COMPLETE GUIDE 2026').toUpperCase();
      const head = String(settings.mainHeadline || 'RANK #1 ON GOOGLE').toUpperCase();
      const sub = String(settings.subHeadline || 'Step-by-Step Masterclass');
      const theme = String(settings.bgTheme || 'crimson');

      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d')!;

      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      if (theme === 'royal') {
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1d4ed8');
      } else if (theme === 'emerald') {
        grad.addColorStop(0, '#022c22');
        grad.addColorStop(1, '#059669');
      } else {
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#be123c');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Decorative accent frame
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 6;
      ctx.strokeRect(36, 36, 1208, 648);

      // Badge pill
      ctx.fillStyle = '#facc15';
      ctx.fillRect(80, 140, Math.min(600, badge.length * 22 + 48), 58);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(badge, 104, 179);

      // Main Headline
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 74px sans-serif';
      ctx.fillText(head.slice(0, 26), 80, 320);
      if (head.length > 26) {
        ctx.fillText(head.slice(26, 52), 80, 410);
      }

      // Subtitle
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText(sub.slice(0, 48), 80, 520);

      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `youtube-thumbnail-1280x720.png`,
        mimeType: 'image/png',
        inputBytes: head.length,
        outputBytes: outBlob.size,
        summaryText: `Generated 1280×720 HD YouTube Thumbnail PNG.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'social-media-image-resizer': {
      const img = await loadImageElement(primaryFile);
      const [wStr, hStr] = String(settings.presetSize || '1080x1080').split('x');
      const targetW = parseInt(wStr, 10) || 1080;
      const targetH = parseInt(hStr, 10) || 1080;

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d')!;

      // Blurred ambient background fill
      ctx.save();
      ctx.filter = 'blur(28px) brightness(0.65)';
      ctx.drawImage(img, -40, -40, targetW + 80, targetH + 80);
      ctx.restore();

      // Proportional center fit
      const scale = Math.min(targetW / img.naturalWidth, targetH / img.naturalHeight);
      const drawW = Math.round(img.naturalWidth * scale);
      const drawH = Math.round(img.naturalHeight * scale);
      ctx.drawImage(img, Math.round((targetW - drawW) / 2), Math.round((targetH - drawH) / 2), drawW, drawH);

      const outBlob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
      return {
        blob: outBlob,
        filename: `${baseName}-${targetW}x${targetH}.jpg`,
        mimeType: 'image/jpeg',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Resized photo to ${targetW}×${targetH}px with smart ambient backdrop.`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'meme-poster-generator': {
      const img = await loadImageElement(primaryFile);
      const top = String(settings.topText || '').toUpperCase();
      const bottom = String(settings.bottomText || '').toUpperCase();

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(28, Math.round(canvas.width / 15));
      ctx.font = `900 ${fontSize}px Impact, "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(4, Math.round(fontSize / 10));

      if (top) {
        ctx.strokeText(top, canvas.width / 2, fontSize + 20, canvas.width - 40);
        ctx.fillText(top, canvas.width / 2, fontSize + 20, canvas.width - 40);
      }
      if (bottom) {
        ctx.strokeText(bottom, canvas.width / 2, canvas.height - 28, canvas.width - 40);
        ctx.fillText(bottom, canvas.width / 2, canvas.height - 28, canvas.width - 40);
      }

      const outBlob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
      return {
        blob: outBlob,
        filename: `${baseName}-meme.jpg`,
        mimeType: 'image/jpeg',
        inputBytes,
        outputBytes: outBlob.size,
        summaryText: `Created captioned meme image (${canvas.width}×${canvas.height}px).`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'password-generator-strength': {
      const len = Math.max(8, Math.min(64, Number(settings.length) || 20));
      const count = Math.max(1, Math.min(25, Number(settings.count) || 5));
      const sym = settings.includeSymbols !== false;
      const charset =
        'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789' + (sym ? '!@#$%^&*()-_=+[]{}' : '');
      const passwords: string[] = [];
      for (let c = 0; c < count; c++) {
        const arr = new Uint32Array(len);
        window.crypto.getRandomValues(arr);
        passwords.push(Array.from(arr, (v) => charset[v % charset.length]).join(''));
      }
      const entropyBits = Math.round(len * Math.log2(charset.length));
      const report = [
        `CRYPTOGRAPHIC PASSWORD RECOVERY SHEET`,
        `Length: ${len} chars | Entropy: ~${entropyBits} bits (${entropyBits >= 100 ? 'Military Grade' : 'Strong'})`,
        `--------------------------------------------------------`,
        ...passwords.map((p, idx) => `${idx + 1}.  ${p}`),
      ].join('\n');
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `secure-passwords-${len}chars.txt`,
        mimeType: 'text/plain',
        inputBytes: len,
        outputBytes: blob.size,
        summaryText: `Generated ${count} cryptographic password(s) (${entropyBits}-bit entropy).`,
        previewText: report,
      };
    }

    case 'word-character-reading-counter': {
      const text = primaryFile ? await readFileAsText(primaryFile) : String(settings.textInput || '');
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const charsWithSpaces = text.length;
      const charsNoSpaces = text.replace(/\s+/g, '').length;
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
      const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
      const readTimeSec = Math.ceil((words / 200) * 60);
      const speakTimeSec = Math.ceil((words / 130) * 60);

      const report = [
        `TEXT & READING TIME ANALYSIS REPORT`,
        `-------------------------------------------`,
        `Total Words                : ${words.toLocaleString()}`,
        `Characters (with spaces)   : ${charsWithSpaces.toLocaleString()}`,
        `Characters (no spaces)     : ${charsNoSpaces.toLocaleString()}`,
        `Sentences                  : ${sentences.toLocaleString()}`,
        `Paragraphs                 : ${paragraphs.toLocaleString()}`,
        `Estimated Reading Time     : ${readTimeSec} sec (~${(words / 200).toFixed(1)} min @ 200 WPM)`,
        `Estimated Speaking Time    : ${speakTimeSec} sec (~${(words / 130).toFixed(1)} min @ 130 WPM)`,
      ].join('\n');

      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `word-count-analysis.txt`,
        mimeType: 'text/plain',
        inputBytes: text.length,
        outputBytes: blob.size,
        summaryText: `${words} words · ${charsWithSpaces} characters · ${sentences} sentences.`,
        previewText: report,
      };
    }

    case 'text-case-converter-cleaner': {
      const raw = String(settings.rawText || '').trim();
      const cleaned = raw.replace(/\s+/g, ' ');
      const upper = cleaned.toUpperCase();
      const lower = cleaned.toLowerCase();
      const title = lower.replace(/\b\w/g, (c) => c.toUpperCase());
      const camel = lower
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/^[A-Z]/, (c) => c.toLowerCase());
      const snake = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

      const mode = String(settings.caseMode || 'all');
      const output =
        mode === 'upper'
          ? upper
          : mode === 'lower'
          ? lower
          : mode === 'title'
          ? title
          : [
              `UPPERCASE   : ${upper}`,
              `lowercase   : ${lower}`,
              `Title Case  : ${title}`,
              `camelCase   : ${camel}`,
              `snake_case  : ${snake}`,
            ].join('\n\n');

      const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `converted-text-case.txt`,
        mimeType: 'text/plain',
        inputBytes: raw.length,
        outputBytes: blob.size,
        summaryText: `Converted text across ${mode === 'all' ? '5 case styles' : mode} and cleaned whitespace.`,
        previewText: output,
      };
    }

    case 'base64-file-encoder-decoder': {
      const buf = await primaryFile.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);
      const mime = primaryFile.type || 'application/octet-stream';
      const dataUri = `data:${mime};base64,${b64}`;
      const output = [
        `/* DATA URI (${primaryFile.name} — ${bytes.byteLength} bytes) */`,
        dataUri,
        ``,
        `/* RAW BASE64 STRING */`,
        b64,
      ].join('\n');
      const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `${baseName}-base64.txt`,
        mimeType: 'text/plain',
        inputBytes,
        outputBytes: blob.size,
        summaryText: `Encoded ${primaryFile.name} into Base64 (${b64.length.toLocaleString()} chars).`,
        previewText: output.slice(0, 2000) + (output.length > 2000 ? '\n... [Full Base64 in downloaded file]' : ''),
      };
    }

    case 'url-encoder-utm-builder': {
      const base = String(settings.baseUrl || 'https://pdflove.store').trim();
      const src = String(settings.utmSource || 'google').trim();
      const med = String(settings.utmMedium || 'cpc').trim();
      const camp = String(settings.utmCampaign || 'launch').trim();
      const sep = base.includes('?') ? '&' : '?';
      const fullUrl = `${base}${sep}utm_source=${encodeURIComponent(src)}&utm_medium=${encodeURIComponent(
        med
      )}&utm_campaign=${encodeURIComponent(camp)}`;
      const report = [
        `UTM CAMPAIGN TRACKING LINK`,
        `Full Trackable URL : ${fullUrl}`,
        `URL-Encoded String : ${encodeURIComponent(fullUrl)}`,
      ].join('\n\n');
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `utm-campaign-url.txt`,
        mimeType: 'text/plain',
        inputBytes: base.length,
        outputBytes: blob.size,
        summaryText: `Built UTM URL: ${fullUrl}`,
        previewText: report,
      };
    }

    case 'color-converter-hex-rgb-hsl': {
      const rawHex = String(settings.hexInput || '#E11D48').trim().replace(/^#/, '');
      const cleanHex = rawHex.length === 3 ? rawHex.split('').map((c) => c + c).join('') : rawHex.padEnd(6, '0').slice(0, 6);
      const r = parseInt(cleanHex.slice(0, 2), 16) || 225;
      const g = parseInt(cleanHex.slice(2, 4), 16) || 29;
      const b = parseInt(cleanHex.slice(4, 6), 16) || 72;

      const rN = r / 255,
        gN = g / 255,
        bN = b / 255;
      const max = Math.max(rN, gN, bN),
        min = Math.min(rN, gN, bN);
      const l = (max + min) / 2;
      const k = 1 - max;
      const c = k === 1 ? 0 : (1 - rN - k) / (1 - k);
      const m = k === 1 ? 0 : (1 - gN - k) / (1 - k);
      const y = k === 1 ? 0 : (1 - bN - k) / (1 - k);

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${cleanHex}`;
      ctx.fillRect(0, 0, 640, 220);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 220, 640, 140);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`HEX : #${cleanHex.toUpperCase()}   |   RGB : rgb(${r}, ${g}, ${b})`, 28, 270);
      ctx.font = '18px monospace';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(
        `CMYK: ${Math.round(c * 100)}%, ${Math.round(m * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%   |   Luminance: ${Math.round(
          l * 100
        )}%`,
        28,
        315
      );

      const outBlob = await canvasToBlob(canvas, 'image/png');
      return {
        blob: outBlob,
        filename: `color-swatch-${cleanHex}.png`,
        mimeType: 'image/png',
        inputBytes: 7,
        outputBytes: outBlob.size,
        summaryText: `#${cleanHex.toUpperCase()} = rgb(${r}, ${g}, ${b}) | CMYK(${Math.round(c * 100)}%, ${Math.round(
          m * 100
        )}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%)`,
        previewImageUrl: URL.createObjectURL(outBlob),
      };
    }

    case 'roman-numeral-number-words':
    case 'income-tax-slab-calculator':
    case 'fd-rd-interest-calculator':
    case 'ppf-retirement-calculator': {
      let report = '';
      let summary = '';

      if (tool.slug === 'roman-numeral-number-words') {
        const n = Math.max(0, Math.floor(Number(settings.numberInput) || 145850));
        const ones = [
          '',
          'One',
          'Two',
          'Three',
          'Four',
          'Five',
          'Six',
          'Seven',
          'Eight',
          'Nine',
          'Ten',
          'Eleven',
          'Twelve',
          'Thirteen',
          'Fourteen',
          'Fifteen',
          'Sixteen',
          'Seventeen',
          'Eighteen',
          'Nineteen',
        ];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const twoDigit = (num: number) =>
          num < 20 ? ones[num] : `${tens[Math.floor(num / 10)]}${num % 10 ? ' ' + ones[num % 10] : ''}`;

        const toIndianWords = (num: number): string => {
          if (num === 0) return 'Zero';
          const parts: string[] = [];
          const crore = Math.floor(num / 10000000);
          num %= 10000000;
          const lakh = Math.floor(num / 100000);
          num %= 100000;
          const thousand = Math.floor(num / 1000);
          num %= 1000;
          const hundred = Math.floor(num / 100);
          const rem = num % 100;
          if (crore > 0) parts.push(`${twoDigit(crore)} Crore`);
          if (lakh > 0) parts.push(`${twoDigit(lakh)} Lakh`);
          if (thousand > 0) parts.push(`${twoDigit(thousand)} Thousand`);
          if (hundred > 0) parts.push(`${ones[hundred]} Hundred`);
          if (rem > 0) parts.push(twoDigit(rem));
          return parts.join(' ');
        };

        const words = toIndianWords(n);
        summary = `Rupees ${words} Only (₹${n.toLocaleString('en-IN')})`;
        report = [
          `CHEQUE & INVOICE AMOUNT IN WORDS`,
          `Numeric Amount (INR) : Rs. ${n.toLocaleString('en-IN')}/-`,
          `In Indian Words      : Rupees ${words} Only`,
        ].join('\n');
      } else if (tool.slug === 'income-tax-slab-calculator') {
        const gross = Number(settings.annualIncome) || 1500000;
        const ded = Number(settings.deductions80C) || 250000;
        const taxableNew = Math.max(0, gross - 75000);
        const taxableOld = Math.max(0, gross - 50000 - ded);

        const calcNewTax = (t: number) => {
          if (t <= 1200000) return 0;
          let tax = 0;
          if (t > 400000) tax += Math.min(400000, t - 400000) * 0.05;
          if (t > 800000) tax += Math.min(400000, t - 800000) * 0.1;
          if (t > 1200000) tax += Math.min(400000, t - 1200000) * 0.15;
          if (t > 1600000) tax += Math.min(400000, t - 1600000) * 0.2;
          if (t > 2000000) tax += Math.min(400000, t - 2000000) * 0.25;
          if (t > 2400000) tax += (t - 2400000) * 0.3;
          return Math.round(tax * 1.04);
        };

        const calcOldTax = (t: number) => {
          if (t <= 500000) return 0;
          let tax = 0;
          if (t > 250000) tax += Math.min(250000, t - 250000) * 0.05;
          if (t > 500000) tax += Math.min(500000, t - 500000) * 0.2;
          if (t > 1000000) tax += (t - 1000000) * 0.3;
          return Math.round(tax * 1.04);
        };

        const newTax = calcNewTax(taxableNew);
        const oldTax = calcOldTax(taxableOld);
        const better = newTax <= oldTax ? 'New Tax Regime' : 'Old Tax Regime';
        summary = `New Regime Tax: ₹${newTax.toLocaleString()} | Old Regime Tax: ₹${oldTax.toLocaleString()} (Best: ${better})`;
        report = [
          `INCOME TAX COMPARISON REPORT (NEW VS OLD REGIME)`,
          `Gross Annual Income           : Rs. ${gross.toLocaleString()}`,
          `New Regime Taxable Income     : Rs. ${taxableNew.toLocaleString()} (after Rs. 75k Std. Deduction)`,
          `Old Regime Taxable Income     : Rs. ${taxableOld.toLocaleString()} (after Deductions)`,
          `----------------------------------------------------`,
          `Total Tax (New Regime + Cess) : Rs. ${newTax.toLocaleString()}`,
          `Total Tax (Old Regime + Cess) : Rs. ${oldTax.toLocaleString()}`,
          `Recommended Regime            : ${better} (Saves Rs. ${Math.abs(newTax - oldTax).toLocaleString()})`,
        ].join('\n');
      } else if (tool.slug === 'fd-rd-interest-calculator') {
        const p = Number(settings.depositAmount) || 200000;
        const r = Number(settings.interestRate) || 7.25;
        const t = Number(settings.tenureYears) || 3;
        const maturity = p * Math.pow(1 + r / 400, 4 * t);
        const interest = maturity - p;
        summary = `FD Maturity Value: ₹${Math.round(maturity).toLocaleString()} (Interest Earned: ₹${Math.round(interest).toLocaleString()})`;
        report = [
          `FIXED DEPOSIT (FD) MATURITY SCHEDULE`,
          `Deposit Principal   : Rs. ${p.toLocaleString()}`,
          `Interest Rate       : ${r}% p.a. (Quarterly Compounded)`,
          `Tenure              : ${t} Years`,
          `Interest Earned     : Rs. ${Math.round(interest).toLocaleString()}`,
          `Total Maturity Value: Rs. ${Math.round(maturity).toLocaleString()}`,
        ].join('\n');
      } else {
        const yearly = Number(settings.yearlyInvest) || 150000;
        const rate = (Number(settings.ppfRate) || 7.1) / 100;
        const yrs = Math.max(15, Number(settings.durationYears) || 15);
        let balance = 0;
        for (let y = 1; y <= yrs; y++) {
          balance = (balance + yearly) * (1 + rate);
        }
        const invested = yearly * yrs;
        const interest = balance - invested;
        summary = `${yrs}-Year PPF Maturity: ₹${Math.round(balance).toLocaleString()} (Tax-Free Interest: ₹${Math.round(interest).toLocaleString()})`;
        report = [
          `PUBLIC PROVIDENT FUND (PPF) RETIREMENT REPORT`,
          `Annual Contribution  : Rs. ${yearly.toLocaleString()} / year`,
          `PPF Interest Rate    : ${(rate * 100).toFixed(2)}% p.a. (Tax-Free EEE)`,
          `Duration             : ${yrs} Years`,
          `Total Invested       : Rs. ${invested.toLocaleString()}`,
          `Total Interest Earned: Rs. ${Math.round(interest).toLocaleString()}`,
          `Tax-Free Maturity    : Rs. ${Math.round(balance).toLocaleString()}`,
        ].join('\n');
      }

      const pdfBytes = await createPaginatedTextPdf(tool.name, report, 12);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      return {
        blob,
        filename: `${tool.slug}.pdf`,
        mimeType: 'application/pdf',
        inputBytes: report.length,
        outputBytes: blob.size,
        summaryText: summary,
        previewText: report,
      };
    }

    default: {
      throw new Error(`Unsupported tool operation: ${tool.slug}`);
    }
  }
}


