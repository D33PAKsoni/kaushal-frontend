"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AudioRecorder, { TranscriptEntry } from "@/components/AudioRecorder";
import FaceMonitor, { IntegrityEvent } from "@/components/FaceMonitor";
import { useTTS } from "@/components/useTTS";
import { t, T, Lang } from "@/lib/translations";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Interview phase state machine
// setup → question_playing → ready_to_answer → recording → processing → (repeat) → complete
type Phase =
  | "setup"
  | "question_playing"   // TTS active — mic button greyed out
  | "ready_to_answer"    // TTS done — mic button lit up, waiting for candidate to press
  | "recording"          // candidate pressed mic — recording in progress
  | "processing"         // answer submitted — waiting for agent
  | "complete";

interface Turn {
  question_primary: string;
  answer: string;
  quality: string;
  score: number;
  stage: string;
}

const STAGE_KEY: Record<string, any> = {
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
  const [micPermitted, setMicPermitted] = useState(false);

  const { speak, stop: stopTTS, isSpeaking } = useTTS();
  const processingStartRef = useRef<number>(0);

  // Mic is ONLY active when phase === "recording"
  const isRecording = phase === "recording";

  useEffect(() => {
    const storedLang = sessionStorage.getItem("km_lang") as Lang | null;
    const stored = sessionStorage.getItem("km_session");
    if (storedLang) setLang(storedLang);
    if (stored) setSessionInfo(JSON.parse(stored));
  }, []);

  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    // Only accumulate if still in recording phase
    setCurrentTranscript((prev) =>
      prev ? `${prev} ${entry.text}` : entry.text
    );
  }, []);

  const flushIntegrityEvents = useCallback(async (events: IntegrityEvent[]) => {
    if (!events.length) return;
    try {
      await fetch(`${API_URL}/session/${sessionId}/integrity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
    } catch { /* non-critical */ }
  }, [sessionId]);

  // Called when candidate presses mic button to stop and submit
  const handleStopAndSubmit = useCallback(async () => {
    if (phase !== "recording") return;
    // Stop mic immediately
    setPhase("processing");
    setError("");
    processingStartRef.current = Date.now();

    // Small delay to let the last audio chunk arrive
    await new Promise((r) => setTimeout(r, 600));

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
      if (!res.ok) throw new Error(`Agent error: ${res.status}`);
      const data = await res.json();

      setProcessingTime(Date.now() - processingStartRef.current);
      setTurns((prev) => [
        ...prev,
        {
          question_primary: currentQuestion.primary,
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
        primary: data.next_question_primary || data.next_question_kn,
        en: data.next_question_en,
      });

      if (data.is_complete) {
        await flushIntegrityEvents(integrityEvents);
        setPhase("complete");
        return;
      }

      // Play next question — mic button stays greyed
      setPhase("question_playing");
      await speak(
        data.tts,
        data.next_question_primary || data.next_question_kn,
        lang
      );
      // TTS done → light up mic button
      setPhase("ready_to_answer");

    } catch (err: any) {
      setError(`${t("connectionError", lang)}: ${err.message}`);
      setPhase("ready_to_answer");
    }
  }, [
    phase, currentTranscript, turnNumber, sessionId, sessionInfo,
    currentQuestion, currentStage, integrityEvents, lang, speak, flushIntegrityEvents,
  ]);

  const startInterview = async () => {
    const openingText = t("openingQuestion", lang);
    setCurrentQuestion({ primary: openingText, en: T.openingQuestion.en });
    setPhase("question_playing");
    await speak({ use_browser_tts: true, text: openingText }, openingText, lang);
    setPhase("ready_to_answer");
  };

  const handleIntegrityEvent = useCallback(
    (ev: IntegrityEvent) => setIntegrityEvents((p) => [...p, ev]),
    []
  );

  const sl = (stage: string) => {
    const key = STAGE_KEY[stage];
    return key ? t(key, lang) : stage;
  };

  // ── Mic button config ──────────────────────────────────
  const micButtonConfig = (() => {
    switch (phase) {
      case "setup":
        return { disabled: true, label: "–", color: "bg-gray-300 text-gray-400", pulse: false };
      case "question_playing":
        return {
          disabled: true,
          label: lang === "kn" ? "🔇 ಪ್ರಶ್ನೆ ನಡೆಯುತ್ತಿದೆ..." : "🔇 Question playing...",
          color: "bg-gray-300 text-gray-400 cursor-not-allowed",
          pulse: false,
        };
      case "ready_to_answer":
        return {
          disabled: false,
          label: lang === "kn" ? "🎤 ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಿ" : "🎤 Press to Speak",
          color: "bg-green-600 hover:bg-green-500 text-white shadow-lg animate-pulse",
          pulse: true,
        };
      case "recording":
        return {
          disabled: false,
          label: lang === "kn" ? "⏹️ ನಿಲ್ಲಿಸಿ ಮತ್ತು ಸಲ್ಲಿಸಿ" : "⏹️ Stop & Submit",
          color: "bg-red-500 hover:bg-red-400 text-white shadow-lg",
          pulse: false,
        };
      case "processing":
        return {
          disabled: true,
          label: lang === "kn" ? "⏳ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ..." : "⏳ Analysing...",
          color: "bg-gray-300 text-gray-400 cursor-not-allowed",
          pulse: false,
        };
      default:
        return { disabled: true, label: "–", color: "bg-gray-300", pulse: false };
    }
  })();

  // ── Complete screen ────────────────────────────────────
  if (phase === "complete") {
    const avgScore = turns.length
      ? Math.round(turns.reduce((s, t) => s + t.score, 0) / turns.length)
      : 0;
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-900 to-green-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-1">
            {t("interviewComplete", lang)}
          </h2>
          <div className="bg-green-50 rounded-xl p-4 mb-4 text-left space-y-1 mt-4">
            <p className="text-sm text-green-700">
              <b>{turns.length}</b> {t("questionsAnswered", lang)}
            </p>
            <p className="text-sm text-green-700">
              {t("averageScore", lang)}: <b>{avgScore}/10</b>
            </p>
            <p className="text-xs text-green-600 mt-1">
              {t("scoringInProgress", lang)}
            </p>
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

  // ── Main screen ────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-green-800 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-base">KaushalMitra</h1>
          <p className="text-green-300 text-xs">
            {sl(currentStage)} · {turnNumber}/8
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

      {/* Face Monitor */}
      <div className="px-4 pt-3">
        <FaceMonitor
          isActive={phase !== "setup"}
          onEvent={handleIntegrityEvent}
          onCameraReady={() => {}}
          showOverlay={true}
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {phase === "setup" ? (
          <div className="text-center mt-4">
            <div className="text-5xl mb-3">🎤</div>
            <p className="text-lg text-gray-700 font-semibold mb-2">
              {t("readyQuestion", lang)}
            </p>
            <ul className="text-sm text-gray-500 text-left space-y-2 bg-gray-50 rounded-xl p-4 mt-3">
              <li>✅ {t("enableCamera", lang)}</li>
              <li>✅ {t("quietPlace", lang)}</li>
              <li>✅ {t("eightQuestions", lang)}</li>
              <li>
                {lang === "kn"
                  ? "✅ ಮೈಕ್ ಬಟನ್ ಒತ್ತಿ ಉತ್ತರಿಸಿ"
                  : "✅ Press the mic button to answer each question"}
              </li>
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Question card */}
            <div
              className={`rounded-2xl p-4 shadow-sm border transition-all ${
                phase === "question_playing"
                  ? "bg-blue-50 border-blue-300"
                  : phase === "ready_to_answer"
                  ? "bg-green-50 border-green-300"
                  : phase === "recording"
                  ? "bg-red-50 border-red-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                  {sl(currentStage)}
                </span>
                {phase === "question_playing" && (
                  <span className="text-xs text-blue-500 animate-pulse">
                    🔊 {t("questionPlaying", lang)}
                  </span>
                )}
                {phase === "ready_to_answer" && (
                  <span className="text-xs text-green-600 font-medium animate-pulse">
                    {lang === "kn" ? "👇 ಮೈಕ್ ಒತ್ತಿ ಉತ್ತರಿಸಿ" : "👇 Press mic to answer"}
                  </span>
                )}
                {phase === "recording" && (
                  <span className="text-xs text-red-600 animate-pulse font-medium">
                    🔴 {t("listeningLabel", lang)}
                  </span>
                )}
              </div>
              <p className="text-gray-800 text-base leading-relaxed">
                {currentQuestion.primary}
              </p>
              {lang === "kn" && currentQuestion.en && currentQuestion.en !== currentQuestion.primary && (
                <p className="text-gray-400 text-xs mt-2">{currentQuestion.en}</p>
              )}
            </div>

            {/* Live transcript while recording */}
            {currentTranscript && (phase === "recording" || phase === "processing") && (
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
              <div className="text-center py-3 text-gray-500 text-sm">
                <div className="inline-block w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                {t("analyzing", lang)}
              </div>
            )}

            {/* Previous turns */}
            {turns.length > 0 && (
              <div className="space-y-2 mt-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  {t("previousAnswers", lang)}
                </p>
                {turns.slice(-2).reverse().map((turn, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 opacity-60">
                    <p className="text-xs text-gray-500 truncate">{turn.question_primary}</p>
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 mt-1 inline-block ${
                        turn.quality === "excellent" || turn.quality === "good"
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      {turn.quality} · {turn.score}/10
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

      {/* ── Bottom controls ── */}
      <div className="px-4 pb-6 pt-3 bg-white border-t border-gray-100 space-y-3">

        {/* AudioRecorder — invisible, only active when phase==="recording" */}
        <AudioRecorder
          apiUrl={API_URL}
          onTranscript={handleTranscript}
          onError={(e) => setError(e)}
          isActive={isRecording}
          onMicReady={() => setMicPermitted(true)}
          lang={lang}
        />

        {phase === "setup" ? (
          <button
            onClick={startInterview}
            className="w-full bg-green-700 text-white py-5 rounded-2xl font-bold text-lg active:scale-95 transition-all shadow-lg"
          >
            🎤 {t("interviewStart", lang)}
          </button>
        ) : (
          <div className="space-y-2">
            {/* THE MIC BUTTON — central UX element */}
            <button
              disabled={micButtonConfig.disabled}
              onClick={() => {
                if (phase === "ready_to_answer") {
                  setCurrentTranscript(""); // clear any stale text
                  setPhase("recording");
                } else if (phase === "recording") {
                  handleStopAndSubmit();
                }
              }}
              className={`w-full py-5 rounded-2xl font-bold text-lg transition-all active:scale-95 ${micButtonConfig.color}`}
            >
              {micButtonConfig.label}
            </button>

            {/* Skip TTS button */}
            {phase === "question_playing" && (
              <button
                onClick={() => { stopTTS(); setPhase("ready_to_answer"); }}
                className="w-full bg-yellow-500 text-white py-3 rounded-xl text-sm font-medium active:scale-95"
              >
                ⏭️ {t("skipQuestion", lang)}
              </button>
            )}
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
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Loading...
      </div>
    }>
      <InterviewContent />
    </Suspense>
  );
}
