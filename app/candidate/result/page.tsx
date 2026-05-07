"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Lang } from "@/lib/translations";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_POLLS = 40;       // 40 × 3s = 2 minutes max wait
const POLL_INTERVAL = 3000; // 3 seconds

const FITMENT_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  job_ready:         { bg: "bg-green-50",  text: "text-green-800",  border: "border-green-300" },
  trainable:         { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-300" },
  requires_training: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-300" },
  not_suitable:      { bg: "bg-red-50",    text: "text-red-800",    border: "border-red-300" },
  review_required:   { bg: "bg-gray-50",   text: "text-gray-800",   border: "border-gray-300" },
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.round((score / 10) * 100);
  const color = score >= 8 ? "bg-green-500" : score >= 6 ? "bg-yellow-500" : score >= 4 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-bold text-gray-800">{score.toFixed(1)}/10</span>
      </div>
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") || "";
  const [lang, setLang] = useState<Lang>("kn");
  const [status, setStatus] = useState<"waiting" | "ready" | "timeout" | "error">("waiting");
  const [result, setResult] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    const l = sessionStorage.getItem("km_lang") as Lang | null;
    if (l) setLang(l);
  }, []);

  useEffect(() => {
    if (!sessionId || status === "ready") return;

    let count = 0;
    const messages = lang === "kn"
      ? ["ಉತ್ತರಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...", "ಸ್ಕೋರ್ ಲೆಕ್ಕ ಹಾಕಲಾಗುತ್ತಿದೆ...", "ಫಲಿತಾಂಶ ತಯಾರಾಗುತ್ತಿದೆ...", "ಶಿಫಾರಸುಗಳನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ..."]
      : ["Analysing your answers...", "Calculating scores...", "Preparing result...", "Generating recommendations..."];

    const poll = async () => {
      try {
        // Update status message
        setStatusText(messages[Math.floor(count / 3) % messages.length]);
        setPollCount(count);

        const res = await fetch(`${API_URL}/score/${sessionId}/status`);
        const data = await res.json();

        if (data.status === "complete") {
          const rRes = await fetch(`${API_URL}/score/${sessionId}/result/summary`);
          if (rRes.ok) {
            const rData = await rRes.json();
            setResult(rData);
            setStatus("ready");
            clearInterval(timer);
          }
        } else if (data.status === "error") {
          setStatus("error");
          clearInterval(timer);
        }

        count++;
        if (count >= MAX_POLLS) {
          clearInterval(timer);
          setStatus("timeout");
        }
      } catch {
        count++;
      }
    };

    poll(); // immediate first call
    const timer = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Waiting screen ────────────────────────────────────
  if (status === "waiting") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-900 to-green-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="text-5xl mb-4">
            {pollCount < 5 ? "🧠" : pollCount < 15 ? "⚙️" : "📊"}
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {lang === "kn" ? "ಫಲಿತಾಂಶ ತಯಾರಾಗುತ್ತಿದೆ..." : "Preparing your result..."}
          </h2>
          <p className="text-gray-500 text-sm mb-6 min-h-[1.5rem]">{statusText}</p>
          <div className="flex justify-center gap-1.5 mb-4">
            {[0,1,2].map((i) => (
              <div key={i} className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${Math.min(95, (pollCount / MAX_POLLS) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-300 mt-2">~{Math.max(0, (MAX_POLLS - pollCount) * 3)}s remaining</p>
        </div>
      </main>
    );
  }

  // ── Timeout screen ────────────────────────────────────
  if (status === "timeout") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">⏰</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">
            {lang === "kn" ? "ತಡ ಆಗುತ್ತಿದೆ" : "Taking longer than expected"}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {lang === "kn"
              ? "ನಿಮ್ಮ ಫಲಿತಾಂಶ ಸಿದ್ಧವಾಗುತ್ತಿದೆ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
              : "Your result is still being processed. Please try again in a moment."}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => { setStatus("waiting"); setPollCount(0); }}
              className="w-full bg-green-700 text-white py-3 rounded-xl font-bold"
            >
              {lang === "kn" ? "🔄 ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ" : "🔄 Try Again"}
            </button>
            <button onClick={() => router.push("/")} className="w-full text-gray-400 text-sm py-2">
              {lang === "kn" ? "ಮುಖಪುಟ" : "Go Home"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Error screen ──────────────────────────────────────
  if (status === "error" || !result) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-600">{lang === "kn" ? "ಫಲಿತಾಂಶ ಲೋಡ್ ಆಗಲಿಲ್ಲ" : "Could not load result"}</p>
          <button onClick={() => router.push("/")} className="mt-4 text-green-700 underline text-sm">
            {lang === "kn" ? "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ" : "Go home"}
          </button>
        </div>
      </main>
    );
  }

  // ── Result card ───────────────────────────────────────
  const fc = result.fitment_category;
  const style = FITMENT_STYLE[fc] || FITMENT_STYLE.review_required;
  const label = lang === "kn" ? result.fitment_label_kn : result.fitment_label_en;
  const cards = result.reason_cards || {};

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-green-800 text-white px-4 py-4 text-center">
        <h1 className="font-bold text-lg">KaushalMitra</h1>
        <p className="text-green-300 text-xs">
          {lang === "kn" ? "ಕೌಶಲ ಮೌಲ್ಯಮಾಪನ ಫಲಿತಾಂಶ" : "Skill Assessment Result"}
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* Fitment badge */}
        <div className={`rounded-2xl p-5 border-2 text-center ${style.bg} ${style.border}`}>
          <p className={`text-3xl font-bold mb-1 ${style.text}`}>{label}</p>
          <p className="text-gray-500 text-sm">
            {lang === "kn" ? "ಒಟ್ಟು ಸ್ಕೋರ್" : "Composite Score"}:
            <span className="font-bold text-gray-700 ml-1">{result.composite_score}/10</span>
          </p>
          {result.is_flagged && (
            <p className="mt-2 text-xs text-red-600 font-medium">
              🔍 {lang === "kn" ? "ಹಸ್ತಚಾಲಿತ ಪರಿಶೀಲನೆ ಅಗತ್ಯ" : "Flagged for manual review"}
            </p>
          )}
        </div>

        {/* Score bars */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">
            {lang === "kn" ? "ಸ್ಕೋರ್ ವಿವರ" : "Score Breakdown"}
          </h3>
          <ScoreBar label={lang === "kn" ? "ವಿಷಯ ಜ್ಞಾನ" : "Domain Knowledge"} score={result.domain_score} />
          <ScoreBar label={lang === "kn" ? "ಸಂವಹನ" : "Communication"} score={result.communication_score} />
          <ScoreBar label={lang === "kn" ? "ಒಟ್ಟು" : "Composite"} score={result.composite_score} />
        </div>

        {/* Summary */}
        {(cards.summary_kn || cards.summary_en) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-2">{lang === "kn" ? "ಸಾರಾಂಶ" : "Summary"}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {lang === "kn" ? cards.summary_kn : cards.summary_en}
            </p>
          </div>
        )}

        {/* Strengths */}
        {(cards.strengths_kn?.length || cards.strengths_en?.length) && (
          <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
            <h3 className="font-semibold text-green-800 mb-3">
              {lang === "kn" ? "✅ ಶಕ್ತಿಗಳು" : "✅ Strengths"}
            </h3>
            <ul className="space-y-1">
              {(lang === "kn" ? cards.strengths_kn : cards.strengths_en)?.map((s: string, i: number) => (
                <li key={i} className="text-green-700 text-sm flex gap-2"><span>•</span><span>{s}</span></li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {(cards.improvements_kn?.length || cards.improvements_en?.length) && (
          <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
            <h3 className="font-semibold text-orange-800 mb-3">
              {lang === "kn" ? "📈 ಸುಧಾರಣೆ ಬೇಕಾದ ಕ್ಷೇತ್ರಗಳು" : "📈 Areas to Improve"}
            </h3>
            <ul className="space-y-1">
              {(lang === "kn" ? cards.improvements_kn : cards.improvements_en)?.map((s: string, i: number) => (
                <li key={i} className="text-orange-700 text-sm flex gap-2"><span>•</span><span>{s}</span></li>
              ))}
            </ul>
          </div>
        )}

        {/* Next action */}
        {(cards.next_action_kn || cards.next_action_en) && (
          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">
              {lang === "kn" ? "👉 ಮುಂದಿನ ಹೆಜ್ಜೆ" : "👉 Recommended Next Step"}
            </h3>
            <p className="text-blue-700 text-sm font-medium">
              {lang === "kn" ? cards.next_action_kn : cards.next_action_en}
            </p>
          </div>
        )}

        <button
          onClick={() => router.push("/")}
          className="w-full bg-green-700 text-white py-4 rounded-2xl font-bold text-lg mt-2"
        >
          {lang === "kn" ? "ಮುಖಪುಟ" : "Home"}
        </button>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>}>
      <ResultContent />
    </Suspense>
  );
}
