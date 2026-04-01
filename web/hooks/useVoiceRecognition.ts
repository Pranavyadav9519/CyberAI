"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { VoiceRecognitionState } from "@/lib/types";

// Extend Window to include webkit-prefixed speech recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface UseVoiceRecognitionOptions {
  /** Keep the microphone open after each utterance ends. Default: false */
  continuous?: boolean;
  /** Emit partial results as the user speaks. Default: true */
  interimResults?: boolean;
  /** BCP 47 language tag, e.g. "en-US". Default: browser default */
  lang?: string;
  /** Called whenever the interim (in-progress) transcript updates */
  onInterim?: (text: string) => void;
  /** Called once with the final transcript when the utterance ends */
  onFinal?: (text: string) => void;
  /** Called when a recognition error occurs */
  onError?: (error: string) => void;
}

export interface UseVoiceRecognitionReturn extends VoiceRecognitionState {
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
}

export function useVoiceRecognition(
  options: UseVoiceRecognitionOptions = {}
): UseVoiceRecognitionReturn {
  const {
    continuous = false,
    interimResults = true,
    lang,
    onInterim,
    onFinal,
    onError,
  } = options;

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Use refs for callbacks to avoid stale closures in event handlers
  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onInterimRef.current = onInterim;
    onFinalRef.current = onFinal;
    onErrorRef.current = onError;
  }, [onInterim, onFinal, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    // Abort any existing session
    recognitionRef.current?.abort();

    const SpeechRecognitionImpl =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionImpl();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    if (lang) recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        setTranscript((prev) => prev + finalText);
        onFinalRef.current?.(finalText);
      }
      setInterimTranscript(interimText);
      if (interimText) onInterimRef.current?.(interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted") {
        const msg = `Speech recognition error: ${event.error}`;
        setError(msg);
        onErrorRef.current?.(msg);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    try {
      setTranscript("");
      setInterimTranscript("");
      recognition.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recognition");
      setIsListening(false);
    }
  }, [isSupported, continuous, interimResults, lang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
