import React, { useState, useEffect, useRef } from "react";
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Minimize2, 
  Maximize2, 
  User, 
  Shield, 
  MapPin, 
  Radio, 
  Sparkles,
  Lock,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { logActivity } from "@/lib/activityLogger";
import { useAuth } from "@/contexts/AuthContext";

export interface ContactTarget {
  id: number | string;
  name: string;
  phone: string;
  role: string;
  sitio?: string;
}

interface InSystemCallModalProps {
  contact: ContactTarget | null;
  isOpen: boolean;
  initialMode?: "chooser" | "audio" | "video";
  onClose: () => void;
}

// Gentle audio synth for realistic Messenger-style calling and connecting sound effects
class WebAudioRingtone {
  private ctx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private ringInterval: any = null;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public startRinging() {
    try {
      this.init();
      if (!this.ctx) return;
      this.stop();

      const playTone = () => {
        if (!this.ctx || this.ctx.state === "closed") return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(440, this.ctx.currentTime); // Standard ringback tone
        osc2.frequency.setValueAtTime(480, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 1.2);
        osc2.stop(this.ctx.currentTime + 1.2);
      };

      playTone();
      this.ringInterval = setInterval(playTone, 2800);
    } catch {}
  }

  public playConnectedChime() {
    try {
      this.stop();
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, this.ctx.currentTime + 0.15); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, this.ctx.currentTime + 0.3); // G5

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.45);
    } catch {}
  }

  public playEndCallChime() {
    try {
      this.stop();
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch {}
  }

  public stop() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }
}

const ringtone = new WebAudioRingtone();

