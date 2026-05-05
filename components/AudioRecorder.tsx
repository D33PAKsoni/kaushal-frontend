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
  isActive: boolean;
}

const CHUNK_DURATION_MS = 5000;  // 5-second chunks per spec
const OVERLAP_MS = 1000;          // 1-second overlap

export default function AudioRecorder({
  apiUrl,
  onTranscript,
  onError,
  isActive,
}: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Determine best MIME type for this browser
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
      if (blob.size < 100) return; // Too small — skip silence

      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append("audio", blob, "chunk.webm");

        const res = await fetch(`${apiUrl}/asr/transcribe`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("ASR error:", errText);
          onError?.(`ASR error: ${res.status}`);
          return;
        }

        const data = await res.json();
        if (data.transcript && data.transcript.trim()) {
          onTranscript({
            text: data.transcript,
            language: data.language,
            confidence: data.confidence,
            model: data.model_used,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.error("Network error sending chunk:", err);
        onError?.("Network error — check backend connection");
      } finally {
        setIsProcessing(false);
      }
    },
    [apiUrl, onTranscript, onError]
  );

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
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        chunksRef.current = [];
        sendChunk(blob);
      };

      // Chunked recording loop
      const recordChunk = () => {
        if (!mediaRecorderRef.current) return;

        chunksRef.current = [];
        mediaRecorderRef.current.start();

        timerRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
            // Restart after overlap delay
            setTimeout(recordChunk, OVERLAP_MS);
          }
        }, CHUNK_DURATION_MS);
      };

      recordChunk();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic access error:", err);
      onError?.(
        err.name === "NotAllowedError"
          ? "Microphone access denied — please allow mic access"
          : `Microphone error: ${err.message}`
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

  // Start/stop based on isActive prop
  useEffect(() => {
    if (isActive && !isRecording) {
      startRecording();
    } else if (!isActive && isRecording) {
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
    <div className="flex flex-col items-center gap-2">
      {/* Listening indicator */}
      {isRecording && (
        <div className="flex items-center gap-3">
          <div className="relative w-4 h-4">
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
            <div className="w-4 h-4 bg-green-600 rounded-full" />
          </div>
          <span className="text-green-700 font-medium font-kannada text-sm">
            {isProcessing ? "ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ..." : "ಕೇಳುತ್ತಿದ್ದೇನೆ..."}
          </span>
        </div>
      )}

      {!isRecording && !isActive && (
        <span className="text-gray-400 text-sm">Microphone inactive</span>
      )}
    </div>
  );
}
