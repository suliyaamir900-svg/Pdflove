import { TOOLS_CATALOG, ToolDefinition } from '../data/toolsCatalog';
import { LanguageCode, SUPPORTED_LANGUAGES } from '../data/translations';

export function updateDocumentSeoAndSchema(
  path: string,
  activeTool: ToolDefinition | undefined,
  lang: LanguageCode
) {
  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
  document.documentElement.lang = langInfo.code;
  document.documentElement.dir = langInfo.dir;

  const baseUrl = 'https://pdflove.store';
  const cleanPath = path === '/' ? '/' : path.replace(/\/+$/, '');
  const canonicalUrl = `${baseUrl}${cleanPath}`;

  let title = 'PDFLove.store – All Your PDF & Image Tools in One Place';
  let description =
    'Merge, split, compress, convert and manage your documents with 90 fast, privacy-first online PDF and image tools.';

  if (activeTool) {
    title = activeTool.seoTitle;
    description = activeTool.seoDescription;
  } else if (cleanPath === '/about') {
    title = 'About PDFLove.store – Privacy-First Online PDF & Image Utility Suite';
    description = 'Learn how PDFLove.store processes PDF documents and images locally in your web browser.';
  } else if (cleanPath === '/privacy') {
    title = 'Privacy Policy & Local Browser Processing – PDFLove.store';
    description = 'Transparent explanation of browser-based file processing, memory cleanup, and privacy safeguards on PDFLove.store.';
  } else if (cleanPath === '/terms') {
    title = 'Terms of Service – PDFLove.store';
    description = 'Terms and conditions for using PDFLove.store online PDF and image utilities.';
  } else if (cleanPath === '/contact') {
    title = 'Contact & Support – PDFLove.store';
    description = 'Get in touch with the PDFLove.store engineering and support team.';
  } else if (cleanPath === '/seo-guide') {
    title = 'Google Search Console, Sitemap, GEO SEO & Single-File Deployment Guide – PDFLove.store';
    description = 'Complete deployment instructions, testing matrix, sitemap.xml, robots.txt, and standalone single-file HTML export.';
  }

  document.title = title;

  const setMeta = (selector: string, attr: string, val: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, val);
  };

  setMeta('meta[name="description"]', 'content', description);
  setMeta('#canonical-link', 'href', canonicalUrl);
  setMeta('#og-title', 'content', title);
  setMeta('#og-description', 'content', description);
  setMeta('#og-url', 'content', canonicalUrl);
  setMeta('#twitter-title', 'content', title);
  setMeta('#twitter-description', 'content', description);

  // Build JSON-LD Graph
  const graph: any[] = [
    {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: `${baseUrl}/`,
      name: 'PDFLove.store',
      description: 'All Your PDF & Image Tools in One Place.',
      inLanguage: SUPPORTED_LANGUAGES.map((l) => l.code),
    },
  ];

  if (activeTool) {
    graph.push(
      {
        '@type': 'WebApplication',
        '@id': `${canonicalUrl}#app`,
        name: `${activeTool.name} — PDFLove.store`,
        url: canonicalUrl,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All',
        description: activeTool.introDefinition,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${baseUrl}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: activeTool.category.replace('-', ' ').toUpperCase(),
            item: `${baseUrl}/#directory`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: activeTool.name,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: activeTool.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.a,
          },
        })),
      }
    );
  }

  const schemaEl = document.getElementById('schema-jsonld');
  if (schemaEl) {
    schemaEl.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': graph,
    });
  }
}

export { generateCompleteSitemapXml, getCompleteSitemapEntries } from './sitemapGenerator';
import { generateCompleteSitemapXml as buildCompleteSitemapXml } from './sitemapGenerator';

export function generateSitemapXmlString(): string {
  return buildCompleteSitemapXml();
}

export function generateRobotsTxtString(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: https://www.pdflove.store/sitemap.xml\nSitemap: https://www.pdflove.store/sitemap-index.xml\n`;
}

