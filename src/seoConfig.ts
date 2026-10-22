import { TOOLS_CATALOG, ToolDefinition } from './data/toolsCatalog';
import { LanguageCode, SUPPORTED_LANGUAGES } from './data/translations';
import { buildBeyondSeoProfileForTool, BEYOND_SEO_VERSION } from './beyondSeoEngine';
export {
  generateCompleteSitemapXml,
  getCompleteSitemapEntries,
  type SitemapUrlEntry,
  type SitemapExportOptions,
} from './services/sitemapGenerator';

export const SEO_SITE_ORIGIN = 'https://www.pdflove.store';

export interface PageSeoMeta {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogType: 'website';
  robots: string;
  aeoDirectAnswer: string;
  geoKeyFacts: string[];
  geographySummary: string;
  geoRegionCodes: string;
  geoPlacenames: string;
  structuredData: Record<string, unknown>;
}

export const GEOGRAPHY_TARGET_COUNTRIES = [
  { code: 'IN', name: 'India', hreflang: 'en-IN', coords: '20.5937;78.9629' },
  { code: 'IN-HI', name: 'India (Hindi)', hreflang: 'hi-IN', coords: '28.6139;77.2090' },
  { code: 'IN-GU', name: 'India (Gujarat)', hreflang: 'gu-IN', coords: '23.0225;72.5714' },
  { code: 'US', name: 'United States', hreflang: 'en-US', coords: '37.0902;-95.7129' },
  { code: 'GB', name: 'United Kingdom', hreflang: 'en-GB', coords: '55.3781;-3.4360' },
  { code: 'AE', name: 'United Arab Emirates', hreflang: 'ar-AE', coords: '23.4241;53.8478' },
  { code: 'CA', name: 'Canada', hreflang: 'en-CA', coords: '56.1304;-106.3468' },
  { code: 'AU', name: 'Australia', hreflang: 'en-AU', coords: '-25.2744;133.7751' },
  { code: 'SG', name: 'Singapore', hreflang: 'en-SG', coords: '1.3521;103.8198' },
  { code: 'DE', name: 'Germany', hreflang: 'de-DE', coords: '51.1657;10.4515' },
  { code: 'FR', name: 'France', hreflang: 'fr-FR', coords: '46.2276;2.2137' },
  { code: 'ES', name: 'Spain', hreflang: 'es-ES', coords: '40.4637;-3.7492' },
  { code: 'BR', name: 'Brazil', hreflang: 'pt-BR', coords: '-14.2350;-51.9253' },
  { code: 'ID', name: 'Indonesia', hreflang: 'id-ID', coords: '-0.7893;113.9213' },
  { code: 'TR', name: 'Turkey', hreflang: 'tr-TR', coords: '38.9637;35.2433' },
];

export const INDIA_AND_GLOBAL_HUBS = [
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Ahmedabad',
  'Surat',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Jaipur',
  'Lucknow',
  'Indore',
  'New York',
  'London',
  'Dubai',
  'Singapore',
  'Toronto',
  'Sydney',
];

const UNIVERSAL_PDF_KEYWORDS = [
  'www.pdflove.store',
  'pdflove.store',
  'pdflove',
  'pdflove by nexify',
  'pdf tools online free',
  'best pdf website in india',
  'all in one pdf tools',
  'merge pdf online',
  'split pdf online',
  'compress pdf to 100kb',
  'compress pdf to 200kb',
  'pdf to word converter',
  'word to pdf converter',
  'jpg to pdf',
  'pdf to jpg',
  'certificate maker with multiple signatures',
  'gst invoice generator pdf india',
  'qr code generator online',
  'video compressor online',
  'add subtitles to video online',
];

function buildToolGeographyKeywords(tool: ToolDefinition): string[] {
  const lower = tool.name.toLowerCase();
  return [
    `${lower} online free`,
    `${lower} india`,
    `${lower} mobile and pc`,
    `${lower} without watermark`,
    `best ${lower} tool www.pdflove.store`,
    `${tool.slug.replace(/-/g, ' ')} online`,
    `${lower} in hindi`,
    `${lower} near me`,
  ];
}

export const PDFLAW_LOCAL_BUSINESS_SCHEMA = {
  '@type': 'LocalBusiness',
  '@id': `${SEO_SITE_ORIGIN}/#localbusiness`,
  name: 'PDFLove (www.pdflove.store)',
  alternateName: ['PDFLove', 'www.pdflove.store', 'PDFLove.store', 'PDFLove by Nexify'],
  url: `${SEO_SITE_ORIGIN}/`,
  image: `${SEO_SITE_ORIGIN}/og-cover.svg`,
  logo: `${SEO_SITE_ORIGIN}/og-cover.svg`,
  description:
    "PDFLove (www.pdflove.store) by Nexify is India's #1 free online PDF, Image, QR Code, Multi-Signature Certificate, Watermark PDF, and GST Shop/Job Invoice software suite serving businesses, students, and professionals across major Indian cities and worldwide.",
  priceRange: '₹0 (100% Free)',
  currenciesAccepted: 'INR',
  paymentAccepted: 'Free / Zero Cost',
  openingHours: 'Mo-Su 00:00-23:59',
  contactPoint: {
    '@type': 'ContactPoint',
    url: `${SEO_SITE_ORIGIN}/contact`,
    contactType: 'customer support',
    availableLanguage: ['English', 'Hindi', 'Gujarati'],
    areaServed: 'IN',
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Mumbai, Delhi NCR, Bengaluru, Ahmedabad, Surat, Hyderabad, Pune, Chennai, Kolkata, Jaipur',
    addressRegion: 'Maharashtra, Delhi, Karnataka, Gujarat, Telangana, Tamil Nadu, West Bengal, Rajasthan',
    addressCountry: 'IN',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 20.5937,
    longitude: 78.9629,
  },
  areaServed: [
    {
      '@type': 'City',
      name: 'Mumbai',
      containedInPlace: { '@type': 'State', name: 'Maharashtra, India' },
    },
    {
      '@type': 'City',
      name: 'Delhi NCR',
      containedInPlace: { '@type': 'State', name: 'Delhi, India' },
    },
    {
      '@type': 'City',
      name: 'Bengaluru',
      containedInPlace: { '@type': 'State', name: 'Karnataka, India' },
    },
    {
      '@type': 'City',
      name: 'Ahmedabad',
      containedInPlace: { '@type': 'State', name: 'Gujarat, India' },
    },
    {
      '@type': 'City',
      name: 'Surat',
      containedInPlace: { '@type': 'State', name: 'Gujarat, India' },
    },
    {
      '@type': 'City',
      name: 'Hyderabad',
      containedInPlace: { '@type': 'State', name: 'Telangana, India' },
    },
    {
      '@type': 'City',
      name: 'Pune',
      containedInPlace: { '@type': 'State', name: 'Maharashtra, India' },
    },
    {
      '@type': 'City',
      name: 'Chennai',
      containedInPlace: { '@type': 'State', name: 'Tamil Nadu, India' },
    },
    {
      '@type': 'City',
      name: 'Kolkata',
      containedInPlace: { '@type': 'State', name: 'West Bengal, India' },
    },
    {
      '@type': 'City',
      name: 'Jaipur',
      containedInPlace: { '@type': 'State', name: 'Rajasthan, India' },
    },
  ],
  parentOrganization: {
    '@id': `${SEO_SITE_ORIGIN}/#organization`,
  },
};

