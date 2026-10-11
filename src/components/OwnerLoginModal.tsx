import React, { useState } from 'react';
import { Shield, KeyRound, X, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface OwnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OwnerLoginModal: React.FC<OwnerLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const validPins = ['1234', 'admin', 'owner', '8696312384', '9982151938'];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (validPins.includes(pin.trim().toLowerCase())) {
      setError(false);
      setPin('');
      onSuccess();
    } else {
      setError(true);
    }
  };

  const handleQuickLogin = () => {
    setError(false);
    setPin('');
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative space-y-5 animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Heading */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
            <Shield className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900">
            दुकानदार / एडमिन लॉगिन
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            प्रिंट ऑर्डर्स, पेमेंट स्वीकृति, रेट लिस्ट, QR कोड और विज्ञापन (Ads) कंट्रोल के लिए लॉगिन करें।
          </p>
        </div>

        {/* Quick 1-Click Access for Owner */}
        <button
          type="button"
          onClick={handleQuickLogin}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition group"
        >
          <CheckCircle className="w-4 h-4 text-amber-600" />
          <span>⚡ तुरंत लॉगिन करें (डिफ़ॉल्ट PIN: 1234)</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <div className="relative flex items-center justify-center">
          <hr className="w-full border-slate-200" />
          <span className="absolute bg-white px-2 text-[11px] text-slate-400 font-medium">
            या PIN दर्ज करें
          </span>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Owner Security PIN</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              placeholder="1234"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError(false);
              }}
              className={`w-full px-4 py-2.5 rounded-xl border text-center font-mono tracking-widest text-lg font-bold outline-none transition ${
                error
                  ? 'border-red-400 bg-red-50/50 text-red-900 focus:ring-2 focus:ring-red-400'
                  : 'border-slate-300 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100'
              }`}
            />
            {error && (
              <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-1 justify-center">
                <AlertCircle className="w-3.5 h-3.5" />
                गलत PIN! डिफ़ॉल्ट PIN 1234 का उपयोग करें।
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
          >
            <span>दुकानदार पैनल खोलें (Open Panel)</span>
          </button>
        </form>

        <p className="text-[10px] text-slate-400 text-center">
          दुकान के कंप्यूटर पर सीधे खोलने के लिए URL में <span className="font-mono text-slate-600 font-bold">?admin=true</span> जोड़ सकते हैं।
        </p>
      </div>
    </div>
  );
};
