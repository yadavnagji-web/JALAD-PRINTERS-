import React, { useEffect, useState } from 'react';
import {
  ShopSettings,
  PricingSettings,
  UploadedDocument,
  PrintJobConfig,
  OrderItem,
  CustomerOrder,
  RegisteredShopkeeper,
} from './types';
import { api, DEFAULT_PRICING, DEFAULT_SHOP_SETTINGS } from './services/api';
import { Header } from './components/Header';
import { DocumentUploader } from './components/DocumentUploader';
import { DocumentCard } from './components/DocumentCard';
import { ImageEditorModal } from './components/ImageEditorModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { OrderSummaryCheckout } from './components/OrderSummaryCheckout';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { UserAppQrModal } from './components/UserAppQrModal';
import { OwnerShareModal } from './components/OwnerShareModal';
import { ShopkeeperRegistrationModal } from './components/ShopkeeperRegistrationModal';
import { AdminPanel } from './components/AdminPanel';
import { OwnerPaymentApprovalModal } from './components/OwnerPaymentApprovalModal';
import { OwnerLoginModal } from './components/OwnerLoginModal';
import { DesktopSetupModal } from './components/DesktopSetupModal';
import { OwnerBackgroundMonitor } from './components/OwnerBackgroundMonitor';
import { playOrderChime } from './utils/audioAlert';
import { calculateOrderTotal } from './utils/pricing';
import {
  ArrowRight,
  ArrowLeft,
  Printer,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Plus,
  FileText,
  Clock,
  Layers,
  CreditCard,
  RotateCcw,
  QrCode,
  Share2,
  Lock,
  Megaphone,
  X,
} from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SHOP_SETTINGS);
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Wizard Step State: 1 = Fast Upload, 2 = Print Options, 3 = Review & Payment, 4 = Print Progress
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Customer document state
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [configs, setConfigs] = useState<{ [docId: string]: PrintJobConfig }>({});

  // Modals state
  const [editingDoc, setEditingDoc] = useState<UploadedDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<UploadedDocument | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<CustomerOrder | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isUserAppQrOpen, setIsUserAppQrOpen] = useState(false);
  const [isOwnerShareModalOpen, setIsOwnerShareModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isOwnerLoginModalOpen, setIsOwnerLoginModalOpen] = useState(false);
  const [isDesktopSetupOpen, setIsDesktopSetupOpen] = useState(false);
  const [isAppUpdateAvailable, setIsAppUpdateAvailable] = useState(false);
  const [isOwnerDevice, setIsOwnerDevice] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get('mode') === 'owner' ||
        params.get('mode') === 'desktop' ||
        params.get('desktop') === 'true' ||
        localStorage.getItem('sqp_is_owner_device') === 'true' ||
        localStorage.getItem('sqp_auto_start') === 'true' ||
        localStorage.getItem('sqp_owner_minimized') === 'true'
      );
    }
    return false;
  });

  const [isOwnerMinimizedView, setIsOwnerMinimizedView] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get('minimized') === 'true' ||
        localStorage.getItem('sqp_owner_minimized') === 'true'
      );
    }
    return false;
  });

  // Initial load, URL routing, and Automatic User App Update Detection
  useEffect(() => {
    let currentAppVersion: string | null = null;

    const init = async () => {
      const [s, p] = await Promise.all([api.getSettings(), api.getPricing()]);
      setSettings(s);
      setPricing(p);

      // Check URL parameters for Owner or New Shopkeeper flows
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (
          params.get('mode') === 'owner' ||
          params.get('admin') === 'true' ||
          params.get('minimized') === 'true' ||
          localStorage.getItem('sqp_auto_start') === 'true'
        ) {
          setIsAdminOpen(true);
        }
        if (params.get('minimized') === 'true' || localStorage.getItem('sqp_owner_minimized') === 'true') {
          setIsOwnerMinimizedView(true);
        }
        if (params.get('mode') === 'new_shopkeeper' || params.get('join') === 'shopkeeper') {
          setIsRegistrationModalOpen(true);
        }
      }
    };
    init();

    // Automatic update detection: polls server version and reloads on update
    const checkAppVersion = async () => {
      try {
        const res = await fetch('/api/version');
        if (res.ok) {
          const data = await res.json();
          if (!currentAppVersion) {
            currentAppVersion = data.version;
          } else if (currentAppVersion !== data.version) {
            console.log('[Auto-Update] New app version detected. Displaying update notification popup...');
            setIsAppUpdateAvailable(true);
          }
        }
      } catch {
        // Safe offline check
      }
    };

    checkAppVersion();
    const updateInterval = setInterval(checkAppVersion, 15000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkAppVersion();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Register service worker if supported
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    return () => {
      clearInterval(updateInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleDocumentsAdded = (newDocs: UploadedDocument[]) => {
    setDocuments((prev) => [...prev, ...newDocs]);
    // Initialize default configs for new documents: Strictly B&W by default and High Quality internally
    setConfigs((prev) => {
      const updated = { ...prev };
      newDocs.forEach((d) => {
        if (!updated[d.id]) {
          updated[d.id] = {
            paperSize: settings.defaultPaperSize || 'A4',
            orientation: 'portrait',
            pageRange: 'all',
            copies: 1,
            colorMode: 'bw', // BY DEFAULT B&W HI RAKHE
            duplex: false,
            scaling: 'actual_size',
            quality: 'high', // QUALITY AUTOMATIC HIGH RAKHO INTERNAL
            mergeIdCards: false,
          };
        }
      });
      return updated;
    });
  };

  const handleUpdateConfig = (docId: string, partial: Partial<PrintJobConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], ...partial },
    }));
  };

  const handleRemoveDoc = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setConfigs((prev) => {
      const copy = { ...prev };
      delete copy[docId];
      return copy;
    });
  };

  // Convert documents + configs to OrderItems
  const orderItems: OrderItem[] = documents.map((doc) => {
    const config = configs[doc.id] || {
      paperSize: 'A4',
      orientation: 'portrait',
      pageRange: 'all',
      copies: 1,
      colorMode: 'bw',
      duplex: false,
      scaling: 'actual_size',
      quality: 'standard',
    };
    const totalCalc = calculateOrderTotal([{ doc, config }], pricing);
    return {
      id: `item-${doc.id}`,
      document: doc,
      config,
      calculatedPrice: totalCalc.subtotal,
      pageCountToPrint: doc.pageCount,
    };
  });

  const totals = calculateOrderTotal(
    documents.map((d) => ({ doc: d, config: configs[d.id] })),
    pricing
  );

  const handleOrderCompleted = (order: CustomerOrder) => {
    setTrackingOrder(order);
    setWizardStep(4);
  };

  const handleResetForNewOrder = () => {
    setDocuments([]);
    setConfigs({});
    setTrackingOrder(null);
    setWizardStep(1);
  };

  const handleOwnerAccessPrompt = () => {
    setIsOwnerLoginModalOpen(true);
  };

  // 24x7 Minimized Shopkeeper Background Monitor View (Runs 24x7 on Desktop)
  if (isOwnerMinimizedView) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
        <OwnerBackgroundMonitor
          settings={settings}
          onMaximize={() => {
            setIsOwnerMinimizedView(false);
            localStorage.setItem('sqp_owner_minimized', 'false');
            setIsAdminOpen(true);
          }}
          onExit={() => {
            setIsOwnerMinimizedView(false);
            localStorage.setItem('sqp_owner_minimized', 'false');
          }}
        />

        {/* 24x7 Instant Payment Popup Modal (Loud Audio Chime & Verification) */}
        <OwnerPaymentApprovalModal
          onOrderApproved={(order) => {
            if (trackingOrder && trackingOrder.id === order.id) {
              setTrackingOrder(order);
            }
          }}
        />

        <DesktopSetupModal
          isOpen={isDesktopSetupOpen}
          onClose={() => setIsDesktopSetupOpen(false)}
          settings={settings}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        settings={settings}
        language={language}
        onLanguageToggle={() => setLanguage((l) => (l === 'hi' ? 'en' : 'hi'))}
        onOpenTracking={() => setIsTrackingModalOpen(true)}
        onOpenAdmin={() => {
          if (isAdminOpen) {
            setIsAdminOpen(false);
          } else {
            setIsOwnerLoginModalOpen(true);
          }
        }}
        isAdmin={isAdminOpen}
        isOwnerDevice={isOwnerDevice}
        onToggleOwnerDevice={() => {
          const next = !isOwnerDevice;
          setIsOwnerDevice(next);
          localStorage.setItem('sqp_is_owner_device', next ? 'true' : 'false');
          if (next) playOrderChime();
        }}
        onOpenDesktopSetup={() => setIsDesktopSetupOpen(true)}
        onMinimizeToTray={() => {
          setIsOwnerMinimizedView(true);
          localStorage.setItem('sqp_owner_minimized', 'true');
        }}
      />

      {/* 
        Shop Owner Payment Approval Popup:
        Active ONLY when Admin Panel is open or in Minimized Monitor Mode.
        Never shows on the customer's mobile app view.
      */}
      {isAdminOpen && (
        <OwnerPaymentApprovalModal
          onOrderApproved={(order) => {
            if (trackingOrder && trackingOrder.id === order.id) {
              setTrackingOrder(order);
            }
          }}
        />
      )}

      {/* Main View Area: Admin Panel OR Customer App */}
      {isAdminOpen ? (
        <AdminPanel
          settings={settings}
          pricing={pricing}
          onUpdateSettings={setSettings}
          onUpdatePricing={setPricing}
          onClose={() => setIsAdminOpen(false)}
        />
      ) : (
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6 space-y-5">
          {/* Store Owner Notice & Ads Announcement (Shown ONLY when Ads Control Button is ON) */}
          {settings.adsEnabled && (
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 text-slate-900 space-y-3 shadow-md animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase tracking-wider">
                <Megaphone className="w-4 h-4 text-amber-600" />
                <span>विशेष सूचना / Announcement</span>
              </div>
              {settings.adsBannerUrl && (
                <div className="rounded-2xl overflow-hidden border border-amber-300 max-h-60 bg-black/5 flex items-center justify-center">
                  <img
                    src={settings.adsBannerUrl}
                    alt="Notice Banner"
                    className="w-full h-auto object-cover max-h-60 rounded-xl"
                  />
                </div>
              )}
              {settings.adsContent && (
                <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                  {settings.adsContent}
                </p>
              )}
            </div>
          )}

          {/* User-Friendly Step Wizard Progress Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs">
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] sm:text-xs font-bold">
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className={`py-2 px-1 sm:px-3 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  wizardStep === 1
                    ? 'bg-blue-600 text-white shadow-xs'
                    : wizardStep > 1
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
                <span>{language === 'hi' ? 'अपलोड' : 'Upload'}</span>
              </button>

              {/* Step 2 */}
              <button
                type="button"
                disabled={documents.length === 0}
                onClick={() => documents.length > 0 && setWizardStep(2)}
                className={`py-2 px-1 sm:px-3 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  wizardStep === 2
                    ? 'bg-blue-600 text-white shadow-xs'
                    : wizardStep > 2
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'bg-slate-100 text-slate-400 disabled:opacity-50'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
                <span>{language === 'hi' ? 'विकल्प' : 'Options'}</span>
              </button>

              {/* Step 3 */}
              <button
                type="button"
                disabled={documents.length === 0}
                onClick={() => documents.length > 0 && setWizardStep(3)}
                className={`py-2 px-1 sm:px-3 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  wizardStep === 3
                    ? 'bg-blue-600 text-white shadow-xs'
                    : wizardStep > 3
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'bg-slate-100 text-slate-400 disabled:opacity-50'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
                <span>{language === 'hi' ? 'भुगतान' : 'Payment'}</span>
              </button>

              {/* Step 4 */}
              <button
                type="button"
                disabled={!trackingOrder}
                onClick={() => trackingOrder && setWizardStep(4)}
                className={`py-2 px-1 sm:px-3 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  wizardStep === 4
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-400 disabled:opacity-50'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">4</span>
                <span>{language === 'hi' ? 'प्रिंट' : 'Printing'}</span>
              </button>
            </div>
          </div>

          {/* STEP 1: FAST UPLOAD WIZARD */}
          {wizardStep === 1 && (
            <DocumentUploader
              settings={settings}
              language={language}
              uploadedDocuments={documents}
              onDocumentsAdded={handleDocumentsAdded}
              onRemoveDocument={handleRemoveDoc}
              onNextStep={() => setWizardStep(2)}
              onOpenPreview={(doc) => setPreviewDoc(doc)}
            />
          )}

          {/* STEP 2: PRINT CONFIGURATION WIZARD WITH PREVIEW */}
          {wizardStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {language === 'hi'
                      ? `प्रिंट विकल्प व साइज चुनें (${documents.length} फाइलें)`
                      : `Configure Print Options (${documents.length} files)`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'hi'
                      ? 'रंग (B&W/Colour), प्रतियां (Copies) और दोनों तरफ (Duplex) सेट करें'
                      : 'Set paper size, colour, duplex, and copies'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? '+ और फाइल जोड़ें' : '+ Add More Files'}</span>
                </button>
              </div>

              {/* Documents Option Cards */}
              <div className="space-y-4">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    config={configs[doc.id]}
                    pricing={pricing}
                    language={language}
                    onUpdateConfig={(part) => handleUpdateConfig(doc.id, part)}
                    onRemove={() => handleRemoveDoc(doc.id)}
                    onOpenEditor={() => setEditingDoc(doc)}
                    onOpenPreview={() => setPreviewDoc(doc)}
                  />
                ))}
              </div>

              {/* Sticky Next / Back Footer */}
              <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xl flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-50 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{language === 'hi' ? 'वापस (Back)' : 'Back'}</span>
                </button>

                <div className="text-right">
                  <span className="text-xs text-slate-500 font-medium block">
                    कुल राशि (Total Bill):
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-blue-700">
                    ₹{totals.total.toFixed(2)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/20 active:scale-95 transition"
                >
                  <span>{language === 'hi' ? 'अगला: बिल व भुगतान' : 'Next: Payment'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & PAYMENT WIZARD */}
          {wizardStep === 3 && (
            <div className="animate-in fade-in">
              <OrderSummaryCheckout
                items={orderItems}
                pricing={pricing}
                settings={settings}
                language={language}
                onOrderCompleted={handleOrderCompleted}
                onBackToEdit={() => setWizardStep(2)}
              />
            </div>
          )}

          {/* STEP 4: LIVE PRINT PIPELINE & CONFIRMATION */}
          {wizardStep === 4 && trackingOrder && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    प्रिंट जॉब सक्रिय (Print Job Active)
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                    ऑर्डर #{trackingOrder.orderNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {trackingOrder.assignedPrinterName || 'Shop Windows Spooler Connected'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">कुल भुगतान</span>
                  <span className="text-2xl font-black text-emerald-600">
                    ₹{trackingOrder.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Progress Pipeline */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  प्रिंटर स्थिति (Printer Status):
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white">
                    1. भुगतान सत्यापित ✓
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white animate-pulse">
                    2. प्रिंट कतार में (Queued)
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-200 text-slate-600">
                    3. तैयार (Pickup)
                  </div>
                </div>
              </div>

              {/* Receipt & Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTrackingModalOpen(true)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>रसीद देखें व डाउनलोड करें (View Receipt)</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetForNewOrder}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>नया दस्तावेज प्रिंट करें (Start New Print)</span>
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* MODALS */}

      {/* 1. Document Visual Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* 2. Photo Editor Modal */}
      {editingDoc && (
        <ImageEditorModal
          document={editingDoc}
          isOpen={!!editingDoc}
          onClose={() => setEditingDoc(null)}
          onSaveProcessedCopy={(processedUrl) => {
            setDocuments((prev) =>
              prev.map((d) => (d.id === editingDoc.id ? { ...d, previewUrl: processedUrl } : d))
            );
          }}
        />
      )}

      {/* 3. Customer Scan to Print QR Modal */}
      <UserAppQrModal
        settings={settings}
        isOpen={isUserAppQrOpen}
        onClose={() => setIsUserAppQrOpen(false)}
      />

      {/* 4. Owner Share Modal */}
      <OwnerShareModal
        settings={settings}
        isOpen={isOwnerShareModalOpen}
        onClose={() => setIsOwnerShareModalOpen(false)}
      />

      {/* 5. Shopkeeper Multi-Owner Registration Modal */}
      <ShopkeeperRegistrationModal
        isOpen={isRegistrationModalOpen}
        onRegistered={(reg) => {
          setIsRegistrationModalOpen(false);
          setIsAdminOpen(true);
        }}
        onCancel={() => setIsRegistrationModalOpen(false)}
      />

      {/* 6. Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        initialOrder={trackingOrder}
        settings={settings}
      />

      {/* 7. Store Owner PIN Login Modal */}
      <OwnerLoginModal
        isOpen={isOwnerLoginModalOpen}
        onClose={() => setIsOwnerLoginModalOpen(false)}
        onSuccess={() => {
          setIsOwnerLoginModalOpen(false);
          setIsAdminOpen(true);
          localStorage.setItem('sqp_is_owner_device', 'true');
          setIsOwnerDevice(true);
        }}
      />

      {/* 8. Desktop 24x7 Auto-Start Setup Modal */}
      <DesktopSetupModal
        isOpen={isDesktopSetupOpen}
        onClose={() => setIsDesktopSetupOpen(false)}
        settings={settings}
        onActivateMinimizedMode={() => {
          setIsOwnerMinimizedView(true);
          localStorage.setItem('sqp_owner_minimized', 'true');
        }}
      />

      {/* Auto-Update Notification Banner / Popup */}
      {isAppUpdateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-md bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-amber-400/80 animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shrink-0 font-black">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider">
                  🚀 नया ऐप अपडेट उपलब्ध!
                </span>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-xs text-blue-200 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-sm font-black text-white">ऐप का नया संस्करण जारी हुआ है!</h4>
              <p className="text-xs text-blue-100 leading-relaxed">
                नवीनतम सुविधाओं, सुरक्षा सुधारों और तेज स्पीड के लिए कृपया बटन पर क्लिक करके ऐप रीलोड करें।
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full py-2.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>अभी ऐप रीलोड करें (Update App Now)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer - Minimal and Clean */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-3 sm:py-4 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
          <p className="text-xs font-semibold text-slate-700">
            Designed by Nagji Yadav Sakodar, 9982151938
          </p>

          {/* Store Owner Portal Access Button */}
          <button
            type="button"
            onClick={handleOwnerAccessPrompt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition shadow-2xs"
            title="दुकानदार / संचालक पोर्टल लॉगिन"
          >
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>दुकानदार लॉगिन (Store Owner Portal)</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