export interface StandardToolSchemaOverrideOptions {
  canonicalUrl?: string;
  aggregateRating?: Record<string, unknown>;
  reviews?: Record<string, unknown>[];
}

export function buildStandardToolSoftwareApplicationSchema(
  tool: ToolDefinition,
  options?: StandardToolSchemaOverrideOptions
): Record<string, unknown> {
  const canonicalUrl = options?.canonicalUrl || tool.canonical || `${SEO_SITE_ORIGIN}/tools/${tool.slug}`;
  const baseKeywords = Array.isArray(tool.keywords) && tool.keywords.length > 0 ? tool.keywords : tool.seoKeywords;
  const toolGeoKeywords = Array.from(
    new Set([...baseKeywords, ...buildToolGeographyKeywords(tool), ...UNIVERSAL_PDF_KEYWORDS])
  );
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${canonicalUrl}#software`,
    name: `${tool.name} – PDFLove`,
    alternateName: [tool.name, `${tool.name} Online Free`, `${tool.name} PDFLove`, ...tool.aliases.slice(0, 4)],
    url: canonicalUrl,
    applicationCategory: 'UtilitiesApplication, BusinessApplication',
    applicationSubCategory: `${tool.category} (${tool.filterTag})`,
    operatingSystem: 'All (Android Phone, iPhone, iPad, Windows PC, Mac, Linux)',
    browserRequirements: 'Requires HTML5 Canvas, Web Audio, and ES2020+ JavaScript',
    softwareVersion: '2026.4.0',
    isAccessibleForFree: true,
    description: tool.seoDescription || tool.introDefinition,
    abstract: tool.aeoDirectAnswer,
    keywords: toolGeoKeywords.join(', '),
    screenshot: `${SEO_SITE_ORIGIN}/og-cover.svg`,
    areaServed: [
      ...GEOGRAPHY_TARGET_COUNTRIES.map((c) => ({ '@type': 'Country', name: c.name })),
      ...INDIA_AND_GLOBAL_HUBS.map((city) => ({ '@type': 'City', name: city })),
    ],
    availableLanguage: SUPPORTED_LANGUAGES.map((l) => l.name),
    featureList: [
      ...tool.geoKeyFacts,
      `Supports ${tool.supportedFormats.join(', ')}`,
      '100% Free Forever — No Paywalls, No Watermarks, Unlimited Usage',
      '100% Client-Side Local Browser Processing on Phone, Tablet & PC',
      'Zero Server Upload — Instant Download',
    ],
    author: {
      '@type': 'Organization',
      '@id': `${SEO_SITE_ORIGIN}/#organization`,
      name: 'PDFLove',
      legalName: 'Nexify',
      url: `${SEO_SITE_ORIGIN}/`,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SEO_SITE_ORIGIN}/#organization`,
      name: 'PDFLove (Copyright by Nexify)',
      url: `${SEO_SITE_ORIGIN}/`,
    },
    copyrightHolder: {
      '@type': 'Organization',
      name: 'Nexify',
    },
    copyrightNotice: 'Copyright by Nexify',
    offers: {
      '@type': 'Offer',
      '@id': `${canonicalUrl}#offer`,
      price: '0',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    },
  };

  if (options?.aggregateRating) {
    schema.aggregateRating = options.aggregateRating;
  }
  if (options?.reviews && options.reviews.length > 0) {
    schema.review = options.reviews;
  }

  return schema;
}

