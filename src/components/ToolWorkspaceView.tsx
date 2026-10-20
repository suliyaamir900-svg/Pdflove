import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  Sliders,
  ShieldCheck,
  Sparkles,
  Trash2,
  HelpCircle,
  X,
  Plus,
  Award,
  Receipt,
  Subtitles,
} from 'lucide-react';
import { ToolDefinition, getToolBySlug } from '../data/toolsCatalog';
import { TranslationDictionary } from '../data/translations';
import { executeToolOperation, ProcessingResult } from '../services/documentEngine';
import { generateSampleFileForTool } from '../services/sampleGenerator';

interface ToolWorkspaceViewProps {
  tool: ToolDefinition;
  t: TranslationDictionary;
  onNavigate: (path: string) => void;
  initialFile?: File | null;
  onClearInitialFile?: () => void;
  onGlobalLoadingChange?: (active: boolean, label?: string, progressPct?: number) => void;
}

interface InvoiceRow {
  desc: string;
  qty: number;
  price: number;
}

interface SubtitleRow {
  start: number;
  end: number;
  text: string;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const ToolWorkspaceView: React.FC<ToolWorkspaceViewProps> = ({
  tool,
  t,
  onNavigate,
  initialFile,
  onClearInitialFile,
  onGlobalLoadingChange,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [secondaryFile, setSecondaryFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showQuickStart, setShowQuickStart] = useState<boolean>(true);

  // Interactive Invoice Builder rows state
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([
    { desc: 'Full-Stack Web Development & UI Design', qty: 1, price: 25000 },
    { desc: 'Technical SEO & Google Search Console Setup', qty: 1, price: 8500 },
    { desc: 'Cloud Hosting & Performance Optimization', qty: 2, price: 3500 },
  ]);

  // Interactive Video Subtitle rows state
  const [subtitleRows, setSubtitleRows] = useState<SubtitleRow[]>([
    { start: 0, end: 3, text: 'Welcome to PDFLove.store Video Studio!' },
    { start: 3, end: 7, text: 'Easily add custom subtitles & compress videos.' },
    { start: 7, end: 12, text: 'Fast, private browser-based processing.' },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);

  const isInvoiceTool = tool.slug === 'create-pdf-invoice' || tool.slug === 'quotation-estimate-maker';
  const isCertificateTool = tool.slug === 'create-pdf-certificate';
  const isSubtitleTool = tool.slug === 'add-subtitles-video' || tool.slug === 'srt-subtitle-generator';

  // Initialize default settings when tool changes
  useEffect(() => {
    const initial: Record<string, any> = {};
    tool.settings.forEach((s) => {
      initial[s.key] = s.defaultValue;
    });
    if (isInvoiceTool) {
      initial.invoiceDate = initial.invoiceDate || new Date().toISOString().slice(0, 10);
      initial.dueDate = initial.dueDate || 'Due within 15 Days';
      initial.sellerGstin = initial.sellerGstin || 'GSTIN: 27AABCU9603R1ZM';
      initial.clientGstin = initial.clientGstin || 'GSTIN: 29GGGGG1314R9Z6';
      initial.currencySymbol = initial.currencySymbol || '₹';
      initial.taxPercent = initial.taxPercent ?? 18;
      initial.discountPercent = initial.discountPercent ?? 0;
      initial.paymentNotes =
        initial.paymentNotes ||
        'Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0000123 | UPI: merchant@upi';
    }
    if (isCertificateTool) {
      initial.orgName = initial.orgName || 'PDFLove Academy & Certification Board';
      initial.certId = initial.certId || 'CERT-2026-8841';
      initial.certTheme = initial.certTheme || 'rose';
    }
    setSettings(initial);
    if (initialFile) {
      setFiles([initialFile]);
      onClearInitialFile?.();
    } else {
      setFiles([]);
    }
    setSecondaryFile(null);
    setErrorMsg(null);
    setResult(null);
    setProgress(0);
    setProgressStage('');
    setShowQuickStart(true);
  }, [tool.slug]);

  // Sync interactive invoice rows into settings.itemsList
  useEffect(() => {
    if (isInvoiceTool) {
      const serialized = invoiceRows
        .map((r) => `${r.desc || 'Item'} | ${r.qty} | ${r.price}`)
        .join('\n');
      setSettings((prev) => ({ ...prev, itemsList: serialized }));
    }
  }, [invoiceRows, isInvoiceTool]);

  // Sync interactive subtitle rows into settings.subtitleScript / settings.cues
  useEffect(() => {
    if (isSubtitleTool) {
      const serialized = subtitleRows
        .map((r) => `${r.start} - ${r.end} | ${r.text}`)
        .join('\n');
      setSettings((prev) => ({
        ...prev,
        subtitleScript: serialized,
        cues: serialized,
      }));
    }
  }, [subtitleRows, isSubtitleTool]);

  // Manage object URL lifecycle cleanly
  useEffect(() => {
    if (!result) {
      setDownloadUrl(null);
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setDownloadUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      if (result.previewImageUrl) {
        URL.revokeObjectURL(result.previewImageUrl);
      }
    };
  }, [result]);

  const triggerBrowserDownload = (blob: Blob, filename: string) => {
    const tempUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = tempUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(tempUrl), 4000);
  };

  const handleFilesSelected = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    setErrorMsg(null);
    setResult(null);
    const list = Array.from(incoming);
    const oversized = list.find((f) => f.size > 150 * 1024 * 1024);
    if (oversized) {
      setErrorMsg(`File "${oversized.name}" exceeds the 150 MB browser memory limit.`);
      return;
    }
    if (tool.multipleFiles) {
      setFiles((prev) => [...prev, ...list]);
    } else {
      setFiles([list[0]]);
    }
  };

  const runProcessingWithFiles = async (targetFiles: File[]) => {
    setErrorMsg(null);
    setResult(null);
    setIsProcessing(true);
    setProgress(10);
    setProgressStage('Initializing...');
    onGlobalLoadingChange?.(true, `Running ${tool.name}...`, 10);

    try {
      const res = await executeToolOperation(tool, targetFiles, secondaryFile, settings, (pct, stage) => {
        setProgress(pct);
        setProgressStage(stage);
        onGlobalLoadingChange?.(true, stage, pct);
      });
      setProgress(100);
      setProgressStage('Complete');
      setResult(res);
      triggerBrowserDownload(res.blob, res.filename);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'Could not process this file. Please check that you selected a valid file format.'
      );
    } finally {
      setIsProcessing(false);
      onGlobalLoadingChange?.(false);
    }
  };

