import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[11px] sm:text-xs font-bold rounded-lg border border-emerald-400/40 transition-all cursor-pointer shadow-md shadow-emerald-950/30 whitespace-nowrap shrink-0"
        title="Install Night Count State App"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#0e1b30] hover:bg-[#162744] text-emerald-400 text-[11px] sm:text-xs font-semibold rounded-lg border border-emerald-500/40 transition-all cursor-pointer whitespace-nowrap shrink-0"
          title="Install on iPhone / iPad"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-[#0b1424] border border-slate-700 p-5 shadow-2xl text-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/air-force-logo.png"
                    alt="Night Count State"
                    className="w-8 h-8 object-contain"
                  />
                  <h3 className="text-sm font-bold text-white">Install Night Count State</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                1. Tap the <strong className="text-white">Share</strong> button in Safari&apos;s toolbar.
                <br />
                2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
