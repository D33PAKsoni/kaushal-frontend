"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import AudioRecorder, { TranscriptEntry } from "@/components/AudioRecorder";
import { Suspense } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function InterviewContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") || "demo";

  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [asrStatus, setAsrStatus] = useState<"unknown" | "ok" | "degraded">("unknown");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Load session info
  useEffect(() => {
    const stored = sessionStorage.getItem("km_session");
    if (stored) {
      setSessionInfo(JSON.parse(stored));
    }
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  // Check ASR health on mount (Day 1 critical diagnostic)
  useEffect(() => {
    const checkASR = async () => {
      try {
        const res = await fetch(`${API_URL}/asr/health`);
        const data = await res.json();
        setAsrStatus(data.status === "ok" ? "ok" : "degraded");
      } catch {
        setAsrStatus("degraded");
      }
    };
    checkASR();
  }, []);

  const handleTranscript = (entry: TranscriptEntry) => {
    setTranscripts((prev) => [...prev, entry]);
  };

  const handleError = (err: string) => {
    setError(err);
    setIsListening(false);
  };

  const toggleListening = () => {
    setError("");
    setIsListening((prev) => !prev);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-green-800 text-white px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">KaushalMitra</h1>
          <p className="text-green-300 text-xs font-kannada">ಕೌಶಲ ಮಿತ್ರ</p>
        </div>
        <div className="text-right">
          {sessionInfo && (
            <>
              <p className="text-sm">{sessionInfo.name}</p>
              <p className="text-green-300 text-xs">{sessionInfo.trade} · {sessionInfo.district}</p>
            </>
          )}
        </div>
      </div>

      {/* ASR Status Banner */}
      <div className={`px-4 py-2 text-xs text-center ${
        asrStatus === "ok" ? "bg-green-100 text-green-700" :
        asrStatus === "degraded" ? "bg-yellow-100 text-yellow-700" :
        "bg-gray-100 text-gray-500"
      }`}>
        {asrStatus === "ok" && "✅ ASR Ready — IndicWhisper online"}
        {asrStatus === "degraded" && "⚠️ ASR degraded — check HF_API_TOKEN in .env"}
        {asrStatus === "unknown" && "Checking ASR status..."}
      </div>

      {/* Session ID (Day 1 debug info) */}
      <div className="bg-blue-50 px-4 py-2 text-xs text-blue-600 font-mono">
        Session: {sessionId}
      </div>

      {/* Transcript Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {transcripts.length === 0 ? (
          <div className="text-center text-gray-400 mt-12">
            <div className="text-5xl mb-4">🎤</div>
            <p className="font-kannada text-lg text-gray-500">
              ಮಾತನಾಡಲು ಪ್ರಾರಂಭಿಸಿ
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Press Start and speak in Kannada
            </p>
          </div>
        ) : (
          transcripts.map((entry, i) => (
            <div
              key={i}
              className="transcript-entry bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
            >
              <p className="font-kannada text-gray-800 text-base leading-relaxed">
                {entry.text}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                  {entry.language === "kn" ? "ಕನ್ನಡ" : entry.language}
                </span>
                <span>{Math.round(entry.confidence * 100)}% confidence</span>
                <span className="ml-auto font-mono">{entry.model}</span>
              </div>
            </div>
          ))
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* AudioRecorder (invisible — handles mic logic) */}
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        <AudioRecorder
          apiUrl={API_URL}
          onTranscript={handleTranscript}
          onError={handleError}
          isActive={isListening}
        />

        {/* Big mic button */}
        <button
          onClick={toggleListening}
          className={`w-full mt-3 py-5 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-md ${
            isListening
              ? "bg-red-500 hover:bg-red-400 text-white"
              : "bg-green-700 hover:bg-green-600 text-white"
          }`}
        >
          {isListening ? (
            <span className="font-kannada">⏹️ ನಿಲ್ಲಿಸಿ · Stop</span>
          ) : (
            <span className="font-kannada">🎤 ಮಾತನಾಡಿ · Speak</span>
          )}
        </button>

        {/* Clear */}
        {transcripts.length > 0 && (
          <button
            onClick={() => setTranscripts([])}
            className="w-full mt-2 py-2 text-gray-400 text-sm"
          >
            Clear transcript
          </button>
        )}
      </div>
    </main>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <InterviewContent />
    </Suspense>
  );
}
