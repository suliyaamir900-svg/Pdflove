import { TOOLS_CATALOG, ToolDefinition } from './data/toolsCatalog';
import { LanguageCode, SUPPORTED_LANGUAGES } from './data/translations';

export const SEO_SITE_ORIGIN = 'https://pdflove.store';

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
  structuredData: Record<string, unknown>;
}

function buildToolStructuredData(tool: ToolDefinition, canonicalUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SEO_SITE_ORIGIN}/#organization`,
        name: 'PDFLove.store',
        url: `${SEO_SITE_ORIGIN}/`,
        description:
          'Privacy-first browser utility platform offering 160+ online PDF, Image, QR Code, Video Subtitle, Media Compressor, Calculator, Invoice, and Certificate tools.',
        sameAs: [SEO_SITE_ORIGIN],
      },
      {
        '@type': 'WebSite',
        '@id': `${SEO_SITE_ORIGIN}/#website`,
        url: `${SEO_SITE_ORIGIN}/`,
        name: 'PDFLove.store',
        publisher: { '@id': `${SEO_SITE_ORIGIN}/#organization` },
        description:
          'All Your PDF, Image, QR, Video Compressor & Calculator Tools in One Place. 160+ free online browser utilities.',
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
        name: tool.seoTitle,
        description: tool.seoDescription,
        isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` },
        about: { '@id': `${canonicalUrl}#software` },
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['#aeo-direct-answer', '#tool-intro-definition', '#howto-steps'],
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${canonicalUrl}#software`,
        name: `${tool.name} – PDFLove.store`,
        url: canonicalUrl,
        applicationCategory: 'UtilitiesApplication',
        applicationSubCategory: tool.category,
        operatingSystem: 'Web Browser (Windows, macOS, Linux, Android, iOS)',
        browserRequirements: 'Requires HTML5 Canvas, Web Audio, and ES2020+ JavaScript',
        description: tool.introDefinition,
        abstract: tool.aeoDirectAnswer,
        keywords: tool.seoKeywords.join(', '),
        featureList: [
          ...tool.geoKeyFacts,
          `Supports ${tool.supportedFormats.join(', ')}`,
          '100% Client-Side Local Browser Processing',
        ],
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
      },
      {
        '@type': 'HowTo',
        '@id': `${canonicalUrl}#howto`,
        name: `How to use ${tool.name} Online Free`,
        description: tool.aeoDirectAnswer,
        totalTime: 'PT15S',
        step: tool.howToSteps.map((stepText, idx) => ({
          '@type': 'HowToStep',
          position: idx + 1,
          name: `Step ${idx + 1}`,
          text: stepText,
          url: `${canonicalUrl}#step-${idx + 1}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'PDFLove.store',
            item: `${SEO_SITE_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: tool.filterTag,
            item: `${SEO_SITE_ORIGIN}/#directory`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: tool.name,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: `How does ${tool.name} work online?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: tool.aeoDirectAnswer,
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
      },
    ],
  };
}

// Pre-computed SEO, AEO & GEO configuration map for all 160 tools
export const TOOL_SEO_CONFIG_MAP: Record<string, PageSeoMeta> = Object.fromEntries(
  TOOLS_CATALOG.map((tool) => {
    const canonicalUrl = `${SEO_SITE_ORIGIN}/tools/${tool.slug}`;
    return [
      tool.slug,
      {
        slug: tool.slug,
        title: tool.seoTitle,
        description: tool.seoDescription,
        keywords: tool.seoKeywords.join(', '),
        canonicalUrl,
        ogTitle: tool.seoTitle,
        ogDescription: tool.seoDescription,
        ogType: 'website',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        aeoDirectAnswer: tool.aeoDirectAnswer,
        geoKeyFacts: tool.geoKeyFacts,
        structuredData: buildToolStructuredData(tool, canonicalUrl),
      },
    ];
  })
);

// Static route SEO, AEO & GEO configurations
export const STATIC_ROUTE_SEO_MAP: Record<string, PageSeoMeta> = {
  '/': {
    slug: '',
    title: 'PDFLove.store – 160+ Free Online PDF, Image, QR, Video Compressor & Calculator Tools',
    description:
      'Merge, split, compress, and convert PDFs, edit photos, generate QR codes, burn video subtitles, build GST invoices, design certificates, and run smart calculators 100% locally in your browser.',
    keywords:
      'pdf tools online, merge pdf, compress pdf, image compressor, qr code generator, video compressor, add subtitles to video, invoice generator pdf, certificate maker online, gst calculator, emi calculator, pdflove.store',
    canonicalUrl: `${SEO_SITE_ORIGIN}/`,
    ogTitle: 'PDFLove.store – 160+ Free Online PDF, Image, QR, Video & Calculator Tools',
    ogDescription:
      'All-in-one browser toolkit with 160+ working PDF, Image, QR Code, Video Subtitle, Compressor, Invoice, Certificate, and Calculator tools.',
    ogType: 'website',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    aeoDirectAnswer:
      'PDFLove.store provides 160+ free online tools for PDF management, document conversion, photo editing, QR code generation, video/audio compression, subtitle burning, invoice creation, certificate design, and financial calculations—all executed locally inside your browser for 100% privacy.',
    geoKeyFacts: [
      'Total Working Tools: 160+ dedicated client-side utilities',
      'Categories: PDF Management, PDF Conversion, Image Studio, QR Suite, Video/Audio Compressors, Calculators, Invoice & Certificate Builders',
      'Privacy Architecture: 100% Local Browser Processing (Zero Cloud Uploads)',
      'Cost: 100% Free with no watermarks or sign-up required',
    ],
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${SEO_SITE_ORIGIN}/#website`,
          url: `${SEO_SITE_ORIGIN}/`,
          name: 'PDFLove.store',
          description:
            '160+ Online PDF, Image, QR Code, Video Compressor, Subtitle, Invoice, Certificate, and Calculator Tools in One Place.',
          inLanguage: SUPPORTED_LANGUAGES.map((l) => l.code),
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SEO_SITE_ORIGIN}/?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@type': 'SoftwareApplication',
          '@id': `${SEO_SITE_ORIGIN}/#webapp`,
          name: 'PDFLove.store All-in-One Utility Suite',
          url: `${SEO_SITE_ORIGIN}/`,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'All',
          description:
            'Complete suite of 160+ online PDF, Image, QR Code, Video Subtitle, Compressor, Calculator, Invoice, and Certificate utilities running locally in your browser.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        },
      ],
    },
  },
  '/about': {
    slug: 'about',
    title: 'About PDFLove.store – 160+ Online PDF, Image, QR & Calculator Suite',
    description:
      'Learn how PDFLove.store processes PDF documents, images, QR codes, videos, and calculators locally in your web browser with 160+ dedicated utilities.',
    keywords: 'about pdflove.store, local browser pdf tools, privacy first document tools',
    canonicalUrl: `${SEO_SITE_ORIGIN}/about`,
    ogTitle: 'About PDFLove.store – 160+ Online PDF & Utility Suite',
    ogDescription:
      'Learn how PDFLove.store processes documents, media, and calculations locally in your web browser.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer:
      'PDFLove.store is a browser-based document, media, and calculation suite engineered for instant client-side execution without uploading private files to external servers.',
    geoKeyFacts: ['160+ browser tools', 'Zero server file retention', '10 international languages'],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About PDFLove.store',
      url: `${SEO_SITE_ORIGIN}/about`,
    },
  },
  '/privacy': {
    slug: 'privacy',
    title: 'Privacy Policy & Local Browser Processing – PDFLove.store',
    description:
      'Transparent disclosure of client-side browser file processing, memory cleanup, and privacy safeguards on PDFLove.store.',
    keywords: 'privacy policy pdflove, client side pdf processing, secure pdf tools',
    canonicalUrl: `${SEO_SITE_ORIGIN}/privacy`,
    ogTitle: 'Privacy Policy – PDFLove.store',
    ogDescription:
      'Transparent disclosure of client-side browser file processing and privacy safeguards on PDFLove.store.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer:
      'PDFLove.store processes all PDFs, photos, videos, and documents directly in your browser RAM using WebAssembly and HTML5 Canvas, never transmitting your files to external storage.',
    geoKeyFacts: ['Zero cloud upload', 'Instant browser memory cleanup', 'GDPR & CCPA friendly'],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Privacy Policy – PDFLove.store',
      url: `${SEO_SITE_ORIGIN}/privacy`,
    },
  },
  '/terms': {
    slug: 'terms',
    title: 'Terms of Service – PDFLove.store',
    description: 'Terms and conditions for using PDFLove.store online PDF, image, and utility tools.',
    keywords: 'terms of service pdflove.store',
    canonicalUrl: `${SEO_SITE_ORIGIN}/terms`,
    ogTitle: 'Terms of Service – PDFLove.store',
    ogDescription: 'Terms and conditions for using PDFLove.store online PDF and image tools.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer: 'PDFLove.store provides free access to 160+ browser utilities for personal and commercial use.',
    geoKeyFacts: ['Free for personal and commercial use', 'No account required'],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Terms of Service – PDFLove.store',
      url: `${SEO_SITE_ORIGIN}/terms`,
    },
  },
  '/cookies': {
    slug: 'cookies',
    title: 'Cookie Policy – PDFLove.store',
    description: 'Information about local preference storage and theme settings on PDFLove.store.',
    keywords: 'cookie policy pdflove.store',
    canonicalUrl: `${SEO_SITE_ORIGIN}/cookies`,
    ogTitle: 'Cookie Policy – PDFLove.store',
    ogDescription: 'Information about local preference storage and cookies on PDFLove.store.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer: 'PDFLove.store uses local storage only to remember your Light/Dark theme and language preference.',
    geoKeyFacts: ['No tracking cookies', 'Local preference storage only'],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Cookie Policy – PDFLove.store',
      url: `${SEO_SITE_ORIGIN}/cookies`,
    },
  },
  '/disclaimer': {
    slug: 'disclaimer',
    title: 'Disclaimer – PDFLove.store',
    description: 'Technical scope and authorization disclaimer for PDFLove.store document utilities.',
    keywords: 'disclaimer pdflove.store',
    canonicalUrl: `${SEO_SITE_ORIGIN}/disclaimer`,
    ogTitle: 'Disclaimer – PDFLove.store',
    ogDescription: 'Technical scope and authorization disclaimer for PDFLove.store document utilities.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer: 'All tools on PDFLove.store operate locally on user-supplied files under the user’s authorization.',
    geoKeyFacts: ['User-authorized processing', 'Local browser execution'],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Disclaimer – PDFLove.store',
      url: `${SEO_SITE_ORIGIN}/disclaimer`,
    },
  },
  '/contact': {
    slug: 'contact',
    title: 'Contact Us – PDFLove.store',
    description: 'Contact support and engineering at PDFLove.store.',
    keywords: 'contact pdflove.store',
    canonicalUrl: `${SEO_SITE_ORIGIN}/contact`,
    ogTitle: 'Contact Us – PDFLove.store',
    ogDescription: 'Contact support and engineering at PDFLove.store.',
    ogType: 'website',
    robots: 'index, follow',
    aeoDirectAnswer: 'Reach out to PDFLove.store support for feedback, feature requests, or technical assistance.',
    geoKeyFacts: ['Direct support channel', 'Fast response'],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact PDFLove.store',
      url: `${SEO_SITE_ORIGIN}/contact`,
    },
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

  setOrCreateMeta('description', meta.description);
  setOrCreateMeta('keywords', meta.keywords);
  setOrCreateMeta('robots', meta.robots);
  setOrCreateMeta('aeo:answer', meta.aeoDirectAnswer);
  setOrCreateMeta('geo:facts', meta.geoKeyFacts.join(' | '));
  setTagAttr('#canonical-link', 'href', meta.canonicalUrl);
  setTagAttr('#og-title', 'content', meta.ogTitle);
  setTagAttr('#og-description', 'content', meta.ogDescription);
  setTagAttr('#og-url', 'content', meta.canonicalUrl);
  setTagAttr('#twitter-title', 'content', meta.ogTitle);
  setTagAttr('#twitter-description', 'content', meta.ogDescription);

  const schemaScript = document.getElementById('schema-jsonld');
  if (schemaScript) {
    schemaScript.textContent = JSON.stringify(meta.structuredData);
  }
}