  const handleLoadSampleAndRun = async () => {
    try {
      setErrorMsg(null);
      setResult(null);
      const sample = await generateSampleFileForTool(tool.slug, tool.acceptMime);
      let loadedFiles = [sample];
      if (tool.multipleFiles && (tool.slug === 'merge-pdf' || tool.slug === 'photo-collage-grid-maker')) {
        const sample2 = await generateSampleFileForTool(tool.slug, tool.acceptMime);
        loadedFiles = [sample, sample2];
      }
      setFiles(loadedFiles);
      await runProcessingWithFiles(loadedFiles);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not generate sample file.');
    }
  };

  const handlePrimaryActionButton = async () => {
    if (tool.requiresFileUpload && files.length === 0) {
      fileInputRef.current?.click();
      return;
    }
    await runProcessingWithFiles(files);
  };

  const totalInputBytes = files.reduce((acc, f) => acc + f.size, 0);

  // Invoice live math
  const invSubtotal = invoiceRows.reduce((sum, r) => sum + (Number(r.qty) || 0) * (Number(r.price) || 0), 0);
  const invDiscountPct = Number(settings.discountPercent) || 0;
  const invDiscountAmt = invSubtotal * (invDiscountPct / 100);
  const invTaxable = Math.max(0, invSubtotal - invDiscountAmt);
  const invTaxPct = Number(settings.taxPercent) || 0;
  const invTaxAmt = invTaxable * (invTaxPct / 100);
  const invGrandTotal = invTaxable + invTaxAmt;
  const invCurrency = String(settings.currencySymbol || '₹');

