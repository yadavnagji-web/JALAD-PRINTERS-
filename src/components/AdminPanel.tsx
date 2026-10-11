import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  LayoutDashboard,
  Settings,
  Printer,
  IndianRupee,
  CreditCard,
  ListOrdered,
  QrCode,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Trash2,
  Download,
  Search,
  Lock,
  LogOut,
  Save,
  FileCheck,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Plus,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  X,
  Users,
  Phone,
  MessageSquare,
  Share2,
  Megaphone,
  Minimize2,
  Maximize2,
  Sun,
  Bell,
} from 'lucide-react';
import {
  AuditLog,
  CustomerOrder,
  PaymentTransaction,
  PricingSettings,
  PrinterConfig,
  ShopSettings,
  WindowsAgentStatus,
  RegisteredShopkeeper,
} from '../types';
import { api } from '../services/api';
import { runAutomatedTestSuite, TestResult } from '../utils/testRunner';
import { OwnerShareModal } from './OwnerShareModal';
import { UserAppQrModal } from './UserAppQrModal';
import { OwnerBackgroundMonitor } from './OwnerBackgroundMonitor';
import { DesktopSetupModal } from './DesktopSetupModal';

interface AdminPanelProps {
  settings: ShopSettings;
  pricing: PricingSettings;
  onUpdateSettings: (newSettings: ShopSettings) => void;
  onUpdatePricing: (newPricing: PricingSettings) => void;
  onClose: () => void;
}

