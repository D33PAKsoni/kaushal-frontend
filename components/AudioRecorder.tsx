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
  onTranscript: (entry: TranscriptEntry) => void;
  onError?: (error: string) => void;
  isActive: boolean;         // controlled by parent — true = recording
  onMicReady?: () => void;   // called once mic permission is granted
  lang?: string;             // "kn" | "en" | "hi" — passed to ASR for model routing
}

const CHUNK_DURATION_MS = 5000;
const OVERLAP_MS = 500;

export default function AudioRecorder({
  apiUrl,
  onTranscript,
  onError,
  isActive,
  onMicReady,
  lang = "kn",
}: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
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
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type))
        return type;
    }
    return "";
  };

  const sendChunk = useCallback(
    async (blob: Blob) => {
      if (blob.size < 100) return;
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append("audio", blob, "chunk.webm");
        const res = await fetch(`${apiUrl}/asr/transcribe?lang=${lang}`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) { onError?.(`ASR error: ${res.status}`); return; }
        const data = await res.json();
        if (data.transcript?.trim()) {
          onTranscript({
            text: data.transcript,
            language: data.language,
            confidence: data.confidence,
            model: data.model_used,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        onError?.("Network error — check backend");
      } finally {
        setIsProcessing(false);
      }
    },
    [apiUrl, onTranscript, onError]
  );

  // Initialise mic stream once on mount (asks permission early)
  useEffect(() => {
    const initStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        streamRef.current = stream;
        // Keep stream alive but paused — stop tracks immediately,
        // we'll re-request when actually recording
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        onMicReady?.();
      } catch (err: any) {
        onError?.(
          err.name === "NotAllowedError"
            ? "Microphone access denied"
            : `Mic error: ${err.message}`
        );
      }
    };
    initStream();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
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
        sendChunk(blob);
      };

      const recordChunk = () => {
        if (!mediaRecorderRef.current) return;
        chunksRef.current = [];
        mediaRecorderRef.current.start();
        timerRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
            setTimeout(recordChunk, OVERLAP_MS);
          }
        }, CHUNK_DURATION_MS);
      };

      recordChunk();
      setIsRecording(true);
    } catch (err: any) {
      onError?.(
        err.name === "NotAllowedError"
          ? "Microphone access denied"
          : `Mic error: ${err.message}`
      );
    }
  }, [sendChunk, onError]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => {
    if (isActive && !isRecording) startRecording();
    else if (!isActive && isRecording) stopRecording();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => () => stopRecording(), [stopRecording]);

  // Invisible component — UI is in the interview page
  return (
    <div className="flex items-center gap-2 justify-center">
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="relative w-3 h-3">
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
            <div className="w-3 h-3 bg-red-600 rounded-full" />
          </div>
          <span className="text-xs text-red-600 font-medium">
            {isProcessing ? "Processing..." : "Recording..."}
          </span>
        </div>
      )}
    </div>
  );
}
