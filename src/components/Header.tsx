import React from 'react';
import { Printer, Shield, Search, Phone, MessageSquare, Clock, Store } from 'lucide-react';
import { ShopSettings } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  settings: ShopSettings;
  language: 'hi' | 'en';
  onLanguageToggle: () => void;
  onOpenTracking: () => void;
  onOpenAdmin: () => void;
  isAdmin: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  language,
  onLanguageToggle,
  onOpenTracking,
  onOpenAdmin,
  isAdmin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Shop Info Strip */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 hidden sm:block">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-200 font-medium">
              <Store className="w-3.5 h-3.5 text-blue-400" />
              {settings.shopAddress || 'Station Road, Jaipur'}
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {settings.openingHours}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`tel:${settings.mobileNumber}`}
              className="flex items-center gap-1 hover:text-white transition"
            >
              <Phone className="w-3 h-3 text-emerald-400" />
              {settings.mobileNumber}
            </a>
            <a
              href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-white transition text-emerald-400 font-medium"
            >
              <MessageSquare className="w-3 h-3" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Main Bar - Optimized for Mobile & Desktop */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
        {/* Mobile View: Line 1 = Shop Name, Line 2 = Action Buttons */}
        <div className="block sm:hidden space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <h1 className="text-sm font-black text-slate-900 truncate tracking-tight flex-1" title={settings.shopName}>
              {settings.shopName || 'JALAD PRINTERS & EMITRA CENTER CHIKHALI'}
            </h1>
          </div>

          {/* Line 2: All buttons in single line */}
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
            <div className="flex items-center gap-1.5 shrink-0">
              <PWAInstallButton />
              <button
                type="button"
                onClick={onOpenTracking}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition shrink-0"
              >
                <Search className="w-3 h-3 text-slate-500" />
                <span>Track Order</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onLanguageToggle}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition shrink-0"
              >
                {language === 'hi' ? 'EN' : 'हिन्दी'}
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition bg-amber-600 text-white shrink-0"
                >
                  <Shield className="w-3 h-3" />
                  <span>Exit Admin</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition bg-slate-900 hover:bg-slate-800 text-white shrink-0 shadow-xs"
                  title="दुकानदार / एडमिन पैनल खोलें"
                >
                  <Store className="w-3 h-3 text-amber-400" />
                  <span>दुकानदार</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop / Tablet View */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0">
              <Printer className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-900 truncate" title={settings.shopName}>
                  {settings.shopName || 'JALAD PRINTERS & EMITRA CENTER CHIKHALI'}
                </h1>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  Online Print
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {settings.shopAddress || 'VPO CHIKHALI, TEH CHIKHALI, DIST. DUNGARPUR RAJASTHAN'}
              </p>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <button
              onClick={onOpenTracking}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Track Order</span>
            </button>
            <button
              onClick={onLanguageToggle}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
            >
              {language === 'hi' ? 'EN' : 'हिन्दी'}
            </button>
            {isAdmin ? (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition bg-amber-600 text-white shadow-xs hover:bg-amber-700"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Exit Admin</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition bg-slate-900 text-white shadow-xs hover:bg-slate-800"
                title="दुकानदार / एडमिन पैनल खोलें"
              >
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span>दुकानदार पैनल (Owner)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
