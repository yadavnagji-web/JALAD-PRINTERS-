import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Copy,
  Receipt,
  Loader2,
  X,
  Volume2,
  ShieldCheck,
  Check,
  DollarSign,
  Printer,
  Sparkles,
} from 'lucide-react';
import { CustomerOrder, OrderItem, PricingSettings, ShopSettings } from '../types';
import { api } from '../services/api';
import { playOrderChime } from '../utils/audioAlert';

interface CashOrOnlinePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  totalAmount: number;
  subtotal: number;
  items: OrderItem[];
  settings: ShopSettings;
  pricing: PricingSettings;
  language: 'hi' | 'en';
  onOrderCompleted: (order: CustomerOrder) => void;
}

export const CashOrOnlinePaymentModal: React.FC<CashOrOnlinePaymentModalProps> = ({
  isOpen,
  onClose,
  orderNumber,
  totalAmount,
  subtotal,
  items,
  settings,
  pricing,
  language,
  onOrderCompleted,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'cash'>('upi');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [customerUtrNumber, setCustomerUtrNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CustomerOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const upiId = settings.shopUpiId || '8696312384@upi';
  const shopName = settings.shopName || 'JALAD PRINTERS & EMITRA CENTER CHIKHALI';
  const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${totalAmount.toFixed(2)}&cu=INR&tn=${orderNumber}`;

  // Generate UPI QR code
  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(upiUri, {
      width: 260,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setUpiQrDataUrl)
      .catch(console.error);
  }, [isOpen, upiUri]);

  // Poll for approval if order is submitted and awaiting approval
  useEffect(() => {
    if (!createdOrder) return;
    let isCancelled = false;

    const interval = setInterval(async () => {
      try {
        const check = await api.getOrderById(createdOrder.id);
        if (isCancelled || !check) return;
        if (check.paymentStatus === 'paid') {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          setCreatedOrder(null);
          onOrderCompleted(check);
        }
      } catch (e) {
        // Safe retry
      }
    }, 1200);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [createdOrder, onOrderCompleted]);

  if (!isOpen) return null;

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // 1. Submit Order (Cash or Online UPI)
  const handleSubmitOrder = async (method: 'upi_qr' | 'counter_cash') => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const newOrder: CustomerOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerName: 'Walk-in Customer',
      customerPhone: 'Counter',
      items,
      subtotal,
      tax: 0,
      totalAmount,
      paymentStatus: 'counter_pending',
      paymentMethod: method,
      paymentTxnId: customerUtrNumber || (method === 'upi_qr' ? `UPI-${Date.now().toString().slice(-6)}` : null),
      paidAt: null,
      createdAt: new Date().toISOString(),
      printStatus: 'pending_payment',
      assignedPrinterId: null,
      assignedPrinterName: null,
      retryCount: 0,
      failureReason: null,
      completedAt: null,
      verifiedHashMatch: true,
    };

    try {
      const created = await api.createOrder(newOrder);
      setCreatedOrder(created);
      // Play sound chime to notify
      playOrderChime();
    } catch (err: any) {
      setErrorMessage(err.message || 'ऑर्डर सबमिट करने में समस्या आई');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Direct Counter / Owner Quick Approval right inside modal
  const handleQuickApprove = async (approveMethod: 'online' | 'cash') => {
    if (!createdOrder) return;
    setIsVerifying(true);
    try {
      const approved = await api.approvePayment(
        createdOrder.id,
        approveMethod,
        'Shop Owner (Quick Verify)',
        customerUtrNumber || undefined
      );
      if (approved) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        playOrderChime();
        setCreatedOrder(null);
        onOrderCompleted(approved);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'पुष्टि करने में विफल');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {language === 'hi' ? 'कैश या ऑनलाइन भुगतान' : 'Cash or Online Payment'}
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                ऑर्डर #{orderNumber} • कुल बिल:{' '}
                <strong className="text-white font-black text-sm">₹{totalAmount.toFixed(2)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Awaiting Shopkeeper Approval View */}
          {createdOrder ? (
            <div className="space-y-4 text-center py-2 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto animate-pulse shadow-md">
                <Receipt className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 inline-block">
                  🔔 दुकानदार से पुष्टि की प्रतीक्षा (Awaiting Owner Approval)
                </span>
                <h4 className="text-lg font-black text-slate-900 mt-2 font-mono">
                  ऑर्डर #{createdOrder.orderNumber}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  देय राशि: <strong className="text-slate-900 font-black text-base">₹{createdOrder.totalAmount.toFixed(2)}</strong> ({createdOrder.paymentMethod === 'counter_cash' ? 'नकद' : 'ऑनलाइन UPI'})
                </p>
              </div>

              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center justify-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  दुकानदार के कंप्यूटर / सिस्टम पर अलर्ट भेज दिया गया है!
                </p>
                <p className="text-slate-600 text-[11px]">
                  जैसे ही दुकानदार अपने कंप्यूटर या मोबाइल से पुष्टि करेंगे, प्रिंट तुरंत शुरू हो जाएगा।
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-600 py-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>लाइव जांच जारी है (Polling for Approval)...</span>
              </div>

              {/* Instant Counter / Shop Owner Quick Verify Buttons */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <p className="text-[11px] font-bold text-slate-600">
                  🏪 दुकानदार त्वरित सत्यापन (Store Owner 1-Tap Verification):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={() => handleQuickApprove('online')}
                    className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex flex-col items-center gap-1 shadow-md transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>✓ Online UPI Received</span>
                    <span className="text-[10px] font-normal opacity-90">ऑनलाइन प्राप्त हुआ</span>
                  </button>

                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={() => handleQuickApprove('cash')}
                    className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex flex-col items-center gap-1 shadow-md transition disabled:opacity-50"
                  >
                    <DollarSign className="w-5 h-5" />
                    <span>💵 Cash Received</span>
                    <span className="text-[10px] font-normal opacity-90">काउंटर नकद प्राप्त</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreatedOrder(null)}
                className="text-xs text-slate-400 hover:text-slate-600 underline pt-2"
              >
                ← वापस भुगतान विकल्प पर जाएं
              </button>
            </div>
          ) : (
            <>
              {/* Payment Method Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('upi')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
                    selectedMethod === 'upi'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>1. ऑनलाइन UPI (QR/Apps)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('cash')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
                    selectedMethod === 'cash'
                      ? 'bg-white text-amber-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>2. काउंटर नकद (Cash)</span>
                </button>
              </div>

              {/* TAB 1: ONLINE UPI */}
              {selectedMethod === 'upi' && (
                <div className="space-y-3.5 pt-1">
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-xs font-bold text-slate-700 text-center">
                      Google Pay, PhonePe, Paytm या किसी भी UPI ऐप से स्कैन करें:
                    </span>

                    {/* QR Code */}
                    {upiQrDataUrl ? (
                      <div className="p-2 bg-white rounded-2xl shadow-md border border-slate-200">
                        <img src={upiQrDataUrl} alt="UPI QR Code" className="w-44 h-44 object-contain" />
                      </div>
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      </div>
                    )}

                    {/* Amount & UPI Copy */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                      <span className="font-mono text-slate-700">{upiId}</span>
                      <button
                        type="button"
                        onClick={copyUpiId}
                        className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedUpi ? 'कॉपी हुआ ✓' : 'कॉपी'}</span>
                      </button>
                    </div>

                    {/* Direct UPI Apps */}
                    <div className="w-full pt-1">
                      <span className="text-[11px] font-bold text-slate-500 block text-center mb-1.5">
                        सीधे मोबाइल ऐप से भुगतान करें:
                      </span>
                      <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                        <a
                          href={upiUri}
                          className="py-2 px-1 text-center rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 text-[11px]"
                        >
                          GPay
                        </a>
                        <a
                          href={upiUri}
                          className="py-2 px-1 text-center rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-[11px]"
                        >
                          PhonePe
                        </a>
                        <a
                          href={upiUri}
                          className="py-2 px-1 text-center rounded-xl bg-blue-500 text-white hover:bg-blue-600 text-[11px]"
                        >
                          Paytm
                        </a>
                        <a
                          href={upiUri}
                          className="py-2 px-1 text-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-[11px]"
                        >
                          BHIM
                        </a>
                      </div>
                    </div>

                    {/* UTR Ref */}
                    <div className="w-full space-y-1 pt-1">
                      <label className="block text-[11px] font-bold text-slate-600 text-left">
                        UTR / ट्रांजेक्शन नंबर (वैकल्पिक):
                      </label>
                      <input
                        type="text"
                        placeholder="12-अंक UPI Ref / UTR"
                        value={customerUtrNumber}
                        onChange={(e) => setCustomerUtrNumber(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 py-1.5 px-3 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                      />
                    </div>
                  </div>

                  {/* Submit Online Payment */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSubmitOrder('upi_qr')}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>ऑर्डर दर्ज हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>✓ मैंने ऑनलाइन UPI भुगतान कर दिया (Confirm ₹{totalAmount.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 2: CASH AT COUNTER */}
              {selectedMethod === 'cash' && (
                <div className="space-y-4 pt-1">
                  <div className="p-5 bg-amber-50 rounded-2xl border-2 border-amber-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        काउंटर पर नकद भुगतान (Pay Cash at Shop Counter)
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        दुकानदार को काउंटर पर नकद राशि{' '}
                        <strong className="text-slate-900 text-sm font-black">₹{totalAmount.toFixed(2)}</strong> दें।
                      </p>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-amber-200 text-xs text-slate-600">
                      दुकानदार आपके ऑर्डर नंबर <strong>{orderNumber}</strong> पर नकद राशि लेकर तुरंत सिस्टम में पुष्टि करेंगे, जिसके बाद प्रिंट स्वचालित रूप से निकल जाएगा।
                    </div>
                  </div>

                  {/* Submit Cash Order */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSubmitOrder('counter_cash')}
                    className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-lg shadow-amber-600/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>ऑर्डर दर्ज हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <Receipt className="w-5 h-5" />
                        <span>💵 काउंटर नकद देकर प्रिंट करें (Submit Cash Order)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
