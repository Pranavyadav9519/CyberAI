"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { cn } from "@/lib/utils";

type VoiceButtonMode = "idle" | "listening" | "processing" | "speaking";

interface VoiceButtonProps {
  /** Called when a complete voice exchange finishes, with the user transcript and AI response */
  onExchange?: (transcript: string, response: string) => void;
  className?: string;
}

export function VoiceButton({ onExchange, className }: VoiceButtonProps) {
  const [mode, setMode] = useState<VoiceButtonMode>("idle");
  const [aiResponse, setAiResponse] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported } =
    useSpeechSynthesis({ rate: 1.05 });

  // Sync speaking state: once TTS finishes, return to idle
  useEffect(() => {
    if (mode === "speaking" && !isSpeaking) {
      setMode("idle");
    }
  }, [mode, isSpeaking]);

  const handleFinalTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) {
        setMode("idle");
        setLiveTranscript("");
        return;
      }

      setMode("processing");
      setLiveTranscript(transcript);

      try {
        const res = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: transcript, stream: false }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          if (err.code === "GEMINI_KEY_MISSING") {
            speak("Voice features are not configured. Please add a Gemini API key.");
          } else {
            speak("Sorry, I couldn't process that. Please try again.");
          }
          setMode("idle");
          return;
        }

        const data = await res.json();
        const text: string = data.text ?? "";
        setAiResponse(text);

        if (ttsSupported && text) {
          setMode("speaking");
          speak(text);
          onExchange?.(transcript, text);
        } else {
          setMode("idle");
          onExchange?.(transcript, text);
        }
      } catch {
        speak("Connection error. Please try again.");
        setMode("idle");
      }
    },
    [speak, ttsSupported, onExchange]
  );

  const { startListening, stopListening, isSupported: sttSupported } =
    useVoiceRecognition({
      continuous: false,
      interimResults: true,
      onInterim: setLiveTranscript,
      onFinal: handleFinalTranscript,
      onError: (err) => {
        console.error("Voice recognition error:", err);
        setMode("idle");
        setLiveTranscript("");
      },
    });

  const handleClick = useCallback(() => {
    if (mode === "listening") {
      stopListening();
      setMode("idle");
      setLiveTranscript("");
      return;
    }

    if (mode === "speaking") {
      stopSpeaking();
      setMode("idle");
      return;
    }

    if (mode === "idle") {
      if (!sttSupported) return;
      setAiResponse("");
      setLiveTranscript("");
      setMode("listening");
      startListening();
    }
  }, [mode, sttSupported, startListening, stopListening, stopSpeaking]);

  if (!sttSupported) return null;

  const label =
    mode === "listening"
      ? "Stop listening"
      : mode === "processing"
        ? "Processing…"
        : mode === "speaking"
          ? "Stop speaking"
          : "Start voice input";

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* Live transcript / response bubble */}
      <AnimatePresence>
        {(liveTranscript || aiResponse) && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute bottom-full mb-2 left-1/2 -translate-x-1/2",
              "w-64 rounded-xl border border-cyan-500/30 bg-surface-900/95",
              "px-3 py-2 text-xs shadow-lg backdrop-blur-sm",
              "pointer-events-none"
            )}
          >
            {liveTranscript && mode !== "speaking" && (
              <p className="text-surface-300 leading-snug">
                <span className="text-cyan-400 font-medium">You: </span>
                {liveTranscript}
              </p>
            )}
            {aiResponse && mode === "speaking" && (
              <p className="text-surface-200 leading-snug">
                <span className="text-green-400 font-medium">CyberAI: </span>
                {aiResponse}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse rings when listening */}
      {mode === "listening" && (
        <>
          <motion.span
            className="absolute inset-0 rounded-lg bg-cyan-500/20"
            animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="absolute inset-0 rounded-lg bg-cyan-500/10"
            animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.4,
            }}
          />
        </>
      )}

      <button
        onClick={handleClick}
        disabled={mode === "processing"}
        aria-label={label}
        title={label}
        className={cn(
          "relative p-1.5 rounded-lg transition-colors flex-shrink-0",
          mode === "idle" &&
            "text-surface-500 hover:text-surface-300 hover:bg-surface-700",
          mode === "listening" && "text-cyan-400 bg-cyan-500/10",
          mode === "processing" &&
            "text-surface-500 bg-surface-700 cursor-wait",
          mode === "speaking" && "text-green-400 bg-green-500/10"
        )}
      >
        {mode === "processing" ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : mode === "speaking" ? (
          <Volume2 className="w-4 h-4" aria-hidden="true" />
        ) : mode === "listening" ? (
          <MicOff className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Mic className="w-4 h-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
