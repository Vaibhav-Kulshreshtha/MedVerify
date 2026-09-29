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
  CheckCircle,
  Settings,
  X,
  RefreshCw,
  Server,
  Cpu,
} from 'lucide-react';

export function BackendStatusBadge() {
  const [isCloudOnline, setIsCloudOnline] = useState<boolean | null>(null);
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
    setIsCloudOnline(res.isOnline);
    setActiveUrl(res.activeUrl);
  };

  useEffect(() => {
    checkStatus();
    setInputUrl(getStoredApiUrl() || '');
    const interval = setInterval(checkStatus, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const target = inputUrl.trim().replace(/\/+$/, '');
    const res = await checkBackendHealth(target || undefined);

    setIsTesting(false);
    setIsCloudOnline(res.isOnline);
    setActiveUrl(res.activeUrl);

    if (res.isOnline) {
      setTestResult({
        success: true,
        message: 'Connected successfully to cloud/local FastAPI engine!',
      });
      setTimeout(() => {
        setShowModal(false);
        setTestResult(null);
      }, 1800);
    } else {
      setTestResult({
        success: false,
        message:
          res.message ||
          'Could not reach target URL. In-browser Edge Forensic Engine remains active so all scans continue to work.',
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
    setIsCloudOnline(res.isOnline);
    setActiveUrl(res.activeUrl);
    setTestResult({
      success: res.isOnline,
      message: res.isOnline
        ? 'Restored standard default gateway'
        : 'Stand-alone Edge Forensic Engine is active',
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-[4px] text-[11px] sm:text-xs font-mono border transition-all cursor-pointer hover:shadow-hairline ${
          isCloudOnline
            ? 'bg-pharm-green-bg border-pharm-green-border text-pharm-green-dark hover:border-pharm-green'
            : 'bg-pharm-green-bg/60 border-pharm-green-border/80 text-clinical-navy hover:border-pharm-green'
        }`}
        title={
          isCloudOnline
            ? `Cloud FastAPI Gateway: ${activeUrl || getEffectiveApiUrl()}`
            : 'Edge In-Browser Forensic Engine Active (Zero-Latency Standalone Mode)'
        }
      >
        <span className="w-1.5 h-1.5 rounded-[1px] bg-pharm-green flex-shrink-0 animate-pulse" />
        {isCloudOnline ? (
          <span className="flex items-center gap-1 tracking-tight font-medium text-[10px] sm:text-xs">
            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[1.5] flex-shrink-0 text-pharm-green" />
            <span className="hidden sm:inline">API: </span>
            <span>CLOUD ONLINE</span>
            <Settings className="w-3 h-3 text-pharm-green ml-0.5 opacity-60 hover:opacity-100" />
          </span>
        ) : (
          <span className="flex items-center gap-1 tracking-tight font-medium text-[10px] sm:text-xs text-clinical-navy">
            <Cpu className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[1.5] flex-shrink-0 text-pharm-green-dark" />
            <span className="hidden sm:inline">ENGINE: </span>
            <span className="font-semibold text-pharm-green-dark">ACTIVE (EDGE)</span>
            <span className="text-[9px] text-clinical-subtext ml-0.5 hidden xs:inline">
              [SETTINGS]
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
                  MedVerify Diagnostic Engine Status
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
              {/* Standalone Edge Forensic Status */}
              <div className="bg-pharm-green-bg/40 border border-pharm-green-border rounded-[4px] p-3 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-clinical-navy font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-pharm-green" />
                    IN-BROWSER FORENSIC ENGINE:
                  </span>
                  <span className="font-bold px-1.5 py-0.5 rounded-[2px] text-[10px] bg-pharm-green text-white">
                    OPERATIONAL
                  </span>
                </div>
                <p className="text-[11px] text-clinical-subtext leading-relaxed font-sans">
                  MedVerify includes an autonomous client-side computer vision engine. Even if remote cloud servers sleep or have network lag, packaging sharpness, edge density, and medicine database screening run 100% locally with zero downtime.
                </p>
              </div>

              {/* Cloud Gateway Status */}
              <div className="bg-clinical-panel/70 border border-clinical-border rounded-[4px] p-3 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-clinical-muted">CLOUD FASTAPI GATEWAY:</span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded-[2px] text-[10px] ${
                      isCloudOnline
                        ? 'bg-pharm-green-bg text-pharm-green-dark border border-pharm-green-border'
                        : 'bg-clinical-panel text-clinical-muted border border-clinical-border'
                    }`}
                  >
                    {isCloudOnline ? 'CONNECTED (ONLINE)' : 'STANDALONE MODE'}
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
                      : 'bg-clinical-panel border-clinical-border text-clinical-subtext'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-pharm-green flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{testResult.message}</span>
                </div>
              )}

              {/* Quick Connect Form */}
              <form onSubmit={handleTestAndSave} className="space-y-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-clinical-navy mb-1">
                    CONNECT CLOUD OR TUNNEL BACKEND (OPTIONAL):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://med-verify-backend.onrender.com"
                      className="flex-1 bg-white border border-clinical-border rounded-[4px] px-3 py-2 text-xs font-mono text-clinical-navy focus:outline-none focus:border-clinical-navy min-h-[42px]"
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
                        <span>TEST &amp; SAVE</span>
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-clinical-muted font-sans mt-1 block">
                    You can paste any Render URL or localtunnel URL. If left empty, MedVerify runs reliably using the built-in edge forensic engine.
                  </span>
                </div>
              </form>

              {/* Render Cold Start Note */}
              <div className="border border-clinical-border bg-clinical-panel p-3 rounded-[4px] space-y-1.5">
                <div className="font-mono font-bold text-[11px] text-clinical-navy flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-clinical-navy" />
                  RENDER FREE TIER SLEEP NOTE:
                </div>
                <p className="text-[11px] text-clinical-subtext leading-relaxed">
                  Render free tier spins down containers after 15 minutes of idle time. The first request takes <strong>30 to 45 seconds</strong> to boot. During this time, MedVerify seamlessly performs client-side verification so you never have to wait.
                </p>
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
                className="px-4 py-1.5 text-xs font-mono text-clinical-navy bg-white hover:bg-clinical-panel border border-clinical-border rounded-[4px] transition-colors cursor-pointer font-semibold"
              >
                CLOSE &amp; CONTINUE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
