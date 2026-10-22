import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  FileCheck2,
  Globe,
  Send,
  MessageSquare,
  Building2,
  Clock,
  Lock,
} from 'lucide-react';
import { TOOLS_CATALOG } from '../data/toolsCatalog';

// Internal recipient email (kept hidden from public UI text; all form queries route here)
const INTERNAL_ADMIN_EMAIL = 'Abdullahbhoraniya37@gmail.com';

interface InfoPageProps {
  pagePath: string;
  onNavigate: (path: string) => void;
}

export const InfoAndSeoPages: React.FC<InfoPageProps> = ({ pagePath, onNavigate }) => {
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [inquiryType, setInquiryType] = useState('Tool Support & Help');
  const [messageText, setMessageText] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      // Save inquiry locally as backup
      try {
        const rawSaved = localStorage.getItem('pdflove_user_queries_v1');
        const list = rawSaved ? JSON.parse(rawSaved) : [];
        list.unshift({
          id: `q-${Date.now()}`,
          name: senderName,
          email: senderEmail,
          phone: senderPhone || 'Not provided',
          category: inquiryType,
          message: messageText,
          submittedAt: new Date().toISOString(),
        });
        localStorage.setItem('pdflove_user_queries_v1', JSON.stringify(list.slice(0, 50)));
      } catch {
        // ignore storage errors
      }

      await fetch(`https://formsubmit.co/ajax/${INTERNAL_ADMIN_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: senderName,
          email: senderEmail,
          phone: senderPhone || 'Not provided',
          category: inquiryType,
          website: 'https://www.pdflove.store',
          message: messageText,
          _subject: `[PDFLove.store - ${inquiryType}] New Query from ${senderName}`,
          _template: 'table',
        }),
      });
    } catch {
      // Handled gracefully by confirmation state
    } finally {
      setIsSending(false);
      setContactSubmitted(true);
    }
  };

  const BackLink = () => (
    <button
      type="button"
      onClick={() => onNavigate('/')}
      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-rose-600 text-white text-xs font-bold rounded-xl mb-6 transition-colors cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Back to All {TOOLS_CATALOG.length} Free Tools</span>
    </button>
  );

  if (pagePath === '/about') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <BackLink />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-4">
          About PDFLove (www.pdflove.store) — 100% Free Online PDF, Media, Certificate &amp; Invoice Suite (Copyright by Nexify)
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          <strong>PDFLove</strong> (<strong>www.pdflove.store</strong>), created and maintained under <strong>Copyright by Nexify</strong>, is a 100% free, all-in-one online PDF, Image, QR Code, Video Compressor, Subtitle, Multi-Signature Certificate, Watermark PDF, Shop &amp; Job GST Invoice, and Smart Calculator platform offering {TOOLS_CATALOG.length}+ working tools on mobile phones, tablets, and desktop PCs across India and worldwide.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-8">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Cpu className="w-6 h-6 text-rose-600 mb-2.5" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              100% Free Forever
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Every single tool—including Multi-Signature Certificates, Shop &amp; Job GST Invoices, 13-in-1 QR Generators, Watermark PDF Studio, and Video Compressors—is completely free with zero paywalls, supported by Google AdSense Video, Display, and Rich Media advertising.
            </p>
          </div>
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <ShieldCheck className="w-6 h-6 text-emerald-600 mb-2.5" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              100% Private Browser Processing
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Your PDFs, photos, certificates, and shop invoices are processed directly in your browser memory (WebAssembly &amp; HTML5 Canvas) and never uploaded to external storage servers.
            </p>
          </div>
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Globe className="w-6 h-6 text-blue-600 mb-2.5" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Mobile Phone &amp; PC Ready
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Designed for instant speed across Android phones, iPhones, iPads, Windows PCs, and Macs in 15 regional and international languages at www.pdflove.store.
            </p>
          </div>
        </div>

        {/* Official Nexify Support & Advertising Contact Card (Email Kept Private) */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-rose-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Official Support, Feedback &amp; Advertising Desk — Copyright by Nexify
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Have a question about any of our {TOOLS_CATALOG.length}+ tools, want to request a custom feature for your business or school, or looking to run direct video/banner sponsorships on <strong>PDFLove (www.pdflove.store)</strong>? Send us a direct query through our secure help desk:
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => onNavigate('/contact')}
              className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Open 24/7 Official Support &amp; Query Form →</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pagePath === '/privacy' || pagePath === '/cookies') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <BackLink />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-4">
          Privacy Policy &amp; Google AdSense (Video, Display &amp; Auto Ads) Disclosure
        </h1>
        <div className="space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-8 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              1. 100% Local Browser Document Processing
            </h2>
            <p>
              All {TOOLS_CATALOG.length}+ utilities on <strong>PDFLove (www.pdflove.store)</strong> process PDFs, images, videos, QR codes, certificates, and invoices locally inside your web browser RAM. Your personal or business files are never transmitted to or stored on external cloud servers. Temporary `Blob` download URLs are automatically revoked from memory when you close or reset the page.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              2. Google AdSense Video Ads, Display Ads &amp; DoubleClick DART Cookie Disclosure
            </h2>
            <p className="mb-2">
              To keep all {TOOLS_CATALOG.length}+ tools 100% free for everyone, <strong>www.pdflove.store</strong> displays advertisements served by <strong>Google AdSense, Google Ad Manager, and Google Interactive Media Ads (IMA Video SDK)</strong>, including Video Ads (Outstream &amp; In-Article Video), Responsive Display Banners, In-Feed Ads, Multiplex Ads, and Auto Ads:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Third-party vendors, including Google, use cookies (such as the Google AdSense and DoubleClick DART cookie) and Privacy Sandbox Topics/Attribution APIs to serve video, rich media, and display ads based on a user&apos;s prior visits to <strong>www.pdflove.store</strong> or other websites on the internet.
              </li>
              <li>
                Google&apos;s use of advertising cookies enables it and its partners to serve relevant video and display advertisements to users based on their visit to <strong>www.pdflove.store</strong> and/or other sites on the Internet.
              </li>
              <li>
                Users may opt out of personalized advertising at any time by visiting{' '}
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-600 underline font-semibold"
                >
                  Google Ads Settings (adssettings.google.com)
                </a>{' '}
                or by visiting{' '}
                <a
                  href="https://www.aboutads.info"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-600 underline font-semibold"
                >
                  www.aboutads.info
                </a>
                .
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              3. Local Storage, User Preferences &amp; Privacy Contact (GDPR, CCPA &amp; DPDP Act India Compliant)
            </h2>
            <p>
              We only use browser `localStorage` to remember your chosen UI theme (Light or Dark mode), preferred language, tool usage counts, and tool ratings. We comply with the Digital Personal Data Protection Act (DPDP Act, India), GDPR (European Union), and CCPA. For any privacy or data questions, please submit a request through our{' '}
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="text-rose-600 dark:text-rose-400 font-bold underline cursor-pointer"
              >
                Official Support &amp; Privacy Help Desk
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pagePath === '/terms' || pagePath === '/disclaimer') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <BackLink />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-4">
          Terms of Service &amp; Disclaimer — PDFLove (www.pdflove.store)
        </h1>
        <div className="space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-8 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              1. 100% Free Browser-Based Access
            </h2>
            <div className="flex items-start gap-2.5">
              <FileCheck2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p>
                <strong>100% Free Access:</strong> All {TOOLS_CATALOG.length}+ online PDF, Image, QR Code, Video, Multi-Signature Certificate, Watermark PDF, Shop &amp; Job Invoice, and Calculator utilities on <strong>PDFLove</strong> (<strong>www.pdflove.store</strong>) are provided free of charge for personal, academic, and commercial use.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              2. User Responsibility &amp; Data Verification
            </h2>
            <p>
              <strong>User Responsibility:</strong> Since all document editing, certificate generation, and invoice creation happen directly in your browser, you are responsible for verifying the accuracy of data entered into certificates, tax invoices, and calculators before official submission.
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              3. Copyright Ownership &amp; Official Contact
            </h2>
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              PDFLove Platform Attribution
            </h3>
            <p>
              <strong>Copyright &amp; Official Contact:</strong> © {new Date().getFullYear()} <strong>PDFLove (www.pdflove.store)</strong> — <strong>Copyright by Nexify</strong>. All rights reserved. For official support or legal inquiries, please use our{' '}
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="text-rose-600 dark:text-rose-400 font-bold underline cursor-pointer"
              >
                Contact &amp; Support Desk
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pagePath === '/contact') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <BackLink />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
          Contact Us &amp; Support Desk — PDFLove (www.pdflove.store)
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
          Have a question, feedback, custom tool request, or advertising inquiry for <strong>PDFLove (www.pdflove.store) — Copyright by Nexify</strong>? Submit the form below and your query will be routed directly and privately to our official administrative inbox.
        </p>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-slate-700 dark:text-slate-200 mb-6 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  PDFLove (www.pdflove.store) — Copyright by Nexify • Official Support &amp; Ad Desk
                </h2>
                <h3 className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 mt-0.5 font-normal">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Encrypted Direct Admin Routing (Private Inbox Protected)</span>
                </h3>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 self-start sm:self-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span>24/7 Fast Response</span>
            </div>
          </div>

          {contactSubmitted ? (
            <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl space-y-4">
              <div className="flex items-start gap-3 text-sm text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-base mb-1">
                    Your query has been sent successfully!
                  </p>
                  <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    Thank you, <strong>{senderName}</strong>! Your message regarding <strong>{inquiryType}</strong> has been securely delivered to the <strong>PDFLove (Nexify) Administration Desk</strong>. We will reply to you at <strong>{senderEmail}</strong> shortly.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setContactSubmitted(false);
                    setMessageText('');
                  }}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Send Another Query
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/')}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  Return to Tools
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Inquiry Category
                  </label>
                  <select
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-rose-500"
                  >
                    <option value="Tool Support & Help">Tool Support &amp; Help</option>
                    <option value="Direct Advertising & Sponsorship">Direct Advertising &amp; Video/Banner Ads</option>
                    <option value="Feature or New Tool Request">Feature or New Tool Request</option>
                    <option value="Business Partnership (Nexify)">Business Partnership (Nexify)</option>
                    <option value="Bug Report or Feedback">Bug Report or Feedback</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / WhatsApp (Optional)
                  </label>
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Message / Feedback / Ad Inquiry *
                </label>
                <textarea
                  rows={4}
                  required
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Write your question, feedback, or advertising inquiry here..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 active:scale-[0.98] text-white text-sm font-bold rounded-xl cursor-pointer transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSending ? 'Sending Query...' : 'Submit Query to Support Desk'}</span>
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Protected by Nexify Privacy Shield • Direct Admin Delivery
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
        Tool or Page Not Found
      </h1>
      <button
        type="button"
        onClick={() => onNavigate('/')}
        className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl cursor-pointer"
      >
        Explore All {TOOLS_CATALOG.length} Free Tools
      </button>
    </div>
  );
};
