'use client';

import React, { useEffect, useState } from 'react';
import {
  checkBackendHealth,
  getEffectiveApiUrl,
  getStoredApiUrl,
  setStoredApiUrl,
} from '@/lib/api';
import {
  Activity,
  AlertCircle,
  Settings,
  X,
  ExternalLink,
  CheckCircle,
  RefreshCw,
  Server,
} from 'lucide-react';

export function BackendStatusBadge() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  const checkStatus = async () => {
    const res = await checkBackendHealth();
    setIsOnline(res.isOnline);
    setActiveUrl(res.activeUrl);
  };

  useEffect(() => {
    checkStatus();
    setInputUrl(getStoredApiUrl() || '');
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const target = inputUrl.trim().replace(/\/+$/, '');
    const res = await checkBackendHealth(target || undefined);

    setIsTesting(false);
    setIsOnline(res.isOnline);
    setActiveUrl(res.activeUrl);

    if (res.isOnline) {
      setTestResult({
        success: true,
        message: 'Connected successfully to diagnostic gateway!',
      });
      setTimeout(() => {
        setShowModal(false);
        setTestResult(null);
      }, 1800);
    } else {
      setTestResult({
        success: false,
        message: res.message || 'Unable to connect to target URL. If using Render free tier, wait ~45s for cold start.',
      });
    }
  };

  const handleResetToDefault = async () => {
    setStoredApiUrl(null);
    setInputUrl('');
    setIsTesting(true);
    setTestResult(null);
    const res = await checkBackendHealth();
    setIsTesting(false);
    setIsOnline(res.isOnline);
    setActiveUrl(res.activeUrl);
    setTestResult({
      success: res.isOnline,
      message: res.isOnline ? 'Restored standard default gateway' : 'Default gateway is currently unreachable',
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-[4px] text-[11px] sm:text-xs font-mono border transition-all cursor-pointer hover:shadow-hairline ${
          isOnline === null
            ? 'bg-clinical-panel border-clinical-border text-clinical-muted'
            : isOnline
            ? 'bg-pharm-green-bg border-pharm-green-border text-pharm-green-dark hover:border-pharm-green'
            : 'bg-alert-red-bg border-alert-red-border text-alert-red-dark hover:border-alert-red animate-pulse'
        }`}
        title={`Click to configure Diagnostics API Gateway: ${activeUrl || getEffectiveApiUrl()}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-[1px] flex-shrink-0 ${
            isOnline === null
              ? 'bg-clinical-muted'
              : isOnline
              ? 'bg-pharm-green'
              : 'bg-alert-red'
          }`}
        />
        {isOnline === null ? (
          <span className="tracking-tight text-[10px] sm:text-xs">CHECKING...</span>
        ) : isOnline ? (
          <span className="flex items-center gap-1 tracking-tight font-medium text-[10px] sm:text-xs">
            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[1.5] flex-shrink-0" />
            <span className="hidden sm:inline">API: </span>
            <span>ONLINE</span>
            <Settings className="w-3 h-3 text-pharm-green ml-0.5 opacity-60 hover:opacity-100" />
          </span>
        ) : (
          <span className="flex items-center gap-1 tracking-tight font-medium text-[10px] sm:text-xs">
            <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[1.5] flex-shrink-0" />
            <span className="hidden sm:inline">API: </span>
            <span>OFFLINE</span>
            <span className="text-[9px] underline underline-offset-2 ml-0.5 text-alert-red-dark hidden xs:inline">
              [CONNECT]
            </span>
          </span>
        )}
      </button>

      {/* Gateway Configuration & Quick Connect Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-clinical-navy/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-clinical-surface border border-clinical-border rounded-[4px] shadow-2xl max-w-lg w-full max-h-[92dvh] flex flex-col overflow-hidden text-clinical-navy">
            {/* Modal Header */}
            <div className="bg-clinical-panel border-b border-clinical-border px-4 sm:px-5 py-3.5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-clinical-navy stroke-[1.75]" />
                <h3 className="font-serif text-sm sm:text-base font-bold text-clinical-navy">
                  Diagnostics API Gateway Connection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-clinical-muted hover:text-clinical-navy text-xs font-mono p-1 rounded-[2px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs font-sans">
              <div className="bg-clinical-panel/70 border border-clinical-border rounded-[4px] p-3 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-clinical-muted">CURRENT GATEWAY TARGET:</span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded-[2px] text-[10px] ${
                      isOnline
                        ? 'bg-pharm-green-bg text-pharm-green-dark border border-pharm-green-border'
                        : 'bg-alert-red-bg text-alert-red-dark border border-alert-red-border'
                    }`}
                  >
                    {isOnline ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
                <div className="font-bold text-clinical-navy break-all bg-white p-2 rounded-[2px] border border-clinical-border">
                  {activeUrl || getEffectiveApiUrl()}
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-[4px] border text-xs font-mono flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-pharm-green-bg border-pharm-green-border text-pharm-green-dark'
                      : 'bg-alert-red-bg border-alert-red-border text-alert-red-dark'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 text-pharm-green flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-alert-red flex-shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{testResult.message}</span>
                </div>
              )}

              {/* Quick Connect Form */}
              <form onSubmit={handleTestAndSave} className="space-y-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-clinical-navy mb-1">
                    ENTER RENDER BACKEND URL:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://medverify-backend-xxxx.onrender.com"
                      className="flex-1 bg-white border border-clinical-border rounded-[4px] px-3 py-2 text-xs font-mono text-clinical-navy focus:outline-none focus:border-clinical-navy min-h-[42px]"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isTesting}
                      className="px-4 py-2 bg-clinical-navy hover:bg-clinical-navy-light text-white font-mono text-xs font-semibold rounded-[4px] transition-colors flex items-center justify-center gap-1.5 shadow-hairline disabled:opacity-70 cursor-pointer min-h-[42px] flex-shrink-0"
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>CONNECTING...</span>
                        </>
                      ) : (
                        <span>TEST &amp; CONNECT</span>
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-clinical-muted font-sans mt-1 block">
                    Copy the URL directly from your open Render dashboard tab (e.g. <code>https://medverify-backend-xxxx.onrender.com</code>).
                  </span>
                </div>
              </form>

              {/* Render Cold Start Note */}
              <div className="border border-clinical-border bg-clinical-panel p-3 rounded-[4px] space-y-1.5">
                <div className="font-mono font-bold text-[11px] text-clinical-navy flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-clinical-navy" />
                  RENDER FREE TIER COLD START:
                </div>
                <p className="text-[11px] text-clinical-subtext leading-relaxed">
                  Render spins down free web services after 15 minutes of inactivity. When you connect, the first request may take <strong>30 to 50 seconds</strong> to spin up the container. Once awake, all scans respond instantly in ~1 second.
                </p>
              </div>

              {/* Permanent Fix Instructions for Vercel */}
              <div className="border border-clinical-border bg-white p-3.5 rounded-[4px] space-y-2">
                <div className="font-mono font-bold text-xs text-clinical-navy flex items-center justify-between">
                  <span>PERMANENT FIX FOR ALL USERS (VERCEL):</span>
                  <a
                    href="https://vercel.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-clinical-muted hover:text-clinical-navy inline-flex items-center gap-1 text-[11px]"
                  >
                    <span>Vercel Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <ol className="list-decimal list-inside text-[11px] text-clinical-subtext space-y-1 leading-relaxed">
                  <li>Go to your open <strong>Vercel Dashboard tab</strong> (project <code>med-verify</code>).</li>
                  <li>Click <strong>Settings &rarr; Environment Variables</strong>.</li>
                  <li>Add Variable Name: <code className="text-clinical-navy font-bold">NEXT_PUBLIC_API_URL</code></li>
                  <li>Add Value: <code className="text-clinical-navy font-bold">https://your-backend.onrender.com</code></li>
                  <li>Go to <strong>Deployments &rarr; click &ldquo;...&rdquo; on latest commit &rarr; Redeploy</strong>.</li>
                </ol>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-clinical-panel border-t border-clinical-border px-4 sm:px-5 py-3 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={isTesting}
                className="text-xs font-mono text-clinical-muted hover:text-clinical-navy cursor-pointer"
              >
                [Reset to Auto-Detect]
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 text-xs font-mono text-clinical-navy bg-white hover:bg-clinical-panel border border-clinical-border rounded-[4px] transition-colors cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