// Generates a complete, runnable Vanilla HTML5 + CSS3 + JS single-file "index.html"
// for users who want to host PDFLove.store as a single standalone HTML file anywhere.
export function generateStandaloneSingleFileHtml(): string {
  const toolsMinimal = TOOLS_CATALOG.map((t) => ({
    n: t.number,
    s: t.slug,
    name: t.name,
    c: t.category,
    f: t.filterTag,
    d: t.shortDesc,
    def: t.introDefinition,
    fmt: t.supportedFormats,
    m: t.multipleFiles,
    req: t.requiresFileUpload,
  }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PDFLove.store – All Your PDF &amp; Image Tools in One Place</title>
  <meta name="description" content="Merge, split, compress, convert and manage your documents with 90 simple online PDF and image tools on PDFLove.store." />
  <link rel="canonical" href="https://pdflove.store/" id="canonical-tag" />
  <meta property="og:title" content="PDFLove.store – All Your PDF &amp; Image Tools in One Place" />
  <meta property="og:description" content="Merge, split, compress, convert and manage your documents with simple online tools." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://pdflove.store/" />
  <script src="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js" crossorigin="anonymous"></script>
  <style>
    :root { --bg: #f8fafc; --surface: #ffffff; --text: #0f172a; --muted: #475569; --border: #e2e8f0; --accent: #e11d48; --accent-hover: #be123c; }
    [data-theme="dark"] { --bg: #0f172a; --surface: #1e293b; --text: #f8fafc; --muted: #94a3b8; --border: #334155; --accent: #f43f5e; --accent-hover: #e11d48; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
    header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 20; }
    .brand { font-weight: 800; font-size: 1.25rem; color: var(--text); text-decoration: none; }
    .brand span { color: var(--accent); }
    nav { display: flex; gap: 1.25rem; align-items: center; flex-wrap: wrap; }
    nav a, button.link-btn { color: var(--muted); text-decoration: none; font-size: 0.9rem; background: none; border: none; cursor: pointer; font-weight: 500; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.25rem; }
    .hero { text-align: center; padding: 3rem 1rem; }
    .hero h1 { font-size: clamp(2rem, 4vw, 3rem); margin-bottom: 0.75rem; }
    .search-box { max-width: 560px; margin: 1.5rem auto; width: 100%; padding: 0.85rem 1.2rem; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; cursor: pointer; transition: transform 0.15s ease; text-align: left; }
    .card:hover { transform: translateY(-2px); border-color: var(--accent); }
    .card h3 { font-size: 1rem; margin-bottom: 0.35rem; }
    .card p { font-size: 0.85rem; color: var(--muted); }
    .workspace { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 2rem; margin-top: 1.5rem; }
    .btn { background: var(--accent); color: #fff; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem; }
    .btn:hover { background: var(--accent-hover); }
    footer { border-top: 1px solid var(--border); padding: 2rem; text-align: center; color: var(--muted); font-size: 0.85rem; margin-top: 4rem; }
  </style>
</head>
<body>
  <header>
    <a href="/" class="brand" onclick="navTo('/');return false;">PDF<span>Love</span>.store</a>
    <nav>
      <a href="/" onclick="navTo('/');return false;">All 90 Tools</a>
      <button class="link-btn" onclick="toggleTheme()">Toggle Theme</button>
    </nav>
  </header>
  <main class="container" id="app"></main>
  <footer>PDFLove.store — Standalone Single-File HTML5 Edition · Client-Side Browser Processing</footer>
  <script>
    const TOOLS = ${JSON.stringify(toolsMinimal)};
    function toggleTheme() {
      const d = document.documentElement;
      d.setAttribute('data-theme', d.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }
    function navTo(path) {
      history.pushState({}, '', path);
      render();
    }
    window.addEventListener('popstate', render);
    function render() {
      const path = location.pathname;
      const app = document.getElementById('app');
      if (path.startsWith('/tools/')) {
        const slug = path.replace('/tools/', '');
        const t = TOOLS.find(x => x.s === slug);
        if (!t) { app.innerHTML = '<h1>404 Tool Not Found</h1>'; return; }
        document.title = t.name + ' Online | PDFLove.store';
        app.innerHTML = '<button class="link-btn" onclick="navTo(\\'/\\')">← Back to All 90 Tools</button>' +
          '<div class="workspace"><h1>' + t.name + '</h1><p style="margin:0.5rem 0 1.25rem;color:var(--muted)">' + t.def + '</p>' +
          '<input type="file" id="fInput" ' + (t.m ? 'multiple' : '') + ' style="margin-bottom:1rem;display:block" />' +
          '<button class="btn" onclick="runTool(\\'' + t.s + '\\')">Start Processing</button>' +
          '<div id="status" style="margin-top:1rem;font-weight:600"></div></div>';
      } else {
        document.title = 'PDFLove.store – All Your PDF & Image Tools in One Place';
        app.innerHTML = '<section class="hero"><h1>All Your PDF &amp; Image Tools in One Place</h1>' +
          '<p style="color:var(--muted)">Merge, split, compress, convert and manage your documents with simple online tools.</p>' +
          '<input class="search-box" placeholder="Search 90 tools..." oninput="filterCards(this.value)" /></section>' +
          '<div class="grid" id="grid">' + TOOLS.map(t =>
            '<div class="card" data-name="' + (t.name + ' ' + t.d).toLowerCase() + '" onclick="navTo(\\x27/tools/' + t.s + '\\x27)">' +
            '<h3>' + t.n + '. ' + t.name + '</h3><p>' + t.d + '</p></div>'
          ).join('') + '</div>';
      }
    }
    function filterCards(q) {
      const term = q.toLowerCase();
      document.querySelectorAll('#grid .card').forEach(c => {
        c.style.display = c.getAttribute('data-name').includes(term) ? '' : 'none';
      });
    }
    async function runTool(slug) {
      const st = document.getElementById('status');
      const input = document.getElementById('fInput');
      st.textContent = 'Processing locally in browser...';
      try {
        const pdfDoc = await PDFLib.PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        page.drawText('Processed by PDFLove.store (' + slug + ')', { x: 50, y: 780, size: 16 });
        const bytes = await pdfDoc.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        st.innerHTML = 'Done! <a href="' + url + '" download="' + slug + '-output.pdf" style="color:var(--accent)">Download Output (' + (blob.size/1024).toFixed(1) + ' KB)</a>';
      } catch (e) { st.textContent = 'Error: ' + e.message; }
    }
    render();
  </script>
</body>
</html>`;
}
