"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AudioRecorder, { TranscriptEntry } from "@/components/AudioRecorder";
import FaceMonitor, { IntegrityEvent } from "@/components/FaceMonitor";
import { useTTS } from "@/components/useTTS";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type InterviewPhase =
  | "setup"
  | "question_playing"
  | "listening"
  | "processing"
  | "complete";

interface Turn {
  question_kn: string;
  question_en: string;
  answer: string;
  quality: string;
  score: number;
  stage: string;
}

function InterviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") || "demo";

  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [phase, setPhase] = useState<InterviewPhase>("setup");
  const [currentQuestion, setCurrentQuestion] = useState({
    en: "",
    kn: "ನಮಸ್ಕಾರ! ಸಂದರ್ಶನಕ್ಕೆ ಸ್ವಾಗತ.",
    primary: "ನಮಸ್ಕಾರ! ಸಂದರ್ಶನಕ್ಕೆ ಸ್ವಾಗತ.",
  });
  const [turnNumber, setTurnNumber] = useState(0);
  const [currentStage, setCurrentStage] = useState("background");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [integrityEvents, setIntegrityEvents] = useState<IntegrityEvent[]>([]);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);

  const { speak, stop: stopTTS, isSpeaking } = useTTS();
  const processingStartRef = useRef<number>(0);

  useEffect(() => {
    const stored = sessionStorage.getItem("km_session");
    if (stored) setSessionInfo(JSON.parse(stored));
  }, []);

  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    setCurrentTranscript((prev) =>
      prev ? `${prev} ${entry.text}` : entry.text
    );
  }, []);

  const flushIntegrityEvents = useCallback(
    async (events: IntegrityEvent[]) => {
      if (events.length === 0) return;
      try {
        await fetch(`${API_URL}/session/${sessionId}/integrity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events }),
        });
      } catch (e) {
        console.warn("Could not flush integrity events:", e);
      }
    },
    [sessionId]
  );

  const submitAnswer = useCallback(async () => {
    setIsListening(false);
    setPhase("processing");
    processingStartRef.current = Date.now();
    setError("");

    try {
      const res = await fetch(`${API_URL}/agent/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          trade: sessionInfo?.trade || "electrician",
          transcript: currentTranscript || "(no answer)",
          turn_number: turnNumber,
          preferred_language: sessionInfo?.language || "kn",
        }),
      });

      if (!res.ok) throw new Error(`Agent error: ${res.status}`);
      const data = await res.json();

      setProcessingTime(Date.now() - processingStartRef.current);

      setTurns((prev) => [
        ...prev,
        {
          question_kn: currentQuestion.kn,
          question_en: currentQuestion.en,
          answer: currentTranscript,
          quality: data.answer_quality,
          score: data.answer_score,
          stage: currentStage,
        },
      ]);

      setCurrentTranscript("");
      setTurnNumber(data.turn_number);
      setCurrentStage(data.current_stage);
      setCurrentQuestion({
        en: data.next_question_en,
        kn: data.next_question_kn,
        primary: data.next_question_primary || data.next_question_kn,
      });

      if (data.is_complete) {
        await flushIntegrityEvents(integrityEvents);
        setPhase("complete");
        return;
      }

      setPhase("question_playing");
      await speak(data.tts, data.next_question_primary || data.next_question_kn);
      setPhase("listening");
      setIsListening(true);
    } catch (err: any) {
      console.error(err);
      setError(`ದೋಷ: ${err.message} — ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ`);
      setPhase("listening");
      setIsListening(true);
    }
  }, [
    currentTranscript,
    turnNumber,
    sessionId,
    sessionInfo,
    currentQuestion,
    currentStage,
    integrityEvents,
    speak,
    flushIntegrityEvents,
  ]);

  const getOpeningByLanguage = (lang: string) => {
    if (lang === "hi") return {
      text: "नमस्कार! कौशल मित्र साक्षात्कार में आपका स्वागत है। कृपया अपने कार्य अनुभव के बारे में बताएं।",
      lang: "hi-IN",
    };
    if (lang === "en") return {
      text: "Welcome to the KaushalMitra interview. Please tell me about your work experience.",
      lang: "en-IN",
    };
    return {
      text: "ನಮಸ್ಕಾರ! ಕೌಶಲ ಮಿತ್ರ ಸಂದರ್ಶನಕ್ಕೆ ಸ್ವಾಗತ. ನಿಮ್ಮ ಕೆಲಸದ ಅನುಭವದ ಬಗ್ಗೆ ಹೇಳಿ.",
      lang: "kn-IN",
    };
  };

  const startInterview = async () => {
    setPhase("question_playing");
    const lang = sessionInfo?.language || "kn";
    const opening = getOpeningByLanguage(lang);
    const en = "Welcome to the KaushalMitra interview. Please tell me about your work experience.";
    setCurrentQuestion({ en, kn: opening.text, primary: opening.text });
    await speak({ use_browser_tts: true, text: opening.text }, opening.text);
    setPhase("listening");
    setIsListening(true);
  };

  const handleIntegrityEvent = useCallback((event: IntegrityEvent) => {
    setIntegrityEvents((prev) => [...prev, event]);
  }, []);

  const stageLabel: Record<string, string> = {
    background: "ಹಿನ್ನೆಲೆ",
    l1_domain: "ಮೂಲ ಕೌಶಲ",
    l2_advanced: "ಸುಧಾರಿತ",
    situational: "ಸನ್ನಿವೇಶ",
    closing: "ಮುಕ್ತಾಯ",
  };

  // ── Complete screen ────────────────────────────────────
  if (phase === "complete") {
    const avgScore =
      turns.length > 0
        ? Math.round(turns.reduce((s, t) => s + t.score, 0) / turns.length)
        : 0;
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-900 to-green-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-1">
            ಸಂದರ್ಶನ ಮುಗಿದಿದೆ
          </h2>
          <p className="text-gray-500 text-sm mb-4">Interview Complete</p>
          <div className="bg-green-50 rounded-xl p-4 mb-4 text-left space-y-1">
            <p className="text-sm text-green-700">
              <b>{turns.length}</b> ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಲಾಗಿದೆ
            </p>
            <p className="text-sm text-green-700">
              ಸರಾಸರಿ ಸ್ಕೋರ್: <b>{avgScore}/10</b>
            </p>
            <p className="text-xs text-green-600">
              ಸ್ಕೋರಿಂಗ್ ನಡೆಯುತ್ತಿದೆ... ಫಲಿತಾಂಶ ಶೀಘ್ರದಲ್ಲಿ ಸಿದ್ಧ.
            </p>
          </div>
          <p className="text-xs text-gray-400 mb-6">
            ನಿಮ್ಮ ಸಮಯಕ್ಕೆ ಧನ್ಯವಾದ · Thank you for your time
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full bg-green-700 text-white py-3 rounded-xl font-bold"
          >
            ಮುಖಪುಟ · Home
          </button>
        </div>
      </main>
    );
  }

  // ── Main interview screen ──────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-green-800 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-base">KaushalMitra</h1>
          <p className="text-green-300 text-xs">
            {stageLabel[currentStage] || currentStage} · {turnNumber}/8
          </p>
        </div>
        {sessionInfo && (
          <div className="text-right text-xs">
            <p className="font-medium">{sessionInfo.name}</p>
            <p className="text-green-300">{sessionInfo.trade}</p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-gray-200">
        <div
          className="h-full bg-green-500 transition-all duration-700"
          style={{ width: `${(turnNumber / 8) * 100}%` }}
        />
      </div>

      {/* Face Monitor */}
      <div className="px-4 pt-3">
        <FaceMonitor
          isActive={phase !== "setup"}
          onEvent={handleIntegrityEvent}
          showOverlay={true}
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {phase === "setup" ? (
          <div className="text-center mt-6">
            <div className="text-5xl mb-4">🎤</div>
            <p className="font-kannada text-lg text-gray-700 mb-2">
              ಸಂದರ್ಶನ ಪ್ರಾರಂಭಿಸಲು ಸಿದ್ಧರಿದ್ದೀರಾ?
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Ready to start the interview?
            </p>
            <ul className="text-sm text-gray-500 text-left space-y-2 bg-gray-50 rounded-xl p-4">
              <li>✅ ಕ್ಯಾಮೆರಾ ಮತ್ತು ಮೈಕ್ ಆನ್ ಮಾಡಿ</li>
              <li>✅ ಶಾಂತ ಸ್ಥಳದಲ್ಲಿ ಕುಳಿತುಕೊಳ್ಳಿ</li>
              <li>✅ 8 ಪ್ರಶ್ನೆಗಳು · ~8 ನಿಮಿಷ</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Question card */}
            <div
              className={`rounded-2xl p-4 shadow-sm border transition-colors ${
                isSpeaking
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                  {stageLabel[currentStage]}
                </span>
                {isSpeaking && (
                  <span className="text-xs text-blue-500 animate-pulse">
                    🔊 ಪ್ರಶ್ನೆ ಕೇಳಿ...
                  </span>
                )}
                {phase === "listening" && (
                  <span className="text-xs text-green-600 animate-pulse">
                    🎤 ಮಾತನಾಡಿ...
                  </span>
                )}
              </div>
              <p className="font-kannada text-gray-800 text-base leading-relaxed">
                {currentQuestion.primary || currentQuestion.kn}
              </p>
              {currentQuestion.en && currentQuestion.en !== (currentQuestion.primary || currentQuestion.kn) && (
                <p className="text-gray-400 text-xs mt-2">
                  {currentQuestion.en}
                </p>
              )}
            </div>

            {/* Live transcript */}
            {currentTranscript && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs text-yellow-600 mb-1 font-medium">
                  ನಿಮ್ಮ ಉತ್ತರ:
                </p>
                <p className="font-kannada text-gray-700 text-sm leading-relaxed">
                  {currentTranscript}
                </p>
              </div>
            )}

            {/* Processing */}
            {phase === "processing" && (
              <div className="text-center py-4 text-gray-500 text-sm">
                <div className="inline-block w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                ಉತ್ತರ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...
              </div>
            )}

            {/* Previous turns */}
            {turns.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  ಹಿಂದಿನ ಉತ್ತರಗಳು
                </p>
                {turns
                  .slice(-2)
                  .reverse()
                  .map((t, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl p-3 border border-gray-100 opacity-60"
                    >
                      <p className="font-kannada text-xs text-gray-500 truncate">
                        {t.question_kn}
                      </p>
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 mt-1 inline-block ${
                          t.quality === "excellent" || t.quality === "good"
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-600"
                        }`}
                      >
                        {t.quality} · {t.score}/10
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-4 py-4 bg-white border-t border-gray-100 space-y-2">
        <AudioRecorder
          apiUrl={API_URL}
          onTranscript={handleTranscript}
          onError={(e) => setError(e)}
          isActive={isListening && phase === "listening"}
        />

        {phase === "setup" && (
          <button
            onClick={startInterview}
            className="w-full bg-green-700 text-white py-5 rounded-2xl font-bold text-lg active:scale-95 transition-all shadow-lg"
          >
            🎤 ಸಂದರ್ಶನ ಪ್ರಾರಂಭಿಸಿ · Start
          </button>
        )}

        {phase === "listening" && (
          <button
            onClick={submitAnswer}
            className={`w-full py-5 rounded-2xl font-bold text-lg active:scale-95 transition-all shadow-md ${
              currentTranscript.trim()
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-green-700 text-white"
            }`}
          >
            {currentTranscript.trim()
              ? "✅ ಉತ್ತರ ಸಲ್ಲಿಸಿ · Submit"
              : "🎤 ಮಾತನಾಡಿ... · Listening..."}
          </button>
        )}

        {phase === "question_playing" && (
          <button
            onClick={() => {
              stopTTS();
              setPhase("listening");
              setIsListening(true);
            }}
            className="w-full bg-yellow-500 text-white py-5 rounded-2xl font-bold text-lg active:scale-95"
          >
            ⏭️ ಪ್ರಶ್ನೆ ಬಿಟ್ಟು · Skip & Answer
          </button>
        )}

        {phase === "processing" && (
          <div className="w-full bg-gray-100 py-5 rounded-2xl text-center text-gray-400 font-medium">
            ⏳ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...
          </div>
        )}

        <p className="text-center text-xs text-gray-300 font-mono">
          {sessionId.slice(0, 8)} · {phase}
          {processingTime > 0 && ` · ${processingTime}ms`}
        </p>
      </div>
    </main>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>}>
      <InterviewContent />
    </Suspense>
  );
}
