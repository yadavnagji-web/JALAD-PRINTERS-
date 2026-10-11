import React, { useEffect, useState, useRef } from 'react';
import {
  Bell,
  CheckCircle,
  CreditCard,
  DollarSign,
  Printer,
  X,
  AlertCircle,
  FileText,
  User,
  Phone,
  ArrowRight,
  ShieldAlert,
  Volume2,
} from 'lucide-react';
import { CustomerOrder } from '../types';
import { api } from '../services/api';
import { playOrderChime } from '../utils/audioAlert';
import { requestScreenWakeLock, releaseScreenWakeLock } from '../utils/wakeLock';
import { autoPrintOrder } from '../utils/silentPrinter';

interface OwnerPaymentApprovalModalProps {
  onOrderApproved?: (order: CustomerOrder) => void;
}

export const OwnerPaymentApprovalModal: React.FC<OwnerPaymentApprovalModalProps> = ({
  onOrderApproved,
}) => {
  const [pendingOrders, setPendingOrders] = useState<CustomerOrder[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dismissedOrderIds, setDismissedOrderIds] = useState<Set<string>>(new Set());
  const lastAlertedOrderId = useRef<string | null>(null);

  // Poll and SSE for orders awaiting approval for instant popup response
  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;

    const checkPending = async () => {
      try {
        const allOrders = await api.getOrders();
        if (!isMounted) return;
        const awaiting = allOrders.filter(
          (o) =>
            (o.paymentStatus === 'counter_pending' || o.paymentStatus === 'pending') &&
            o.printStatus !== 'cancelled' &&
            !dismissedOrderIds.has(o.id)
        );
        setPendingOrders(awaiting);
      } catch (e) {
        // Safe fallback
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 1200);

    // Live Server-Sent Events for 0ms latency desktop popup
    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource('/api/orders/live');
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'order_created' || data.type === 'order_updated' || data.type === 'order_approved') {
              if (isMounted) checkPending();
            }
          } catch {}
        };
      } catch {}
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [dismissedOrderIds]);

  const currentOrder = pendingOrders[0];

  // Trigger Audio Alert, Notification, and Wake Lock when an order appears
  useEffect(() => {
    if (!currentOrder) {
      document.title = 'Smart QR Print';
      releaseScreenWakeLock();
      return;
    }

    // Keep screen awake while order is pending
    requestScreenWakeLock();

    // Vibrate if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 100, 300]);
      } catch (e) {}
    }

    // Immediate sound alert
    playOrderChime();

    // Repeat chime every 4 seconds until owner verifies
    const chimeTimer = setInterval(() => {
      playOrderChime();
    }, 4000);

    // Desktop browser notification if permission granted
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      lastAlertedOrderId.current !== currentOrder.id
    ) {
      try {
        new Notification('🔔 नया प्रिंट ऑर्डर आया!', {
          body: `ऑर्डर #${currentOrder.orderNumber} - ₹${currentOrder.totalAmount} काउंटर पर पुष्टि करें`,
          icon: '/favicon.ico',
        });
        lastAlertedOrderId.current = currentOrder.id;
      } catch (e) {}
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch (e) {}
    }

    // Flashing tab title alert
    let toggle = false;
    const originalTitle = document.title;
    const titleTimer = setInterval(() => {
      document.title = toggle
        ? `🚨 नया ऑर्डर: ₹${currentOrder.totalAmount} (पुष्टि करें)`
        : `🔔 Smart QR Print - नया प्रिंट`;
      toggle = !toggle;
    }, 1000);

    return () => {
      clearInterval(chimeTimer);
      clearInterval(titleTimer);
      document.title = originalTitle;
      releaseScreenWakeLock();
    };
  }, [currentOrder?.id, currentOrder?.totalAmount]);

  if (!currentOrder) return null;

  const handleApprove = async (method: 'online' | 'cash') => {
    setIsProcessing(true);
    try {
      const approved = await api.approvePayment(
        currentOrder.id,
        method,
        'Shop Owner',
        currentOrder.paymentTxnId || undefined
      );
      if (approved) {
        autoPrintOrder(approved);
        setPendingOrders((prev) => prev.filter((o) => o.id !== currentOrder.id));
        if (onOrderApproved) onOrderApproved(approved);
      }
    } catch (err) {
      console.error('Failed to approve payment:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await api.updateOrderStatus(currentOrder.id, {
        paymentStatus: 'failed',
        printStatus: 'cancelled',
        failureReason: 'दुकानदार द्वारा अस्वीकृत (Rejected by Shopkeeper)',
      });
      setDismissedOrderIds((prev) => new Set(prev).add(currentOrder.id));
      setPendingOrders((prev) => prev.filter((o) => o.id !== currentOrder.id));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-4 border-amber-500 overflow-hidden transform animate-in zoom-in-95">
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl animate-bounce">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                नया प्रिंट ऑर्डर! भुगतान पुष्टि (Owner Approval)
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                ग्राहक काउंटर पर है • कृपया भुगतान देखकर पुष्टि करें
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissedOrderIds((prev) => new Set(prev).add(currentOrder.id))}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            title="Dismiss Alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Details Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Order Header Badge */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Order Number
              </span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {currentOrder.orderNumber}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Bill Amount
              </span>
              <span className="text-2xl font-black text-emerald-600">
                ₹{currentOrder.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Customer & Items Details */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400" />
                ग्राहक: <strong className="text-slate-900">{currentOrder.customerName || 'Walk-in Customer'}</strong>
              </span>
              <span className="text-slate-600 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {currentOrder.customerPhone || 'N/A'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                दस्तावेज ({currentOrder.items.length} Files):
              </span>
              <div className="space-y-1">
                {currentOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="truncate max-w-[260px] font-medium text-slate-800">
                      • {it.document.originalFileName}
                    </span>
                    <span className="font-semibold text-slate-600">
                      {it.config.paperSize} | {it.config.colorMode === 'color' ? 'Colour' : 'B&W'} | {it.config.copies} copy
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {currentOrder.paymentTxnId && (
              <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-[11px] font-mono">
                <span className="text-slate-500">Customer UTR / Ref:</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {currentOrder.paymentTxnId}
                </span>
              </div>
            )}
          </div>

          {/* Prompt */}
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-slate-800">
              ग्राहक ने किस माध्यम से भुगतान किया है? (Select Received Mode):
            </p>
            <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 py-1 px-3 rounded-lg border border-emerald-200 inline-block">
              ✓ बिना किसी SQP नंबर के, केवल एक क्लिक में प्रिंट तुरंत शुरू हो जाएगा
            </p>
          </div>

          {/* The Two Big Buttons as specifically requested */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleApprove('online')}
              className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition disabled:opacity-50"
            >
              <CreditCard className="w-5 h-5 shrink-0" />
              <div className="text-left">
                <span className="block leading-tight">✓ Online UPI Received</span>
                <span className="text-[10px] font-normal opacity-90 block">फोनपे/जीपे/QR प्राप्त हुआ</span>
              </div>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleApprove('cash')}
              className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/20 active:scale-95 transition disabled:opacity-50"
            >
              <DollarSign className="w-5 h-5 shrink-0" />
              <div className="text-left">
                <span className="block leading-tight">💵 Cash Received</span>
                <span className="text-[10px] font-normal opacity-90 block">काउंटर पर नकद प्राप्त हुआ</span>
              </div>
            </button>
          </div>

          {/* Reject Option */}
          <div className="pt-2 text-center">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleReject}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 py-1 transition"
            >
              अस्वीकृत करें (Reject Order)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
