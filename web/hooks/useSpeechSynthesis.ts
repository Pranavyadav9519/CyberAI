"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
}

interface UseSpeechSynthesisOptions {
  /** Speech rate — 0.1 to 10. Default: 1 */
  rate?: number;
  /** Pitch — 0 to 2. Default: 1 */
  pitch?: number;
  /** Voice URI to select a specific voice */
  voiceURI?: string;
  /** Maximum chunk length for splitting long responses. Default: 200 */
  chunkLength?: number;
}

/**
 * Splits text into sentence-level chunks so long responses are spoken naturally
 * and don't hit browser utterance limits.
 */
function splitIntoChunks(text: string, maxLen: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn {
  const { rate = 1, pitch = 1, voiceURI, chunkLength = 200 } = options;

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const queueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);

  // Load voices — some browsers fire onvoiceschanged, others return them immediately
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) setVoices(available);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  const speakNext = useCallback(() => {
    if (!isSupported || queueRef.current.length === 0) {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    const chunk = queueRef.current.shift()!;
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = rate;
    utterance.pitch = pitch;

    if (voiceURI) {
      const selected = voices.find((v) => v.voiceURI === voiceURI);
      if (selected) utterance.voice = selected;
    }

    utterance.onend = () => speakNext();
    utterance.onerror = () => speakNext();

    window.speechSynthesis.speak(utterance);
  }, [isSupported, rate, pitch, voiceURI, voices]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      queueRef.current = splitIntoChunks(text, chunkLength);
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      speakNext();
    },
    [isSupported, chunkLength, speakNext]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    queueRef.current = [];
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported, voices };
}
