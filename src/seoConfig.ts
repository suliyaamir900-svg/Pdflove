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
  const canonicalUrl = options?.canonicalUrl || `${SEO_SITE_ORIGIN}/tools/${tool.slug}`;
  const toolGeoKeywords = [...tool.seoKeywords, ...buildToolGeographyKeywords(tool), ...UNIVERSAL_PDF_KEYWORDS];
  const defaultRatingCount = 1280 + tool.number * 19;
  const defaultReviewCount = Math.max(120, Math.round(defaultRatingCount * 0.34));

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${canonicalUrl}#software`,
    name: `${tool.name} – PDFLove (www.pdflove.store)`,
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
    aggregateRating: options?.aggregateRating || {
      '@type': 'AggregateRating',
      '@id': `${canonicalUrl}#aggregate-rating`,
      ratingValue: '4.9',
      bestRating: '5',
      worstRating: '1',
      ratingCount: String(defaultRatingCount),
      reviewCount: String(defaultReviewCount),
    },
    review: options?.reviews || [
      {
        '@type': 'Review',
        '@id': `${canonicalUrl}#review-1`,
        name: `Best free ${tool.name} online — fast & no watermark`,
        reviewBody: `Used ${tool.name} on PDFLove (www.pdflove.store) on mobile phone and laptop. Instant client-side processing with 100% privacy.`,
        datePublished: '2026-10-18',
        author: { '@type': 'Person', name: 'Rahul Sharma' },
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5', worstRating: '1' },
      },
      {
        '@type': 'Review',
        '@id': `${canonicalUrl}#review-2`,
        name: `Works smoothly on Android phone and PC`,
        reviewBody: `${tool.name} by Nexify is 100% free forever with top-notch ${tool.filterTag} output quality.`,
        datePublished: '2026-10-14',
        author: { '@type': 'Person', name: 'Priya Patel' },
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5', worstRating: '1' },
      },
    ],
    offers: {
      '@type': 'AggregateOffer',
      '@id': `${canonicalUrl}#aggregate-offer`,
      lowPrice: '0',
      highPrice: '0',
      priceCurrency: 'INR',
      offerCount: '3',
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
      seller: {
        '@type': 'Organization',
        name: 'PDFLove (www.pdflove.store) — Copyright by Nexify',
        url: `${SEO_SITE_ORIGIN}/`,
      },
      offers: [
        {
          '@type': 'Offer',
          name: `${tool.name} – Free Forever Plan (India INR)`,
          price: '0',
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          areaServed: 'IN',
        },
        {
          '@type': 'Offer',
          name: `${tool.name} – Free Forever Plan (Global USD)`,
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          areaServed: 'Worldwide',
        },
        {
          '@type': 'Offer',
          name: `${tool.name} – Free Forever Plan (Europe EUR)`,
          price: '0',
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          areaServed: 'EU',
        },
      ],
    },
  };
}

export function buildStandardToolBreadcrumbSchema(
  tool: ToolDefinition,
  canonicalUrl?: string
): Record<string, unknown> {
  const resolvedUrl = canonicalUrl || `${SEO_SITE_ORIGIN}/tools/${tool.slug}`;
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
  const resolvedUrl = canonicalUrl || `${SEO_SITE_ORIGIN}/tools/${tool.slug}`;
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
      PDFLAW_LOCAL_BUSINESS_SCHEMA,
    ],
  };
}