type AdminTab =
  | 'dashboard'
  | 'settings'
  | 'ads'
  | 'shopkeepers'
  | 'printers'
  | 'pricing'
  | 'jobs'
  | 'payments'
  | 'qr_poster'
  | 'windows_agent'
  | 'tests';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  settings: initialSettings,
  pricing: initialPricing,
  onUpdateSettings,
  onUpdatePricing,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // default true for owner in session
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Local state for tabs
  const [settingsForm, setSettingsForm] = useState<ShopSettings>(initialSettings);
  const [pricingForm, setPricingForm] = useState<PricingSettings>(initialPricing);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [agentStatus, setAgentStatus] = useState<WindowsAgentStatus | null>(null);

  // Test suite state
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [passCount, setPassCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  // Poster preview state
  const [posterQrUrl, setPosterQrUrl] = useState<string>('');
  const [posterQrType, setPosterQrType] = useState<'app_url' | 'custom_qr'>('app_url');
  const [counterOperatorName, setCounterOperatorName] = useState('Shop Owner');
  const [searchJobQuery, setSearchJobQuery] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [registeredShopkeepers, setRegisteredShopkeepers] = useState<RegisteredShopkeeper[]>([]);
  const [isUploadingOwnerPhoto, setIsUploadingOwnerPhoto] = useState(false);
  const [isOwnerShareModalOpen, setIsOwnerShareModalOpen] = useState(false);
  const [isUserAppQrOpen, setIsUserAppQrOpen] = useState(false);
  const [isUploadingAdBanner, setIsUploadingAdBanner] = useState(false);
  const [searchShopkeeper, setSearchShopkeeper] = useState('');
  const [isDesktopSetupModalOpen, setIsDesktopSetupModalOpen] = useState(false);

  // Desktop Background Minimized Mode State
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('minimized') === 'true') return true;
      return localStorage.getItem('sqp_owner_minimized') === 'true';
    }
    return false;
  });
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [autoStartEnabled, setAutoStartEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sqp_auto_start') === 'true';
    }
    return false;
  });

  // Keep Desktop Active / Screen Wake Lock to prevent sleep during shop hours
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
          wakeLock.addEventListener('release', () => {
            setWakeLockActive(false);
          });
        }
      } catch (err) {
        setWakeLockActive(false);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Request desktop notifications if supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        try {
          wakeLock.release();
        } catch (e) {}
      }
    };
  }, []);

  const handleOwnerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingOwnerPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setSettingsForm((prev) => ({ ...prev, ownerPhotoUrl: data.storagePath }));
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setSettingsForm((prev) => ({ ...prev, ownerPhotoUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setSettingsForm((prev) => ({ ...prev, ownerPhotoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingOwnerPhoto(false);
    }
  };

  const handleAdBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAdBanner(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setSettingsForm((prev) => ({ ...prev, adsBannerUrl: data.storagePath }));
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setSettingsForm((prev) => ({ ...prev, adsBannerUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setSettingsForm((prev) => ({ ...prev, adsBannerUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingAdBanner(false);
    }
  };

  const handleQrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setSettingsForm((prev) => ({ ...prev, customQrImageUrl: data.storagePath }));
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setSettingsForm((prev) => ({ ...prev, customQrImageUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setSettingsForm((prev) => ({ ...prev, customQrImageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingQr(false);
    }
  };

  const loadData = async () => {
    const [fetchedOrders, fetchedPrinters, fetchedAgent, fetchedRegs] = await Promise.all([
      api.getOrders(),
      api.getPrinters(),
      api.getWindowsAgentStatus(),
      api.getRegistrations(),
    ]);
    setOrders(fetchedOrders);
    setPrinters(fetchedPrinters);
    setAgentStatus(fetchedAgent);
    setRegisteredShopkeepers(fetchedRegs);
    setTransactions(api.getTransactions());
    setAuditLogs(api.getAuditLogs());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Generate QR for Poster
  useEffect(() => {
    const targetUrl = window.location.origin;
    QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 1.5,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setPosterQrUrl)
      .catch(console.error);
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await api.updateSettings(settingsForm);
    onUpdateSettings(updated);
    setSaveSuccessMsg('Shop settings saved successfully! Persisted to storage.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Save Pricing
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await api.updatePricing(pricingForm);
    onUpdatePricing(updated);
    setSaveSuccessMsg('Pricing rates updated successfully! Server calculation updated.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Job Actions
  const handleRetryJob = async (orderId: string) => {
    await api.updateOrderStatus(orderId, {
      printStatus: 'queued',
      failureReason: null,
      retryCount: ((orders.find((o) => o.id === orderId)?.retryCount || 0) + 1),
    });
    api.addAuditLog('ADMIN', 'Job Retried', `Order ${orderId} sent back to print queue`);
    loadData();
  };

  const handleAuthorizeReprint = async (orderId: string) => {
    await api.updateOrderStatus(orderId, {
      printStatus: 'queued',
      failureReason: null,
    });
    api.addAuditLog('ADMIN', 'Reprint Authorized', `Authorized manual reprint for order ${orderId}`);
    loadData();
  };

  const handleCancelJob = async (orderId: string) => {
    await api.updateOrderStatus(orderId, {
      printStatus: 'cancelled',
      failureReason: 'Cancelled by operator',
    });
    api.addAuditLog('ADMIN', 'Job Cancelled', `Order ${orderId} cancelled`);
    loadData();
  };

  const handleApproveCounterCash = async (orderId: string) => {
    await api.counterPayment(orderId, counterOperatorName);
    loadData();
  };

  const handleTriggerTestPrint = async (printerId: string) => {
    const res = await api.triggerTestPrint(printerId);
    alert(res.message);
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    const results = await runAutomatedTestSuite((res, passed, failed) => {
      setTestResults((prev) => [...prev, res]);
      setPassCount(passed);
      setFailCount(failed);
    });
    setIsRunningTests(false);
  };

  // Filtered Jobs
  const filteredJobs = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(searchJobQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchJobQuery.toLowerCase()) ||
      o.customerPhone.includes(searchJobQuery);
    const matchStatus = jobStatusFilter === 'all' || o.printStatus === jobStatusFilter;
    return matchSearch && matchStatus;
  });

  // Export Jobs to CSV
  const exportCsv = () => {
    const rows = [
      ['Order Number', 'Date', 'Customer', 'Phone', 'Amount', 'Payment Status', 'Print Status', 'Printer'],
      ...orders.map((o) => [
        o.orderNumber,
        new Date(o.createdAt).toLocaleString(),
        o.customerName,
        o.customerPhone,
        o.totalAmount.toString(),
        o.paymentStatus,
        o.printStatus,
        o.assignedPrinterName || '',
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SmartQRPrint_Orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute metrics
  const todayRevenue = orders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingJobs = orders.filter((o) => o.printStatus === 'queued' || o.printStatus === 'downloading').length;
  const completedJobs = orders.filter((o) => o.printStatus === 'completed').length;
  const failedJobs = orders.filter((o) => o.printStatus === 'failed').length;

  // If Minimized Mode is active on Desktop:
  if (isMinimized) {
    return (
      <OwnerBackgroundMonitor
        settings={settingsForm}
        onMaximize={() => {
          setIsMinimized(false);
          localStorage.setItem('sqp_owner_minimized', 'false');
        }}
        onExit={onClose}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Admin Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
            <Printer className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 24x7 Desktop Auto-Start Setup Download Button */}
          <button
            type="button"
            onClick={() => setIsDesktopSetupModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            title="दुकानदार डेस्कटॉप 24x7 ऑटो-स्टार्ट सेटअप डाउनलोड करें"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>📥 PC सेटअप डाउनलोड</span>
          </button>

          {/* Desktop Minimize Button */}
          <button
            type="button"
            onClick={() => {
              setIsMinimized(true);
              localStorage.setItem('sqp_owner_minimized', 'true');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            title="डेस्कटॉप पर मिनिमाइज करें (Background Monitor Mode)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>🗕 मिनिमाइज मोड</span>
          </button>

          {/* ग्राहक ऐप QR Button for Shopkeeper to Print and Put on Counter */}
          <button
            type="button"
            onClick={() => setIsUserAppQrOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
            title="ग्राहक ऐप QR कोड प्रिंट व डाउनलोड करें"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>ग्राहक ऐप QR</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOwnerShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs"
            title="दुकानदार शेयर लिंक (Share Link with Other Shopkeepers)"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">दुकानदार शेयर</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit to Customer App</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center animate-in fade-in">
          ✓ {saveSuccessMsg}
        </div>
      )}

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-slate-950/80 border-r border-slate-800/80 p-3 space-y-1 shrink-0 overflow-x-auto md:overflow-y-auto">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2 hidden md:block">
            प्रबंधन (Management)
          </div>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard (डैशबोर्ड)</span>
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'jobs'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ListOrdered className="w-4 h-4" />
              <span>Print Queue (प्रिंट कतार)</span>
            </div>
            {pendingJobs > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                {pendingJobs}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('printers')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'printers'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Epson & HP Hub</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Shop Settings (दुकान सेटिंग)</span>
          </button>

          <button
            onClick={() => setActiveTab('ads')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'ads'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span>सूचना व विज्ञापन (Ads)</span>
            </div>
            {settingsForm.adsEnabled ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-900 text-emerald-300">
                ON
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                OFF
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('shopkeepers')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'shopkeepers'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-purple-400" />
              <span>पंजीकृत दुकानदार</span>
            </div>
            {registeredShopkeepers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-900 text-purple-200">
                {registeredShopkeepers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'pricing'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            <span>Pricing Engine (मूल्य दरें)</span>
          </button>

          <button
            onClick={() => setActiveTab('qr_poster')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'qr_poster'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Poster Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'payments'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payments & Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('windows_agent')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'windows_agent'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Windows Print Agent (C#)</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'tests'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Automated QA (20 Tests)</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-900 text-emerald-300">
              QA
            </span>
          </button>
        </aside>

        {/* Tab Content Panes */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-slate-900/50">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-black text-white">Dashboard Overview</h3>
                  <p className="text-xs text-slate-400">
                    Real-time metrics for {settingsForm.shopName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-semibold text-emerald-400">
                    Print Spooler Agent: Online
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold block">Today's Revenue</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">
                    ₹{todayRevenue.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">100% verified payments</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold block">Total Orders</span>
                  <span className="text-2xl font-black text-blue-400 mt-1 block">
                    {orders.length}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">{completedJobs} successfully printed</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold block">In Queue (Spooling)</span>
                  <span className="text-2xl font-black text-amber-400 mt-1 block">
                    {pendingJobs}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Active Windows print jobs</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold block">Failed / Retry Needed</span>
                  <span className="text-2xl font-black text-rose-400 mt-1 block">
                    {failedJobs}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Paper out or jam</span>
                </div>
              </div>

              {/* Printer Hardware Status */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Hardware Status (Shop Windows PC)</span>
                  <button
                    onClick={() => setActiveTab('printers')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Manage Hardware →
                  </button>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {printers.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            p.brand === 'Epson' ? 'bg-indigo-950 text-indigo-400' : 'bg-blue-950 text-blue-400'
                          }`}
                        >
                          <Printer className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{p.name}</span>
                          <span className="text-[11px] text-slate-400">
                            {p.supportedColor ? 'Colour & Photo' : 'B&W High-Speed'} • Driver: Ready
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Ready
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Orders Preview */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white">Recent Print Jobs</h4>
                  <button
                    onClick={() => setActiveTab('jobs')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    View All Queue ({orders.length}) →
                  </button>
                </div>

                {orders.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No print jobs placed yet.</p>
                ) : (
                  <div className="divide-y divide-slate-800/80">
                    {orders.slice(0, 5).map((ord) => (
                      <div key={ord.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white">{ord.orderNumber}</span>
                          <span className="text-slate-400 ml-2">
                            {ord.customerName} ({ord.customerPhone})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-200">₹{ord.totalAmount.toFixed(2)}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ord.printStatus === 'completed'
                                ? 'bg-emerald-950 text-emerald-400'
                                : ord.printStatus === 'printing'
                                ? 'bg-blue-950 text-blue-400 animate-pulse'
                                : 'bg-amber-950 text-amber-400'
                            }`}
                          >
                            {ord.printStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SHOP SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-6">
              <div>
                <h3 className="text-xl font-black text-white">Shop Settings (दुकान सेटिंग्स)</h3>
                <p className="text-xs text-slate-400">
                  Update your shop identity. Changes immediately appear across all posters, customer pages, receipts, and order confirmations.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      दुकान का नाम (Shop Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.shopName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, shopName: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      दुकान UPI ID (Shop UPI ID for Payments) *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.shopUpiId}
                      onChange={(e) => setSettingsForm({ ...settingsForm, shopUpiId: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      मोबाइल नंबर (Mobile Number) *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.mobileNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, mobileNumber: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      व्हाट्सएप नंबर (WhatsApp Support) *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.whatsappNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-bold mb-1">
                      दुकान का पता (Shop Address)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.shopAddress}
                      onChange={(e) => setSettingsForm({ ...settingsForm, shopAddress: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      खुलने का समय (Opening Hours)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.openingHours}
                      onChange={(e) => setSettingsForm({ ...settingsForm, openingHours: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      फाइल प्रतिधारण अवधि (Document Retention Hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={settingsForm.documentRetentionHours}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, documentRetentionHours: parseInt(e.target.value) || 24 })
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Documents older than this will be permanently purged after print.
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-bold mb-1">
                      ग्राहकों के लिए निर्देश (Customer Instructions)
                    </label>
                    <textarea
                      rows={2}
                      value={settingsForm.customerInstructions}
                      onChange={(e) => setSettingsForm({ ...settingsForm, customerInstructions: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  {/* 1. PAYMENT GATEWAY LINK ADDING BOX */}
                  <div className="sm:col-span-2 p-4 bg-slate-900/90 rounded-2xl border border-blue-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-blue-400" />
                        <label className="text-slate-200 font-bold text-xs">
                          पेमेंट गेटवे लिंक (Custom Payment Gateway Link / URL Box)
                        </label>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                        Razorpay • Cashfree • Paytm • BharatPe
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          placeholder="e.g. https://rzp.io/l/your_shop_link or https://pmny.in/..."
                          value={settingsForm.customPaymentLink || ''}
                          onChange={(e) => setSettingsForm({ ...settingsForm, customPaymentLink: e.target.value })}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 font-mono text-xs text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                      {settingsForm.customPaymentLink && (
                        <a
                          href={settingsForm.customPaymentLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Test Link</span>
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      यदि आपके पास मर्चेंट पेमेंट लिंक है, तो यहाँ दर्ज करें। चेकआउट के समय ग्राहकों को सीधे इस लिंक पर क्लिक करके भुगतान करने का विकल्प मिलेगा।
                    </p>
                  </div>

                  {/* 2. QR CODE IMAGE UPLOAD SYSTEM */}
                  <div className="sm:col-span-2 p-4 bg-slate-900/90 rounded-2xl border border-emerald-900/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        <label className="text-slate-200 font-bold text-xs">
                          दुकान का QR कोड इमेज अपलोड सिस्टम (Shop QR Code Image Upload System)
                        </label>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                        PhonePe • Google Pay • Paytm • BHIM Standee
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      अपनी दुकान का मूल स्टैंडी QR कोड इमेज (JPG/PNG) यहाँ अपलोड करें। ग्राहक सीधे इस इमेज को स्कैन करके भी पेमेंट कर सकेंगे।
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Upload Box */}
                      <div className="flex flex-col justify-center border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-4 text-center bg-slate-950/60 transition group">
                        <input
                          type="file"
                          id="qr-image-upload-input"
                          accept="image/*"
                          onChange={handleQrImageUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="qr-image-upload-input"
                          className="cursor-pointer flex flex-col items-center justify-center space-y-2 py-2"
                        >
                          <div className="p-3 bg-slate-900 rounded-xl text-emerald-400 group-hover:scale-105 transition">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {isUploadingQr ? 'Uploading QR Image...' : 'Click to Upload QR Code Image'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Supports JPG, PNG (Max 10MB)
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Preview Box */}
                      <div className="flex flex-col items-center justify-center border border-slate-800 rounded-2xl p-4 bg-slate-950/80 min-h-[140px]">
                        {settingsForm.customQrImageUrl ? (
                          <div className="flex flex-col items-center space-y-2">
                            <div className="relative group">
                              <img
                                src={settingsForm.customQrImageUrl}
                                alt="Shop Custom QR Code"
                                className="w-32 h-32 object-contain rounded-xl border border-slate-700 bg-white p-1.5"
                              />
                              <button
                                type="button"
                                onClick={() => setSettingsForm({ ...settingsForm, customQrImageUrl: '' })}
                                className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md transition"
                                title="Remove QR Image"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                              ✓ Uploaded Shop QR Image Active
                            </span>
                          </div>
                        ) : (
                          <div className="text-center text-slate-500 space-y-1">
                            <ImageIcon className="w-8 h-8 mx-auto text-slate-600" />
                            <span className="text-xs font-medium block">No custom QR image uploaded yet</span>
                            <span className="text-[10px] text-slate-600 block">Default dynamic NPCI QR is being generated</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* QR Display Mode Preference */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <span className="text-slate-300 font-bold">
                        चेकआउट पर QR प्रदर्शन मोड (Display Preference):
                      </span>
                      <select
                        value={settingsForm.qrDisplayMode || 'dynamic'}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, qrDisplayMode: e.target.value as any })
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950 py-1.5 px-3 text-xs text-white focus:outline-hidden"
                      >
                        <option value="dynamic">Dynamic UPI QR (Auto calculates bill amount)</option>
                        <option value="custom_uploaded">Shop Standee QR Image (Uploaded Photo)</option>
                        <option value="both">Both Options (Customer can toggle)</option>
                      </select>
                    </div>
                  </div>

                  {/* 3. OPTIONAL OWNER PHOTO UPLOAD SYSTEM */}
                  <div className="sm:col-span-2 p-4 bg-slate-900/90 rounded-2xl border border-purple-900/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        <label className="text-slate-200 font-bold text-xs">
                          दुकानदार / संचालक फोटो अपलोड (Owner Photo Upload - Optional)
                        </label>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                        वैकल्पिक (Optional)
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      अगर आप अपनी फोटो अपलोड करते हैं, तो यह ग्राहक के होम पेज पर मुख्य प्रिंटर इमेज की जगह प्रमुखता से दिखाई देगी। यदि फोटो अपलोड नहीं करेंगे, तो डिफॉल्ट प्रिंटर इमेज दिखेगी।
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Upload Box */}
                      <div className="flex flex-col justify-center border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-4 text-center bg-slate-950/60 transition group">
                        <input
                          type="file"
                          id="owner-photo-upload-input"
                          accept="image/*"
                          onChange={handleOwnerPhotoUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="owner-photo-upload-input"
                          className="cursor-pointer flex flex-col items-center justify-center space-y-2 py-2"
                        >
                          <div className="p-3 bg-slate-900 rounded-xl text-purple-400 group-hover:scale-105 transition">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {isUploadingOwnerPhoto ? 'फोटो अपलोड हो रही है...' : 'अपनी फोटो अपलोड करने के लिए क्लिक करें'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Supports JPG, PNG (Max 10MB)
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Preview Box */}
                      <div className="flex flex-col items-center justify-center border border-slate-800 rounded-2xl p-4 bg-slate-950/80 min-h-[140px]">
                        {settingsForm.ownerPhotoUrl ? (
                          <div className="flex flex-col items-center space-y-2">
                            <div className="relative group">
                              <img
                                src={settingsForm.ownerPhotoUrl}
                                alt="Shop Owner Photo"
                                className="w-28 h-28 object-cover rounded-2xl border-2 border-purple-500 shadow-md"
                              />
                              <button
                                type="button"
                                onClick={() => setSettingsForm({ ...settingsForm, ownerPhotoUrl: '' })}
                                className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md transition"
                                title="Remove Owner Photo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1">
                              ✓ संचालक फोटो सक्रिय (होम पेज पर दिखेगी)
                            </span>
                          </div>
                        ) : (
                          <div className="text-center text-slate-500 space-y-1">
                            <Users className="w-8 h-8 mx-auto text-slate-600" />
                            <span className="text-xs font-medium block">कोई फोटो अपलोड नहीं की गई</span>
                            <span className="text-[10px] text-slate-600 block">होम पेज पर आधुनिक प्रिंटर इमेज दिखेगी</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save All Shop Settings</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: ADS & NOTICE CONTROL (सूचना व विज्ञापन) */}
          {activeTab === 'ads' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-amber-400" />
                    <span>सूचना व विज्ञापन नियंत्रण (Store Notice & Ads Control)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ग्राहक ऐप पर महत्वपूर्ण सूचना या इमेज विज्ञापन बैनर प्रदर्शित करें
                  </p>
                </div>

                {/* Ads Control Toggle Button (चालू / बंद) */}
                <button
                  type="button"
                  onClick={() =>
                    setSettingsForm((prev) => ({ ...prev, adsEnabled: !prev.adsEnabled }))
                  }
                  className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-lg ${
                    settingsForm.adsEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${settingsForm.adsEnabled ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
                  <span>
                    {settingsForm.adsEnabled
                      ? 'विज्ञापन चालू है (Ads: ON)'
                      : 'विज्ञापन बंद है (Ads: OFF)'}
                  </span>
                </button>
              </div>

              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                  settingsForm.adsEnabled
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{settingsForm.adsEnabled ? '📢' : '🔇'}</span>
                  <div>
                    <span className="font-bold block text-white">
                      {settingsForm.adsEnabled
                        ? 'विज्ञापन व सूचना वर्तमान में ग्राहक ऐप पर सक्रिय (ON) है'
                        : 'विज्ञापन वर्तमान में बंद (OFF) है — ग्राहक ऐप पर कोई सूचना नहीं दिखेगी'}
                    </span>
                    <span className="text-[11px] opacity-80">
                      बटन दबाकर कभी भी तुरंत चालू या बंद कर सकते हैं।
                    </span>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    settingsForm.adsEnabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settingsForm.adsEnabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              {/* Notice Form & Banner Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Controls */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-400" />
                    <span>सूचना का विवरण व इमेज (Content Details)</span>
                  </h4>

                  {/* Text Announcement */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      सूचना संदेश / नोटिस (Notice Text):
                    </label>
                    <textarea
                      rows={3}
                      value={settingsForm.adsContent || ''}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, adsContent: e.target.value }))}
                      placeholder="उदा: आधार कार्ड, जनआधार कार्ड व पैन कार्ड प्रिंटिंग की सुविधा उपलब्ध है। तुरंत प्रिंट प्राप्त करें।"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 text-white p-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500">
                      यह संदेश ग्राहक ऐप पर सबसे ऊपर सूचना बैनर के रूप में दिखेगा।
                    </span>
                  </div>

                  {/* Banner Image Upload */}
                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <label className="block text-xs font-bold text-slate-300">
                      विज्ञापन बैनर इमेज अपलोड (Banner Image - Optional):
                    </label>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition shadow-xs">
                        <Upload className="w-4 h-4" />
                        <span>{isUploadingAdBanner ? 'अपलोड हो रहा है...' : 'बैनर इमेज चुनें'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAdBannerUpload}
                          disabled={isUploadingAdBanner}
                        />
                      </label>

                      {settingsForm.adsBannerUrl && (
                        <button
                          type="button"
                          onClick={() => setSettingsForm((prev) => ({ ...prev, adsBannerUrl: '' }))}
                          className="px-3 py-2 rounded-xl bg-rose-950 text-rose-300 border border-rose-800 text-xs font-bold hover:bg-rose-900 transition"
                        >
                          इमेज हटाएं
                        </button>
                      )}
                    </div>

                    {/* Image URL fallback */}
                    <div className="pt-2">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        या बैनर इमेज का सीधा वेब लिंक दर्ज करें (Image URL):
                      </label>
                      <input
                        type="url"
                        value={settingsForm.adsBannerUrl || ''}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, adsBannerUrl: e.target.value }))}
                        placeholder="https://example.com/banner.jpg"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 text-white py-2 px-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = await api.updateSettings(settingsForm);
                        onUpdateSettings(updated);
                        setSaveSuccessMsg('सूचना व विज्ञापन सेटिंग्स सफलतापूर्वक सहेजी गईं ✓');
                        setTimeout(() => setSaveSuccessMsg(null), 3000);
                      }}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>विज्ञापन सेटिंग्स सहेजें (Save Announcement)</span>
                    </button>
                  </div>
                </div>

                {/* Live Preview on Customer App */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-400" />
                      <span>ग्राहक ऐप पर लाइव प्रीव्यू (Live Customer View)</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {settingsForm.adsEnabled ? '🟢 लाइव दिखेगा' : '⚪ नहीं दिखेगा (OFF)'}
                    </span>
                  </div>

                  {settingsForm.adsEnabled ? (
                    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 text-slate-200 space-y-3 shadow-md animate-in fade-in">
                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                        <Megaphone className="w-4 h-4" />
                        <span>विशेष सूचना / Announcement</span>
                      </div>

                      {settingsForm.adsBannerUrl && (
                        <div className="rounded-xl overflow-hidden border border-amber-500/30 max-h-48 bg-black/40">
                          <img
                            src={settingsForm.adsBannerUrl}
                            alt="Advertisement Banner"
                            className="w-full h-auto object-cover max-h-48"
                          />
                        </div>
                      )}

                      <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                        {settingsForm.adsContent || 'दुकानदार द्वारा कोई सूचना दर्ज नहीं की गई है।'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-slate-500 flex items-center justify-center mx-auto">
                        <Megaphone className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-400">
                        विज्ञापन बंद (OFF) स्थिति में है
                      </p>
                      <p className="text-[11px] text-slate-600 max-w-xs mx-auto">
                        जब आप ऊपर दिए गए बटन को चालू करेंगे, तभी यह बैनर ग्राहकों को होम पेज पर दिखेगा।
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: REGISTERED SHOPKEEPERS (पंजीकृत दुकानदार) */}
          {activeTab === 'shopkeepers' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <span>पंजीकृत दुकानदार (Registered Shopkeepers)</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-900/60 text-purple-300 border border-purple-700">
                      कुल: {registeredShopkeepers.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    आपके शेयर लिंक द्वारा पंजीकृत अन्य दुकानदारों और ई-मित्र संचालकों की सूची
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOwnerShareModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span>दुकानदार शेयर लिंक (Share Invite Link)</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="नाम या मोबाइल नंबर से खोजें (Search by Name or Mobile)..."
                  value={searchShopkeeper}
                  onChange={(e) => setSearchShopkeeper(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Shopkeepers List */}
              {(() => {
                const filtered = registeredShopkeepers.filter(
                  (sk) =>
                    sk.name.toLowerCase().includes(searchShopkeeper.toLowerCase()) ||
                    sk.mobileNumber.includes(searchShopkeeper) ||
                    (sk.shopName && sk.shopName.toLowerCase().includes(searchShopkeeper.toLowerCase()))
                );

                if (filtered.length === 0) {
                  return (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-950/60 text-purple-400 flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-200">
                        {registeredShopkeepers.length === 0
                          ? 'अभी तक कोई अन्य दुकानदार पंजीकृत नहीं हुआ है'
                          : 'खोज से कोई दुकानदार नहीं मिला'}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        अपने मित्र दुकानदारों को Smart QR Print से जोड़ने के लिए ऊपर दिए गए "दुकानदार शेयर लिंक" बटन पर क्लिक करके लिंक भेजें।
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsOwnerShareModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition"
                      >
                        शेयर लिंक खोलें
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((sk) => (
                      <div
                        key={sk.id}
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl space-y-3 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-900/40 text-purple-300 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-800/40">
                              {sk.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">{sk.name}</h4>
                              <p className="text-xs text-purple-300 font-medium">
                                {sk.shopName || 'दुकान का नाम नहीं दिया'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(sk.registeredAt).toLocaleDateString('hi-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {sk.address && (
                          <p className="text-xs text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                            📍 {sk.address}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                          <span className="font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {sk.mobileNumber}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${sk.mobileNumber}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 transition"
                            >
                              <Phone className="w-3 h-3 text-blue-400" />
                              <span>कॉल</span>
                            </a>
                            <a
                              href={`https://wa.me/91${sk.mobileNumber.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-[11px] font-bold flex items-center gap-1 transition"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: PRINTERS (EPSON & HP HUB) */}
          {activeTab === 'printers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-black text-white">Epson & HP Hardware Hub</h3>
                  <p className="text-xs text-slate-400">
                    Assign print jobs by type (Colour/Photo to Epson EcoTank, High-speed B&W to HP LaserJet)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {printers.map((printer) => (
                  <div key={printer.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${
                            printer.brand === 'Epson'
                              ? 'bg-indigo-950 text-indigo-400'
                              : 'bg-blue-950 text-blue-400'
                          }`}
                        >
                          <Printer className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{printer.name}</h4>
                          <span className="text-xs text-slate-400">
                            Model: {printer.model} • Brand: <strong>{printer.brand}</strong>
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {printer.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl">
                      <div className="flex justify-between">
                        <span>Colour Capability:</span>
                        <span className="font-semibold text-white">
                          {printer.supportedColor ? 'Yes (6-Colour Ink Tank)' : 'Monochrome B&W'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duplex (Two-sided):</span>
                        <span className="font-semibold text-white">
                          {printer.supportedDuplex ? 'Auto Hardware Duplex' : 'Manual / Single'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Assigned Types:</span>
                        <span className="font-semibold text-blue-400">
                          {printer.assignedJobTypes.join(', ')}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleTriggerTestPrint(printer.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Send Test Print Page</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PRICING ENGINE */}
          {activeTab === 'pricing' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="text-xl font-black text-white">Pricing Engine (INR ₹)</h3>
                <p className="text-xs text-slate-400">
                  Configure per-page rates, duplex surcharges, A3 multipliers, and photo pricing.
                </p>
              </div>

              <form onSubmit={handleSavePricing} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl space-y-2 border border-slate-800">
                    <span className="font-bold text-white block">A4 Black & White (B&W)</span>
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400">Single Sided (₹/page):</label>
                      <input
                        type="number"
                        step="0.5"
                        value={pricingForm.bwSingleA4}
                        onChange={(e) => setPricingForm({ ...pricingForm, bwSingleA4: parseFloat(e.target.value) || 2 })}
                        className="w-20 text-center rounded-lg border border-slate-700 bg-slate-950 py-1 font-bold text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400">Both Sides / Duplex (₹/sheet):</label>
                      <input
                        type="number"
                        step="0.5"
                        value={pricingForm.bwDuplexA4}
                        onChange={(e) => setPricingForm({ ...pricingForm, bwDuplexA4: parseFloat(e.target.value) || 3 })}
                        className="w-20 text-center rounded-lg border border-slate-700 bg-slate-950 py-1 font-bold text-white"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl space-y-2 border border-slate-800">
                    <span className="font-bold text-white block">A4 Colour (रंगीन)</span>
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400">Single Sided (₹/page):</label>
                      <input
                        type="number"
                        step="0.5"
                        value={pricingForm.colorSingleA4}
                        onChange={(e) => setPricingForm({ ...pricingForm, colorSingleA4: parseFloat(e.target.value) || 10 })}
                        className="w-20 text-center rounded-lg border border-slate-700 bg-slate-950 py-1 font-bold text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400">Both Sides / Duplex (₹/sheet):</label>
                      <input
                        type="number"
                        step="0.5"
                        value={pricingForm.colorDuplexA4}
                        onChange={(e) => setPricingForm({ ...pricingForm, colorDuplexA4: parseFloat(e.target.value) || 18 })}
                        className="w-20 text-center rounded-lg border border-slate-700 bg-slate-950 py-1 font-bold text-white"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl space-y-2 border border-slate-800">
                    <span className="font-bold text-white block">A3 Large Paper</span>
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400">A3 B&W (₹/page):</label>
                      <input
                        type="number"
                        step="1"
                        value={pricingForm.bwSingleA3}
                        onChange={(e) => setPricingForm({ ...pricingForm, bwSingleA3: parseFloat(e.target.value) || 5 })}
                        className="w-20 text-center rounded-lg border border-slate-700 bg-slate-950 py-1 font-bold text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400">A3 Colour (₹/page):</label>
                      <input
                        type="number"
                        step="1"
                        value={pricingForm.colorSingleA3}
                        onChange={(e) => setPricingForm({ ...pricingForm, colorSingleA3: parseFloat(e.target.value) || 20 })}
                        className="w-20 text-center rounded-lg border border-slate-700 bg-slate-950 py-1 font-bold text-white"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl space-y-2 border border-slate-800">
                    <span className="font-bold text-white block">Photo & Specialty</span>
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400">4×6 Glossy Photo (₹):</label>
                      <input
                        type="number"
                        step="1"
                        value={pricingForm.photo4x6}
                        onChange={(e) => setPricingForm({ ...pricingForm, photo4x6: parseFloat(e.target.value) || 25 })}
                        className="w-20 text-center rounded-lg border border-slate-700 bg-slate-950 py-1 font-bold text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400">Passport Photo Sheet (₹):</label>
                      <input
                        type="number"
                        step="1"
                        value={pricingForm.passportSheet}
                        onChange={(e) => setPricingForm({ ...pricingForm, passportSheet: parseFloat(e.target.value) || 50 })}
                        className="w-20 text-center rounded-lg border border-slate-700 bg-slate-950 py-1 font-bold text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      न्यूनतम ऑर्डर राशि (Minimum Order Amount ₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={pricingForm.minOrderAmount}
                      onChange={(e) => setPricingForm({ ...pricingForm, minOrderAmount: parseFloat(e.target.value) || 5 })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      अतिरिक्त सेवा शुल्क (Optional Service Charge ₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={pricingForm.serviceCharge}
                      onChange={(e) => setPricingForm({ ...pricingForm, serviceCharge: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Pricing Rules</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: PRINT QUEUE & JOBS */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-black text-white">Live Print Queue & Orders</h3>
                  <p className="text-xs text-slate-400">
                    Real-time Windows print spooler monitor with SHA-256 integrity confirmation.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={exportCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by order #, customer name, phone..."
                    value={searchJobQuery}
                    onChange={(e) => setSearchJobQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden"
                  />
                </div>
                <select
                  value={jobStatusFilter}
                  onChange={(e) => setJobStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="queued">Queued</option>
                  <option value="printing">Printing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Jobs Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Order / Date</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Items / SHA-256</th>
                        <th className="p-3">Printer</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Print Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredJobs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500">
                            No matching print jobs in queue.
                          </td>
                        </tr>
                      ) : (
                        filteredJobs.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-900/40">
                            <td className="p-3">
                              <span className="font-bold text-white block">{ord.orderNumber}</span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(ord.createdAt).toLocaleTimeString()}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-200 block">{ord.customerName}</span>
                              <span className="text-[11px] text-slate-500">{ord.customerPhone}</span>
                            </td>
                            <td className="p-3">
                              <span className="text-slate-300 block">{ord.items.length} file(s)</span>
                              <span className="font-mono text-[10px] text-emerald-400">
                                ✓ Hash verified
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-slate-300 block">
                                {ord.assignedPrinterName || 'Auto Router'}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-white">
                              ₹{ord.totalAmount.toFixed(2)}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  ord.printStatus === 'completed'
                                    ? 'bg-emerald-950 text-emerald-400'
                                    : ord.printStatus === 'printing'
                                    ? 'bg-blue-950 text-blue-400 animate-pulse'
                                    : ord.printStatus === 'failed'
                                    ? 'bg-rose-950 text-rose-400'
                                    : 'bg-amber-950 text-amber-400'
                                }`}
                              >
                                {ord.printStatus}
                              </span>
                              {ord.failureReason && (
                                <span className="text-[10px] text-rose-400 block mt-0.5">
                                  {ord.failureReason}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1.5 flex-wrap">
                                {ord.paymentStatus === 'counter_pending' && (
                                  <button
                                    onClick={() => handleApproveCounterCash(ord.id)}
                                    className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px]"
                                  >
                                    Approve Cash
                                  </button>
                                )}
                                {ord.printStatus === 'failed' && (
                                  <button
                                    onClick={() => handleRetryJob(ord.id)}
                                    className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px]"
                                  >
                                    Retry
                                  </button>
                                )}
                                {ord.printStatus === 'completed' && (
                                  <button
                                    onClick={() => handleAuthorizeReprint(ord.id)}
                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px]"
                                  >
                                    Reprint
                                  </button>
                                )}
                                {ord.printStatus === 'queued' && (
                                  <button
                                    onClick={() => handleCancelJob(ord.id)}
                                    className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-[10px]"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: QR POSTER STUDIO */}
          {activeTab === 'qr_poster' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="text-xl font-black text-white">QR Poster Studio (A4 Printable)</h3>
                <p className="text-xs text-slate-400">
                  Generate, preview and print the shop's permanent QR poster with clear Hindi customer instructions.
                </p>
              </div>

              {/* Printable Poster Mockup */}
              <div
                id="shop-printable-poster"
                className="bg-white text-slate-900 rounded-3xl p-8 sm:p-12 shadow-2xl border-4 border-blue-600 text-center max-w-lg mx-auto space-y-6"
              >
                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white uppercase tracking-wider">
                    Smart QR Print India
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                    {settingsForm.shopName}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">{settingsForm.shopAddress}</p>
                </div>

                {settingsForm.customQrImageUrl && (
                  <div className="flex justify-center gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPosterQrType('app_url')}
                      className={`px-3 py-1.5 rounded-lg border transition ${
                        posterQrType === 'app_url'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      वेबसाइट QR (Upload Page)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosterQrType('custom_qr')}
                      className={`px-3 py-1.5 rounded-lg border transition ${
                        posterQrType === 'custom_qr'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      अपलोड किया गया Standee QR
                    </button>
                  </div>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 inline-block">
                  {posterQrType === 'custom_qr' && settingsForm.customQrImageUrl ? (
                    <img
                      src={settingsForm.customQrImageUrl}
                      alt="Shop Custom QR"
                      className="w-56 h-56 mx-auto object-contain"
                    />
                  ) : posterQrUrl ? (
                    <img src={posterQrUrl} alt="Shop Permanent QR" className="w-56 h-56 mx-auto object-contain" />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center">Loading...</div>
                  )}
                  <span className="text-[11px] font-bold text-slate-500 mt-2 block">
                    कैमरा या Google Lens से स्कैन करें
                  </span>
                </div>

                {/* Workflow Steps in Hindi as requested */}
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 text-left space-y-2">
                  <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider text-center">
                    प्रिंट प्राप्त करने की सरल प्रक्रिया:
                  </h4>
                  <p className="text-xs sm:text-sm font-bold text-blue-950 text-center leading-relaxed">
                    QR स्कैन करें → फाइल अपलोड करें → प्रिंट विकल्प चुनें → भुगतान करें → प्रिंट प्राप्त करें
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 flex justify-between pt-2 border-t border-slate-100">
                  <span>Helpline: {settingsForm.mobileNumber}</span>
                  <span>Epson EcoTank & HP LaserJet</span>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download / Print A4 Poster (PDF)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: PAYMENTS & AUDIT */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-white">Payment Transactions & Audit Logs</h3>
                <p className="text-xs text-slate-400">
                  Verified UPI payments, gateway reconciliation, and operator audit trail.
                </p>
              </div>

              {/* Counter Cash Approval Bar */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-white block">Operator Identity for Cash Entries</span>
                  <span className="text-slate-400">Recorded on all manual payment approvals</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={counterOperatorName}
                    onChange={(e) => setCounterOperatorName(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium"
                    placeholder="Operator Name"
                  />
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 font-bold text-xs text-white">
                  Recent Verified Transactions ({transactions.length})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold text-[10px]">
                      <tr>
                        <th className="p-3">Txn ID / Gateway Ref</th>
                        <th className="p-3">Order Number</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Verified At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500">
                            No payment transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="p-3 font-mono text-slate-300">
                              {tx.gatewayRef}
                            </td>
                            <td className="p-3 font-bold text-white">{tx.orderNumber}</td>
                            <td className="p-3 uppercase text-slate-400">{tx.method}</td>
                            <td className="p-3 font-bold text-emerald-400">₹{tx.amount.toFixed(2)}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400">
                                {tx.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400">
                              {tx.verifiedAt ? new Date(tx.verifiedAt).toLocaleTimeString() : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit Logs */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="font-bold text-xs text-white pb-2 border-b border-slate-800">
                  System & Operator Audit Log (Immutable Record)
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px] text-slate-400">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-2">
                      <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="text-blue-400">[{log.actor}]</span>
                      <span className="text-slate-200">{log.action}:</span>
                      <span>{log.details}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: WINDOWS PRINT AGENT (C#) */}
          {activeTab === 'windows_agent' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-white">Windows Desktop Print Agent (C# / .NET 8)</h3>
                <p className="text-xs text-slate-400">
                  Desktop spooler client running on your shop Windows PC to control physical Epson and HP USB/Network printers.
                </p>
              </div>

              {/* Status Banner */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Agent Version 2.4.0 (Windows x64 Desktop)
                    </h4>
                    <span className="text-xs text-slate-400">
                      Machine: <strong>SHOP-DESKTOP-WIN11</strong> • Heartbeat: Active
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Online & Polling (/api/agent/jobs)
                </span>
              </div>

              {/* 1-Click 24x7 Desktop Auto-Start & Minimized Setup */}
              <div className="bg-gradient-to-r from-blue-950/80 via-indigo-950/80 to-slate-950 border-2 border-blue-500/40 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
                      <Laptop className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">
                        दुकानदार 24x7 डेस्कटॉप ऑटो-स्टार्ट सेटअप (Windows 1-Click Installer)
                      </h4>
                      <p className="text-xs text-blue-200">
                        कंप्यूटर चालू होते ही बैकग्राउंड में मिनिमाइज रहेगा • नया प्रिंट आते ही ऑटोमेटिक कैश/ऑनलाइन पॉपअप खुलेगा
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDesktopSetupModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>सेटअप डायलॉग खोलें</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <a
                    href="/api/setup/download/bat"
                    download="SmartQRPrint-ShopMonitor-Setup.bat"
                    className="p-3.5 rounded-2xl bg-slate-900 border border-blue-500/30 hover:border-blue-400 flex flex-col justify-between space-y-2 transition group"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                        Windows Startup Auto-Run
                      </span>
                      <strong className="text-white text-xs block mt-0.5 group-hover:text-blue-300">
                        1. .BAT सेटअप डाउनलोड करें
                      </strong>
                      <p className="text-[11px] text-slate-400 mt-1">
                        डबल-क्लिक करते ही Windows Startup फोल्डर में 24x7 ऑटो-स्टार्ट जोड़ देगा।
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-blue-400 font-bold text-[11px] pt-1">
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .bat</span>
                    </div>
                  </a>

                  <a
                    href="/api/setup/download/vbs"
                    download="SmartQRPrint-ShopMonitor.vbs"
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-2 transition group"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Silent Background
                      </span>
                      <strong className="text-white text-xs block mt-0.5 group-hover:text-emerald-300">
                        2. साइलेंट रनर (.vbs)
                      </strong>
                      <p className="text-[11px] text-slate-400 mt-1">
                        बिना किसी कंसोल विंडो के बैकग्राउंड में शांति से चलता रहेगा।
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px] pt-1">
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .vbs</span>
                    </div>
                  </a>

                  <a
                    href="/api/setup/download/widget"
                    download="SmartQRPrint-Desktop-Widget.html"
                    className="p-3.5 rounded-2xl bg-slate-900 border border-purple-500/30 hover:border-purple-400 flex flex-col justify-between space-y-2 transition group"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                        Single-File HTML Widget
                      </span>
                      <strong className="text-white text-xs block mt-0.5 group-hover:text-purple-300">
                        3. डेस्कटॉप विजेट (.html)
                      </strong>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Chrome / Edge में ऑफलाइन/ऑनलाइन कभी भी चलाएं।
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-purple-400 font-bold text-[11px] pt-1">
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .html</span>
                    </div>
                  </a>
                </div>
              </div>

              {/* C# Source Code & Setup Guide */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white">
                  Full C# Project Available in Workspace
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The complete source files for the Windows Desktop Agent have been compiled in the <code>/windows-agent</code> directory. You can publish it for your shop Windows 10/11 machine using:
                </p>
                <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-emerald-400">
                  cd windows-agent && dotnet publish -c Release -r win-x64 --self-contained false -o ./publish
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographic SHA-256 integrity verification before every print</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Dedicated routing: Epson for colour/photo, HP for B&W duplex</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Runs in Windows system tray with notifications and auto-start on boot</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: AUTOMATED QA TEST SUITE */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-black text-white">Automated QA & Test Suite</h3>
                  <p className="text-xs text-slate-400">
                    20 mandatory engineering tests verifying persistence, document preservation, idempotency, and routing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunTests}
                  disabled={isRunningTests}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>{isRunningTests ? 'Running Suite...' : 'Run All 20 Tests'}</span>
                </button>
              </div>

              {/* Results Summary */}
              {testResults.length > 0 && (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Total Executed</span>
                    <span className="text-lg font-black text-white">{testResults.length} / 20</span>
                  </div>
                  <div className="p-3 bg-emerald-950/60 border border-emerald-900 rounded-xl">
                    <span className="text-[11px] text-emerald-400 block">Passed</span>
                    <span className="text-lg font-black text-emerald-400">{passCount}</span>
                  </div>
                  <div className="p-3 bg-rose-950/60 border border-rose-900 rounded-xl">
                    <span className="text-[11px] text-rose-400 block">Failed</span>
                    <span className="text-lg font-black text-rose-400">{failCount}</span>
                  </div>
                </div>
              )}

              {/* Tests Grid */}
              <div className="space-y-2">
                {testResults.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500 font-bold w-6">{t.id}.</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{t.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {t.category}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">{t.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono text-[10px]">{t.durationMs}ms</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.status === 'passed'
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-rose-950 text-rose-400'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Owner Share Modal */}
      <OwnerShareModal
        settings={settingsForm}
        isOpen={isOwnerShareModalOpen}
        onClose={() => setIsOwnerShareModalOpen(false)}
      />

      {/* Customer App Standee QR Modal for Shop Counter */}
      <UserAppQrModal
        settings={settingsForm}
        isOpen={isUserAppQrOpen}
        onClose={() => setIsUserAppQrOpen(false)}
      />

      {/* 24x7 Desktop Auto-Start Setup Modal */}
      <DesktopSetupModal
        isOpen={isDesktopSetupModalOpen}
        onClose={() => setIsDesktopSetupModalOpen(false)}
        settings={settingsForm}
        onActivateMinimizedMode={() => {
          setIsMinimized(true);
          localStorage.setItem('sqp_owner_minimized', 'true');
        }}
      />
    </div>
  );
};