export function buildStandardToolBreadcrumbSchema(
  tool: ToolDefinition,
  canonicalUrl?: string
): Record<string, unknown> {
  const resolvedUrl = canonicalUrl || tool.canonical || `${SEO_SITE_ORIGIN}/tools/${tool.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${resolvedUrl}#breadcrumb`,
    name: `${tool.name} Breadcrumb Hierarchy`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home (PDFLove)',
        item: `${SEO_SITE_ORIGIN}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${tool.filterTag}`,
        item: `${SEO_SITE_ORIGIN}/?category=${encodeURIComponent(tool.filterTag)}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: tool.name,
        item: resolvedUrl,
      },
    ],
  };
}

export function buildStandardToolFaqPageSchema(
  tool: ToolDefinition,
  canonicalUrl?: string
): Record<string, unknown> {
  const resolvedUrl = canonicalUrl || tool.canonical || `${SEO_SITE_ORIGIN}/tools/${tool.slug}`;
  const beyondProfile = buildBeyondSeoProfileForTool(tool, `/tools/${tool.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${resolvedUrl}#faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: `How does ${tool.name} work online on www.pdflove.store?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: tool.aeoDirectAnswer,
        },
      },
      {
        '@type': 'Question',
        name: `Does ${tool.name} work on mobile phones and PC browsers in India and worldwide?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes, ${tool.name} on PDFLove (www.pdflove.store) is 100% responsive and works smoothly on Android phones, iPhones, tablets, Windows PCs, and Macs across India and worldwide without installing any app.`,
        },
      },
      {
        '@type': 'Question',
        name: beyondProfile.conversationQuestion,
        acceptedAnswer: {
          '@type': 'Answer',
          text: beyondProfile.conversationAnswer,
        },
      },
      ...tool.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.a,
        },
      })),
    ],
  };
}

function buildToolStructuredData(tool: ToolDefinition, canonicalUrl: string) {
  const softwareNode = { ...buildStandardToolSoftwareApplicationSchema(tool, { canonicalUrl }) };
  delete softwareNode['@context'];
  const breadcrumbNode = { ...buildStandardToolBreadcrumbSchema(tool, canonicalUrl) };
  delete breadcrumbNode['@context'];
  const faqNode = { ...buildStandardToolFaqPageSchema(tool, canonicalUrl) };
  delete faqNode['@context'];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SEO_SITE_ORIGIN}/#organization`,
        name: 'PDFLove',
        legalName: 'Nexify',
        alternateName: ['www.pdflove.store', 'PDFLove.store', 'PDFLove by Nexify'],
        url: `${SEO_SITE_ORIGIN}/`,
        description:
          'PDFLove (Copyright by Nexify) — #1 privacy-first online PDF, Image, QR Code, Video Subtitle, Media Compressor, Calculator, GST Invoice, and Multi-Signature Certificate platform at www.pdflove.store.',
        areaServed: GEOGRAPHY_TARGET_COUNTRIES.map((c) => ({
          '@type': 'Country',
          name: c.name,
        })),
        sameAs: [SEO_SITE_ORIGIN, 'https://pdflove.store'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SEO_SITE_ORIGIN}/#website`,
        url: `${SEO_SITE_ORIGIN}/`,
        name: 'PDFLove (www.pdflove.store) – #1 Online PDF & Document Utility Suite',
        publisher: { '@id': `${SEO_SITE_ORIGIN}/#organization` },
        copyrightHolder: { '@type': 'Organization', name: 'Nexify' },
        copyrightNotice: 'Copyright by Nexify',
        description:
          'All Your PDF, Image, QR, Video Compressor, Certificate & Calculator Tools in One Place on PDFLove (www.pdflove.store). 160+ free online browser utilities by Nexify.',
        inLanguage: SUPPORTED_LANGUAGES.map((l) => l.code),
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SEO_SITE_ORIGIN}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: `${tool.name} Online Free – PDFLove (www.pdflove.store)`,
        description: tool.seoDescription,
        isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` },
        about: { '@id': `${canonicalUrl}#software` },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        inLanguage: SUPPORTED_LANGUAGES.map((l) => l.code),
        isAccessibleForFree: true,
        spatialCoverage: {
          '@type': 'Place',
          name: 'Worldwide & All India (Mumbai, Delhi, Bengaluru, Ahmedabad, Surat, Pune, Hyderabad, Chennai, Kolkata, Jaipur, Lucknow, Indore)',
        },
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['#aeo-direct-answer', '#tool-intro-definition', '#howto-steps'],
        },
      },
      softwareNode,
      {
        '@type': 'HowTo',
        '@id': `${canonicalUrl}#howto`,
        name: `How to use ${tool.name} Online on Phone & PC at www.pdflove.store`,
        description: tool.aeoDirectAnswer,
        totalTime: 'PT10S',
        step: tool.howToSteps.map((stepText, idx) => ({
          '@type': 'HowToStep',
          position: idx + 1,
          name: `Step ${idx + 1}`,
          text: stepText,
          url: `${canonicalUrl}#step-${idx + 1}`,
        })),
      },
      breadcrumbNode,
      faqNode,
    ],
  };
}

// Pre-computed Individual Per-Page SEO, AEO & Geography configuration map for all tools
export const TOOL_SEO_CONFIG_MAP: Record<string, PageSeoMeta> = Object.fromEntries(
  TOOLS_CATALOG.map((tool) => {
    const canonicalUrl = tool.canonical || `${SEO_SITE_ORIGIN}/tools/${tool.slug}`;
    const enrichedTitle = tool.seoTitle;
    const enrichedDesc = tool.seoDescription;
    const baseKeywords = Array.isArray(tool.keywords) && tool.keywords.length > 0 ? tool.keywords : tool.seoKeywords;
    const allKeywords = Array.from(
      new Set([
        ...baseKeywords,
        ...buildToolGeographyKeywords(tool),
        ...UNIVERSAL_PDF_KEYWORDS,
      ])
    ).join(', ');
    const geographySummary = `India (Mumbai, Delhi NCR, Bengaluru, Ahmedabad, Surat, Pune, Hyderabad, Chennai, Kolkata, Jaipur, Lucknow, Indore) & Global (US, UK, UAE, CA, AU, SG, DE, FR)`;
    const enrichedGeoFacts = [
      ...tool.geoKeyFacts,
      `100% Free Online ${tool.name} at ${canonicalUrl}`,
      `Optimized for India (All 28 States) & Global 190+ Countries on Phone & PC`,
    ];

    return [
      tool.slug,
      {
        slug: tool.slug,
        title: enrichedTitle,
        description: enrichedDesc,
        keywords: allKeywords,
        canonicalUrl,
        ogTitle: enrichedTitle,
        ogDescription: enrichedDesc,
        ogType: 'website',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        aeoDirectAnswer: tool.aeoDirectAnswer,
        geoKeyFacts: enrichedGeoFacts,
        geographySummary,
        geoRegionCodes: 'IN, US, GB, AE, CA, AU, SG, DE, FR',
        geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
        structuredData: buildToolStructuredData(tool, canonicalUrl),
      },
    ];
  })
);

