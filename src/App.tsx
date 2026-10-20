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
  CheckCircle2,
  Lock,
  Cpu,
  Menu,
  X,
  Loader2,
  QrCode,
  Minimize2,
  Film,
  Calculator,
} from 'lucide-react';
import { TOOLS_CATALOG, ToolDefinition, FilterTag } from './data/toolsCatalog';
import {
  LanguageCode,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
} from './data/translations';
import { ToolWorkspaceView } from './components/ToolWorkspaceView';
import { InfoAndSeoPages } from './components/InfoAndSeoPages';
import { applySeoConfigToHead } from './seoConfig';
import { Analytics } from '@vercel/analytics/react';

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
      {/* Top thin progress bar */}
      <div className="w-full h-1 bg-slate-200/60 dark:bg-slate-800/60 overflow-hidden">
        <div
          className="h-full bg-rose-600 transition-transform duration-150 origin-left"
          style={{ transform: `scaleX(${Math.max(0.08, Math.min(1, progress / 100))})` }}
        />
      </div>

      {/* Subtle floating progress indicator card */}
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

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [lang, setLang] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('pdflove_lang') as LanguageCode;
    return SUPPORTED_LANGUAGES.some((l) => l.code === saved) ? saved : 'en';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('pdflove_theme') === 'dark';
  });
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [pendingHeroFile, setPendingHeroFile] = useState<File | null>(null);
  const [globalLoading, setGlobalLoading] = useState<{
    active: boolean;
    label: string;
    progress: number;
  }>({ active: false, label: '', progress: 0 });

  const heroFileInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Sync dark mode class on <html> and <body>
  useEffect(() => {
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
  }, [darkMode]);

  // Persist language preference
  useEffect(() => {
    localStorage.setItem('pdflove_lang', lang);
  }, [lang]);

  // Listen to browser Back / Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    setMobileMenuOpen(false);
    setShowSuggestions(false);
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

    // Trigger brief initializing progress indicator when opening a tool workspace to prevent UI flicker
    if (path.startsWith('/tools/')) {
      setGlobalLoading({ active: true, label: 'Initializing workspace...', progress: 45 });
      setTimeout(() => {
        setGlobalLoading((prev) => (prev.progress === 45 ? { active: false, label: '', progress: 0 } : prev));
      }, 180);
    }

    window.history.pushState({}, '', path);
    setCurrentPath(path);
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

  // Background SEO Title, Meta Description, Canonical URL, and JSON-LD Schema updates via src/seoConfig.ts
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

  const popularTools = useMemo(() => TOOLS_CATALOG.filter((item) => item.popular), []);
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

  const renderCategoryIcon = (tag: FilterTag) => {
    switch (tag) {
      case 'Image':
        return <ImageIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'Convert':
        return <ArrowRightLeft className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'Security':
        return <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'QR':
        return <QrCode className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'Compress':
        return <Minimize2 className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'Media':
        return <Film className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'Calculator':
        return <Calculator className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'Utility':
        return <Wrench className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
      default:
        return <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
    }
  };

  // Clean, simple Tool Card with Icon, Name, and Short Description only
  const ToolCard: React.FC<{ tool: ToolDefinition }> = ({ tool }) => (
    <a
      href={`/tools/${tool.slug}`}
      onClick={(e) => {
        e.preventDefault();
        navigateTo(`/tools/${tool.slug}`);
      }}
      className="group flex items-start gap-3.5 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-rose-500 dark:hover:border-rose-500 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
    >
      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 shrink-0 mt-0.5">
        {renderCategoryIcon(tool.filterTag)}
      </div>
      <div className="min-w-0">
        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors mb-1">
          {tool.name}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
          {tool.shortDesc}
        </p>
      </div>
    </a>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <GlobalLoadingOverlay
        active={globalLoading.active}
        label={globalLoading.label}
        progress={globalLoading.progress}
      />

      {/* Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Custom Multi-Layer Vector Brand Logo */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/');
            }}
            className="group flex items-center gap-3 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-9 h-9 shrink-0" viewBox="0 0 44 44" aria-hidden="true">
                <defs>
                  <linearGradient id="pdflove-brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FB7185" />
                    <stop offset="45%" stopColor="#E11D48" />
                    <stop offset="100%" stopColor="#9F1239" />
                  </linearGradient>
                </defs>
                <rect width="44" height="44" rx="11" fill="url(#pdflove-brand-grad)" />
                {/* Precision Document Page Frame */}
                <path
                  d="M13 8.5h11.5l7.5 7.5v17.5a2.5 2.5 0 0 1-2.5 2.5h-16.5a2.5 2.5 0 0 1-2.5-2.5v-22.5a2.5 2.5 0 0 1 2.5-2.5z"
                  fill="#ffffff"
                  fillOpacity="0.14"
                  stroke="#ffffff"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                {/* Folded Corner */}
                <path
                  d="M24.5 8.5v7.5h7.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Vector Heart Core */}
                <path
                  d="M21 29.8c-3.1-2.1-5-3.9-5-5.9 0-1.5 1.1-2.7 2.6-2.7.9 0 1.8.5 2.4 1.2.6-.7 1.5-1.2 2.4-1.2 1.5 0 2.6 1.2 2.6 2.7 0 2-1.9 3.8-5 5.9z"
                  fill="#ffffff"
                />
                {/* Micro QR/Utility Accent Dots */}
                <circle cx="15.5" cy="14" r="1.1" fill="#ffffff" />
                <circle cx="19" cy="14" r="1.1" fill="#ffffff" fillOpacity="0.75" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-tight">
                PDF<span className="text-rose-600 dark:text-rose-500">Love</span>
                <span className="text-slate-500 dark:text-slate-400 font-semibold text-sm">.store</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                {TOOLS_CATALOG.length}+ Pro Tools
              </span>
            </div>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="/#directory"
              onClick={(e) => {
                e.preventDefault();
                setActiveFilter('ALL');
                navigateTo('/#directory');
              }}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navAllTools}
            </a>
            <a
              href="/#pdf-management"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/#pdf-management');
              }}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navPdfTools}
            </a>
            <a
              href="/#image-tools"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/#image-tools');
              }}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navImageTools}
            </a>
            <a
              href="/#qr-tools"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/#qr-tools');
              }}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              QR Tools
            </a>
            <a
              href="/#media-compressors"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/#media-compressors');
              }}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Compressors &amp; Video
            </a>
            <a
              href="/#calculators"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/#calculators');
              }}
              className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Calculators
            </a>
          </nav>

          {/* Zone 3: Language & Theme Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4 text-slate-500 hidden sm:inline" />
              <label htmlFor="lang-select" className="sr-only">
                Select Language
              </label>
              <select
                id="lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value as LanguageCode)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
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
              className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
            >
              <button
                type="button"
                onClick={() => setDarkMode(false)}
                aria-pressed={!darkMode}
                title="Switch to Light Theme"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                title="Switch to Dark Theme"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
              className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3 text-sm">
            <div className="flex flex-col space-y-2.5 font-medium">
              <a
                href="/#directory"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/#directory');
                }}
              >
                {t.navAllTools}
              </a>
              <a
                href="/#pdf-management"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/#pdf-management');
                }}
              >
                {t.navPdfTools}
              </a>
              <a
                href="/#image-tools"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/#image-tools');
                }}
              >
                {t.navImageTools}
              </a>
              <a
                href="/#qr-tools"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/#qr-tools');
                }}
              >
                QR Code Tools
              </a>
              <a
                href="/#media-compressors"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/#media-compressors');
                }}
              >
                Video, Subtitles &amp; Compressors
              </a>
              <a
                href="/#calculators"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/#calculators');
                }}
              >
                Calculators
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Router */}
      <main className="flex-1">
        {activeTool ? (
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
        ) : currentPath !== '/' ? (
          <InfoAndSeoPages pagePath={currentPath} onNavigate={navigateTo} />
        ) : (
          /* ================= HOMEPAGE ================= */
          <div>
            {/* 1. Hero Section with Functional Search & File Picker */}
            <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-12 sm:py-16 px-4 sm:px-6">
              <div className="max-w-4xl mx-auto text-center">
                <h1
                  className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4"
                  style={{ textWrap: 'balance' }}
                >
                  {t.heroTitle}
                </h1>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                  {t.heroSubtitle}
                </p>

                {/* Functional Tool Search Box */}
                <div className="relative max-w-2xl mx-auto mb-8 text-left">
                  <div className="relative flex items-center">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
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
                      className="w-full pl-12 pr-24 py-4 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white dark:focus:bg-slate-800"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Live Search Suggestions Dropdown */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-20 divide-y divide-slate-100 dark:divide-slate-800">
                      {searchSuggestions.map((sug) => (
                        <button
                          key={sug.slug}
                          type="button"
                          onMouseDown={() => navigateTo(`/tools/${sug.slug}`)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-4 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {renderCategoryIcon(sug.filterTag)}
                            <div className="truncate">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {sug.name}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                                — {sug.shortDesc}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Primary & Secondary Hero Actions */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <a
                    href="#directory"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {t.ctaExploreTools}
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
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-rose-500 text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-4 h-4 text-rose-600" />
                    {t.ctaChooseFile}
                  </label>
                </div>
              </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-16">
              {/* 2. Popular Tools Section */}
              {!searchQuery && activeFilter === 'ALL' && (
                <section aria-labelledby="popular-heading">
                  <div className="mb-6">
                    <h2
                      id="popular-heading"
                      className="text-2xl font-bold text-slate-900 dark:text-white"
                    >
                      {t.popularToolsHeading}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {popularTools.map((tool) => (
                      <ToolCard key={tool.slug} tool={tool} />
                    ))}
                  </div>
                </section>
              )}

              {/* 3. Interactive Filter Bar & All Tools Directory */}
              <section id="directory" aria-labelledby="directory-heading" className="scroll-mt-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h2
                      id="directory-heading"
                      className="text-2xl font-bold text-slate-900 dark:text-white"
                    >
                      {t.navAllTools} ({TOOLS_CATALOG.length})
                    </h2>
                  </div>

                  {/* Interactive Filter Controls */}
                  <div
                    role="tablist"
                    aria-label="Filter tools by category"
                    className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-xl"
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
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          activeFilter === tab.id
                            ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtered Grid or Categorized Grid */}
                {(searchQuery.trim() !== '' || activeFilter !== 'ALL') ? (
                  filteredTools.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredTools.map((tool) => (
                        <ToolCard key={tool.slug} tool={tool} />
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <p className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                        No tools matched "{searchQuery}"
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setActiveFilter('ALL');
                        }}
                        className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Show All Tools
                      </button>
                    </div>
                  )
                ) : (
                  <div className="space-y-12">
                    {/* PDF Management Tools */}
                    <div id="pdf-management" className="scroll-mt-20">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        {t.pdfManagementHeading}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {pdfManagementTools.map((tool) => (
                          <ToolCard key={tool.slug} tool={tool} />
                        ))}
                      </div>
                    </div>

                    {/* PDF Conversion Tools */}
                    <div id="conversion-tools" className="scroll-mt-20">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        {t.pdfConversionHeading}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {pdfConversionTools.map((tool) => (
                          <ToolCard key={tool.slug} tool={tool} />
                        ))}
                      </div>
                    </div>

                    {/* Image & Photo Tools */}
                    <div id="image-tools" className="scroll-mt-20">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        {t.imageToolsHeading}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {imageTools.map((tool) => (
                          <ToolCard key={tool.slug} tool={tool} />
                        ))}
                      </div>
                    </div>

                    {/* QR Code Suite */}
                    <div id="qr-tools" className="scroll-mt-20">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        QR Code Generators (Wi-Fi, UPI, WhatsApp, vCard, Location &amp; Bulk QR)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {qrTools.map((tool) => (
                          <ToolCard key={tool.slug} tool={tool} />
                        ))}
                      </div>
                    </div>

                    {/* Video, Subtitle, Audio & File Compressors */}
                    <div id="media-compressors" className="scroll-mt-20">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        Video Subtitle Studio, Video Compressor, Audio Compressor &amp; File Compressors
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {mediaCompressorTools.map((tool) => (
                          <ToolCard key={tool.slug} tool={tool} />
                        ))}
                      </div>
                    </div>

                    {/* Smart Calculators */}
                    <div id="calculators" className="scroll-mt-20">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        Smart Calculators (GST, EMI Loan, Age, BMI, SIP, Salary &amp; Unit Converters)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {calculatorTools.map((tool) => (
                          <ToolCard key={tool.slug} tool={tool} />
                        ))}
                      </div>
                    </div>

                    {/* Document Templates & Utilities */}
                    <div id="document-utilities" className="scroll-mt-20">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        {t.documentUtilitiesHeading} (Invoice Builder, Certificate Demo, Resume, ID Card &amp; More)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {documentUtilityTools.map((tool) => (
                          <ToolCard key={tool.slug} tool={tool} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* 4. Why Use PDFLove.store */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-200 dark:border-slate-800">
                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <Cpu className="w-7 h-7 text-rose-600 mb-3" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Fast Browser Processing
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Merge, split, compress, and convert your PDFs and images directly in your browser without waiting for remote server queues.
                  </p>
                </div>

                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <Lock className="w-7 h-7 text-rose-600 mb-3" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Private &amp; Safe
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Your documents are processed locally on your device and are never saved in browser storage or shared externally.
                  </p>
                </div>

                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-7 h-7 text-rose-600 mb-3" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Works on Every Device
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Designed for mobile phones, tablets, laptops, and desktop computers with support for 10 international languages.
                  </p>
                </div>
              </section>

              {/* 5. How It Works Section */}
              <section
                id="how-it-works"
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 scroll-mt-20"
              >
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  {t.howItWorksTitle}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <div className="text-xs font-mono font-bold text-rose-600 mb-1">01</div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                      Choose a Tool
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Pick any PDF or image tool from the directory or use the search bar above.
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-rose-600 mb-1">02</div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                      Select Your File
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Upload your PDF, Office document, or photo directly from your device.
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-rose-600 mb-1">03</div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                      Adjust Options
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Configure page numbers, rotation, quality, or format settings as needed.
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-rose-600 mb-1">04</div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                      Download Result
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Click Start Processing to immediately process and download your finished file.
                    </p>
                  </div>
                </div>
              </section>

              {/* 6. Frequently Asked Questions */}
              <section id="faq" className="scroll-mt-20">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  {t.faqTitle}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                      Are my PDF and image files kept private?
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Yes. PDFLove.store processes your files directly inside your web browser so your documents stay on your device.
                    </p>
                  </div>
                  <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                      How do I merge or compress PDF files?
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Open Merge PDF or Compress PDF, select your files, and click Start Processing. Your processed PDF will download automatically.
                    </p>
                  </div>
                  <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                      Can I use PDFLove.store on mobile phones?
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Yes. All tools work smoothly on Android, iPhone, iPad, Mac, and Windows browsers without installing any software.
                    </p>
                  </div>
                  <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                      Which formats are supported?
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      We support PDF, Word (DOCX), Excel (XLSX), PowerPoint (PPTX), CSV, HTML, TXT, Markdown, EPUB, JPG, PNG, WebP, MP4, WebM, WAV, MP3, SRT, VTT, and ZIP files.
                    </p>
                  </div>
                </div>
              </section>

              {/* 7. Complete SEO, AEO & GEO Knowledge Directory for Search Engines */}
              <section
                aria-labelledby="seo-directory-heading"
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6"
              >
                <div>
                  <h2
                    id="seo-directory-heading"
                    className="text-lg font-bold text-slate-900 dark:text-white mb-2"
                  >
                    PDFLove.store — All-in-One Online PDF, Image, QR, Video Compressor, Invoice, Certificate &amp; Calculator Suite ({TOOLS_CATALOG.length} Tools)
                  </h2>
                  <p id="aeo-direct-answer" className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    PDFLove.store is a complete client-side browser platform offering {TOOLS_CATALOG.length} free online utilities across PDF Management, Document Conversion, Photo Editing, QR Code Generation, Video &amp; Audio Compression, Video Subtitle Burning, Printable Invoice &amp; Certificate Builders, and Financial/Academic Calculators. Every tool has its own dedicated URL, structured Schema.org metadata, direct answer summary, and instant local browser processing.
                  </p>
                </div>

                {/* Crawlable Internal Link Index of All 160 Tools */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                    Complete Index of All {TOOLS_CATALOG.length} Online Tools (Direct Links)
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
                    {TOOLS_CATALOG.map((tool) => (
                      <a
                        key={tool.slug}
                        href={`/tools/${tool.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigateTo(`/tools/${tool.slug}`);
                        }}
                        className="text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:underline"
                      >
                        {tool.name}
                      </a>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10 text-sm">
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
                  PDF<span className="text-rose-600 dark:text-rose-500">Love</span>.store
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.footerRights}
              </p>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
                Popular PDF Tools
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                {['merge-pdf', 'split-pdf', 'compress-pdf', 'pdf-to-word', 'word-to-pdf', 'add-page-numbers'].map(
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
                Image &amp; Document Tools
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                {[
                  'jpg-to-pdf',
                  'pdf-to-jpg',
                  'compress-image',
                  'resize-image',
                  'create-pdf-invoice',
                  'generate-qr-code',
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
                    href="/cookies"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('/cookies');
                    }}
                    className="hover:text-rose-600"
                  >
                    Cookie Policy
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
                    className="hover:text-rose-600"
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} PDFLove.store. All rights reserved.
          </div>
        </div>
      </footer>
      <Analytics />
    </div>
  );
}
