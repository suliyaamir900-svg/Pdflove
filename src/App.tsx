import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  FileText,
  Image as ImageIcon,
  ArrowRightLeft,
  Shield,
  Wrench,
  Sun,
  Moon,
  Globe,
  Upload,
  Menu,
  X,
  Loader2,
  QrCode,
  Minimize2,
  Film,
  Calculator,
  Award,
  Receipt,
  ArrowUpRight,
  Flame,
  Activity,
} from 'lucide-react';
import { TOOLS_CATALOG, ToolDefinition, FilterTag } from './data/toolsCatalog';
import {
  LanguageCode,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
} from './data/translations';
import { AdSenseSlot } from './components/AdSenseSlot';
import { applySeoConfigToHead, resolveSeoConfigForPath } from './seoConfig';
import { BEYOND_SEO_VERSION } from './beyondSeoEngine';
import {
  getToolUsageCounts,
  getToolUsageCount,
  formatToolUsageLabel,
  getMostPopularToolSlugs,
  TOOL_USAGE_UPDATED_EVENT,
  TOOL_USAGE_STORAGE_KEY,
  ToolUsageCountsMap,
} from './services/toolUsageTracker';

const ToolWorkspaceView = React.lazy(() =>
  import('./components/ToolWorkspaceView').then((m) => ({ default: m.ToolWorkspaceView }))
);
const InfoAndSeoPages = React.lazy(() =>
  import('./components/InfoAndSeoPages').then((m) => ({ default: m.InfoAndSeoPages }))
);

interface GlobalLoadingOverlayProps {
  active: boolean;
  label: string;
  progress: number;
}