function buildStaticPageStructuredData(pageType: string, pageTitle: string, pageSlug: string, description: string) {
  const pageUrl = pageSlug ? `${SEO_SITE_ORIGIN}/${pageSlug}` : `${SEO_SITE_ORIGIN}/`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SEO_SITE_ORIGIN}/#organization`,
        name: 'PDFLove',
        legalName: 'Nexify',
        url: `${SEO_SITE_ORIGIN}/`,
      },
      {
        '@type': pageType,
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: pageTitle,
        description,
        isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` },
        breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        name: `${pageTitle} Breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home (PDFLove)',
            item: `${SEO_SITE_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: pageTitle,
            item: pageUrl,
          },
        ],
      },
    ],
  };
}

// Static route Individual SEO, AEO & Geography configurations
export const STATIC_ROUTE_SEO_MAP: Record<string, PageSeoMeta> = {
  '/': {
    slug: '',
    title: 'Free Online PDF, Image, QR & Invoice Tools | PDFLove',
    description:
      'Merge, split, compress, and convert PDF files, images, QR codes, certificates, and GST invoices online for free with PDFLove. Fast, private browser tools.',
    keywords: [...UNIVERSAL_PDF_KEYWORDS, 'pdflove', 'nexify', ...INDIA_AND_GLOBAL_HUBS.map((c) => `pdf tools ${c.toLowerCase()}`)].join(', '),
    canonicalUrl: `${SEO_SITE_ORIGIN}/`,
    ogTitle: 'Free Online PDF, Image, QR & Invoice Tools | PDFLove',
    ogDescription:
      'Merge, split, compress, and convert PDF files, images, QR codes, certificates, and GST invoices online for free with PDFLove. Fast, private browser tools.',
    ogType: 'website',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    aeoDirectAnswer:
      'PDFLove, Copyright by Nexify, provides 160+ free online tools for every PDF task—including Merge PDF, Split PDF, Compress PDF, Watermark PDF, PDF to Word, Word to PDF, JPG to PDF, Multi-Signature Certificate Maker, GST Invoice Builder, QR Code Generator, Video Compressor, and Smart Calculators—working smoothly on mobile phones, tablets, and PC browsers.',
    geoKeyFacts: [
      'Official Brand: PDFLove — Copyright by Nexify',
      'Total Working Tools: 160+ dedicated client-side PDF, Media & Document utilities',
      'Device Compatibility: 100% Responsive on Mobile Phones (Android/iOS), Tablets, and PC',
      'Geographic Coverage: All India (28 States & 8 UTs) + Global 190+ Countries',
    ],
    geographySummary: 'All India (Mumbai, Delhi, Bengaluru, Ahmedabad, Surat, Pune, Hyderabad) & Global Worldwide',
    geoRegionCodes: 'IN, US, GB, AE, CA, AU, SG, DE, FR, ES, BR, ID, TR',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SEO_SITE_ORIGIN}/#organization`,
          name: 'PDFLove',
          legalName: 'Nexify',
          alternateName: ['PDFLove by Nexify', 'PDFLove Online Tools'],
          url: `${SEO_SITE_ORIGIN}/`,
          areaServed: GEOGRAPHY_TARGET_COUNTRIES.map((c) => ({ '@type': 'Country', name: c.name })),
        },
        {
          '@type': 'WebSite',
          '@id': `${SEO_SITE_ORIGIN}/#website`,
          url: `${SEO_SITE_ORIGIN}/`,
          name: 'PDFLove',
          alternateName: ['PDFLove by Nexify', 'PDFLove Free Online PDF Tools'],
          copyrightHolder: { '@type': 'Organization', name: 'Nexify' },
          copyrightNotice: 'Copyright by Nexify',
          description:
            'Merge, split, compress, and convert PDF files, images, QR codes, certificates, and GST invoices online for free with PDFLove.',
          inLanguage: SUPPORTED_LANGUAGES.map((l) => l.code),
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SEO_SITE_ORIGIN}/?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@type': 'WebPage',
          '@id': `${SEO_SITE_ORIGIN}/#webpage`,
          url: `${SEO_SITE_ORIGIN}/`,
          name: 'Free Online PDF, Image, QR & Invoice Tools | PDFLove',
          isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` },
          about: { '@id': `${SEO_SITE_ORIGIN}/#webapp` },
          breadcrumb: { '@id': `${SEO_SITE_ORIGIN}/#breadcrumb` },
          inLanguage: SUPPORTED_LANGUAGES.map((l) => l.code),
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${SEO_SITE_ORIGIN}/#breadcrumb`,
          name: 'PDFLove Home to Individual Tools Hierarchy',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home (PDFLove)',
              item: `${SEO_SITE_ORIGIN}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: `All ${TOOLS_CATALOG.length} Free PDF & Document Tools`,
              item: `${SEO_SITE_ORIGIN}/#directory`,
            },
            ...TOOLS_CATALOG.slice(0, 18).map((t, index) => ({
              '@type': 'ListItem',
              position: index + 3,
              name: t.name,
              item: `${SEO_SITE_ORIGIN}/tools/${t.slug}`,
            })),
          ],
        },
        {
          '@type': 'ItemList',
          '@id': `${SEO_SITE_ORIGIN}/#tools-catalog-list`,
          name: 'PDFLove Complete Online Tools Directory',
          numberOfItems: TOOLS_CATALOG.length,
          itemListElement: TOOLS_CATALOG.map((t, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: t.name,
            description: t.shortDesc,
            url: `${SEO_SITE_ORIGIN}/tools/${t.slug}`,
          })),
        },
        {
          '@type': 'SoftwareApplication',
          '@id': `${SEO_SITE_ORIGIN}/#webapp`,
          name: 'PDFLove All-in-One PDF & Document Utility Suite',
          url: `${SEO_SITE_ORIGIN}/`,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'All (Android, iOS, Windows, macOS, Linux)',
          description:
            'Complete suite of 160+ online PDF, Image, QR Code, Video Compressor, Calculator, GST Invoice, Watermark PDF, and Multi-Signature Certificate utilities.',
          areaServed: 'Worldwide',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'INR',
          },
        },
      ],
    },
  },
  '/about': {
    slug: 'about',
    title: 'About PDFLove – Free Online PDF, Image & QR Tools Suite',
    description:
      'Learn how PDFLove by Nexify processes PDF documents, images, QR codes, videos, and multi-signature certificates privately inside your web browser.',
    keywords: 'about pdflove, pdflove pdf tools india, nexify pdf tools, local browser pdf tools',
    canonicalUrl: `${SEO_SITE_ORIGIN}/about`,
    ogTitle: 'About PDFLove – Free Online PDF, Image & QR Tools Suite',
    ogDescription: 'Learn how PDFLove processes PDF documents, images, QR codes, and certificates locally in your browser.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer:
      'PDFLove, Copyright by Nexify, is a fast browser-based document, PDF, media, and certificate utility platform designed for mobile phones, tablets, and desktop PCs.',
    geoKeyFacts: ['160+ browser tools', 'Zero server file retention', 'Works on mobile phone, tablet & PC'],
    geographySummary: 'India & Global Worldwide',
    geoRegionCodes: 'IN, US, GB, AE, CA, AU, SG',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: buildStaticPageStructuredData(
      'AboutPage',
      'About PDFLove – Free Online PDF, Image & QR Tools Suite',
      'about',
      'Learn how PDFLove by Nexify processes PDF documents, images, QR codes, videos, and multi-signature certificates privately inside your web browser.'
    ),
  },
  '/privacy': {
    slug: 'privacy',
    title: 'Privacy Policy & Local Browser Processing | PDFLove',
    description:
      'Read the PDFLove Privacy Policy covering 100% client-side browser PDF and image processing, zero server file storage, memory cleanup, and cookie controls.',
    keywords: 'privacy policy pdflove, client side pdf processing, safe pdf tools',
    canonicalUrl: `${SEO_SITE_ORIGIN}/privacy`,
    ogTitle: 'Privacy Policy & Local Browser Processing | PDFLove',
    ogDescription: 'Client-side browser file processing and privacy safeguards on PDFLove.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer:
      'PDFLove processes all PDFs, photos, videos, and documents directly in your browser RAM without uploading private files to external cloud servers.',
    geoKeyFacts: ['Zero cloud upload', 'Instant browser memory cleanup', 'GDPR, DPDP India & CCPA compliant'],
    geographySummary: 'India (DPDP Act Compliant) & Global (GDPR/CCPA Compliant)',
    geoRegionCodes: 'IN, US, GB, EU, AE',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: buildStaticPageStructuredData(
      'WebPage',
      'Privacy Policy & Local Browser Processing | PDFLove',
      'privacy',
      'Read the PDFLove Privacy Policy covering 100% client-side browser PDF and image processing, zero server file storage, memory cleanup, and cookie controls.'
    ),
  },
  '/terms': {
    slug: 'terms',
    title: 'Terms of Service – Free Online PDF & Image Tools | PDFLove',
    description:
      'Review the Terms of Service for using PDFLove free online PDF, image, QR code, multi-signature certificate, GST invoice, and calculator tools in your browser.',
    keywords: 'terms of service pdflove, pdf tools terms',
    canonicalUrl: `${SEO_SITE_ORIGIN}/terms`,
    ogTitle: 'Terms of Service – Free Online PDF & Image Tools | PDFLove',
    ogDescription: 'Terms and conditions for using PDFLove free online PDF and image tools.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer: 'PDFLove provides access to 160+ browser utilities for personal and commercial use.',
    geoKeyFacts: ['Personal and commercial use', 'Instant access on Phone & PC'],
    geographySummary: 'India & Global Worldwide',
    geoRegionCodes: 'IN, US, GB, AE',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: buildStaticPageStructuredData(
      'WebPage',
      'Terms of Service – Free Online PDF & Image Tools | PDFLove',
      'terms',
      'Review the Terms of Service for using PDFLove free online PDF, image, QR code, multi-signature certificate, GST invoice, and calculator tools in your browser.'
    ),
  },
  '/contact': {
    slug: 'contact',
    title: 'Contact Support & Feedback – Help Desk | PDFLove',
    description:
      'Contact the PDFLove support and engineering team for help with online PDF, image, QR code, certificate, or GST invoice tools, bug reports, and feature requests.',
    keywords: 'contact pdflove, pdflove support',
    canonicalUrl: `${SEO_SITE_ORIGIN}/contact`,
    ogTitle: 'Contact Support & Feedback – Help Desk | PDFLove',
    ogDescription: 'Contact the PDFLove support and engineering team for help and feedback.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer: 'Reach out to PDFLove support for feedback, feature requests, or advertising inquiries.',
    geoKeyFacts: ['Direct support channel', 'Fast response across India & Worldwide'],
    geographySummary: 'India & Global Support Desk',
    geoRegionCodes: 'IN, US, GB, AE',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: buildStaticPageStructuredData(
      'ContactPage',
      'Contact Support & Feedback – Help Desk | PDFLove',
      'contact',
      'Contact the PDFLove support and engineering team for help with online PDF, image, QR code, certificate, or GST invoice tools, bug reports, and feature requests.'
    ),
  },
  '/cookies': {
    slug: 'cookies',
    title: 'Cookie Policy & Browser Storage Preferences | PDFLove',
    description:
      'Understand how PDFLove uses local browser storage for dark mode, language preferences, tool usage counters, and Google AdSense display and video ad cookies.',
    keywords: 'cookie policy pdflove, google adsense video ads disclosure, doubleclick dart cookie',
    canonicalUrl: `${SEO_SITE_ORIGIN}/cookies`,
    ogTitle: 'Cookie Policy & Browser Storage Preferences | PDFLove',
    ogDescription: 'Cookie Policy and local browser storage disclosure for PDFLove.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer:
      'PDFLove uses local storage for theme and language preferences and Google AdSense Video & Display cookies to keep all 160+ tools 100% free.',
    geoKeyFacts: ['Google AdSense Video & Display Publisher Policy Compliant', '100% Free Tools Forever'],
    geographySummary: 'India & Global Worldwide',
    geoRegionCodes: 'IN, US, GB, EU, AE',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: buildStaticPageStructuredData(
      'WebPage',
      'Cookie Policy & Browser Storage Preferences | PDFLove',
      'cookies',
      'Understand how PDFLove uses local browser storage for dark mode, language preferences, tool usage counters, and Google AdSense display and video ad cookies.'
    ),
  },
  '/disclaimer': {
    slug: 'disclaimer',
    title: 'Legal Disclaimer – Free Online Browser Tools | PDFLove',
    description:
      'Read the legal disclaimer for PDFLove free online PDF, image, QR code, certificate, GST invoice, and financial calculator tools processed locally in your browser.',
    keywords: 'disclaimer pdflove, legal disclaimer pdf tools',
    canonicalUrl: `${SEO_SITE_ORIGIN}/disclaimer`,
    ogTitle: 'Legal Disclaimer – Free Online Browser Tools | PDFLove',
    ogDescription: 'Legal disclaimer for using PDFLove free online PDF, image, and calculator tools.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer:
      'All 160+ tools on PDFLove are provided 100% free of charge with local client-side browser execution.',
    geoKeyFacts: ['100% Free Forever', 'Client-side browser execution'],
    geographySummary: 'India & Global Worldwide',
    geoRegionCodes: 'IN, US, GB, AE',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: buildStaticPageStructuredData(
      'WebPage',
      'Legal Disclaimer – Free Online Browser Tools | PDFLove',
      'disclaimer',
      'Read the legal disclaimer for PDFLove free online PDF, image, QR code, certificate, GST invoice, and financial calculator tools processed locally in your browser.'
    ),
  },
};

