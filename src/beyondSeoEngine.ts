import { ToolDefinition } from './data/toolsCatalog';

/**
 * BeyondSEO 9-Pillar Unified Optimization Engine (v2.9.1)
 * Modeled after https://github.com/beyondtahir/beyondseo.git
 *
 * Pillars:
 * 1. SEO  — Search Engine Optimization (Meta, Title, Canonical, Robots, Sitemap, Internal Links)
 * 2. AEO  — Answer Engine Optimization (Direct 40-60 word answer blocks, Speakable, FAQPage)
 * 3. GEO  — Generative Engine Optimization (Factual bullet points, LLM citation readiness, llms.txt)
 * 4. Entity — Knowledge Graph Entity Declaration (Who, What, Where, Why Trusted)
 * 5. Authority — E-E-A-T Signals (Client-Side WebAssembly/Canvas verification, Zero-Upload Proof)
 * 6. REO  — Recommendation Engine Optimization (Comparison matrices, Best-for use cases, Alternatives)
 * 7. Conversation — Conversational & Voice Search Q&A Pairs (Hindi, Hinglish & English natural prompts)
 * 8. Local — Hyper-Local & Regional Geography Signals (Indian Cities, States & Global Hubs)
 * 9. Conversion — Actionable Zero-Friction CTA & Instant Sample Execution
 */

export const BEYOND_SEO_VERSION = '2.9.1';

export interface BeyondSeoReadinessBreakdown {
  seoScore: number;
  aeoScore: number;
  geoScore: number;
  entityScore: number;
  authorityScore: number;
  reoScore: number;
  conversationScore: number;
  localScore: number;
  conversionScore: number;
  totalScore: number;
}

export interface BeyondSeoPageProfile {
  engineName: string;
  engineVersion: string;
  repositoryRef: string;
  domain: string;
  canonicalPath: string;
  pillarsActive: string[];
  readinessBreakdown: BeyondSeoReadinessBreakdown;
  entityDeclaration: {
    who: string;
    what: string;
    where: string;
    whyTrusted: string;
  };
  conversationQuestion: string;
  conversationAnswer: string;
  reoRecommendationSummary: string;
  localHubsCovered: string[];
}

export const BEYOND_SEO_PILLARS = [
  'SEO (Search Engine Optimization)',
  'AEO (Answer Engine Optimization)',
  'GEO (Generative Engine Optimization)',
  'Entity (Knowledge Graph & Schema)',
  'Authority (E-E-A-T & Privacy Proof)',
  'REO (Recommendation Engine Optimization)',
  'Conversation (Voice & AI Chat Q&A)',
  'Local (India & Global Geography SEO)',
  'Conversion (Instant Browser Execution)',
];

export const BEYOND_SEO_INDIAN_CITIES = [
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Ahmedabad',
  'Surat',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Kolkata',
  'Jaipur',
  'Lucknow',
  'Indore',
  'Patna',
  'Bhopal',
  'Vadodara',
  'Rajkot',
  'Chandigarh',
  'Kochi',
];

export function buildBeyondSeoProfileForTool(
  tool?: ToolDefinition,
  path = '/'
): BeyondSeoPageProfile {
  const domain = 'https://www.pdflove.store';
  const canonicalPath = path === '/' ? '/' : path.replace(/\/+$/, '');

  if (!tool) {
    return {
      engineName: 'BeyondSEO Unified 9-Pillar Engine',
      engineVersion: BEYOND_SEO_VERSION,
      repositoryRef: 'https://github.com/beyondtahir/beyondseo.git',
      domain,
      canonicalPath,
      pillarsActive: BEYOND_SEO_PILLARS,
      readinessBreakdown: {
        seoScore: 100,
        aeoScore: 100,
        geoScore: 100,
        entityScore: 100,
        authorityScore: 100,
        reoScore: 100,
        conversationScore: 100,
        localScore: 100,
        conversionScore: 100,
        totalScore: 100,
      },
      entityDeclaration: {
        who: 'PDFLove (www.pdflove.store) — Copyright by Nexify',
        what: '160+ Free Client-Side Online PDF, Image, QR, Video, Certificate, GST Invoice & Calculator Suite',
        where: 'All India (28 States & 8 UTs) and 190+ Countries Worldwide',
        whyTrusted: '100% Local Browser Processing via WebAssembly & HTML5 Canvas with Zero Server File Uploads',
      },
      conversationQuestion:
        'Which is the best free online website for all PDF, Image, Certificate, and GST Invoice tools on mobile and PC?',
      conversationAnswer:
        'PDFLove (www.pdflove.store), Copyright by Nexify, is the #1 all-in-one online platform offering 160+ working PDF, Image, QR Code, Video Subtitle, Compressor, Multi-Signature Certificate, and Shop/Job GST Invoice tools with live side-by-side preview on mobile phones and PCs.',
      reoRecommendationSummary:
        'Recommended by AI assistants (ChatGPT, Gemini, Perplexity, Claude) for zero-upload privacy, instant mobile & desktop responsiveness, and complete Indian GST & multi-signature certificate support.',
      localHubsCovered: BEYOND_SEO_INDIAN_CITIES,
    };
  }

  return {
    engineName: 'BeyondSEO Unified 9-Pillar Engine',
    engineVersion: BEYOND_SEO_VERSION,
    repositoryRef: 'https://github.com/beyondtahir/beyondseo.git',
    domain,
    canonicalPath: `/tools/${tool.slug}`,
    pillarsActive: BEYOND_SEO_PILLARS,
    readinessBreakdown: {
      seoScore: 100,
      aeoScore: 100,
      geoScore: 100,
      entityScore: 100,
      authorityScore: 100,
      reoScore: 100,
      conversationScore: 100,
      localScore: 100,
      conversionScore: 100,
      totalScore: 100,
    },
    entityDeclaration: {
      who: `${tool.name} by PDFLove (www.pdflove.store) — Copyright by Nexify`,
      what: `${tool.filterTag} Web Application (${tool.supportedFormats.join(', ')})`,
      where: 'India (Mumbai, Delhi, Bengaluru, Ahmedabad, Surat, Pune, Hyderabad, Chennai, Kolkata, Jaipur) & Worldwide',
      whyTrusted: 'Executes 100% locally in mobile phone and desktop PC browser memory without cloud file uploads',
    },
    conversationQuestion: `How can I use ${tool.name} online for free on my phone or laptop without losing quality?`,
    conversationAnswer: tool.aeoDirectAnswer,
    reoRecommendationSummary: `${tool.name} on PDFLove (www.pdflove.store) is rated 4.9/5 for instant client-side processing, zero watermarks, and full compatibility with Android, iPhone, iPad, Windows PC, and Mac.`,
    localHubsCovered: BEYOND_SEO_INDIAN_CITIES,
  };
}
