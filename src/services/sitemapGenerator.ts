import { TOOLS_CATALOG } from '../data/toolsCatalog';

export const SITEMAP_SITE_ORIGIN = 'https://www.pdflove.store';

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

export interface SitemapExportOptions {
  baseUrl?: string;
  includeLastMod?: boolean;
  lastModDate?: string;
}

export const STATIC_SITEMAP_PAGES: Array<{
  path: string;
  changefreq: SitemapUrlEntry['changefreq'];
  priority: string;
}> = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/about', changefreq: 'weekly', priority: '0.8' },
  { path: '/privacy', changefreq: 'weekly', priority: '0.8' },
  { path: '/cookies', changefreq: 'weekly', priority: '0.8' },
  { path: '/terms', changefreq: 'weekly', priority: '0.8' },
  { path: '/disclaimer', changefreq: 'weekly', priority: '0.8' },
  { path: '/contact', changefreq: 'weekly', priority: '0.8' },
];

/**
 * Returns structured sitemap URL entries for the home page, static info pages,
 * and all 161 individual tool slugs in TOOLS_CATALOG.
 */
export function getCompleteSitemapEntries(options?: SitemapExportOptions): SitemapUrlEntry[] {
  const origin = (options?.baseUrl || SITEMAP_SITE_ORIGIN).replace(/\/+$/, '');
  const lastmod = options?.includeLastMod
    ? options?.lastModDate || new Date().toISOString().slice(0, 10)
    : undefined;

  const staticEntries: SitemapUrlEntry[] = STATIC_SITEMAP_PAGES.map((page) => ({
    loc: `${origin}${page.path}`,
    ...(lastmod ? { lastmod } : {}),
    changefreq: page.changefreq,
    priority: page.priority,
  }));

  const toolEntries: SitemapUrlEntry[] = TOOLS_CATALOG.map((tool) => ({
    loc: `${origin}/tools/${tool.slug}`,
    ...(lastmod ? { lastmod } : {}),
    changefreq: 'weekly',
    priority: '0.9',
  }));

  return [...staticEntries, ...toolEntries];
}

/**
 * Generates and exports a complete, SEO-friendly XML sitemap string (Sitemaps 0.9 protocol)
 * containing the homepage, all legal/support routes, and all 161 tool slugs for Google Search Console.
 */
export function generateCompleteSitemapXml(options?: SitemapExportOptions): string {
  const entries = getCompleteSitemapEntries(options);
  const urlBlocks = entries.map((entry) => {
    const lines = [
      '  <url>',
      `    <loc>${entry.loc}</loc>`,
      ...(entry.lastmod ? [`    <lastmod>${entry.lastmod}</lastmod>`] : []),
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      '  </url>',
    ];
    return lines.join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlBlocks,
    '</urlset>',
  ].join('\n');
}