export const InSystemCallModal: React.FC<InSystemCallModalProps> = ({
  contact,
  isOpen,
  initialMode = "chooser",
  onClose
}) => {
  const { user, fullName, username } = useAuth();
  const callerName = fullName || username || user?.email?.split("@")[0] || "Health Worker";

  const [callState, setCallState] = useState<"chooser" | "calling" | "connected" | "ended">("chooser");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  // Initialize or reset state when opening modal
  useEffect(() => {
    if (isOpen && contact) {
      setIsMinimized(false);
      setDuration(0);
      setIsMuted(false);
      setIsVideoEnabled(true);
      setIsSpeakerOn(true);

      if (initialMode === "audio") {
        setCallType("audio");
        startCall("audio");
      } else if (initialMode === "video") {
        setCallType("video");
        startCall("video");
      } else {
        setCallState("chooser");
      }
    } else {
      cleanupMedia();
      ringtone.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      cleanupMedia();
      ringtone.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, contact, initialMode]);

  const cleanupMedia = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startCall = async (type: "audio" | "video") => {
    setCallType(type);
    setCallState("calling");
    setDuration(0);

    // Play ringing tone
    ringtone.startRinging();

    // Log call initiation in Activity Logs
    logActivity({
      action: "IN_SYSTEM_CALL_INITIATED",
      entityType: "COMMUNICATION",
      description: `Initiated in-system ${type === "video" ? "Video" : "Audio"} Call to ${contact?.name} (${contact?.phone})`,
      workerName: callerName,
      userEmail: user?.email || undefined
    });

    // Start local camera if video call
    if (type === "video") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        setHasCameraPermission(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera not accessible or permission denied:", err);
        setHasCameraPermission(false);
      }
    }

    // Simulate realistic connection time (approx 2.5s)
    setTimeout(() => {
      ringtone.stop();
      ringtone.playConnectedChime();
      setCallState("connected");

      // Start call timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }, 2600);
  };

  const handleEndCall = () => {
    ringtone.stop();
    ringtone.playEndCallChime();
    setCallState("ended");

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cleanupMedia();

    // Log call conclusion in Activity Logs
    if (duration > 0 && contact) {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      const durationStr = `${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`;
      logActivity({
        action: "IN_SYSTEM_CALL_ENDED",
        entityType: "COMMUNICATION",
        description: `Completed in-system ${callType === "video" ? "Video" : "Audio"} Call with ${contact.name} (Duration: ${durationStr})`,
        workerName: callerName,
        userEmail: user?.email || undefined
      });
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  };

  const toggleVideo = async () => {
    if (callType === "audio") {
      // Upgrade from audio to video
      setCallType("video");
      setIsVideoEnabled(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        setHasCameraPermission(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch {
        setHasCameraPermission(false);
      }
    } else {
      setIsVideoEnabled((prev) => {
        const next = !prev;
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getVideoTracks().forEach((track) => {
            track.enabled = next;
          });
        }
        return next;
      });
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen || !contact) return null;

  // 1. Minimized Floating Chat-Head / PiP View (like Messenger)
  if (isMinimized && callState !== "chooser") {
    return (
      <div 
        className="fixed bottom-6 right-20 z-50 flex items-center gap-3 p-3 rounded-2xl bg-slate-900/95 text-white border border-sky-500/40 shadow-2xl backdrop-blur-md animate-bounce-subtle cursor-pointer select-none"
        onClick={() => setIsMinimized(false)}
      >
        <div className="relative">
          <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-lg text-white border-2 border-white/60">
            {contact.name.charAt(0)}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold leading-tight truncate max-w-[120px]">{contact.name}</span>
          <span className="text-[10px] text-sky-300 font-mono">
            {callState === "calling" ? "Calling..." : formatTimer(duration)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleEndCall();
            }}
            className="h-8 w-8 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Call Chooser Modal ("Audio Call" or "Video Call")
  if (callState === "chooser") {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          <div className="p-6 text-center bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-transparent border-b border-border/40">
            <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-white dark:border-slate-800">
              {contact.name.charAt(0)}
              <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" />
            </div>
            
            <h3 className="mt-4 text-xl font-heading font-extrabold text-foreground">
              {contact.name}
            </h3>
            <p className="text-xs font-semibold text-primary mt-0.5 uppercase tracking-wide">
              {contact.role}
            </p>
            {contact.sitio && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3 text-primary" />
                <span>Assigned Sitio: {contact.sitio}</span>
              </p>
            )}

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-foreground">
              <PhoneCall className="h-3.5 w-3.5 text-primary" />
              <span>{contact.phone}</span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-muted/40 p-3 rounded-xl border border-border/50 text-xs text-muted-foreground flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>In-System Health Call:</strong> This call will take place directly inside the Barangay Health System network (Messenger style), requiring no mobile carrier load or telephone charges.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                onClick={() => startCall("audio")}
                size="lg"
                className="h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex flex-col items-center justify-center gap-1 shadow-md active:scale-95 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  <span className="text-sm">Audio Call</span>
                </div>
                <span className="text-[10px] font-normal text-emerald-100">Voice call in system</span>
              </Button>

              <Button
                onClick={() => startCall("video")}
                size="lg"
                className="h-14 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex flex-col items-center justify-center gap-1 shadow-md active:scale-95 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  <span className="text-sm">Video Call</span>
                </div>
                <span className="text-[10px] font-normal text-sky-100">Camera video call</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // 3. Messenger-Style Active Calling Screen (Full experience)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-2xl h-[580px] max-h-[92vh] rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden text-white">
        
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-sky-950/40 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Top Header Controls Bar */}
        <div className="relative z-10 px-5 py-3.5 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Lock className="h-3 w-3 text-sky-400" />
              BHW System Secure Call
            </span>
            <Badge variant="outline" className="text-[10px] py-0 px-2 border-white/20 text-slate-300 font-mono uppercase">
              {callType === "video" ? "Video Mode" : "Voice Mode"}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-300 transition-colors"
              title="Minimize call to floating bubble"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleEndCall}
              className="h-8 w-8 rounded-full hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 flex items-center justify-center transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Viewport Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 min-h-0">
          
          {/* A. Video Mode Screen */}
          {callType === "video" && (
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center shadow-inner">
              
              {/* Simulated Remote Video Stream / Avatar Display */}
              <div className="flex flex-col items-center text-center p-6 space-y-3">
                <div className="relative">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-5xl font-extrabold shadow-2xl border-4 border-white/20">
                    {contact.name.charAt(0)}
                  </div>
                  {callState === "calling" && (
                    <div className="absolute inset-0 rounded-full border-4 border-sky-400 animate-ping opacity-40 pointer-events-none" />
                  )}
                  {callState === "connected" && (
                    <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-md" />
                  )}
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                    {contact.name}
                  </h2>
                  <p className="text-xs text-sky-300 font-medium mt-0.5 uppercase tracking-wider">
                    {contact.role} • {contact.sitio || "Barangay Subukin"}
                  </p>
                </div>

                <div className="pt-1">
                  {callState === "calling" && (
                    <div className="flex items-center gap-2 text-sm text-sky-400 animate-pulse font-medium">
                      <Radio className="h-4 w-4" />
                      <span>Ringing in system...</span>
                    </div>
                  )}
                  {callState === "connected" && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Connected • {formatTimer(duration)}</span>
                    </div>
                  )}
                  {callState === "ended" && (
                    <span className="text-sm text-rose-400 font-bold">Call Ended</span>
                  )}
                </div>
              </div>

              {/* PiP Local Webcam Video Feed in Corner (Messenger Style) */}
              <div className="absolute bottom-3 right-3 w-28 sm:w-36 h-36 sm:h-48 rounded-xl overflow-hidden bg-slate-800 border-2 border-white/30 shadow-2xl flex items-center justify-center group">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover mirror ${isVideoEnabled && hasCameraPermission ? "block" : "hidden"}`}
                  style={{ transform: "scaleX(-1)" }}
                />
                {(!isVideoEnabled || !hasCameraPermission) && (
                  <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400">
                    <User className="h-8 w-8 text-slate-500 mb-1" />
                    <span className="text-[10px] font-medium leading-tight">You (Camera off)</span>
                  </div>
                )}
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white uppercase backdrop-blur-xs">
                  You
                </div>
              </div>
            </div>
          )}

          {/* B. Audio Mode Screen */}
          {callType === "audio" && (
            <div className="flex flex-col items-center text-center space-y-4 my-auto">
              {/* Pulsating Messenger Rings around Avatar */}
              <div className="relative flex items-center justify-center">
                {callState === "calling" && (
                  <>
                    <div className="absolute w-44 h-44 rounded-full border border-sky-400/30 animate-ping [animation-duration:2.5s] pointer-events-none" />
                    <div className="absolute w-56 h-56 rounded-full border border-sky-400/20 animate-ping [animation-duration:3s] pointer-events-none" />
                  </>
                )}
                {callState === "connected" && (
                  <div className="absolute w-40 h-40 rounded-full bg-sky-500/10 animate-pulse pointer-events-none" />
                )}

                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-5xl font-extrabold shadow-2xl border-4 border-white/20">
                  {contact.name.charAt(0)}
                  {callState === "connected" && (
                    <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-md" />
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
                  {contact.name}
                </h2>
                <p className="text-xs text-sky-300 font-semibold uppercase tracking-wider mt-1">
                  {contact.role}
                </p>
                {contact.sitio && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-sky-400" />
                    <span>Assigned Sitio: {contact.sitio}</span>
                  </p>
                )}
              </div>

              {/* Status and Audio Waves */}
              <div className="pt-2 flex flex-col items-center gap-3">
                {callState === "calling" && (
                  <div className="flex items-center gap-2 text-sm text-sky-400 animate-pulse font-semibold">
                    <Radio className="h-4 w-4" />
                    <span>Connecting in system...</span>
                  </div>
                )}

                {callState === "connected" && (
                  <>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/30">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>CONNECTED • {formatTimer(duration)}</span>
                    </div>

                    {/* Simulated Messenger Audio Waves */}
                    <div className="flex items-center gap-1.5 h-6">
                      <span className="w-1 bg-sky-400 rounded-full animate-pulse h-3" />
                      <span className="w-1 bg-sky-400 rounded-full animate-pulse h-5 [animation-delay:0.1s]" />
                      <span className="w-1 bg-sky-400 rounded-full animate-pulse h-6 [animation-delay:0.2s]" />
                      <span className="w-1 bg-sky-400 rounded-full animate-pulse h-4 [animation-delay:0.15s]" />
                      <span className="w-1 bg-sky-400 rounded-full animate-pulse h-2 [animation-delay:0.05s]" />
                    </div>
                  </>
                )}

                {callState === "ended" && (
                  <div className="text-sm text-rose-400 font-bold bg-rose-500/10 px-4 py-1 rounded-full border border-rose-500/30">
                    Call Ended
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Floating Control Dock (Messenger Style) */}
        <div className="relative z-10 px-6 py-5 bg-black/40 border-t border-white/10 backdrop-blur-md flex items-center justify-center gap-3 sm:gap-5">
          
          {/* Mute Mic */}
          <button
            onClick={toggleMute}
            className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-lg ${
              isMuted 
                ? "bg-rose-500 text-white" 
                : "bg-white/15 hover:bg-white/25 text-white"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />}
          </button>

          {/* Toggle Video */}
          <button
            onClick={toggleVideo}
            className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-lg ${
              callType === "video" && isVideoEnabled
                ? "bg-white/15 hover:bg-white/25 text-white"
                : "bg-slate-700/80 hover:bg-slate-700 text-slate-300"
            }`}
            title={callType === "video" && isVideoEnabled ? "Turn Off Camera" : "Turn On Video"}
          >
            {callType === "video" && isVideoEnabled ? (
              <Video className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </button>

          {/* End Call Button (Big Red Center button) */}
          <button
            onClick={handleEndCall}
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-all duration-200 shadow-xl hover:scale-105 active:scale-95"
            title="End Call"
          >
            <PhoneOff className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>

          {/* Toggle Speaker */}
          <button
            onClick={() => setIsSpeakerOn((p) => !p)}
            className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-lg ${
              isSpeakerOn
                ? "bg-white/15 hover:bg-white/25 text-white"
                : "bg-slate-700/80 text-slate-400"
            }`}
            title={isSpeakerOn ? "Speaker Muted" : "Speaker On"}
          >
            {isSpeakerOn ? <Volume2 className="h-5 w-5 sm:h-6 sm:w-6" /> : <VolumeX className="h-5 w-5 sm:h-6 sm:w-6" />}
          </button>

          {/* Switch to Audio/Video */}
          <button
            onClick={() => {
              if (callType === "audio") {
                startCall("video");
              } else {
                setCallType("audio");
                cleanupMedia();
              }
            }}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all duration-200 active:scale-95 shadow-lg"
            title={callType === "audio" ? "Switch to Video Call" : "Switch to Audio Call"}
          >
            {callType === "audio" ? <Video className="h-5 w-5 sm:h-6 sm:w-6 text-sky-400" /> : <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />}
          </button>

        </div>
      </div>
    </div>
  );
};

export default InSystemCallModal;
