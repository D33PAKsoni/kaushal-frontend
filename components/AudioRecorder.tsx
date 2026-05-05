"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export interface TranscriptEntry {
  text: string;
  language: string;
  confidence: number;
  model: string;
  timestamp: number;
}

interface AudioRecorderProps {
  apiUrl: string;
  lang?: string;
  onTranscript: (entry: TranscriptEntry) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}

const CHUNK_DURATION_MS = 5000;
const RESTART_DELAY_MS = 200; // no overlap — overlap caused TTS bleed

export default function AudioRecorder({
  apiUrl,
  lang = "kn",
  onTranscript,
  onError,
  isActive,
}: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const restartRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * THE KEY FIX for mic capturing TTS audio:
   *
   * When stopRecording() is called (e.g. when TTS starts playing),
   * we immediately set suppressRef = true BEFORE calling recorder.stop().
   * The MediaRecorder.onstop callback fires asynchronously after stop(),
   * so without this flag the last buffered chunk (which may contain TTS audio)
   * would still be sent to the ASR API.
   *
   * With suppressRef = true, sendChunk() drops the blob silently.
   */
  const suppressRef = useRef<boolean>(true); // start suppressed, only open when active

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const getSupportedMimeType = (): string => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  };

  const sendChunk = useCallback(
    async (blob: Blob) => {
      // ── Suppress check — drop chunk if recording was stopped ──
      if (suppressRef.current) {
        console.debug("[AudioRecorder] Chunk suppressed — mic was stopped, dropping");
        return;
      }
      if (blob.size < 500) return; // skip near-silence

      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append("audio", blob, "chunk.webm");

        const res = await fetch(
          `${apiUrl}/asr/transcribe?lang_hint=${lang}`,
          { method: "POST", body: formData }
        );

        if (!res.ok) {
          onError?.(`ASR error: ${res.status}`);
          return;
        }

        const data = await res.json();

        // Second suppress check — state may have changed while awaiting
        if (suppressRef.current) return;

        if (data.transcript?.trim()) {
          onTranscript({
            text: data.transcript,
            language: data.language,
            confidence: data.confidence,
            model: data.model_used,
            timestamp: Date.now(),
          });
        }
      } catch {
        if (!suppressRef.current) {
          onError?.("Network error — check backend connection");
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [apiUrl, lang, onTranscript, onError]
  );

  const startRecording = useCallback(async () => {
    // Open the gate for chunks BEFORE acquiring mic
    suppressRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        chunksRef.current = [];
        sendChunk(blob); // suppress check is inside sendChunk
      };

      const recordChunk = () => {
        if (!mediaRecorderRef.current || suppressRef.current) return;
        chunksRef.current = [];
        mediaRecorderRef.current.start();

        timerRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
            restartRef.current = setTimeout(() => {
              if (!suppressRef.current && streamRef.current) {
                recordChunk();
              }
            }, RESTART_DELAY_MS);
          }
        }, CHUNK_DURATION_MS);
      };

      recordChunk();
      setIsRecording(true);
    } catch (err: any) {
      suppressRef.current = true;
      onError?.(
        err.name === "NotAllowedError"
          ? "Microphone access denied — allow mic in browser settings"
          : `Microphone error: ${err.message}`
      );
    }
  }, [sendChunk, onError]);

  const stopRecording = useCallback(() => {
    // ── Set suppress FIRST, before stopping recorder ──────
    // This ensures the onstop callback drops its chunk.
    suppressRef.current = true;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (restartRef.current) clearTimeout(restartRef.current);

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    setIsRecording(false);
  }, []);

  // React to isActive changes
  useEffect(() => {
    if (isActive && !isRecording) {
      startRecording();
    } else if (!isActive) {
      // Always stop and suppress when not active
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center gap-2 h-5">
      {isRecording && (
        <>
          <div className="relative w-3 h-3">
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
            <div className="w-3 h-3 bg-green-600 rounded-full" />
          </div>
          <span className="text-green-700 text-xs">
            {isProcessing ? "Processing..." : "Listening..."}
          </span>
        </>
      )}
    </div>
  );
}