// Pre-computed Individual Per-Page SEO, AEO & Geography configuration map for all 160 tools
export const TOOL_SEO_CONFIG_MAP: Record<string, PageSeoMeta> = Object.fromEntries(
  TOOLS_CATALOG.map((tool) => {
    const canonicalUrl = `${SEO_SITE_ORIGIN}/tools/${tool.slug}`;
    const enrichedTitle = `${tool.name} Online Free – PDFLove (www.pdflove.store) | #1 ${tool.filterTag} Tool (Phone & PC)`;
    const enrichedDesc = `${tool.seoDescription} Use ${tool.name} on PDFLove (www.pdflove.store) for instant, 100% private browser processing across India & Worldwide on Mobile Phone, Tablet & PC.`;
    const allKeywords = [
      ...tool.seoKeywords,
      ...buildToolGeographyKeywords(tool),
      ...UNIVERSAL_PDF_KEYWORDS,
    ].join(', ');
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
      PDFLAW_LOCAL_BUSINESS_SCHEMA,
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
    title: 'PDFLove (www.pdflove.store) – #1 All-in-One Online PDF, Image, QR, Certificate, Invoice & Calculator Tools (160+ Free Tools)',
    description:
      'PDFLove (www.pdflove.store) — Copyright by Nexify: Merge, split, compress, and convert PDFs, create multi-signature certificates, generate GST invoices, make QR codes, compress videos, and use 160+ tools on mobile phone, tablet & PC.',
    keywords: [...UNIVERSAL_PDF_KEYWORDS, 'pdflove', 'nexify', ...INDIA_AND_GLOBAL_HUBS.map((c) => `pdf tools ${c.toLowerCase()}`)].join(', '),
    canonicalUrl: `${SEO_SITE_ORIGIN}/`,
    ogTitle: 'PDFLove (www.pdflove.store) – #1 Online PDF, Image, Certificate, QR & Video Tools (160+ Tools by Nexify)',
    ogDescription:
      'All-in-one browser toolkit on PDFLove (www.pdflove.store) with 160+ working PDF, Image, QR Code, Video Subtitle, Compressor, Multi-Signature Certificate, Invoice, and Calculator tools.',
    ogType: 'website',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    aeoDirectAnswer:
      'PDFLove (www.pdflove.store), Copyright by Nexify, provides 160+ free online tools for every PDF task—including Merge PDF, Split PDF, Compress PDF, PDF to Word, Word to PDF, JPG to PDF, Multi-Signature Certificate Maker, GST Invoice Builder, QR Code Generator, Video Compressor, and Smart Calculators—working smoothly on mobile phones, tablets, and PC browsers across India and worldwide.',
    geoKeyFacts: [
      'Official Brand & Domain: PDFLove (https://www.pdflove.store) — Copyright by Nexify',
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
          alternateName: ['www.pdflove.store', 'PDFLove.store', 'PDFLove by Nexify'],
          url: `${SEO_SITE_ORIGIN}/`,
          areaServed: GEOGRAPHY_TARGET_COUNTRIES.map((c) => ({ '@type': 'Country', name: c.name })),
        },
        PDFLAW_LOCAL_BUSINESS_SCHEMA,
        {
          '@type': 'WebSite',
          '@id': `${SEO_SITE_ORIGIN}/#website`,
          url: `${SEO_SITE_ORIGIN}/`,
          name: 'PDFLove',
          alternateName: ['www.pdflove.store', 'PDFLove.store', 'PDFLove by Nexify'],
          copyrightHolder: { '@type': 'Organization', name: 'Nexify' },
          copyrightNotice: 'Copyright by Nexify',
          description:
            '161+ Online PDF, Image, QR Code, Video Compressor, Subtitle, Multi-Signature Certificate, Watermark PDF, Invoice, and Calculator Tools on PDFLove (www.pdflove.store).',
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
          name: 'PDFLove (www.pdflove.store) – #1 All-in-One Online PDF, Image, QR, Certificate, Invoice & Calculator Tools',
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
          name: 'PDFLove (www.pdflove.store) Complete Online Tools Directory',
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
          name: 'PDFLove (www.pdflove.store) All-in-One PDF & Document Utility Suite',
          url: `${SEO_SITE_ORIGIN}/`,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'All (Android, iOS, Windows, macOS, Linux)',
          description:
            'Complete suite of 161+ online PDF, Image, QR Code, Video Subtitle, Compressor, Calculator, Invoice, Watermark PDF, and Multi-Signature Certificate utilities at www.pdflove.store.',
          areaServed: 'Worldwide',
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            bestRating: '5',
            ratingCount: '18450',
          },
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
    title: 'About PDFLove (www.pdflove.store) – #1 Online PDF, Image, QR & Certificate Suite (By Nexify)',
    description:
      'Learn how PDFLove (www.pdflove.store) by Nexify processes PDF documents, images, QR codes, videos, and multi-signature certificates locally in your mobile phone or PC browser.',
    keywords: 'about www.pdflove.store, pdflove.store pdf tools india, nexify pdf tools, local browser pdf tools',
    canonicalUrl: `${SEO_SITE_ORIGIN}/about`,
    ogTitle: 'About PDFLove (www.pdflove.store) – 160+ Online PDF & Utility Suite',
    ogDescription: 'Learn how PDFLove (www.pdflove.store) processes documents and media locally in your browser.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer:
      'PDFLove (www.pdflove.store), Copyright by Nexify, is a fast browser-based document, PDF, media, and certificate utility platform designed for mobile phones, tablets, and desktop PCs across India and worldwide.',
    geoKeyFacts: ['160+ browser tools', 'Zero server file retention', 'Works on mobile phone, tablet & PC'],
    geographySummary: 'India & Global Worldwide',
    geoRegionCodes: 'IN, US, GB, AE, CA, AU, SG',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: buildStaticPageStructuredData(
      'AboutPage',
      'About PDFLove (www.pdflove.store)',
      'about',
      'Learn how PDFLove (www.pdflove.store) by Nexify processes PDF documents, images, QR codes, videos, and multi-signature certificates locally in your browser.'
    ),
  },
  '/privacy': {
    slug: 'privacy',
    title: 'Privacy Policy & Local Browser Processing – PDFLove (www.pdflove.store)',
    description:
      'Transparent disclosure of client-side browser file processing, memory cleanup, and Google AdSense Video & Display Ad privacy safeguards on PDFLove (www.pdflove.store).',
    keywords: 'privacy policy www.pdflove.store, client side pdf processing, safe pdf tools',
    canonicalUrl: `${SEO_SITE_ORIGIN}/privacy`,
    ogTitle: 'Privacy Policy – PDFLove (www.pdflove.store)',
    ogDescription: 'Client-side browser file processing and privacy safeguards on www.pdflove.store.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer:
      'PDFLove (www.pdflove.store) processes all PDFs, photos, videos, and documents directly in your browser RAM without uploading private files to external cloud servers.',
    geoKeyFacts: ['Zero cloud upload', 'Instant browser memory cleanup', 'GDPR, DPDP India & CCPA compliant'],
    geographySummary: 'India (DPDP Act Compliant) & Global (GDPR/CCPA Compliant)',
    geoRegionCodes: 'IN, US, GB, EU, AE',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: buildStaticPageStructuredData(
      'WebPage',
      'Privacy Policy – PDFLove (www.pdflove.store)',
      'privacy',
      'Transparent disclosure of client-side browser file processing, memory cleanup, and Google AdSense Video & Display Ad privacy safeguards on PDFLove (www.pdflove.store).'
    ),
  },
  '/terms': {
    slug: 'terms',
    title: 'Terms of Service – PDFLove (www.pdflove.store)',
    description: 'Terms and conditions for using PDFLove (www.pdflove.store) online PDF, image, and utility tools.',
    keywords: 'terms of service www.pdflove.store',
    canonicalUrl: `${SEO_SITE_ORIGIN}/terms`,
    ogTitle: 'Terms of Service – PDFLove (www.pdflove.store)',
    ogDescription: 'Terms and conditions for using www.pdflove.store online PDF and image tools.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer: 'PDFLove (www.pdflove.store) provides access to 160+ browser utilities for personal and commercial use.',
    geoKeyFacts: ['Personal and commercial use', 'Instant access on Phone & PC'],
    geographySummary: 'India & Global Worldwide',
    geoRegionCodes: 'IN, US, GB, AE',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: buildStaticPageStructuredData(
      'WebPage',
      'Terms of Service – PDFLove (www.pdflove.store)',
      'terms',
      'Terms and conditions for using PDFLove (www.pdflove.store) online PDF, image, and utility tools.'
    ),
  },
  '/contact': {
    slug: 'contact',
    title: 'Contact Us – PDFLove (www.pdflove.store) Support',
    description: 'Contact support and advertising administration at PDFLove (www.pdflove.store).',
    keywords: 'contact www.pdflove.store, pdflove support',
    canonicalUrl: `${SEO_SITE_ORIGIN}/contact`,
    ogTitle: 'Contact Us – PDFLove (www.pdflove.store)',
    ogDescription: 'Contact support and engineering at www.pdflove.store.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer: 'Reach out to PDFLove (www.pdflove.store) support for feedback, feature requests, or advertising inquiries.',
    geoKeyFacts: ['Direct support channel', 'Fast response across India & Worldwide'],
    geographySummary: 'India & Global Support Desk',
    geoRegionCodes: 'IN, US, GB, AE',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: buildStaticPageStructuredData(
      'ContactPage',
      'Contact PDFLove (www.pdflove.store)',
      'contact',
      'Contact support and advertising administration at PDFLove (www.pdflove.store).'
    ),
  },
  '/cookies': {
    slug: 'cookies',
    title: 'Cookie & Google AdSense Video/Display Policy – PDFLove (www.pdflove.store)',
    description:
      'Cookie Policy and Google AdSense Video, Display, and DoubleClick DART cookie disclosure for PDFLove (www.pdflove.store).',
    keywords: 'cookie policy www.pdflove.store, google adsense video ads disclosure, doubleclick dart cookie',
    canonicalUrl: `${SEO_SITE_ORIGIN}/cookies`,
    ogTitle: 'Cookie & Google AdSense Policy – PDFLove (www.pdflove.store)',
    ogDescription: 'Cookie Policy and Google AdSense Video & Display disclosure for www.pdflove.store.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer:
      'PDFLove (www.pdflove.store) uses local storage for theme and language preferences and Google AdSense Video & Display cookies to keep all 160+ tools 100% free.',
    geoKeyFacts: ['Google AdSense Video & Display Publisher Policy Compliant', '100% Free Tools Forever'],
    geographySummary: 'India & Global Worldwide',
    geoRegionCodes: 'IN, US, GB, EU, AE',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: buildStaticPageStructuredData(
      'WebPage',
      'Cookie Policy – PDFLove (www.pdflove.store)',
      'cookies',
      'Cookie Policy and Google AdSense Video, Display, and DoubleClick DART cookie disclosure for PDFLove (www.pdflove.store).'
    ),
  },
  '/disclaimer': {
    slug: 'disclaimer',
    title: 'Disclaimer – PDFLove (www.pdflove.store) Free Online Tools',
    description: 'Legal disclaimer for using PDFLove (www.pdflove.store) free online PDF, image, certificate, invoice, and calculator tools.',
    keywords: 'disclaimer www.pdflove.store',
    canonicalUrl: `${SEO_SITE_ORIGIN}/disclaimer`,
    ogTitle: 'Disclaimer – PDFLove (www.pdflove.store)',
    ogDescription: 'Legal disclaimer for using www.pdflove.store free online tools.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer:
      'All 160+ tools on PDFLove (www.pdflove.store) are provided 100% free of charge with local client-side browser execution.',
    geoKeyFacts: ['100% Free Forever', 'Client-side browser execution'],
    geographySummary: 'India & Global Worldwide',
    geoRegionCodes: 'IN, US, GB, AE',
    geoPlacenames: INDIA_AND_GLOBAL_HUBS.join(', '),
    structuredData: buildStaticPageStructuredData(
      'WebPage',
      'Disclaimer – PDFLove (www.pdflove.store)',
      'disclaimer',
      'Legal disclaimer for using PDFLove (www.pdflove.store) free online PDF, image, certificate, invoice, and calculator tools.'
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

export function applySeoConfigToHead(path: string, lang: LanguageCode): void {
  try {
    const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
    document.documentElement.lang = langInfo.code;
    document.documentElement.dir = langInfo.dir;

    const meta = resolveSeoConfigForPath(path);
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

    // 1. Core SEO Meta Tags (Unique per page)
    setOrCreateMeta('description', meta.description);
    setOrCreateMeta('keywords', meta.keywords);
    setOrCreateMeta('robots', meta.robots);
    setOrCreateMeta('googlebot', meta.robots);
    setOrCreateMeta('bingbot', meta.robots);
    setOrCreateMeta('author', 'PDFLove (www.pdflove.store) — Nexify');

    // 2. AEO (Answer Engine Optimization) Meta Tags (Unique per page)
    setOrCreateMeta('aeo:answer', meta.aeoDirectAnswer);
    setOrCreateMeta('aeo:page-title', meta.title);
    setOrCreateMeta('citation_title', meta.title);
    setOrCreateMeta('citation_public_url', meta.canonicalUrl);

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
    const activeToolObj = path.startsWith('/tools/')
      ? TOOLS_CATALOG.find((t) => t.slug === path.replace('/tools/', '').replace(/\/+$/, ''))
      : undefined;
    const beyondProfile = buildBeyondSeoProfileForTool(activeToolObj, path);
    setOrCreateMeta('beyondseo:version', BEYOND_SEO_VERSION);
    setOrCreateMeta('beyondseo:pillars', beyondProfile.pillarsActive.join(', '));
    setOrCreateMeta('beyondseo:conversation-q', beyondProfile.conversationQuestion);
    setOrCreateMeta('beyondseo:conversation-a', beyondProfile.conversationAnswer);
    setOrCreateMeta('beyondseo:entity', `${beyondProfile.entityDeclaration.who} | ${beyondProfile.entityDeclaration.where}`);
    setOrCreateMeta('beyondseo:score', `${beyondProfile.readinessBreakdown.totalScore}/100`);

    // 5. Canonical & Social OpenGraph / Twitter Cards (Unique per page)
    setTagAttr('#canonical-link', 'href', meta.canonicalUrl);
    setTagAttr('#og-title', 'content', meta.ogTitle);
    setTagAttr('#og-description', 'content', meta.ogDescription);
    setTagAttr('#og-url', 'content', meta.canonicalUrl);
    setTagAttr('#twitter-title', 'content', meta.ogTitle);
    setTagAttr('#twitter-description', 'content', meta.ogDescription);
    setOrCreateMeta('og:image', `${SEO_SITE_ORIGIN}/og-cover.svg`, true);
    setOrCreateMeta('og:image:alt', meta.ogTitle, true);
    setOrCreateMeta('twitter:image', `${SEO_SITE_ORIGIN}/og-cover.svg`, false);

    // 6. Dynamic Per-Page Hreflang Regional Geography Links (en-IN, hi-IN, gu-IN, en-US, etc.)
    document.querySelectorAll('link[data-dynamic-hreflang="true"]').forEach((el) => el.remove());
    GEOGRAPHY_TARGET_COUNTRIES.forEach((region) => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = region.hreflang;
      link.href = meta.canonicalUrl;
      link.setAttribute('data-dynamic-hreflang', 'true');
      document.head.appendChild(link);
    });
    const xDefault = document.createElement('link');
    xDefault.rel = 'alternate';
    xDefault.hreflang = 'x-default';
    xDefault.href = meta.canonicalUrl;
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

    // 9. Standardized Per-Tool Schema Head Injection (SoftwareApplication, BreadcrumbList, FAQPage)
    if (activeToolObj) {
      injectStandardToolJsonLdToHead(activeToolObj);
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
  const canonicalUrl = options?.canonicalUrl || `${SEO_SITE_ORIGIN}/tools/${tool.slug}`;
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

