import React from 'react';
import { Microscope, ShieldCheck } from 'lucide-react';
import { BackendStatusBadge } from './BackendStatusBadge';

export function Header() {
  return (
    <header className="border-b border-clinical-border bg-clinical-surface sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Clinical Lab Emblem */}
          <div className="h-10 w-10 rounded-[4px] border border-clinical-navy bg-clinical-navy flex items-center justify-center text-white shadow-hairline flex-shrink-0">
            <Microscope className="w-5 h-5 stroke-[1.5]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-clinical-navy">
                MedVerify
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-clinical-muted border-l border-clinical-border pl-2 hidden xs:inline">
                Diagnostic Core
              </span>
            </div>
            {/* User requirement: Tagline "Verify before you consume" in serif font */}
            <p className="text-xs sm:text-sm font-serif text-clinical-subtext tracking-tight font-normal">
              Verify before you consume
            </p>
          </div>
        </div>

        {/* Action / Telemetry Area */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-clinical-muted border-r border-clinical-border pr-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-pharm-green" />
              AUTHENTICITY VERIFICATION ACTIVE
            </span>
          </div>

          <BackendStatusBadge />
        </div>
      </div>
    </header>
  );
}
