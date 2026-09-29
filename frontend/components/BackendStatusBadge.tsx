'use client';

import React, { useEffect, useState } from 'react';
import { checkBackendHealth, API_BASE_URL } from '@/lib/api';
import { Activity, AlertCircle } from 'lucide-react';

export function BackendStatusBadge() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  const checkStatus = async () => {
    const res = await checkBackendHealth();
    setIsOnline(res.isOnline);
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-[4px] text-xs font-mono border transition-colors ${
        isOnline === null
          ? 'bg-clinical-panel border-clinical-border text-clinical-muted'
          : isOnline
          ? 'bg-pharm-green-bg border-pharm-green-border text-pharm-green-dark'
          : 'bg-alert-red-bg border-alert-red-border text-alert-red-dark'
      }`}
      title={`Diagnostics API Gateway: ${API_BASE_URL}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-[1px] ${
          isOnline === null
            ? 'bg-clinical-muted'
            : isOnline
            ? 'bg-pharm-green'
            : 'bg-alert-red'
        }`}
      />
      {isOnline === null ? (
        <span className="tracking-tight text-[11px] sm:text-xs">CHECKING...</span>
      ) : isOnline ? (
        <span className="flex items-center gap-1.5 tracking-tight font-medium text-[11px] sm:text-xs">
          <Activity className="w-3.5 h-3.5 stroke-[1.5]" />
          <span className="hidden sm:inline">API GATEWAY: </span>ONLINE
          <span className="hidden md:inline"> [PORT 8000]</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5 tracking-tight font-medium text-[11px] sm:text-xs">
          <AlertCircle className="w-3.5 h-3.5 stroke-[1.5]" />
          <span className="hidden sm:inline">API GATEWAY: </span>OFFLINE
        </span>
      )}
    </div>
  );
}
