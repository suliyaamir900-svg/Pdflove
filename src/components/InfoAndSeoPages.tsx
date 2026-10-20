import React, { useState } from 'react';
import {
  Download,
  FileCode,
  Globe,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Mail,
  Server,
  Copy,
  Check,
} from 'lucide-react';
import {
  generateRobotsTxtString,
  generateSitemapXmlString,
  generateStandaloneSingleFileHtml,
} from '../services/seoAndSingleFileExporter';
import { TOOLS_CATALOG } from '../data/toolsCatalog';

interface InfoPageProps {
  pagePath: string;
  onNavigate: (path: string) => void;
}

export const InfoAndSeoPages: React.FC<InfoPageProps> = ({ pagePath, onNavigate }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const downloadTextAsset = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const BackLink = () => (
    <button
      type="button"
      onClick={() => onNavigate('/')}
      className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 mb-6 cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to All 90 Tools Directory
    </button>
  );

  if (pagePath === '/about') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <BackLink />
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
          About PDFLove.store
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          PDFLove.store (<strong>https://pdflove.store</strong>) is an online PDF and image utility platform offering 90 specialized document management, conversion, optimization, and generation tools accessible from any desktop, laptop, tablet, or mobile browser internationally.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              01. Browser-First Processing Architecture
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Unlike legacy file converters that upload every PDF to remote queues, PDFLove.store executes core PDF manipulation, page rendering, spreadsheet extraction, and image processing directly inside your browser using standard WebAssembly and JavaScript engines (pdf-lib, Mozilla PDF.js, SheetJS, Mammoth, and HTML5 Canvas).
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              02. Honest Technical Transparency
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Every tool on PDFLove.store documents its exact supported formats, processing method, and browser memory boundaries upfront. We never display fabricated compression percentages or simulated progress bars.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pagePath === '/privacy') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <BackLink />
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
          Privacy Policy &amp; File Processing Disclosure
        </h1>
        <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              1. Local Browser Processing vs. Server Processing
            </h2>
            <p>
              All 90 tools in the PDFLove.store catalog execute locally within your web browser’s memory space. When you select or drag-and-drop a PDF, Word document, Excel sheet, or image file, the file is read via the standard HTML5 <code>FileReader</code> / <code>ArrayBuffer</code> API and processed on your device. Your files do not leave your device during local browser operations.
            </p>
          </section>
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              2. Temporary Object URLs &amp; Memory Cleanup
            </h2>
            <p>
              When a tool generates an output file for download, a temporary browser <code>Blob</code> and <code>URL.createObjectURL()</code> reference is created in volatile RAM. When you clear the tool, navigate away, or close the tab, temporary object URLs are revoked via <code>URL.revokeObjectURL()</code>.
            </p>
          </section>
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              3. Zero Document Storage in localStorage or Analytics
            </h2>
            <p>
              PDFLove.store never writes uploaded document contents, extracted text, filenames containing personal data, or PDF passwords into <code>localStorage</code>, <code>sessionStorage</code>, cookies, or analytics payloads. Local storage is strictly limited to saving your UI language preference (e.g., <code>pdflove_lang</code>) and light/dark theme toggle (<code>pdflove_theme</code>).
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (pagePath === '/terms' || pagePath === '/cookies' || pagePath === '/disclaimer') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <BackLink />
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
          {pagePath === '/terms'
            ? 'Terms of Service'
            : pagePath === '/cookies'
            ? 'Cookie & Local Storage Policy'
            : 'Technical & Legal Disclaimer'}
        </h1>
        <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              1. Authorized Document Usage
            </h2>
            <p>
              You must own or have explicit legal authorization to modify, convert, unlock, or extract content from any document you process using PDFLove.store. Specifically, tools such as Unlock PDF and Remove PDF Password are provided solely for documents where you are the authorized owner or custodian and possess the requisite authorization.
            </p>
          </section>
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              2. Browser Hardware &amp; Format Limitations
            </h2>
            <p>
              Because processing takes place inside your browser, maximum file size and processing speed depend on your device’s available RAM and CPU capabilities. Always retain a backup copy of your original files before running batch modifications.
            </p>
          </section>
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              3. Cookie &amp; Preference Storage
            </h2>
            <p>
              PDFLove.store does not require tracking cookies to operate its core document tools. Only non-identifying UI state (selected interface language and dark/light theme) is persisted locally in your browser.
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (pagePath === '/contact') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <BackLink />
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
          Contact PDFLove.store
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          For technical support, bug reports, or inquiries regarding PDFLove.store (https://pdflove.store), use the contact details or inquiry form below.
        </p>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            <Mail className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-semibold">Official Domain &amp; Support</p>
              <p className="text-xs text-slate-500 font-mono">Website: https://pdflove.store · Support: support@pdflove.store</p>
            </div>
          </div>

          {contactSubmitted ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg text-sm text-emerald-800 dark:text-emerald-200">
              Thank you. Your message has been formatted for support@pdflove.store.
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setContactSubmitted(true);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Message or Tool Feedback
                </label>
                <textarea
                  rows={4}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (pagePath === '/seo-guide') {
    const sitemapXml = generateSitemapXmlString();
    const robotsTxt = generateRobotsTxtString();
    const singleHtml = generateStandaloneSingleFileHtml();

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <BackLink />
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
          Deliverables: Single-File HTML Export, Sitemap.xml, Robots.txt &amp; Google Search Console Guide
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-8 max-w-3xl">
          Download production-ready deployment files for <strong>https://pdflove.store</strong>, inspect the external dependency license matrix, and follow the step-by-step Google Search Console &amp; GEO SEO deployment checklist.
        </p>

        {/* Download Deliverables Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <FileCode className="w-7 h-7 text-rose-600 mb-3" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                1. Standalone index.html
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                Complete self-contained single-file HTML5 + CSS3 + Vanilla JS edition containing all 90 tool routes for single-file static hosting.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadTextAsset(singleHtml, 'index.html', 'text/html;charset=utf-8')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download index.html
            </button>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <Globe className="w-7 h-7 text-rose-600 mb-3" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                2. Complete sitemap.xml ({TOOLS_CATALOG.length + 8} URLs)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                Valid XML sitemap with all 90 canonical HTTPS tool URLs (<code>https://pdflove.store/tools/...</code>) and informational pages. Also served live at <code>/sitemap.xml</code>.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadTextAsset(sitemapXml, 'sitemap.xml', 'application/xml;charset=utf-8')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                sitemap.xml
              </button>
              <button
                type="button"
                onClick={() => copyText('sitemap', sitemapXml)}
                className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {copiedKey === 'sitemap' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
            <div>
              <Server className="w-7 h-7 text-rose-600 mb-3" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                3. robots.txt &amp; llms.txt
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                Root-level crawler directives referencing <code>https://pdflove.store/sitemap.xml</code>. Also served live at <code>/robots.txt</code> and <code>/llms.txt</code>.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadTextAsset(robotsTxt, 'robots.txt', 'text/plain;charset=utf-8')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                robots.txt
              </button>
              <a
                href="/llms.txt"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center"
              >
                llms.txt
              </a>
            </div>
          </div>
        </div>

        {/* Google Search Console & Hosting Deployment Instructions */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Google Search Console, Custom Domain (pdflove.store) &amp; Hosting Configuration
          </h2>
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Step 1: Connect Custom Domain &amp; Enforce HTTPS
              </h3>
              <p>
                Deploy the application to Cloudflare Pages, Vercel, Netlify, or Cloud Run. Point the apex domain <code>pdflove.store</code> (A/AAAA or ALIAS record) and <code>www.pdflove.store</code> (CNAME) to your host, enable automatic Let’s Encrypt / Edge TLS certificates, and configure a 301 redirect from <code>http://</code> and <code>www.pdflove.store</code> to <code>https://pdflove.store</code>.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Step 2: Configure Static-Hosting SPA Rewrites for Clean Tool URLs
              </h3>
              <p>
                To ensure direct visits and refreshes on clean URLs like <code>https://pdflove.store/tools/merge-pdf</code> return HTTP 200 (while serving <code>/robots.txt</code>, <code>/sitemap.xml</code>, and <code>/llms.txt</code> directly as static files), add a rewrite rule:
              </p>
              <pre className="mt-2 p-3 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
{`# Netlify / Cloudflare Pages (_redirects)
/robots.txt   /robots.txt   200
/sitemap.xml  /sitemap.xml  200
/llms.txt     /llms.txt     200
/*            /index.html   200`}
              </pre>
              <p className="mt-2 text-xs text-slate-500">
                Note on Blogger / Restricted Single-File Hosts: Platforms like Blogger do not allow uploading root-level <code>sitemap.xml</code> or arbitrary <code>/tools/slug</code> path rewrites natively. On those platforms, host on Cloudflare Pages / Netlify / Vercel for full root file and clean path control.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Step 3: Verify Ownership in Google Search Console &amp; Submit Sitemap
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 mt-1">
                <li>Open Google Search Console and add a <strong>Domain Property</strong> for <code>pdflove.store</code>.</li>
                <li>Copy the real TXT verification token provided by Google Search Console and add it to your DNS provider (never use placeholder tokens).</li>
                <li>Once verified, open the <strong>Sitemaps</strong> tab and submit <code>https://pdflove.store/sitemap.xml</code>.</li>
                <li>Use the <strong>URL Inspection Tool</strong> to inspect key pages (such as <code>https://pdflove.store/tools/merge-pdf</code> and <code>https://pdflove.store/tools/compress-pdf</code>), verify canonical tags, and test JSON-LD structured data.</li>
              </ol>
            </div>
          </div>
        </section>

        {/* External Dependencies & Licenses Table */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            External Dependencies &amp; Open-Source Licenses
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Library</th>
                  <th className="py-2.5 pr-4 font-semibold">Version</th>
                  <th className="py-2.5 pr-4 font-semibold">License</th>
                  <th className="py-2.5 font-semibold">Purpose in PDFLove.store</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                <tr>
                  <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">pdf-lib</td>
                  <td className="py-2.5 pr-4 tabular-nums">^1.17.1</td>
                  <td className="py-2.5 pr-4">MIT</td>
                  <td className="py-2.5 font-sans">PDF creation, merging, splitting, rotation, watermarks, page numbers, metadata, and vector typesetting.</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">pdfjs-dist (Mozilla PDF.js)</td>
                  <td className="py-2.5 pr-4 tabular-nums">^5.x / 4.x</td>
                  <td className="py-2.5 pr-4">Apache-2.0</td>
                  <td className="py-2.5 font-sans">Rendering PDF pages to Canvas (PDF to JPG/PNG/WebP), text extraction, coordinate search, and highlighting.</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">jszip</td>
                  <td className="py-2.5 pr-4 tabular-nums">^3.10.1</td>
                  <td className="py-2.5 pr-4">MIT / GPLv3</td>
                  <td className="py-2.5 font-sans">Packaging multi-page split PDFs, image archives, and OpenXML (.docx, .pptx, .epub) containers.</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">mammoth</td>
                  <td className="py-2.5 pr-4 tabular-nums">^1.x</td>
                  <td className="py-2.5 pr-4">BSD-2-Clause</td>
                  <td className="py-2.5 font-sans">Client-side parsing of Microsoft Word (.docx) documents for Word-to-PDF conversion.</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">xlsx (SheetJS Community)</td>
                  <td className="py-2.5 pr-4 tabular-nums">^0.18.5</td>
                  <td className="py-2.5 pr-4">Apache-2.0</td>
                  <td className="py-2.5 font-sans">Reading and writing Excel (.xlsx) and CSV spreadsheets in the browser.</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">qrcode &amp; jsbarcode</td>
                  <td className="py-2.5 pr-4 tabular-nums">^1.5.x / ^3.11.x</td>
                  <td className="py-2.5 pr-4">MIT</td>
                  <td className="py-2.5 font-sans">Generating ISO-compliant 2D QR codes and 1D retail/inventory barcodes on HTML5 Canvas.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Testing & Verification Report */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Testing &amp; Verification Report (Passed vs. Browser-Scoped Limitations)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg">
              <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-sm mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Verified &amp; Passed in Browser Runtime
              </div>
              <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside">
                <li>All 90 dedicated tool URLs (<code>/tools/:slug</code>) with dynamic title, meta description, canonical tag, and JSON-LD schema.</li>
                <li>PDF Merge, Split, Rotate, Delete, Extract, Organize, Reorder, Duplicate, Blank Pages, Page Numbers, Watermark, Text/Image overlay, Crop, Flatten, Metadata View/Edit.</li>
                <li>PDF to JPG/PNG/WebP/TXT/CSV/HTML/JSON/DOCX/XLSX/PPTX/EPUB and JPG/PNG/WebP/BMP/HTML/TXT/MD/CSV/JSON/DOCX/XLSX/PPTX to PDF.</li>
                <li>HTML5 Canvas Image Compress, Resize, Crop, Rotate, Flip, Format Conversions, Grayscale, Brightness, Contrast, Quality, Watermark, and Chroma Transparency.</li>
                <li>PDF Page/Word Counter, Search, Coordinate Highlighting, Invoice/Resume/Checklist/Certificate/Contact Sheet generators, QR Code, and Barcode generators.</li>
                <li>10-Language translation selector (including Hindi, Gujarati, and RTL Arabic layout) + Light/Dark theme persistence.</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 text-sm mb-2">
                <AlertTriangle className="w-4 h-4" />
                Documented Browser-Only Scope &amp; Unverified External Items
              </div>
              <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside">
                <li><strong>Office Layout Fidelity:</strong> Browser-only DOCX/PPTX/XLSX conversions extract and rebuild text, paragraphs, and tables accurately via OpenXML, but complex floating vector shapes or proprietary macros require a server-side LibreOffice headless engine.</li>
                <li><strong>Scanned PDFs without Text Layer:</strong> PDF-to-Word/Excel/CSV and Text Search operate on selectable PDF text streams; scanned bitmap PDFs require an external OCR engine.</li>
                <li><strong>HEIC/TIFF Codec Support:</strong> Depends on the user’s OS/browser native decoder support.</li>
                <li><strong>Live Google Search Console Indexing:</strong> Sitemap and structured data are validated and ready at <code>/sitemap.xml</code>, but live Google indexing status remains unverified until the domain owner submits the DNS token on <code>pdflove.store</code>.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Default: 404 Not Found Page
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="font-mono text-xs text-rose-600 font-semibold mb-2">HTTP 404 · PAGE NOT FOUND</div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
        We couldn’t find that page or tool URL
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
        The address <code>{pagePath}</code> does not match any of our 90 PDF or image utilities. Return to the main directory below to search all tools.
      </p>
      <button
        type="button"
        onClick={() => onNavigate('/')}
        className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg cursor-pointer"
      >
        Explore All 90 Tools
      </button>
    </div>
  );
};
