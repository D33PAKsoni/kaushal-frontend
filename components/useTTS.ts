"use client";

import { useCallback, useRef, useState } from "react";

interface TTSResult {
  audio_base64?: string;
  use_browser_tts?: boolean;
  text?: string;
  source?: string;
}

// Map our language codes to BCP-47 for Web Speech API
const LANG_MAP: Record<string, string> = {
  kn: "kn-IN",
  hi: "hi-IN",
  en: "en-IN",
};

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(async (ttsResult: TTSResult, text: string, lang: string = "kn") => {
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
          speakBrowser(text, lang);
        };
        await audio.play();
        return;
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    }

    // Option B: Browser Web Speech API
    speakBrowser(ttsResult.text || text, lang);
  }, []);

  const speakBrowser = useCallback((text: string, lang: string = "kn") => {
    if (!("speechSynthesis" in window)) {
      console.warn("Web Speech API not supported");
      setIsSpeaking(false);
      return;
    }

    const bcp47 = LANG_MAP[lang] || "kn-IN";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = bcp47;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(
      (v) => v.lang === bcp47 || v.lang.startsWith(bcp47.split("-")[0])
    );
    if (matchedVoice) utterance.voice = matchedVoice;

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

  return { speak, stop, isSpeaking, speakBrowser };  // speakBrowser exposed for direct use
}
