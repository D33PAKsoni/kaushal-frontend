"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AudioRecorder, { TranscriptEntry } from "@/components/AudioRecorder";
import FaceMonitor, { IntegrityEvent } from "@/components/FaceMonitor";
import { useTTS } from "@/components/useTTS";
import { t, T, Lang } from "@/lib/translations";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Phase = "setup" | "question_playing" | "listening" | "processing" | "complete";

interface Turn {
  question_primary: string;
  answer: string;
  quality: string;
  score: number;
}

const STAGE_KEY: Record<string, string> = {
  background: "stageBackground",
  l1_domain: "stageL1",
  l2_advanced: "stageL2",
  situational: "stageSituational",
  closing: "stageClosing",
};

function InterviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") || "demo";

  const [lang, setLang] = useState<Lang>("kn");
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [currentQuestion, setCurrentQuestion] = useState({ primary: "", en: "" });
  const [turnNumber, setTurnNumber] = useState(0);
  const [currentStage, setCurrentStage] = useState("background");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [integrityEvents, setIntegrityEvents] = useState<IntegrityEvent[]>([]);
  const [error, setError] = useState("");
  const [processingTime, setProcessingTime] = useState(0);

  const { speak, stop: stopTTS } = useTTS();
  const procStart = useRef(0);

  // Mic is ONLY on during "listening" — derived, never separate state
  const micActive = phase === "listening";

  useEffect(() => {
    const sl = sessionStorage.getItem("km_lang") as Lang | null;
    const ss = sessionStorage.getItem("km_session");
    if (sl) setLang(sl);
    if (ss) setSessionInfo(JSON.parse(ss));
  }, []);

  const handleTranscript = useCallback(
    (entry: TranscriptEntry) => {
      // Guard: only accumulate when mic should actually be on
      if (phase !== "listening") return;
      setCurrentTranscript((p) => (p ? `${p} ${entry.text}` : entry.text));
    },
    [phase]
  );

  const submitAnswer = useCallback(async () => {
    // Immediately flip to processing — this makes micActive false
    // which stops AudioRecorder before any async work begins
    setPhase("processing");
    setError("");
    procStart.current = Date.now();

    try {
      const res = await fetch(`${API_URL}/agent/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          trade: sessionInfo?.trade || "electrician",
          transcript: currentTranscript || "(no answer)",
          turn_number: turnNumber,
          preferred_language: lang,
        }),
      });

      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();

      setProcessingTime(Date.now() - procStart.current);
      setTurns((p) => [...p, {
        question_primary: currentQuestion.primary,
        answer: currentTranscript,
        quality: data.answer_quality,
        score: data.answer_score,
      }]);
      setCurrentTranscript("");
      setTurnNumber(data.turn_number);
      setCurrentStage(data.current_stage);
      const primary = data.next_question_primary || data.next_question_kn;
      setCurrentQuestion({ primary, en: data.next_question_en });

      if (data.is_complete) {
        // Flush integrity events
        if (integrityEvents.length) {
          fetch(`${API_URL}/session/${sessionId}/integrity`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ events: integrityEvents }),
          }).catch(() => {});
        }
        setPhase("complete");
        return;
      }

      // Play question — micActive is false here (phase = question_playing)
      setPhase("question_playing");
      await speak(data.tts, primary, lang);

      // TTS done → enable mic
      setPhase("listening");
    } catch (err: any) {
      setError(`${t("connectionError", lang)}: ${err.message}`);
      setPhase("listening");
    }
  }, [
    currentTranscript, turnNumber, sessionId, sessionInfo,
    currentQuestion, lang, integrityEvents, speak,
  ]);

  const startInterview = async () => {
    const opening = t("openingQuestion", lang);
    setCurrentQuestion({ primary: opening, en: T.openingQuestion.en });
    setPhase("question_playing");
    await speak({ use_browser_tts: true, text: opening }, opening, lang);
    setPhase("listening");
  };

  const stageLabel = (s: string) => {
    const key = STAGE_KEY[s];
    return key ? t(key as any, lang) : s;
  };

  // ── Complete ───────────────────────────────────────────
  if (phase === "complete") {
    const avg = turns.length
      ? Math.round(turns.reduce((s, t) => s + t.score, 0) / turns.length)
      : 0;
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-900 to-green-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-1">
            {t("interviewComplete", lang)}
          </h2>
          <div className="bg-green-50 rounded-xl p-4 my-4 text-left space-y-1">
            <p className="text-sm text-green-700">
              <b>{turns.length}</b> {t("questionsAnswered", lang)}
            </p>
            <p className="text-sm text-green-700">
              {t("averageScore", lang)}: <b>{avg}/10</b>
            </p>
            <p className="text-xs text-green-600">{t("scoringInProgress", lang)}</p>
          </div>
          <p className="text-xs text-gray-400 mb-6">{t("thankYou", lang)}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full bg-green-700 text-white py-3 rounded-xl font-bold"
          >
            {t("home", lang)}
          </button>
        </div>
      </main>
    );
  }

  // ── Main ───────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-green-800 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-base">KaushalMitra</h1>
          <p className="text-green-300 text-xs">
            {stageLabel(currentStage)} · {turnNumber}/8
          </p>
        </div>
        {sessionInfo && (
          <div className="text-right text-xs">
            <p className="font-medium">{sessionInfo.name}</p>
            <p className="text-green-300 capitalize">{sessionInfo.trade}</p>
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

      {/* Face Monitor — passes lang for localised messages */}
      <div className="px-4 pt-3">
        <FaceMonitor
          isActive={phase !== "setup"}
          onEvent={(ev) => setIntegrityEvents((p) => [...p, ev])}
          showOverlay={true}
          lang={lang}
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto space-y-3">
        {phase === "setup" ? (
          <div className="text-center mt-6">
            <div className="text-5xl mb-4">🎤</div>
            <p className="text-lg font-semibold text-gray-700 mb-2">
              {t("readyQuestion", lang)}
            </p>
            <ul className="text-sm text-gray-500 text-left space-y-2 bg-gray-50 rounded-xl p-4 mt-4">
              <li>✅ {t("enableCamera", lang)}</li>
              <li>✅ {t("quietPlace", lang)}</li>
              <li>✅ {t("eightQuestions", lang)}</li>
            </ul>
          </div>
        ) : (
          <>
            {/* Question card */}
            <div
              className={`rounded-2xl p-4 shadow-sm border transition-colors ${
                phase === "question_playing"
                  ? "bg-blue-50 border-blue-300"
                  : phase === "listening"
                  ? "bg-white border-green-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                  {stageLabel(currentStage)}
                </span>
                {phase === "question_playing" && (
                  <span className="text-xs text-blue-500 animate-pulse">
                    🔊 {t("questionPlaying", lang)}
                  </span>
                )}
                {phase === "listening" && (
                  <span className="text-xs text-green-600 animate-pulse">
                    🎤 {t("listeningLabel", lang)}
                  </span>
                )}
              </div>
              <p className="text-gray-800 text-base leading-relaxed">
                {currentQuestion.primary}
              </p>
              {lang === "kn" && currentQuestion.en && (
                <p className="text-gray-400 text-xs mt-2">{currentQuestion.en}</p>
              )}
            </div>

            {/* Mic muted banner during TTS */}
            {phase === "question_playing" && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-blue-600 text-xs text-center">
                🔇 {lang === "kn"
                  ? "ಪ್ರಶ್ನೆ ನಡೆಯುತ್ತಿದೆ — ಮೈಕ್ ಮ್ಯೂಟ್"
                  : "Question playing — microphone muted"}
              </div>
            )}

            {/* Live transcript */}
            {currentTranscript && phase === "listening" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs text-yellow-600 mb-1 font-medium">
                  {t("yourAnswer", lang)}
                </p>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {currentTranscript}
                </p>
              </div>
            )}

            {/* Processing spinner */}
            {phase === "processing" && (
              <div className="text-center py-4 text-gray-500 text-sm">
                <span className="inline-block w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                {t("analyzing", lang)}
              </div>
            )}

            {/* Previous turns */}
            {turns.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  {t("previousAnswers", lang)}
                </p>
                {turns.slice(-2).reverse().map((turn, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 opacity-60">
                    <p className="text-xs text-gray-500 truncate">{turn.question_primary}</p>
                    <span className={`text-xs rounded-full px-2 py-0.5 mt-1 inline-block ${
                      turn.quality === "excellent" || turn.quality === "good"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-600"
                    }`}>
                      {turn.quality} · {turn.score}/10
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-4 bg-white border-t border-gray-100 space-y-2">
        {/* AudioRecorder: lang prop routes ASR correctly (en→Whisper v3) */}
        <AudioRecorder
          apiUrl={API_URL}
          lang={lang}
          onTranscript={handleTranscript}
          onError={(e) => setError(e)}
          isActive={micActive}
        />

        {phase === "setup" && (
          <button
            onClick={startInterview}
            className="w-full bg-green-700 text-white py-5 rounded-2xl font-bold text-lg active:scale-95 shadow-lg"
          >
            🎤 {t("interviewStart", lang)}
          </button>
        )}

        {phase === "listening" && (
          <button
            onClick={submitAnswer}
            className={`w-full py-5 rounded-2xl font-bold text-lg active:scale-95 shadow-md ${
              currentTranscript.trim()
                ? "bg-blue-600 text-white"
                : "bg-green-700 text-white"
            }`}
          >
            {currentTranscript.trim()
              ? `✅ ${t("submitAnswer", lang)}`
              : `🎤 ${t("speaking", lang)}`}
          </button>
        )}

        {phase === "question_playing" && (
          <button
            onClick={() => { stopTTS(); setPhase("listening"); }}
            className="w-full bg-yellow-500 text-white py-5 rounded-2xl font-bold text-lg active:scale-95"
          >
            ⏭️ {t("skipQuestion", lang)}
          </button>
        )}

        {phase === "processing" && (
          <div className="w-full bg-gray-100 py-5 rounded-2xl text-center text-gray-400 font-medium">
            ⏳ {t("analyzing", lang)}
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

import { T } from "@/lib/translations";

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>}>
      <InterviewContent />
    </Suspense>
  );
}
