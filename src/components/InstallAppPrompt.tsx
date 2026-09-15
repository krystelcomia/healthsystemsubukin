import React, { useState, useEffect } from "react";
import { Download, Share, PlusSquare, Smartphone, Monitor, X, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import barangayLogo from "@/assets/barangay-logo.png";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if running as installed standalone app
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) {
      return;
    }

    // Detect device OS
    const ua = window.navigator.userAgent || "";
    const iosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const androidDevice = /Android/i.test(ua);
    setIsIOS(iosDevice);
    setIsAndroid(androidDevice);

    // Listen for Chrome / Android / Edge PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      const dismissed = sessionStorage.getItem("subukin_pwa_dismissed");
      if (!dismissed) {
        // Show after brief delay so page is loaded
        setTimeout(() => setShowBanner(true), 1500);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // For iOS or browsers where prompt event doesn't fire immediately, show banner if not dismissed
    const timer = setTimeout(() => {
      const dismissed = sessionStorage.getItem("subukin_pwa_dismissed");
      if (!checkStandalone() && !dismissed) {
        setShowBanner(true);
      }
    }, 2000);

    // Listen for custom trigger to open install modal from anywhere in the app
    const handleCustomTrigger = () => {
      handleTriggerInstall();
    };
    window.addEventListener("open-pwa-install-dialog", handleCustomTrigger);

    // Detect when installed successfully
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowBanner(false);
      setShowGuideModal(false);
      setDeferredPrompt(null);
      toast.success("Barangay Subukin App is successfully installed!", {
        description: "You can now open and use it directly from your home screen.",
      });
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("open-pwa-install-dialog", handleCustomTrigger);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          toast.success("Installing Barangay Subukin App...");
          setShowBanner(false);
          setDeferredPrompt(null);
        } else {
          toast.info("Installation dismissed. You can install anytime!");
        }
      } catch (err) {
        console.error("Install prompt error:", err);
        setShowGuideModal(true);
      }
    } else {
      // If native deferredPrompt isn't available (e.g. iOS Safari, Firefox, or Desktop manual)
      setShowGuideModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem("subukin_pwa_dismissed", "true");
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom Banner Prompt */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-emerald-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-start gap-3.5">
            <img
              src={barangayLogo}
              alt="Barangay Subukin"
              className="h-12 w-12 rounded-xl object-contain bg-white/10 p-1 shrink-0 border border-white/20 shadow-sm"
            />
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 rounded border border-emerald-400/30">
                  App Available
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1 leading-tight">
                Install Barangay Subukin App
              </h4>
              <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
                Download to your home screen or desktop for fast, offline-ready access anytime.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleTriggerInstall}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-3.5 py-1.5 h-8 shadow-md transition-all active:scale-95"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Install App
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismissBanner}
                  className="text-xs text-emerald-200 hover:text-white hover:bg-white/10 h-8 px-2.5"
                >
                  Later
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismissBanner}
              className="text-emerald-300/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}



      {/* Detailed Install Guide Dialog (for iOS Safari, Desktop browsers, etc.) */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="sm:max-w-md max-w-[95vw] rounded-2xl p-6">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={barangayLogo}
                alt="Barangay Subukin Logo"
                className="h-12 w-12 rounded-xl object-contain bg-emerald-50 p-1 border border-emerald-200 shadow-sm"
              />
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                  Install Subukin Health App
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Barangay Subukin Health Management Information System
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* iOS Specific Instructions */}
          {isIOS ? (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <Smartphone className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Follow these 3 quick steps in <strong>Safari</strong> on your iPhone or iPad:
                </span>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">
                      Tap the <strong className="text-emerald-700">Share</strong> button
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Look for the <Share className="inline h-3.5 w-3.5 mx-1 text-emerald-600" /> icon at the bottom of your Safari screen (or top on iPad).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">
                      Select <strong className="text-emerald-700">"Add to Home Screen"</strong>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Scroll down the share sheet and tap <PlusSquare className="inline h-3.5 w-3.5 mx-1 text-emerald-600" /> Add to Home Screen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                    3
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">
                      Tap <strong className="text-emerald-700">"Add"</strong>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tap "Add" in the top-right corner to complete downloading the app to your screen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : isAndroid ? (
            /* Android Specific Instructions */
            <div className="space-y-4 py-2">
              {deferredPrompt ? (
                <div className="text-center py-3">
                  <p className="text-xs sm:text-sm text-slate-600 mb-4">
                    Tap the button below to install the Barangay Subukin App directly on your Android phone or tablet:
                  </p>
                  <Button
                    onClick={handleTriggerInstall}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 font-semibold shadow-md"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Install on Device Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>In Chrome / Android browser:</span>
                  </div>
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                      1
                    </span>
                    <p className="text-slate-800">
                      Tap the browser menu <strong>(⋮ three dots)</strong> in the top right.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                      2
                    </span>
                    <p className="text-slate-800">
                      Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                      3
                    </span>
                    <p className="text-slate-800">
                      Tap <strong>"Install"</strong> to confirm.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Desktop / Laptop / PC Instructions */
            <div className="space-y-4 py-2">
              {deferredPrompt ? (
                <div className="text-center py-2">
                  <p className="text-xs sm:text-sm text-slate-600 mb-4">
                    Install Barangay Subukin App onto your computer for instant launching from your desktop or taskbar:
                  </p>
                  <Button
                    onClick={handleTriggerInstall}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 shadow-md"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Install App on Computer
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>In Chrome, Edge, or Brave:</span>
                  </div>
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                      1
                    </span>
                    <p className="text-slate-800">
                      Click the <strong>Install</strong> icon in the address bar (at the far right of the URL bar).
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                      2
                    </span>
                    <p className="text-slate-800">
                      Or click the browser menu <strong>(⋮)</strong> &gt; <strong>"Install Barangay Subukin..."</strong> or <strong>"Apps &gt; Install this site as an app"</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 pt-2 border-t border-slate-100 flex flex-row items-center justify-between sm:justify-end gap-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Works on any device
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuideModal(false)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default InstallAppPrompt;