export function resolveSeoConfigForPath(path: string): PageSeoMeta {
  const cleanPath = path === '/' ? '/' : path.replace(/\/+$/, '');
  if (cleanPath.startsWith('/tools/')) {
    const slug = cleanPath.replace('/tools/', '');
    if (TOOL_SEO_CONFIG_MAP[slug]) {
      return TOOL_SEO_CONFIG_MAP[slug];
    }
  }
  return STATIC_ROUTE_SEO_MAP[cleanPath] || STATIC_ROUTE_SEO_MAP['/'];
}

/**
 * Dynamically applies a tool's `keywords` and `canonical` fields directly to `<head>`
 * (`<meta name="keywords">`, `<link rel="canonical">`, `og:url`, `twitter:url`, and `citation_public_url`).
 */
export function applyToolMetaTagsToHead(
  tool: ToolDefinition,
  canonicalOverride?: string
): { keywordsContent: string; canonicalHref: string } {
  const canonicalHref = canonicalOverride || tool.canonical || `${SEO_SITE_ORIGIN}/tools/${tool.slug}`;
  const baseKeywords = Array.isArray(tool.keywords) && tool.keywords.length > 0 ? tool.keywords : tool.seoKeywords;
  const keywordsContent = Array.from(
    new Set([...baseKeywords, ...buildToolGeographyKeywords(tool), ...UNIVERSAL_PDF_KEYWORDS])
  ).join(', ');

  try {
    // 1. Dynamically set or create <meta name="keywords">
    let keywordsMeta = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
    if (!keywordsMeta) {
      keywordsMeta = document.createElement('meta');
      keywordsMeta.setAttribute('name', 'keywords');
      document.head.appendChild(keywordsMeta);
    }
    keywordsMeta.setAttribute('content', keywordsContent);
    keywordsMeta.setAttribute('data-tool-slug', tool.slug);

    // 2. Dynamically set or create <link rel="canonical" id="canonical-link">
    let canonicalLink = (document.getElementById('canonical-link') ||
      document.querySelector('link[rel="canonical"]')) as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.id = 'canonical-link';
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalHref);
    canonicalLink.setAttribute('data-tool-slug', tool.slug);

    // 3. Keep og:url, twitter:url, and citation_public_url synced with tool.canonical
    const ogUrlEl = document.getElementById('og-url') || document.querySelector('meta[property="og:url"]');
    if (ogUrlEl) ogUrlEl.setAttribute('content', canonicalHref);

    let twitterUrlEl = document.querySelector('meta[name="twitter:url"]');
    if (!twitterUrlEl) {
      twitterUrlEl = document.createElement('meta');
      twitterUrlEl.setAttribute('name', 'twitter:url');
      document.head.appendChild(twitterUrlEl);
    }
    twitterUrlEl.setAttribute('content', canonicalHref);

    const citationUrlEl = document.querySelector('meta[name="citation_public_url"]');
    if (citationUrlEl) citationUrlEl.setAttribute('content', canonicalHref);
  } catch {
    // Ignore DOM manipulation errors in non-browser contexts
  }

  return { keywordsContent, canonicalHref };
}

