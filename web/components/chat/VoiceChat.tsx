"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, X, Loader2, Radio } from "lucide-react";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { cn } from "@/lib/utils";
import type { VoiceChatMessage } from "@/lib/types";
import { nanoid } from "nanoid";

type VoiceMode = "idle" | "listening" | "processing" | "speaking";

interface VoiceChatProps {
  onClose: () => void;
}

export function VoiceChat({ onClose }: VoiceChatProps) {
  const [mode, setMode] = useState<VoiceMode>("idle");
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported } =
    useSpeechSynthesis({ rate: 1.05 });

  const handleFinalTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) {
        setMode("idle");
        setLiveTranscript("");
        return;
      }

      const userMsg: VoiceChatMessage = {
        id: nanoid(),
        role: "user",
        text: transcript,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setMode("processing");
      setLiveTranscript("");

      try {
        const res = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: transcript, stream: false }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          const text =
            err.code === "GEMINI_KEY_MISSING"
              ? "Voice features require a Gemini API key. Please configure it."
              : "Sorry, I couldn't process that request.";
          const aiMsg: VoiceChatMessage = {
            id: nanoid(),
            role: "assistant",
            text,
            createdAt: Date.now(),
          };
          setMessages((prev) => [...prev, aiMsg]);
          setCurrentResponse(text);
          if (ttsSupported) {
            setMode("speaking");
            speak(text);
          } else {
            setMode("idle");
          }
          return;
        }

        const data = await res.json();
        const text: string = data.text ?? "";

        const aiMsg: VoiceChatMessage = {
          id: nanoid(),
          role: "assistant",
          text,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setCurrentResponse(text);

        if (ttsSupported && text) {
          setMode("speaking");
          speak(text);
        } else {
          setMode("idle");
          setCurrentResponse("");
        }
      } catch {
        const errText = "Connection error. Please check your network and try again.";
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: "assistant", text: errText, createdAt: Date.now() },
        ]);
        setMode("idle");
        setCurrentResponse("");
      }
    },
    [ttsSupported, speak]
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

  // Sync speaking state
  useEffect(() => {
    if (mode === "speaking" && !isSpeaking) {
      setMode("idle");
      setCurrentResponse("");
    }
  }, [mode, isSpeaking]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, liveTranscript]);

  const handleMicClick = useCallback(() => {
    if (mode === "listening") {
      stopListening();
      setMode("idle");
      setLiveTranscript("");
      return;
    }
    if (mode === "speaking") {
      stopSpeaking();
      setMode("idle");
      setCurrentResponse("");
      return;
    }
    if (mode === "idle" && sttSupported) {
      setLiveTranscript("");
      setMode("listening");
      startListening();
    }
  }, [mode, sttSupported, startListening, stopListening, stopSpeaking]);

  const statusLabel =
    mode === "listening"
      ? "Listening…"
      : mode === "processing"
        ? "Thinking…"
        : mode === "speaking"
          ? "Speaking…"
          : "Tap mic to speak";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 12 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "fixed bottom-24 right-4 z-50 w-80 rounded-2xl",
        "border border-cyan-500/20 bg-surface-950/95 backdrop-blur-xl shadow-2xl",
        "flex flex-col overflow-hidden"
      )}
      aria-label="Voice chat panel"
      role="dialog"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-cyan-300 tracking-wide">
            CyberAI Voice
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close voice panel"
          className="p-1 rounded-md text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Message history */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-[180px] max-h-[300px]"
        aria-live="polite"
        aria-label="Voice conversation history"
      >
        {messages.length === 0 && !liveTranscript && (
          <p className="text-xs text-surface-600 text-center mt-6">
            Ask CyberAI anything about cybersecurity
          </p>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-xl px-3 py-2 text-xs leading-snug max-w-[90%]",
              msg.role === "user"
                ? "ml-auto bg-surface-800 text-surface-200"
                : "mr-auto bg-cyan-950/60 border border-cyan-500/20 text-cyan-100"
            )}
          >
            {msg.text}
          </motion.div>
        ))}

        {/* Live interim transcript */}
        {liveTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl px-3 py-2 text-xs leading-snug max-w-[90%] ml-auto bg-surface-800/60 text-surface-400 italic border border-surface-700"
          >
            {liveTranscript}
          </motion.div>
        )}
      </div>

      {/* Waveform visualizer */}
      <div className="flex items-center justify-center gap-1 py-3 border-t border-surface-800">
        {Array.from({ length: 9 }).map((_, i) => (
          <motion.span
            key={i}
            className={cn(
              "inline-block w-0.5 rounded-full",
              mode === "listening" ? "bg-cyan-400" : mode === "speaking" ? "bg-green-400" : "bg-surface-700"
            )}
            animate={
              mode === "listening" || mode === "speaking"
                ? {
                    height: [4, 8 + Math.random() * 12, 4],
                    opacity: [0.6, 1, 0.6],
                  }
                : { height: 4, opacity: 0.3 }
            }
            transition={
              mode === "listening" || mode === "speaking"
                ? {
                    duration: 0.6 + i * 0.08,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.07,
                  }
                : {}
            }
          />
        ))}
      </div>

      {/* Mic button + status */}
      <div className="flex flex-col items-center gap-2 pb-4">
        <p className="text-xs text-surface-500">{statusLabel}</p>

        <div className="relative flex items-center justify-center">
          {/* Pulse rings */}
          {mode === "listening" && (
            <>
              <motion.span
                className="absolute inset-0 rounded-full bg-cyan-500/20"
                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.span
                className="absolute inset-0 rounded-full bg-cyan-500/10"
                animate={{ scale: [1, 2.4], opacity: [0.3, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              />
            </>
          )}

          <button
            onClick={handleMicClick}
            disabled={mode === "processing" || !sttSupported}
            aria-label={statusLabel}
            className={cn(
              "relative w-14 h-14 rounded-full flex items-center justify-center",
              "transition-colors shadow-lg",
              mode === "idle" &&
                "bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200",
              mode === "listening" &&
                "bg-cyan-600 text-white hover:bg-cyan-700",
              mode === "processing" &&
                "bg-surface-800 text-surface-500 cursor-wait",
              mode === "speaking" &&
                "bg-green-700 text-white hover:bg-green-800"
            )}
          >
            {mode === "processing" ? (
              <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
            ) : mode === "speaking" ? (
              <Volume2 className="w-6 h-6" aria-hidden="true" />
            ) : mode === "listening" ? (
              <MicOff className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Mic className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {!sttSupported && (
          <p className="text-xs text-surface-600 text-center px-4">
            Voice input not supported in this browser. Try Chrome or Edge.
          </p>
        )}
      </div>
    </motion.div>
  );
}