  const quickStartSteps = [
    tool.requiresFileUpload
      ? `1. Select ${tool.multipleFiles ? 'one or multiple' : 'your'} ${tool.supportedFormats.join(' / ')} file${
          tool.multipleFiles ? 's' : ''
        } (or click "Demo with Sample File").`
      : `1. Customize the ${tool.name} fields or pick a preset below.`,
    tool.settings.length > 0
      ? `2. Review or edit your ${tool.name} configuration.`
      : `2. Settings are automatically configured for best quality.`,
    `3. Click "${t.processBtn}" to process and automatically download your file.`,
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Home
        </a>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <span className="text-slate-900 dark:text-slate-200 font-medium truncate">{tool.name}</span>
      </nav>

      {/* Clean Tool Title & Description */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            {tool.name}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            {tool.shortDesc}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowQuickStart((prev) => !prev)}
          aria-expanded={showQuickStart}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start"
        >
          <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>{showQuickStart ? 'Hide Guide' : 'Quick Start'}</span>
        </button>
      </div>

      {/* Main Functional Tool Workspace */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 mb-10 shadow-xs">
        {/* Quick Start Instructional Overlay */}
        {showQuickStart && (
          <div
            role="region"
            aria-label={`Quick Start workflow for ${tool.name}`}
            className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl"
          >
            <div className="flex items-center justify-between gap-4 mb-2.5">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                  Quick Start — {tool.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickStart(false)}
                aria-label="Dismiss Quick Start overlay"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <span>Got it</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              {quickStartSteps.map((stepText, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-lg"
                >
                  {stepText}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Upload Box */}
        {tool.requiresFileUpload && (
          <div className="mb-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-500 bg-slate-50/60 dark:bg-slate-800/40'
              }`}
            >
              <Upload className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-900 dark:text-white mb-1">{t.dropzoneTitle}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                {t.supportedFormatsLabel}: {tool.supportedFormats.join(', ')}
              </p>

              <input
                ref={fileInputRef}
                type="file"
                id="primary-file-input"
                accept={tool.acceptMime}
                multiple={tool.multipleFiles}
                onChange={(e) => handleFilesSelected(e.target.files)}
                onClick={(e) => e.stopPropagation()}
                className="sr-only"
              />

              <div className="flex flex-wrap items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  {t.selectFilesBtn}
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleAndRun}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-rose-500 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-rose-600" />
                  Demo with Sample File
                </button>
              </div>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span>
                    {files.length} file{files.length > 1 ? 's' : ''} ready ({t.inputSizeLabel}:{' '}
                    <strong className="font-mono tabular-nums">{formatBytes(totalInputBytes)}</strong>)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFiles([]);
                      setResult(null);
                    }}
                    className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t.clearFilesBtn}
                  </button>
                </div>
                {files.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="flex items-center justify-between px-4 py-3 text-sm bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="truncate text-slate-800 dark:text-slate-200 font-medium">{file.name}</span>
                    </div>
                    <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 shrink-0 ml-3">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Secondary File Picker if needed */}
            {tool.secondaryFileLabel && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                <label
                  htmlFor="secondary-file-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  {tool.secondaryFileLabel}
                </label>
                <input
                  ref={secondaryInputRef}
                  id="secondary-file-input"
                  type="file"
                  accept={tool.secondaryAcceptMime}
                  onChange={(e) => setSecondaryFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-200 dark:file:bg-slate-700 file:text-slate-800 dark:file:text-slate-200"
                />
                {secondaryFile && (
                  <p className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
                    Attached: {secondaryFile.name} ({formatBytes(secondaryFile.size)})
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= SPECIAL STUDIO 1: INTERACTIVE CERTIFICATE DEMO & EDITOR ================= */}
        {isCertificateTool && (
          <div className="mb-8 space-y-6">
            {/* 1-Click Certificate Demo Templates */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Award className="w-4 h-4 text-rose-600" />
                <span>Certificate Live Demo &amp; Customizer</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  {
                    label: 'Academic Excellence Demo',
                    theme: 'royal',
                    header: 'CERTIFICATE OF EXCELLENCE',
                    org: 'National Institute of Technology & Science',
                    recipient: 'Aarav Mehta',
                    text: 'For securing First Rank with Distinction in Artificial Intelligence & Web Engineering.',
                    issuer: 'Dr. S. Radhakrishnan, Dean',
                  },
                  {
                    label: 'Course Completion Demo',
                    theme: 'emerald',
                    header: 'CERTIFICATE OF COMPLETION',
                    org: 'PDFLove Digital Academy',
                    recipient: 'Priya Sharma',
                    text: 'For successfully completing the 12-Week Masterclass in Full-Stack Development & SEO.',
                    issuer: 'Program Director',
                  },
                  {
                    label: 'Gold Award Demo',
                    theme: 'gold',
                    header: 'STAR PERFORMER AWARD',
                    org: 'Global Tech Enterprises Ltd.',
                    recipient: 'Vikramaditya Singh',
                    text: 'In recognition of outstanding leadership, innovation, and project delivery in Q3 2026.',
                    issuer: 'Chief Executive Officer',
                  },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        certTheme: preset.theme,
                        certHeader: preset.header,
                        orgName: preset.org,
                        recipientName: preset.recipient,
                        achievementText: preset.text,
                        issuerName: preset.issuer,
                      }))
                    }
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Visual Certificate Preview Box */}
            <div
              className={`relative p-6 sm:p-10 rounded-xl bg-white text-slate-900 shadow-sm border-4 ${
                settings.certTheme === 'gold'
                  ? 'border-amber-600'
                  : settings.certTheme === 'royal'
                  ? 'border-blue-700'
                  : settings.certTheme === 'emerald'
                  ? 'border-emerald-700'
                  : 'border-rose-600'
              }`}
            >
              <div className="border border-slate-300 p-6 sm:p-8 text-center space-y-3">
                <p
                  className={`text-xs font-bold tracking-widest uppercase ${
                    settings.certTheme === 'gold'
                      ? 'text-amber-700'
                      : settings.certTheme === 'royal'
                      ? 'text-blue-700'
                      : settings.certTheme === 'emerald'
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {settings.orgName || 'PDFLove Academy & Certification Board'}
                </p>
                <h3 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-serif">
                  {settings.certHeader || 'CERTIFICATE OF EXCELLENCE'}
                </h3>
                <p className="text-xs sm:text-sm italic text-slate-500">This is proudly presented to</p>
                <div
                  className={`text-2xl sm:text-4xl font-bold font-serif py-1 border-b border-slate-300 max-w-md mx-auto ${
                    settings.certTheme === 'gold'
                      ? 'text-amber-700'
                      : settings.certTheme === 'royal'
                      ? 'text-blue-700'
                      : settings.certTheme === 'emerald'
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {settings.recipientName || 'Priya Sharma'}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 max-w-xl mx-auto leading-relaxed pt-1">
                  {settings.achievementText ||
                    'For outstanding mastery in Full-Stack Web Engineering and Search Engine Optimization.'}
                </p>
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 border-t border-slate-100 mt-4">
                  <div className="text-left">
                    <div className="font-bold text-slate-900">Date: {settings.issueDate || 'October 20, 2026'}</div>
                    <div className="text-[11px] text-slate-500">ID: {settings.certId || 'CERT-2026-8841'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{settings.issuerName || 'Director of Certification'}</div>
                    <div className="text-[11px] text-slate-500">Authorized Signatory</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Certificate Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Full Name (नाम)
                </label>
                <input
                  type="text"
                  value={String(settings.recipientName || '')}
                  onChange={(e) => setSettings({ ...settings, recipientName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Organization / Institute Name
                </label>
                <input
                  type="text"
                  value={String(settings.orgName || '')}
                  onChange={(e) => setSettings({ ...settings, orgName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Certificate Title / Heading
                </label>
                <input
                  type="text"
                  value={String(settings.certHeader || '')}
                  onChange={(e) => setSettings({ ...settings, certHeader: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Border &amp; Theme Color
                </label>
                <select
                  value={String(settings.certTheme || 'rose')}
                  onChange={(e) => setSettings({ ...settings, certTheme: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="rose">Crimson Rose</option>
                  <option value="gold">Royal Gold</option>
                  <option value="royal">Academic Blue</option>
                  <option value="emerald">Emerald Green</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Achievement / Course Citation Text
                </label>
                <input
                  type="text"
                  value={String(settings.achievementText || '')}
                  onChange={(e) => setSettings({ ...settings, achievementText: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Issued By / Signatory Name
                </label>
                <input
                  type="text"
                  value={String(settings.issuerName || '')}
                  onChange={(e) => setSettings({ ...settings, issuerName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="text"
                    value={String(settings.issueDate || '')}
                    onChange={(e) => setSettings({ ...settings, issueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Certificate ID
                  </label>
                  <input
                    type="text"
                    value={String(settings.certId || '')}
                    onChange={(e) => setSettings({ ...settings, certId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SPECIAL STUDIO 2: COMPLETE EDITABLE INVOICE BUILDER ================= */}
        {isInvoiceTool && (
          <div className="mb-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Receipt className="w-4 h-4 text-rose-600" />
                <span>Complete Editable Invoice Structure</span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Live Total: {invCurrency}
                {invGrandTotal.toFixed(2)}
              </span>
            </div>

            {/* Row 1: Invoice Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Invoice / Quote #
                </label>
                <input
                  type="text"
                  value={String(settings.invoiceNumber || settings.quoteNumber || 'INV-2026-001')}
                  onChange={(e) =>
                    setSettings({ ...settings, invoiceNumber: e.target.value, quoteNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={String(settings.invoiceDate || new Date().toISOString().slice(0, 10))}
                  onChange={(e) => setSettings({ ...settings, invoiceDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Due Date / Terms
                </label>
                <input
                  type="text"
                  value={String(settings.dueDate || 'Due within 15 Days')}
                  onChange={(e) => setSettings({ ...settings, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Currency Symbol
                </label>
                <select
                  value={String(settings.currencySymbol || '₹')}
                  onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  <option value="₹">₹ (INR - Indian Rupee)</option>
                  <option value="$">$ (USD - US Dollar)</option>
                  <option value="€">€ (EUR - Euro)</option>
                  <option value="£">£ (GBP - British Pound)</option>
                </select>
              </div>
            </div>

            {/* Row 2: Seller & Buyer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-600">
                  From (Seller / Your Business)
                </div>
                <input
                  type="text"
                  placeholder="Your Company Name & Address"
                  value={String(settings.fromBusiness || settings.vendorName || '')}
                  onChange={(e) =>
                    setSettings({ ...settings, fromBusiness: e.target.value, vendorName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Seller GSTIN / PAN / Tax ID"
                  value={String(settings.sellerGstin || '')}
                  onChange={(e) => setSettings({ ...settings, sellerGstin: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-600">
                  Bill To (Client / Customer)
                </div>
                <input
                  type="text"
                  placeholder="Client Name & Billing Address"
                  value={String(settings.billTo || settings.clientName || '')}
                  onChange={(e) =>
                    setSettings({ ...settings, billTo: e.target.value, clientName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Client GSTIN / Reference"
                  value={String(settings.clientGstin || '')}
                  onChange={(e) => setSettings({ ...settings, clientGstin: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            {/* Row 3: Interactive Line Items Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-900 text-white px-4 py-2.5 grid grid-cols-12 gap-2 text-xs font-bold">
                <div className="col-span-6">Item / Service Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {invoiceRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-slate-900 grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={row.desc}
                        placeholder="Item or service description..."
                        onChange={(e) => {
                          const next = [...invoiceRows];
                          next[idx].desc = e.target.value;
                          setInvoiceRows(next);
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) => {
                          const next = [...invoiceRows];
                          next[idx].qty = parseFloat(e.target.value) || 0;
                          setInvoiceRows(next);
                        }}
                        className="w-full px-2 py-1.5 text-right font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={0}
                        value={row.price}
                        onChange={(e) => {
                          const next = [...invoiceRows];
                          next[idx].price = parseFloat(e.target.value) || 0;
                          setInvoiceRows(next);
                        }}
                        className="w-full px-2 py-1.5 text-right font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2 font-mono font-bold">
                      <span>
                        {invCurrency}
                        {(row.qty * row.price).toFixed(2)}
                      </span>
                      {invoiceRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setInvoiceRows(invoiceRows.filter((_, i) => i !== idx))}
                          aria-label="Remove item"
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setInvoiceRows([...invoiceRows, { desc: 'New Service / Product Item', qty: 1, price: 1000 }])
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
                <span className="text-xs text-slate-500">{invoiceRows.length} item(s)</span>
              </div>
            </div>

            {/* Row 4: Tax, Discount, Payment Notes & Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Bank, UPI &amp; Payment Instructions
                  </label>
                  <input
                    type="text"
                    value={String(settings.paymentNotes || '')}
                    onChange={(e) => setSettings({ ...settings, paymentNotes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={Number(settings.discountPercent ?? 0)}
                      onChange={(e) => setSettings({ ...settings, discountPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      GST / Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={Number(settings.taxPercent ?? 18)}
                      onChange={(e) => setSettings({ ...settings, taxPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                  <span>
                    {invCurrency}
                    {invSubtotal.toFixed(2)}
                  </span>
                </div>
                {invDiscountPct > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({invDiscountPct}%):</span>
                    <span>
                      -{invCurrency}
                      {invDiscountAmt.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">GST / Tax ({invTaxPct}%):</span>
                  <span>
                    +{invCurrency}
                    {invTaxAmt.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-bold text-rose-600">
                  <span>Grand Total Due:</span>
                  <span>
                    {invCurrency}
                    {invGrandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SPECIAL STUDIO 3: INTERACTIVE VIDEO SUBTITLE EDITOR ================= */}
        {isSubtitleTool && (
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Subtitles className="w-4 h-4 text-rose-600" />
                <span>Timed Video Subtitle Cues Editor</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const lastEnd = subtitleRows.length > 0 ? subtitleRows[subtitleRows.length - 1].end : 0;
                  setSubtitleRows([
                    ...subtitleRows,
                    { start: lastEnd, end: lastEnd + 4, text: 'New subtitle caption line...' },
                  ]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Subtitle Cue
              </button>
            </div>

            <div className="space-y-2">
              {subtitleRows.map((cue, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Start (s)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={cue.start}
                      onChange={(e) => {
                        const next = [...subtitleRows];
                        next[idx].start = parseFloat(e.target.value) || 0;
                        setSubtitleRows(next);
                      }}
                      className="w-full px-2 py-1 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-0.5">End (s)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={cue.end}
                      onChange={(e) => {
                        const next = [...subtitleRows];
                        next[idx].end = parseFloat(e.target.value) || 0;
                        setSubtitleRows(next);
                      }}
                      className="w-full px-2 py-1 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                    />
                  </div>
                  <div className="col-span-7">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Subtitle Caption Text</label>
                    <input
                      type="text"
                      value={cue.text}
                      onChange={(e) => {
                        const next = [...subtitleRows];
                        next[idx].text = e.target.value;
                        setSubtitleRows(next);
                      }}
                      className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end pt-4">
                    {subtitleRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSubtitleRows(subtitleRows.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standard Tool Settings (for tools that aren't replaced by Certificate/Invoice custom studio) */}
        {!isCertificateTool && !isInvoiceTool && tool.settings.length > 0 && (
          <div className="mb-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-4">
              <Sliders className="w-4 h-4 text-rose-600" />
              <h2>{t.settingsLabel}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tool.settings.map((field) => (
                <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label
                    htmlFor={`setting-${field.key}`}
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {field.label}
                  </label>

                  {field.type === 'select' && (
                    <select
                      id={`setting-${field.key}`}
                      value={String(settings[field.key] ?? field.defaultValue)}
                      onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'text' && (
                    <input
                      id={`setting-${field.key}`}
                      type="text"
                      placeholder={field.placeholder}
                      value={String(settings[field.key] ?? '')}
                      onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      id={`setting-${field.key}`}
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step || 1}
                      value={Number(settings[field.key] ?? field.defaultValue)}
                      onChange={(e) => setSettings({ ...settings, [field.key]: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      id={`setting-${field.key}`}
                      rows={5}
                      value={String(settings[field.key] ?? '')}
                      onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  )}

                  {field.type === 'checkbox' && (
                    <label className="inline-flex items-center gap-2.5 mt-1 cursor-pointer">
                      <input
                        id={`setting-${field.key}`}
                        type="checkbox"
                        checked={Boolean(settings[field.key])}
                        onChange={(e) => setSettings({ ...settings, [field.key]: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Enabled</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary Action Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t.browserProcessingNotice}</span>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePrimaryActionButton}
            className="w-full sm:w-auto px-8 py-3.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {isProcessing
              ? t.processingState
              : tool.requiresFileUpload && files.length === 0
              ? `${t.selectFilesBtn} & ${t.processBtn}`
              : `${t.processBtn} — ${tool.name}`}
          </button>
        </div>

        {/* Genuine Progress Bar */}
        {isProcessing && (
          <div className="mt-5" role="status" aria-live="polite">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              <span>{progressStage}</span>
              <span className="font-mono tabular-nums">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-600 transition-transform duration-150 origin-left"
                style={{ transform: `scaleX(${progress / 100})` }}
              />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div
            role="alert"
            className="mt-5 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-3 text-sm text-red-800 dark:text-red-200"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Output / Download Result Box */}
        {result && downloadUrl && (
          <div
            role="region"
            aria-label="Processed Output"
            className="mt-6 p-6 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {result.filename}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{result.summaryText}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {result.inputBytes > 0 && (
                      <>
                        <span>
                          {t.inputSizeLabel}: {formatBytes(result.inputBytes)}
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span>
                      {t.outputSizeLabel}: <strong>{formatBytes(result.outputBytes)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <a
                  href={downloadUrl}
                  download={result.filename}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4" />
                  {t.downloadResultBtn}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setResult(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg hover:border-slate-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t.processAnotherBtn}
                </button>
              </div>
            </div>

            {result.previewImageUrl && (
              <div className="mt-5 pt-4 border-t border-emerald-200/70 dark:border-emerald-900/50">
                <img
                  src={result.previewImageUrl}
                  alt={`Processed output for ${tool.name}`}
                  referrerPolicy="no-referrer"
                  className="max-h-80 rounded-lg border border-slate-200 dark:border-slate-700 bg-white object-contain"
                />
              </div>
            )}

            {result.previewText && (
              <div className="mt-5 pt-4 border-t border-emerald-200/70 dark:border-emerald-900/50">
                <pre className="p-4 bg-slate-900 text-slate-100 text-xs font-mono rounded-lg overflow-x-auto max-h-72 leading-relaxed">
                  {result.previewText}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* How-To & FAQ Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <section
          id="howto-steps"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
            {t.howToUseToolLabel} — {tool.name}
          </h2>
          <ol className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
            {tool.howToSteps.map((step, i) => (
              <li key={i} id={`step-${i + 1}`}>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
            {t.faqTitle}
          </h2>
          <div className="space-y-3">
            {tool.faqs.map((faq, idx) => (
              <div key={idx}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{faq.q}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Individual Per-Tool SEO, AEO (Answer Engine Optimization) & GEO (Generative Engine Optimization) Knowledge Block */}
      <article
        aria-label={`${tool.name} Technical Overview & Direct Answer`}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-10 space-y-5"
      >
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold mb-1">
            Direct Answer &amp; Overview (AEO / Featured Snippet)
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            What is {tool.name} and how does it work?
          </h2>
          <p
            id="aeo-direct-answer"
            className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-2"
          >
            {tool.aeoDirectAnswer}
          </p>
          <p
            id="tool-intro-definition"
            className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed"
          >
            {tool.introDefinition}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
              Key Technical Specifications (GEO Facts)
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {tool.geoKeyFacts.map((fact, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
              Common Use Cases &amp; Supported Formats
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3">
              {tool.useCases.map((uc, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>{uc}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              [Supported Formats: {tool.supportedFormats.join(', ')}] [Search Topics: {tool.seoKeywords.join(', ')}]
            </p>
          </div>
        </div>
      </article>

      {/* Related Tools */}
      <section className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t.relatedToolsLabel}</h2>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t.backToToolsBtn}
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {tool.relatedSlugs.map((relSlug) => {
            const relTool = getToolBySlug(relSlug);
            if (!relTool) return null;
            return (
              <a
                key={relTool.slug}
                href={`/tools/${relTool.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`/tools/${relTool.slug}`);
                }}
                className="block p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-rose-500 transition-colors"
              >
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{relTool.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{relTool.shortDesc}</p>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
};
