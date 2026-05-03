"use client";

import { useCallback, useRef, useState } from "react";

interface TTSResult {
  audio_base64?: string;
  use_browser_tts?: boolean;
  text?: string;
  source?: string;
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(async (ttsResult: TTSResult, text: string) => {
    // Stop any current speech
    stop();
    setIsSpeaking(true);

    // Option A: Bhashini audio (base64)
    if (ttsResult.audio_base64) {
      try {
        const audioData = `data:audio/wav;base64,${ttsResult.audio_base64}`;
        const audio = new Audio(audioData);
        audioRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => {
          console.warn("Bhashini audio playback failed — falling back to Web Speech");
          speakBrowser(text);
        };
        await audio.play();
        return;
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    }

    // Option B: Browser Web Speech API (lang=kn-IN)
    speakBrowser(ttsResult.text || text);
  }, []);

  const speakBrowser = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) {
      console.warn("Web Speech API not supported");
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "kn-IN";
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    // Try to find a Kannada voice
    const voices = window.speechSynthesis.getVoices();
    const kannadaVoice = voices.find(
      (v) => v.lang === "kn-IN" || v.lang.startsWith("kn")
    );
    if (kannadaVoice) utterance.voice = kannadaVoice;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, speakBrowser };
}