export function applySeoConfigToHead(path: string, lang: LanguageCode): void {
  try {
    const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
    document.documentElement.lang = langInfo.code;
    document.documentElement.dir = langInfo.dir;

    const activeToolObj = path.startsWith('/tools/')
      ? TOOLS_CATALOG.find((t) => t.slug === path.replace('/tools/', '').replace(/\/+$/, ''))
      : undefined;

    const meta = resolveSeoConfigForPath(path);
    const resolvedCanonical = activeToolObj?.canonical || meta.canonicalUrl;
    const resolvedKeywords = activeToolObj
      ? Array.from(
          new Set([
            ...(activeToolObj.keywords || activeToolObj.seoKeywords),
            ...buildToolGeographyKeywords(activeToolObj),
            ...UNIVERSAL_PDF_KEYWORDS,
          ])
        ).join(', ')
      : meta.keywords;

    document.title = meta.title;

    const setOrCreateMeta = (nameOrProp: string, value: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${nameOrProp}"]` : `meta[name="${nameOrProp}"]`;
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(isProperty ? 'property' : 'name', nameOrProp);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    const setTagAttr = (selector: string, attr: string, value: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };

    // 1. Core SEO Meta Tags (Unique per page, dynamically applying tool.keywords when on a tool page)
    setOrCreateMeta('description', meta.description);
    setOrCreateMeta('keywords', resolvedKeywords);
    setOrCreateMeta('robots', meta.robots);
    setOrCreateMeta('googlebot', meta.robots);
    setOrCreateMeta('bingbot', meta.robots);
    setOrCreateMeta('author', 'PDFLove (www.pdflove.store) — Nexify');

    // 2. AEO (Answer Engine Optimization) Meta Tags (Unique per page)
    setOrCreateMeta('aeo:answer', meta.aeoDirectAnswer);
    setOrCreateMeta('aeo:page-title', meta.title);
    setOrCreateMeta('citation_title', meta.title);
    setOrCreateMeta('citation_public_url', resolvedCanonical);

    // 3. GEO & Geography Optimization Meta Tags (Unique per page — India & Global)
    setOrCreateMeta('geo:facts', meta.geoKeyFacts.join(' | '));
    setOrCreateMeta('geo.region', meta.geoRegionCodes);
    setOrCreateMeta('geo.placename', meta.geoPlacenames);
    setOrCreateMeta('geo.position', '20.5937;78.9629');
    setOrCreateMeta('ICBM', '20.5937, 78.9629');
    setOrCreateMeta('distribution', 'global');
    setOrCreateMeta('target', 'all');
    setOrCreateMeta('coverage', 'Worldwide, India');

    // 4. BeyondSEO v2.9.1 (beyondtahir/beyondseo) 9-Pillar Meta Tags (Entity, Conversation, Authority, REO)
    const beyondProfile = buildBeyondSeoProfileForTool(activeToolObj, path);
    setOrCreateMeta('beyondseo:version', BEYOND_SEO_VERSION);
    setOrCreateMeta('beyondseo:pillars', beyondProfile.pillarsActive.join(', '));
    setOrCreateMeta('beyondseo:conversation-q', beyondProfile.conversationQuestion);
    setOrCreateMeta('beyondseo:conversation-a', beyondProfile.conversationAnswer);
    setOrCreateMeta('beyondseo:entity', `${beyondProfile.entityDeclaration.who} | ${beyondProfile.entityDeclaration.where}`);
    setOrCreateMeta('beyondseo:score', `${beyondProfile.readinessBreakdown.totalScore}/100`);

    // 5. Canonical & Social OpenGraph / Twitter Cards (Dynamically applying tool.canonical when on a tool page)
    let canonicalLink = (document.getElementById('canonical-link') ||
      document.querySelector('link[rel="canonical"]')) as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.id = 'canonical-link';
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', resolvedCanonical);

    setTagAttr('#og-title', 'content', meta.ogTitle);
    setTagAttr('#og-description', 'content', meta.ogDescription);
    setTagAttr('#og-url', 'content', resolvedCanonical);
    setTagAttr('#twitter-title', 'content', meta.ogTitle);
    setTagAttr('#twitter-description', 'content', meta.ogDescription);
    setOrCreateMeta('og:url', resolvedCanonical, true);
    setOrCreateMeta('twitter:url', resolvedCanonical, false);
    setOrCreateMeta('og:image', `${SEO_SITE_ORIGIN}/og-cover.svg`, true);
    setOrCreateMeta('og:image:alt', meta.ogTitle, true);
    setOrCreateMeta('twitter:image', `${SEO_SITE_ORIGIN}/og-cover.svg`, false);

    // 6. Dynamic Per-Page Hreflang Links for Genuinely Supported Languages
    document.querySelectorAll('link[data-dynamic-hreflang="true"]').forEach((el) => el.remove());
    SUPPORTED_LANGUAGES.forEach((language) => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = language.code;
      link.href = language.code === 'en' ? resolvedCanonical : `${resolvedCanonical}?lang=${language.code}`;
      link.setAttribute('data-dynamic-hreflang', 'true');
      document.head.appendChild(link);
    });
    const xDefault = document.createElement('link');
    xDefault.rel = 'alternate';
    xDefault.hreflang = 'x-default';
    xDefault.href = resolvedCanonical;
    xDefault.setAttribute('data-dynamic-hreflang', 'true');
    document.head.appendChild(xDefault);

    // 7. Google Search Console XML Sitemap Link Discovery
    if (!document.querySelector('link[rel="sitemap"][href="https://www.pdflove.store/sitemap.xml"]')) {
      const smLink = document.createElement('link');
      smLink.rel = 'sitemap';
      smLink.type = 'application/xml';
      smLink.title = 'PDFLove Primary XML Sitemap';
      smLink.href = 'https://www.pdflove.store/sitemap.xml';
      document.head.appendChild(smLink);
    }
    if (!document.querySelector('link[rel="sitemap"][href="https://www.pdflove.store/sitemap-index.xml"]')) {
      const smIdxLink = document.createElement('link');
      smIdxLink.rel = 'sitemap';
      smIdxLink.type = 'application/xml';
      smIdxLink.title = 'PDFLove Sitemap Index';
      smIdxLink.href = 'https://www.pdflove.store/sitemap-index.xml';
      document.head.appendChild(smIdxLink);
    }

    // 8. Per-Page JSON-LD Structured Data Graph (SEO + AEO + GEO + LocalBusiness + BreadcrumbList)
    const dynamicJsonLdScript = document.getElementById('dynamic-jsonld') || document.getElementById('schema-jsonld');
    if (dynamicJsonLdScript) {
      dynamicJsonLdScript.textContent = JSON.stringify(meta.structuredData);
    }

    // 9. Standardized Per-Tool Meta & Schema Head Injection (keywords, canonical, SoftwareApplication, BreadcrumbList, FAQPage)
    if (activeToolObj) {
      applyToolMetaTagsToHead(activeToolObj, resolvedCanonical);
      injectStandardToolJsonLdToHead(activeToolObj, { canonicalUrl: resolvedCanonical });
    } else {
      clearStandardToolJsonLdFromHead();
    }
  } catch {
    // Prevent any DOM head manipulation error from affecting UI
  }
}

