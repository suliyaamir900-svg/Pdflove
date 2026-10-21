export async function generateSampleFileForTool(slug: string, acceptMime: string): Promise<File> {
  if (acceptMime.includes('.docx')) {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
    );
    zip.folder('_rels')?.file(
      '.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
    );
    zip.folder('word')?.file(
      'document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>PDFLove.store Sample Word Document (.docx)</w:t></w:r></w:p><w:p><w:r><w:t>This sample file contains paragraphs of text ready to be converted to a clean vector PDF.</w:t></w:r></w:p></w:body></w:document>`
    );
    const blob = await zip.generateAsync({ type: 'blob' });
    return new File([blob], 'sample-document.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  if (acceptMime.includes('.xlsx')) {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Tool Name', 'Category', 'Processing Mode', 'Status'],
      ['Merge PDF', 'PDF Management', 'Client-Side Browser', 'Verified'],
      ['PDF to Excel', 'PDF Conversion', 'SheetJS Engine', 'Verified'],
      ['Compress Image', 'Image Tools', 'HTML5 Canvas', 'Verified'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'AuditData');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new File([buf], 'sample-spreadsheet.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  if (acceptMime.includes('.pptx')) {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    zip.folder('ppt/slides')?.file(
      'slide1.xml',
      `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><a:t>PDFLove.store Sample Presentation — Slide 1: Executive Overview &amp; SEO Strategy</a:t></p:sld>`
    );
    zip.folder('ppt/slides')?.file(
      'slide2.xml',
      `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><a:t>Slide 2: 90 Client-Side Document &amp; Image Utilities</a:t></p:sld>`
    );
    const blob = await zip.generateAsync({ type: 'blob' });
    return new File([blob], 'sample-deck.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
  }

  if (acceptMime.includes('video/')) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;

    if (typeof MediaRecorder !== 'undefined' && typeof canvas.captureStream === 'function') {
      const stream = canvas.captureStream(24);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.start(80);
        let frame = 0;
        const timer = setInterval(() => {
          frame++;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = '#e11d48';
          ctx.fillRect(40 + frame * 12, 60, 180, 56);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 26px sans-serif';
          ctx.fillText('PDFLove.store Sample Video', 40, 180);
          ctx.font = '18px sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`Frame ${frame} · Ready for ${slug}`, 40, 220);
        }, 45);
        setTimeout(() => {
          clearInterval(timer);
          if (recorder.state !== 'inactive') recorder.stop();
        }, 850);
      });
      const blob = new Blob(chunks, { type: 'video/webm' });
      return new File([blob], 'sample-video.webm', { type: 'video/webm' });
    }
  }

  if (acceptMime.includes('audio/')) {
    const sampleRate = 22050;
    const numSamples = sampleRate * 2;
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
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    for (let i = 0; i < numSamples; i++) {
      const val = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.35;
      view.setInt16(44 + i * 2, val * 0x7fff, true);
    }
    return new File([wavBuffer], 'sample-audio.wav', { type: 'audio/wav' });
  }

  if (acceptMime.includes('.zip')) {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    zip.file('readme.txt', 'PDFLove.store Sample ZIP Archive Entry 1');
    zip.file('report-summary.csv', 'Month,Users,Documents\nOctober,125000,480000');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    return new File([blob], 'sample-archive.zip', { type: 'application/zip' });
  }

  if (acceptMime.includes('image/')) {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 960, 640);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(80, 80, 800, 480);
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(120, 120, 180, 56);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('PDFLove.store', 140, 156);
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('Sample High-Resolution Test Image', 120, 290);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px sans-serif';
    ctx.fillText(`960 × 640 px · Ready for ${slug}`, 120, 355);

    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
    return new File([blob], 'sample-image.png', { type: 'image/png' });
  }

  // Default: Generate a real 3-page PDF document with text, table rows, and metadata
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('PDFLove.store Sample Document');
  pdfDoc.setAuthor('PDFLove.store Verification Suite');
  pdfDoc.setSubject('Multi-Page Test PDF');
  pdfDoc.setKeywords(['sample', 'pdf', 'test', 'seo']);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let p = 1; p <= 3; p++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText(`PDFLove.store — Sample Test Document (Page ${p} of 3)`, {
      x: 50,
      y: 780,
      size: 16,
      font: bold,
      color: rgb(0.88, 0.11, 0.28),
    });
    page.drawText(
      `This is page ${p} of a genuine multi-page PDF generated in your browser for testing ${slug}.`,
      { x: 50, y: 745, size: 11, font, color: rgb(0.15, 0.18, 0.24) }
    );
    page.drawText('Metric                  Q1 Value        Q2 Value        Status', {
      x: 50,
      y: 690,
      size: 11,
      font: bold,
    });
    page.drawText(`Document Throughput     1,420 docs      2,190 docs      Active`, {
      x: 50,
      y: 668,
      size: 10.5,
      font,
    });
    page.drawText(`Core Web Vitals LCP     0.9s            0.8s            Optimal`, {
      x: 50,
      y: 648,
      size: 10.5,
      font,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes], 'sample-3page-document.pdf', { type: 'application/pdf' });
}