const GlobalLoadingOverlay: React.FC<GlobalLoadingOverlayProps> = ({ active, label, progress }) => {
  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between"
    >
      <div className="w-full h-1 bg-slate-200/60 dark:bg-slate-800/60 overflow-hidden">
        <div
          className="h-full bg-rose-600 transition-transform duration-150 origin-left"
          style={{ transform: `scaleX(${Math.max(0.08, Math.min(1, progress / 100))})` }}
        />
      </div>

      <div className="self-center mb-6 px-4 py-2.5 bg-slate-900/95 dark:bg-slate-800/95 text-white rounded-xl shadow-lg border border-slate-700/80 flex items-center gap-3 text-xs font-medium backdrop-blur-xs">
        <Loader2 className="w-4 h-4 text-rose-500 animate-spin shrink-0" />
        <span>{label || 'Initializing tool...'}</span>
        {progress > 0 && (
          <span className="font-mono tabular-nums text-slate-300">{progress}%</span>
        )}
      </div>
    </div>
  );
};

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center">
          <div className="max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Workspace Ready
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Click below to return to the main tools dashboard.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/';
              }}
              className="px-5 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [lang, setLang] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('pdflove_lang') as LanguageCode;
      return SUPPORTED_LANGUAGES.some((l) => l.code === saved) ? saved : 'en';
    } catch {
      return 'en';
    }
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pdflove_theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('q') || '';
    } catch {
      return '';
    }
  });
  const [activeFilter, setActiveFilter] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('category') || 'ALL';
    } catch {
      return 'ALL';
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [pendingHeroFile, setPendingHeroFile] = useState<File | null>(null);
  const [globalLoading, setGlobalLoading] = useState<{
    active: boolean;
    label: string;
    progress: number;
  }>({ active: false, label: '', progress: 0 });
  const [toolUsageCounts, setToolUsageCounts] = useState<ToolUsageCountsMap>(() =>
    getToolUsageCounts()
  );

  const heroFileInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Listen for localStorage tool usage counter updates across workspace & tabs
  useEffect(() => {
    const handleUsageUpdated = (e: Event) => {
      const customEvt = e as CustomEvent<ToolUsageCountsMap>;
      if (customEvt.detail && typeof customEvt.detail === 'object') {
        setToolUsageCounts({ ...customEvt.detail });
      } else {
        setToolUsageCounts(getToolUsageCounts());
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === TOOL_USAGE_STORAGE_KEY) {
        setToolUsageCounts(getToolUsageCounts());
      }
    };
    window.addEventListener(TOOL_USAGE_UPDATED_EVENT, handleUsageUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(TOOL_USAGE_UPDATED_EVENT, handleUsageUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Sync dark mode class on <html> and <body>
  useEffect(() => {
    try {
      const root = document.documentElement;
      if (darkMode) {
        root.classList.add('dark');
        document.body.classList.add('dark');
        root.style.colorScheme = 'dark';
        localStorage.setItem('pdflove_theme', 'dark');
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
        root.style.colorScheme = 'light';
        localStorage.setItem('pdflove_theme', 'light');
      }
    } catch {
      // ignore storage errors on restricted mobile browsers
    }
  }, [darkMode]);

  // Persist language preference
  useEffect(() => {
    try {
      localStorage.setItem('pdflove_lang', lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  // Listen to browser Back / Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      try {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('category');
        if (cat) setActiveFilter(cat);
      } catch {
        // ignore
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    setMobileMenuOpen(false);
    setShowSuggestions(false);
    if (path.startsWith('/?category=')) {
      const cat = decodeURIComponent(path.replace('/?category=', ''));
      setActiveFilter(cat || 'ALL');
      window.history.pushState({}, '', path);
      setCurrentPath('/');
      setTimeout(() => {
        document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
      return;
    }
    if (path.startsWith('/#')) {
      if (currentPath !== '/') {
        window.history.pushState({}, '', '/');
        setCurrentPath('/');
        setTimeout(() => {
          const id = path.slice(2);
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      } else {
        const id = path.slice(2);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (path.startsWith('/tools/')) {
      setGlobalLoading({ active: true, label: 'Opening tool...', progress: 50 });
      setTimeout(() => {
        setGlobalLoading((prev) =>
          prev.progress === 50 ? { active: false, label: '', progress: 0 } : prev
        );
      }, 150);
    }

    window.history.pushState({}, '', path);
    setCurrentPath(path.split('?')[0] || '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Resolve active tool if path is /tools/:slug
  const activeTool: ToolDefinition | undefined = useMemo(() => {
    if (currentPath.startsWith('/tools/')) {
      const slug = currentPath.replace('/tools/', '').replace(/\/+$/, '');
      return TOOLS_CATALOG.find((item) => item.slug === slug);
    }
    return undefined;
  }, [currentPath]);

  // Background SEO Title, Meta Description, Canonical URL, and JSON-LD Schema updates
  useEffect(() => {
    applySeoConfigToHead(currentPath, lang);
  }, [currentPath, lang]);

  // Filtered tools for search and category tabs
  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TOOLS_CATALOG.filter((tool) => {
      const matchesFilter =
        activeFilter === 'ALL' ||
        tool.category === activeFilter ||
        tool.filterTag.toLowerCase() === activeFilter.toLowerCase();

      if (!matchesFilter) return false;
      if (!q) return true;

      return (
        tool.name.toLowerCase().includes(q) ||
        tool.slug.toLowerCase().includes(q) ||
        tool.shortDesc.toLowerCase().includes(q) ||
        String(tool.number) === q ||
        tool.aliases.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, activeFilter]);

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TOOLS_CATALOG.filter((tool) => tool.popular).slice(0, 6);
    return TOOLS_CATALOG.filter(
      (tool) =>
        tool.name.toLowerCase().includes(q) ||
        tool.shortDesc.toLowerCase().includes(q) ||
        tool.aliases.some((a) => a.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [searchQuery]);

  const mostPopularSlugs = useMemo(
    () => getMostPopularToolSlugs(TOOLS_CATALOG, toolUsageCounts, 8),
    [toolUsageCounts]
  );

  const totalUserToolUses = useMemo(
    () =>
      Object.values(toolUsageCounts).reduce(
        (sum, val) => sum + (typeof val === 'number' && val > 0 ? val : 0),
        0
      ),
    [toolUsageCounts]
  );

  const popularTools = useMemo(() => {
    const candidates = TOOLS_CATALOG.filter(
      (item) => item.popular || getToolUsageCount(item.slug, toolUsageCounts) > 0
    );
    return [...candidates]
      .sort((a, b) => {
        const countA = getToolUsageCount(a.slug, toolUsageCounts);
        const countB = getToolUsageCount(b.slug, toolUsageCounts);
        if (countB !== countA) return countB - countA;
        if (Boolean(a.popular) !== Boolean(b.popular)) return a.popular ? -1 : 1;
        return a.number - b.number;
      })
      .slice(0, 16);
  }, [toolUsageCounts]);
  const pdfManagementTools = useMemo(
    () => TOOLS_CATALOG.filter((item) => item.category === 'pdf-management'),
    []
  );
  const pdfConversionTools = useMemo(
    () => TOOLS_CATALOG.filter((item) => item.category === 'pdf-conversion'),
    []
  );
  const imageTools = useMemo(
    () => TOOLS_CATALOG.filter((item) => item.category === 'image-tools'),
    []
  );
  const qrTools = useMemo(
    () => TOOLS_CATALOG.filter((item) => item.category === 'qr-tools'),
    []
  );
  const mediaCompressorTools = useMemo(
    () => TOOLS_CATALOG.filter((item) => item.category === 'media-compressors'),
    []
  );
  const calculatorTools = useMemo(
    () => TOOLS_CATALOG.filter((item) => item.category === 'calculators'),
    []
  );
  const documentUtilityTools = useMemo(
    () => TOOLS_CATALOG.filter((item) => item.category === 'document-utilities'),
    []
  );

  // Handle "Choose a File" on Homepage Hero: load file into state and open matching tool
  const handleHeroFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingHeroFile(f);
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') navigateTo('/tools/compress-pdf');
    else if (ext === 'jpg' || ext === 'jpeg') navigateTo('/tools/jpg-to-pdf');
    else if (ext === 'png') navigateTo('/tools/png-to-pdf');
    else if (ext === 'webp') navigateTo('/tools/webp-to-pdf');
    else if (ext === 'docx') navigateTo('/tools/word-to-pdf');
    else if (ext === 'xlsx' || ext === 'xls') navigateTo('/tools/excel-to-pdf');
    else if (ext === 'pptx') navigateTo('/tools/powerpoint-to-pdf');
    else if (ext === 'csv') navigateTo('/tools/csv-to-pdf');
    else if (['mp4', 'webm', 'mov'].includes(ext)) navigateTo('/tools/video-compressor');
    else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) navigateTo('/tools/audio-compressor');
    else if (ext === 'zip') navigateTo('/tools/unzip-archive-extractor');
    else navigateTo('/tools/zip-file-compressor');
  };

  const getCategoryStyle = (tag: FilterTag) => {
    switch (tag) {
      case 'Image':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900/50',
          icon: <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />,
        };
      case 'Convert':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/50 border-purple-100 dark:border-purple-900/50',
          icon: <ArrowRightLeft className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />,
        };
      case 'Security':
        return {
          bg: 'bg-teal-50 dark:bg-teal-950/50 border-teal-100 dark:border-teal-900/50',
          icon: <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />,
        };
      case 'QR':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/50',
          icon: <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
        };
      case 'Compress':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900/50',
          icon: <Minimize2 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
        };
      case 'Media':
        return {
          bg: 'bg-orange-50 dark:bg-orange-950/50 border-orange-100 dark:border-orange-900/50',
          icon: <Film className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />,
        };
      case 'Calculator':
        return {
          bg: 'bg-sky-50 dark:bg-sky-950/50 border-sky-100 dark:border-sky-900/50',
          icon: <Calculator className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />,
        };
      case 'Utility':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-100 dark:border-rose-900/50',
          icon: <Wrench className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
        };
      default:
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-100 dark:border-rose-900/50',
          icon: <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
        };
    }
  };

  // Modern, High-Contrast Responsive Tool Card for Phone & PC with LocalStorage Usage Counter & 'Most Popular' Badge
  const ToolCard: React.FC<{ tool: ToolDefinition }> = ({ tool }) => {
    const style = getCategoryStyle(tool.filterTag);
    const usageCount = getToolUsageCount(tool.slug, toolUsageCounts);
    const isMostPopular = mostPopularSlugs.has(tool.slug);

    return (
      <a
        href={`/tools/${tool.slug}`}
        onClick={(e) => {
          e.preventDefault();
          navigateTo(`/tools/${tool.slug}`);
        }}
        className={`group relative flex items-start gap-3.5 p-4 sm:p-5 bg-white dark:bg-slate-900/95 border rounded-2xl hover:border-rose-500 dark:hover:border-rose-500 shadow-2xs hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
          isMostPopular
            ? 'border-amber-300/90 dark:border-amber-700/70'
            : 'border-slate-200/90 dark:border-slate-800'
        }`}
      >
        <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${style.bg}`}>
          {style.icon}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors leading-snug mb-1">
                {tool.name}
              </h3>
              <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-rose-500 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 mb-2.5">
              {tool.shortDesc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {isMostPopular && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/70">
                <Flame className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                <span>Most Popular</span>
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono tabular-nums ${
                usageCount > 0
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/70'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'
              }`}
              title={`You have used ${tool.name} ${usageCount} ${usageCount === 1 ? 'time' : 'times'}`}
            >
              <Activity className="w-3 h-3 shrink-0" />
              <span>{formatToolUsageLabel(usageCount)}</span>
            </span>
          </div>
        </div>
      </a>
    );
  };

  return (
    <AppErrorBoundary>
      <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <GlobalLoadingOverlay
          active={globalLoading.active}
          label={globalLoading.label}
          progress={globalLoading.progress}
        />

        {/* Header Navigation (Optimized for Mobile Phones & PC) */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-6">
            {/* Zone 1: Custom Multi-Layer Vector Brand Logo */}
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/');
              }}
              className="group flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
            >
              <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                <svg className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" viewBox="0 0 44 44" aria-hidden="true">
                  <defs>
                    <linearGradient id="pdflove-brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FB7185" />
                      <stop offset="45%" stopColor="#E11D48" />
                      <stop offset="100%" stopColor="#9F1239" />
                    </linearGradient>
                  </defs>
                  <rect width="44" height="44" rx="11" fill="url(#pdflove-brand-grad)" />
                  <path
                    d="M13 8.5h11.5l7.5 7.5v17.5a2.5 2.5 0 0 1-2.5 2.5h-16.5a2.5 2.5 0 0 1-2.5-2.5v-22.5a2.5 2.5 0 0 1 2.5-2.5z"
                    fill="#ffffff"
                    fillOpacity="0.14"
                    stroke="#ffffff"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M24.5 8.5v7.5h7.5"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 29.8c-3.1-2.1-5-3.9-5-5.9 0-1.5 1.1-2.7 2.6-2.7.9 0 1.8.5 2.4 1.2.6-.7 1.5-1.2 2.4-1.2 1.5 0 2.6 1.2 2.6 2.7 0 2-1.9 3.8-5 5.9z"
                    fill="#ffffff"
                  />
                  <circle cx="15.5" cy="14" r="1.1" fill="#ffffff" />
                  <circle cx="19" cy="14" r="1.1" fill="#ffffff" fillOpacity="0.75" />
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base sm:text-lg font-extrabold tracking-tight">
                  PDF<span className="text-rose-600 dark:text-rose-500">Love</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                  www.pdflove.store · Nexify
                </span>
              </div>
            </a>

            {/* Zone 2: Desktop Navigation Links */}
            <nav
              aria-label="Primary Navigation"
              className="hidden lg:flex items-center gap-5 text-xs xl:text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              <a
                href="/#directory"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveFilter('ALL');
                  navigateTo('/#directory');
                }}
                className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap"
              >
                {t.navAllTools}
              </a>
              <a
                href="/#pdf-management"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/#pdf-management');
                }}
                className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap"
              >
                {t.navPdfTools}
              </a>
              <a
                href="/#image-tools"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/#image-tools');
                }}
                className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap"
              >
                {t.navImageTools}
              </a>
              <a
                href="/#qr-tools"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/#qr-tools');
                }}
                className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap"
              >
                QR Suite
              </a>
              <a
                href="/#media-compressors"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/#media-compressors');
                }}
                className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap"
              >
                Video &amp; Compressors
              </a>
              <a
                href="/#calculators"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/#calculators');
                }}
                className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap"
              >
                Calculators
              </a>
            </nav>

            {/* Zone 3: Language & Theme Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <div className="flex items-center">
                <Globe className="w-4 h-4 text-slate-500 hidden sm:inline mr-1" />
                <label htmlFor="lang-select" className="sr-only">
                  Select Language
                </label>
                <select
                  id="lang-select"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as LanguageCode)}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer max-w-[92px] sm:max-w-none"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Segmented Light / Dark Mode Switcher */}
              <div
                role="group"
                aria-label="Theme Switcher"
                className="inline-flex items-center p-0.5 sm:p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setDarkMode(false)}
                  aria-pressed={!darkMode}
                  title="Light Theme"
                  className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    !darkMode
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sun className={`w-3.5 h-3.5 ${!darkMode ? 'text-amber-500' : ''}`} />
                  <span className="hidden sm:inline">Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDarkMode(true)}
                  aria-pressed={darkMode}
                  title="Dark Theme"
                  className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    darkMode
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Moon className={`w-3.5 h-3.5 ${darkMode ? 'text-rose-400' : ''}`} />
                  <span className="hidden sm:inline">Dark</span>
                </button>
              </div>

              <button
                type="button"
                aria-label="Toggle Navigation Menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile & Tablet Drawer Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-2 text-sm shadow-lg">
              <div className="grid grid-cols-2 gap-2 font-semibold">
                <a
                  href="/#directory"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveFilter('ALL');
                    navigateTo('/#directory');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200"
                >
                  {t.navAllTools} ({TOOLS_CATALOG.length})
                </a>
                <a
                  href="/#pdf-management"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('/#pdf-management');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200"
                >
                  {t.navPdfTools}
                </a>
                <a
                  href="/#image-tools"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('/#image-tools');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200"
                >
                  {t.navImageTools}
                </a>
                <a
                  href="/#qr-tools"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('/#qr-tools');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200"
                >
                  QR Code Suite
                </a>
                <a
                  href="/#media-compressors"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('/#media-compressors');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200"
                >
                  Video &amp; Compressors
                </a>
                <a
                  href="/#calculators"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('/#calculators');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200"
                >
                  Smart Calculators
                </a>
                <a
                  href="/tools/create-pdf-certificate"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('/tools/create-pdf-certificate');
                  }}
                  className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                >
                  Certificate Studio
                </a>
                <a
                  href="/tools/create-pdf-invoice"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('/tools/create-pdf-invoice');
                  }}
                  className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                >
                  Invoice Builder
                </a>
                <a
                  href="/tools/watermark-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('/tools/watermark-pdf');
                  }}
                  className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                >
                  Watermark PDF Studio
                </a>
                <a
                  href="/tools/pdf-to-all-images"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('/tools/pdf-to-all-images');
                  }}
                  className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                >
                  PDF to Image Studio
                </a>
              </div>
            </div>
          )}
        </header>

        {/* Main Content Router */}
        <main className="flex-1">
          {activeTool ? (
            <React.Suspense
              fallback={
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                  <div className="mb-8">
                    <span className="inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mb-3">
                      {activeTool.category}
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
                      {activeTool.name}
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl">
                      {activeTool.shortDesc}
                    </p>
                  </div>
                  <div className="min-h-[380px] rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-8 flex flex-col items-center justify-center text-center animate-pulse">
                    <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 mb-4" />
                    <div className="h-5 w-56 bg-slate-200 dark:bg-slate-800 rounded-lg mb-2" />
                    <div className="h-3.5 w-72 bg-slate-100 dark:bg-slate-800/70 rounded-lg" />
                  </div>
                </div>
              }
            >
              <ToolWorkspaceView
                tool={activeTool}
                t={t}
                onNavigate={navigateTo}
                initialFile={pendingHeroFile}
                onClearInitialFile={() => setPendingHeroFile(null)}
                onGlobalLoadingChange={(active, label = '', progress = 0) =>
                  setGlobalLoading({ active, label, progress })
                }
              />
            </React.Suspense>
          ) : currentPath !== '/' ? (
            <React.Suspense
              fallback={
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 min-h-[60vh] animate-pulse">
                  <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl mb-4" />
                  <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800/70 rounded-lg mb-8" />
                  <div className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
                </div>
              }
            >
              <InfoAndSeoPages pagePath={currentPath} onNavigate={navigateTo} />
            </React.Suspense>
          ) : (
            /* ================= HOMEPAGE ================= */
            <div>
              {/* 1. Modern Hero Section with Search, Quick File Upload & Instant Studio Shortcuts */}
              <section className="relative bg-gradient-to-b from-rose-50/70 via-white to-slate-50 dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800 py-10 sm:py-16 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold tracking-wide uppercase text-rose-600 dark:text-rose-400 mb-3">
                    <span>PDFLove (www.pdflove.store)</span>
                    <span aria-hidden="true">·</span>
                    <span>{TOOLS_CATALOG.length}+ Free Online Tools</span>
                    <span aria-hidden="true">·</span>
                    <span>Copyright by Nexify</span>
                  </div>

                  <h1
                    className="text-2xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3.5 sm:mb-4 leading-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    {t.heroTitle}
                  </h1>
                  <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed">
                    {t.heroSubtitle}
                  </p>

                  {/* Functional Tool Search Box */}
                  <div className="relative max-w-2xl mx-auto mb-6 sm:mb-8 text-left">
                    <div className="relative flex items-center">
                      <Search className="w-5 h-5 text-rose-500 absolute left-4 pointer-events-none" />
                      <input
                        type="search"
                        aria-label={t.searchPlaceholder}
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSuggestions(true);
                        }}
                        className="w-full pl-12 pr-20 py-3.5 sm:py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700/90 rounded-2xl text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-rose-500 dark:focus:border-rose-500 transition-colors"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Live Search Suggestions Dropdown */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-20 divide-y divide-slate-100 dark:divide-slate-800">
                        {searchSuggestions.map((sug) => {
                          const sugStyle = getCategoryStyle(sug.filterTag);
                          return (
                            <button
                              key={sug.slug}
                              type="button"
                              onMouseDown={() => navigateTo(`/tools/${sug.slug}`)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-3 cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-1.5 rounded-lg border ${sugStyle.bg}`}>
                                  {sugStyle.icon}
                                </div>
                                <div className="truncate">
                                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {sug.name}
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 hidden sm:inline">
                                    — {sug.shortDesc}
                                  </span>
                                </div>
                              </div>
                              <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Primary & Secondary Hero Actions */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                    <a
                      href="#directory"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-5 sm:px-6 py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-xs transition-all whitespace-nowrap"
                    >
                      {t.ctaExploreTools} ({TOOLS_CATALOG.length})
                    </a>

                    <input
                      ref={heroFileInputRef}
                      type="file"
                      onChange={handleHeroFilePicked}
                      className="sr-only"
                      id="hero-quick-file"
                    />
                    <label
                      htmlFor="hero-quick-file"
                      className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-rose-500 active:scale-[0.98] text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl cursor-pointer transition-all whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{t.ctaChooseFile}</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => navigateTo('/tools/watermark-pdf')}
                      className="inline-flex items-center gap-2 px-4 sm:px-5 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-rose-600 active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl cursor-pointer transition-all whitespace-nowrap"
                    >
                      <Shield className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Watermark PDF Studio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo('/tools/generate-qr-code')}
                      className="inline-flex items-center gap-2 px-4 sm:px-5 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-rose-500 active:scale-[0.98] text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl cursor-pointer transition-all whitespace-nowrap"
                    >
                      <QrCode className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>All-in-One QR Studio (13 Types)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo('/tools/pdf-to-all-images')}
                      className="inline-flex items-center gap-2 px-4 sm:px-5 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-rose-500 active:scale-[0.98] text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl cursor-pointer transition-all whitespace-nowrap"
                    >
                      <ImageIcon className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>PDF ↔ Image Studio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo('/tools/create-pdf-invoice')}
                      className="inline-flex items-center gap-2 px-4 sm:px-5 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-rose-500 active:scale-[0.98] text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl cursor-pointer transition-all whitespace-nowrap"
                    >
                      <Receipt className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Shop &amp; Job Invoice Studio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo('/tools/create-pdf-certificate')}
                      className="inline-flex items-center gap-2 px-4 sm:px-5 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-rose-500 active:scale-[0.98] text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl cursor-pointer transition-all whitespace-nowrap"
                    >
                      <Award className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Multi-Sign Certificate</span>
                    </button>
                  </div>
                </div>
              </section>

              <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-12 space-y-12 sm:space-y-16">
                {/* 2. Popular Tools Section */}
                {!searchQuery && activeFilter === 'ALL' && (
                  <section aria-labelledby="popular-heading">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-6">
                      <div className="flex items-center gap-2.5">
                        <h2
                          id="popular-heading"
                          className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white"
                        >
                          {t.popularToolsHeading}
                        </h2>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/70">
                          <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          <span>Most Popular</span>
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <Activity className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>
                          Your Total Tool Uses:{' '}
                          <strong className="font-mono text-slate-900 dark:text-white">
                            {totalUserToolUses.toLocaleString()}
                          </strong>
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                      {popularTools.map((tool) => (
                        <ToolCard key={tool.slug} tool={tool} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Google AdSense Responsive Horizontal Banner Slot */}
                <AdSenseSlot slotId="home-top-banner" format="horizontal" />

                {/* 3. Interactive Filter Bar & All Tools Directory */}
                <section id="directory" aria-labelledby="directory-heading" className="scroll-mt-20">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h2
                        id="directory-heading"
                        className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white"
                      >
                        {t.navAllTools} ({TOOLS_CATALOG.length})
                      </h2>
                    </div>

                    {/* Interactive Filter Controls (Smooth Horizontal Scroll on Mobile, Wrap on Desktop) */}
                    <div
                      role="tablist"
                      aria-label="Filter tools by category"
                      className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-xl overflow-x-auto max-w-full"
                    >
                      {[
                        { id: 'ALL', label: t.filterAll },
                        { id: 'PDF', label: 'PDF' },
                        { id: 'Image', label: t.filterImage },
                        { id: 'QR', label: 'QR Codes' },
                        { id: 'Compress', label: 'Compressors' },
                        { id: 'Media', label: 'Video & Subtitles' },
                        { id: 'Calculator', label: 'Calculators' },
                        { id: 'Convert', label: t.filterConvert },
                        { id: 'Utility', label: 'Templates & Invoice' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={activeFilter === tab.id}
                          onClick={() => setActiveFilter(tab.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            activeFilter === tab.id
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtered Grid or Categorized Grid */}
                  {searchQuery.trim() !== '' || activeFilter !== 'ALL' ? (
                    filteredTools.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                        {filteredTools.map((tool) => (
                          <ToolCard key={tool.slug} tool={tool} />
                        ))}
                      </div>
                    ) : (
                      <div className="p-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <p className="text-base font-bold text-slate-900 dark:text-white mb-3">
                          No tools matched "{searchQuery}"
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setActiveFilter('ALL');
                          }}
                          className="px-5 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Show All {TOOLS_CATALOG.length} Tools
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="space-y-10 sm:space-y-12">
                      {/* PDF Management Tools */}
                      <div id="pdf-management" className="scroll-mt-20">
                        <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mb-3.5 sm:mb-4">
                          {t.pdfManagementHeading}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                          {pdfManagementTools.map((tool) => (
                            <ToolCard key={tool.slug} tool={tool} />
                          ))}
                        </div>
                      </div>

                      {/* PDF Conversion Tools */}
                      <div id="conversion-tools" className="scroll-mt-20">
                        <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mb-3.5 sm:mb-4">
                          {t.pdfConversionHeading}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                          {pdfConversionTools.map((tool) => (
                            <ToolCard key={tool.slug} tool={tool} />
                          ))}
                        </div>
                      </div>

                      {/* Image & Photo Tools */}
                      <div id="image-tools" className="scroll-mt-20">
                        <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mb-3.5 sm:mb-4">
                          {t.imageToolsHeading}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                          {imageTools.map((tool) => (
                            <ToolCard key={tool.slug} tool={tool} />
                          ))}
                        </div>
                      </div>

                      {/* QR Code Suite */}
                      <div id="qr-tools" className="scroll-mt-20">
                        <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mb-3.5 sm:mb-4">
                          QR Code Suite (Wi-Fi, UPI, WhatsApp, vCard, Location &amp; Bulk QR)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                          {qrTools.map((tool) => (
                            <ToolCard key={tool.slug} tool={tool} />
                          ))}
                        </div>
                      </div>

                      {/* Video, Subtitle, Audio & File Compressors */}
                      <div id="media-compressors" className="scroll-mt-20">
                        <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mb-3.5 sm:mb-4">
                          Video Subtitle Studio, Video Compressor, Audio Compressor &amp; File Compressors
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                          {mediaCompressorTools.map((tool) => (
                            <ToolCard key={tool.slug} tool={tool} />
                          ))}
                        </div>
                      </div>

                      {/* Smart Calculators */}
                      <div id="calculators" className="scroll-mt-20">
                        <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mb-3.5 sm:mb-4">
                          Smart Calculators (GST, EMI Loan, Age, BMI, SIP, Salary &amp; Unit Converters)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                          {calculatorTools.map((tool) => (
                            <ToolCard key={tool.slug} tool={tool} />
                          ))}
                        </div>
                      </div>

                      {/* Document Templates & Utilities */}
                      <div id="document-utilities" className="scroll-mt-20">
                        <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mb-3.5 sm:mb-4">
                          {t.documentUtilitiesHeading} (Invoice Builder, Multi-Signature Certificate, Resume &amp; ID Card)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                          {documentUtilityTools.map((tool) => (
                            <ToolCard key={tool.slug} tool={tool} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* Google AdSense Video & Multi-Format Ad Unit + Bottom Multiplex Slot */}
                <AdSenseSlot slotId="home-video-outstream" format="video" />
                <AdSenseSlot slotId="home-bottom-banner" format="autorelaxed" />

                {/* Complete On-Page SEO, AEO (Answer Engine Optimization) & GEO (Generative Engine) Authority & FAQ Hub */}
                <section
                  id="seo-aeo-geo-hub"
                  aria-labelledby="seo-hub-heading"
                  itemScope
                  itemType="https://schema.org/FAQPage"
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-8 space-y-8 shadow-2xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1.5">
                        <span>PDFLove (www.pdflove.store)</span>
                        <span aria-hidden="true">·</span>
                        <span>Copyright by Nexify</span>
                        <span aria-hidden="true">·</span>
                        <span>SEO • AEO • GEO Verified</span>
                      </div>
                      <h2
                        id="seo-hub-heading"
                        className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white"
                      >
                        Why PDFLove (www.pdflove.store) is the #1 All-in-One Online PDF, Image, QR &amp; Document Suite
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateTo('/contact')}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer shrink-0 self-start lg:self-center"
                    >
                      Send Support Query or Ad Inquiry →
                    </button>
                  </div>

                  {/* AEO Direct Answer & GEO Key Facts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 space-y-3">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        Direct Answer Summary (AEO &amp; Voice Search Optimized)
                      </h3>
                      <p
                        id="aeo-direct-answer"
                        className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                      >
                        <strong>PDFLove (www.pdflove.store)</strong> — <strong>Copyright by Nexify</strong> — is a 100% free, client-side online document and media suite offering <strong>{TOOLS_CATALOG.length} working tools</strong> for merging, splitting, compressing, watermarking, and converting PDFs, converting PDFs to all image formats (JPG, PNG, WebP, SVG, BMP, TIFF, AVIF, GIF, ICO), generating 13 types of QR codes (URL, Wi-Fi, UPI Payment, WhatsApp, vCard, Location, Event), designing 5-signature certificates, creating live-preview GST shop and job invoices, and running financial calculators on mobile phones, tablets, and desktop PCs with zero server file uploads.
                      </p>
                      <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>Coverage: All 28 Indian States &amp; 190+ Countries</span>
                        <span aria-hidden="true">·</span>
                        <span>Languages: 15 Global &amp; Regional Languages</span>
                        <span aria-hidden="true">·</span>
                        <span>Privacy: 100% Local Browser RAM Execution</span>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 space-y-2.5">
                      <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                        GEO Key Citation Facts (AI &amp; Search Engines)
                      </h3>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                        <li>
                          <strong>100% Free Forever:</strong> All {TOOLS_CATALOG.length} tools work with zero watermarks, zero sign-ups, and unlimited downloads.
                        </li>
                        <li>
                          <strong>Flagship Interactive Studios:</strong> Watermark PDF Studio, PDF ↔ All Images Studio, 13-in-1 QR Code Studio, 5-Signature Certificate Maker, and 2-Column Live GST Shop &amp; Job Invoice Builder.
                        </li>
                        <li>
                          <strong>Zero Cloud Upload Privacy:</strong> Files are processed locally using WebAssembly, PDF-Lib, PDF.js, and HTML5 Canvas.
                        </li>
                        <li>
                          <strong>Universal Compatibility:</strong> Works seamlessly on Android, iPhone, iPad, Windows PC, Mac, and Linux browsers.
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Schema.org FAQPage Structured Questions & Answers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {[
                      {
                        q: 'Which is the best free website to merge, compress, watermark, and convert PDFs online?',
                        a: `PDFLove (www.pdflove.store), Copyright by Nexify, offers ${TOOLS_CATALOG.length} free online PDF, Image, QR Code, Video, Certificate, and GST Invoice tools that run directly in your browser without watermarks or file uploads.`,
                      },
                      {
                        q: 'Are my PDF documents, photos, and GST invoices safe on www.pdflove.store?',
                        a: 'Yes, 100% safe. Every tool on PDFLove executes locally inside your device browser memory (WebAssembly & HTML5 Canvas). Your files never leave your phone or computer.',
                      },
                      {
                        q: 'Can I create a PDF certificate with multiple signatures or a shop GST invoice with live preview?',
                        a: 'Yes! Use our Multi-Signature Certificate Studio (/tools/create-pdf-certificate) for up to 5 signatures and our Shop & Job GST Invoice Studio (/tools/create-pdf-invoice) with real-time side-by-side A4 preview.',
                      },
                      {
                        q: 'How can I convert a PDF to all image formats or generate UPI, Wi-Fi, and WhatsApp QR codes?',
                        a: 'Open the PDF to All Image Formats Studio (/tools/pdf-to-all-images) to export pages as JPG, PNG, WebP, SVG, TIFF, BMP, AVIF, GIF, or ICO, or open the All-in-One QR Studio (/tools/generate-qr-code) for 13 QR payload types.',
                      },
                    ].map((faq, idx) => (
                      <div
                        key={idx}
                        itemScope
                        itemProp="mainEntity"
                        itemType="https://schema.org/Question"
                        className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                      >
                        <h3
                          itemProp="name"
                          className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white"
                        >
                          {faq.q}
                        </h3>
                        <div
                          itemScope
                          itemProp="acceptedAnswer"
                          itemType="https://schema.org/Answer"
                        >
                          <p
                            itemProp="text"
                            className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                          >
                            {faq.a}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Crawler Complete Directory Links (Indexed by Search Engines) */}
                  <div className="sr-only" aria-hidden="false">
                    <ul>
                      {TOOLS_CATALOG.map((tool) => (
                        <li key={tool.slug}>
                          <a href={`/tools/${tool.slug}`}>{tool.name} — {tool.shortDesc}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              </div>
            </div>
          )}
        </main>

        {/* Clean Responsive Footer */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 text-sm">
              <div>
                <div className="flex items-center gap-2.5 font-extrabold text-base text-slate-900 dark:text-white mb-3">
                  <svg className="w-7 h-7 shrink-0" viewBox="0 0 44 44" aria-hidden="true">
                    <rect width="44" height="44" rx="11" fill="#E11D48" />
                    <path
                      d="M13 8.5h11.5l7.5 7.5v17.5a2.5 2.5 0 0 1-2.5 2.5h-16.5a2.5 2.5 0 0 1-2.5-2.5v-22.5a2.5 2.5 0 0 1 2.5-2.5z"
                      fill="#ffffff"
                      fillOpacity="0.14"
                      stroke="#ffffff"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M24.5 8.5v7.5h7.5"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 29.8c-3.1-2.1-5-3.9-5-5.9 0-1.5 1.1-2.7 2.6-2.7.9 0 1.8.5 2.4 1.2.6-.7 1.5-1.2 2.4-1.2 1.5 0 2.6 1.2 2.6 2.7 0 2-1.9 3.8-5 5.9z"
                      fill="#ffffff"
                    />
                  </svg>
                  <span>
                    PDF<span className="text-rose-600 dark:text-rose-500">Love</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                  {t.footerRights}
                </p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Copyright by <span className="text-rose-600 dark:text-rose-400 font-extrabold">Nexify</span>
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
                  Popular PDF Tools
                </h3>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  {['merge-pdf', 'split-pdf', 'compress-pdf', 'watermark-pdf', 'pdf-to-all-images', 'pdf-to-word'].map(
                    (slug) => {
                      const item = TOOLS_CATALOG.find((x) => x.slug === slug);
                      if (!item) return null;
                      return (
                        <li key={slug}>
                          <a
                            href={`/tools/${slug}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigateTo(`/tools/${slug}`);
                            }}
                            className="hover:text-rose-600 transition-colors"
                          >
                            {item.name}
                          </a>
                        </li>
                      );
                    }
                  )}
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
                  Studios &amp; Utilities
                </h3>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  {[
                    'create-pdf-certificate',
                    'create-pdf-invoice',
                    'generate-qr-code',
                    'video-compressor',
                    'add-subtitles-video',
                    'gst-calculator-india',
                  ].map((slug) => {
                    const item = TOOLS_CATALOG.find((x) => x.slug === slug);
                    if (!item) return null;
                    return (
                      <li key={slug}>
                        <a
                          href={`/tools/${slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigateTo(`/tools/${slug}`);
                          }}
                          className="hover:text-rose-600 transition-colors"
                        >
                          {item.name}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
                  Company &amp; Legal
                </h3>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    <a
                      href="/about"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo('/about');
                      }}
                      className="hover:text-rose-600"
                    >
                      About Us
                    </a>
                  </li>
                  <li>
                    <a
                      href="/privacy"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo('/privacy');
                      }}
                      className="hover:text-rose-600"
                    >
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a
                      href="/cookies"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo('/cookies');
                      }}
                      className="hover:text-rose-600"
                    >
                      Cookie &amp; AdSense Policy
                    </a>
                  </li>
                  <li>
                    <a
                      href="/terms"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo('/terms');
                      }}
                      className="hover:text-rose-600"
                    >
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a
                      href="/disclaimer"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo('/disclaimer');
                      }}
                      className="hover:text-rose-600"
                    >
                      Disclaimer
                    </a>
                  </li>
                  <li>
                    <a
                      href="/contact"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo('/contact');
                      }}
                      className="hover:text-rose-600 font-semibold text-rose-600 dark:text-rose-400"
                    >
                      Contact Us &amp; Send Query
                    </a>
                  </li>
                  <li>
                    <a
                      href="/contact"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo('/contact');
                      }}
                      className="hover:text-rose-600 font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Advertise &amp; Business Inquiry
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Quick Category & Studio Bar */}
            <div className="mb-8 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: `All ${TOOLS_CATALOG.length} Tools`, action: () => navigateTo('/#directory') },
                  { label: 'Watermark PDF Studio', action: () => navigateTo('/tools/watermark-pdf') },
                  { label: 'PDF to All Images', action: () => navigateTo('/tools/pdf-to-all-images') },
                  { label: 'Shop & Job GST Invoice', action: () => navigateTo('/tools/create-pdf-invoice') },
                  { label: 'Multi-Sign Certificate', action: () => navigateTo('/tools/create-pdf-certificate') },
                  { label: 'Merge PDF', action: () => navigateTo('/tools/merge-pdf') },
                  { label: 'Compress PDF', action: () => navigateTo('/tools/compress-pdf') },
                  { label: '13-in-1 QR Studio', action: () => navigateTo('/tools/generate-qr-code') },
                  { label: 'GST Calculator', action: () => navigateTo('/tools/gst-calculator-india') },
                ].map((btn, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={btn.action}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-rose-600 hover:text-white active:scale-[0.98] text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
              >
                ↑ Back to Top
              </button>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                © {new Date().getFullYear()} <span className="font-extrabold text-slate-900 dark:text-white">PDFLove</span> (<a href="https://www.pdflove.store" className="underline hover:text-rose-600">www.pdflove.store</a>) — <span className="text-rose-600 dark:text-rose-400 font-extrabold">Copyright by Nexify</span>. All rights reserved.
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                100% Free Client-Side PDF, Image, QR, Certificate &amp; GST Invoice Suite
              </div>
              <span className="sr-only">
                BeyondSEO v{BEYOND_SEO_VERSION} • Page SEO: {resolveSeoConfigForPath(currentPath).canonicalUrl}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </AppErrorBoundary>
  );
}