const TOOL_HEAD_SCHEMA_SCRIPT_IDS = [
  'tool-software-application-jsonld',
  'tool-breadcrumb-jsonld',
  'tool-faqpage-jsonld',
] as const;

/**
 * Removes tool-specific JSON-LD script tags from document.head when navigating away from tool pages.
 */
export function clearStandardToolJsonLdFromHead(): void {
  try {
    TOOL_HEAD_SCHEMA_SCRIPT_IDS.forEach((id) => {
      document.getElementById(id)?.remove();
    });
    document.querySelectorAll('script[data-pdflove-tool-schema="true"]').forEach((el) => el.remove());
  } catch {
    // ignore DOM cleanup errors
  }
}

/**
 * Standardized SEO helper function that automatically builds and injects
 * 'SoftwareApplication', 'BreadcrumbList', and 'FAQPage' JSON-LD schemas into
 * document.head for any tool page based on the tool's metadata (and optional live ratings/reviews),
 * while keeping the master #dynamic-jsonld @graph synchronized 1:1.
 */
export function injectStandardToolJsonLdToHead(
  tool: ToolDefinition,
  options?: StandardToolSchemaOverrideOptions
): {
  softwareSchema: Record<string, unknown>;
  breadcrumbSchema: Record<string, unknown>;
  faqPageSchema: Record<string, unknown>;
} {
  const canonicalUrl = options?.canonicalUrl || tool.canonical || `${SEO_SITE_ORIGIN}/tools/${tool.slug}`;
  applyToolMetaTagsToHead(tool, canonicalUrl);
  const softwareSchema = buildStandardToolSoftwareApplicationSchema(tool, {
    ...options,
    canonicalUrl,
  });
  const breadcrumbSchema = buildStandardToolBreadcrumbSchema(tool, canonicalUrl);
  const faqPageSchema = buildStandardToolFaqPageSchema(tool, canonicalUrl);

  try {
    const upsertHeadJsonLdScript = (scriptId: string, schemaType: string, payload: Record<string, unknown>) => {
      let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.type = 'application/ld+json';
        scriptEl.setAttribute('data-pdflove-tool-schema', 'true');
        scriptEl.setAttribute('data-schema-type', schemaType);
        scriptEl.setAttribute('data-tool-slug', tool.slug);
        document.head.appendChild(scriptEl);
      } else {
        scriptEl.setAttribute('data-tool-slug', tool.slug);
      }
      scriptEl.textContent = JSON.stringify(payload);
    };

    upsertHeadJsonLdScript('tool-software-application-jsonld', 'SoftwareApplication', softwareSchema);
    upsertHeadJsonLdScript('tool-breadcrumb-jsonld', 'BreadcrumbList', breadcrumbSchema);
    upsertHeadJsonLdScript('tool-faqpage-jsonld', 'FAQPage', faqPageSchema);

    // Keep the unified #dynamic-jsonld @graph in <head> synchronized with live SoftwareApplication, BreadcrumbList & FAQPage nodes
    const globalJsonLd = document.getElementById('dynamic-jsonld') || document.getElementById('schema-jsonld');
    if (globalJsonLd && globalJsonLd.textContent) {
      const parsed = JSON.parse(globalJsonLd.textContent);
      if (parsed && Array.isArray(parsed['@graph'])) {
        const cleanSoftware = { ...softwareSchema };
        delete cleanSoftware['@context'];
        const cleanBreadcrumb = { ...breadcrumbSchema };
        delete cleanBreadcrumb['@context'];
        const cleanFaq = { ...faqPageSchema };
        delete cleanFaq['@context'];

        parsed['@graph'] = parsed['@graph'].map((node: Record<string, unknown>) => {
          if (node['@type'] === 'SoftwareApplication') return cleanSoftware;
          if (node['@type'] === 'BreadcrumbList') return cleanBreadcrumb;
          if (node['@type'] === 'FAQPage') return cleanFaq;
          return node;
        });
        globalJsonLd.textContent = JSON.stringify(parsed);
      }
    }
  } catch {
    // Prevent DOM head manipulation errors from affecting UI execution
  }

  return {
    softwareSchema,
    breadcrumbSchema,
    faqPageSchema,
  };
}

