"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { t, Lang } from "@/lib/translations";

const TRADES = [
  { value: "electrician", kn: "ಎಲೆಕ್ಟ್ರಿಷಿಯನ್", en: "Electrician" },
  { value: "plumber", kn: "ಪ್ಲಂಬರ್", en: "Plumber" },
];

const DISTRICTS = [
  "Belagavi","Dharwad","Mysuru","Bengaluru Urban",
  "Bengaluru Rural","Dakshina Kannada","Ballari","Tumakuru",
  "Kalaburagi","Shivamogga","Hassan","Mandya",
];

type PermState = "idle" | "requesting" | "granted" | "denied";

export default function RegisterPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("kn");
  const [form, setForm] = useState({ name: "", trade: "", district: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Permission states
  const [micPerm, setMicPerm] = useState<PermState>("idle");
  const [camPerm, setCamPerm] = useState<PermState>("idle");
  const [permRequested, setPermRequested] = useState(false);

  const bothGranted = micPerm === "granted" && camPerm === "granted";
  const anyDenied = micPerm === "denied" || camPerm === "denied";
  const requesting = micPerm === "requesting" || camPerm === "requesting";

  useEffect(() => {
    const stored = sessionStorage.getItem("km_lang") as Lang | null;
    if (!stored) {
      router.replace("/candidate/language");
    } else {
      setLang(stored);
    }
  }, [router]);

  // Check if permissions already granted (browser remembers)
  useEffect(() => {
    const checkExisting = async () => {
      if (!navigator.permissions) return;
      try {
        const [mic, cam] = await Promise.all([
          navigator.permissions.query({ name: "microphone" as PermissionName }),
          navigator.permissions.query({ name: "camera" as PermissionName }),
        ]);
        if (mic.state === "granted") setMicPerm("granted");
        if (cam.state === "granted") setCamPerm("granted");
      } catch { /* permissions API not supported — will ask on button click */ }
    };
    checkExisting();
  }, []);

  const requestPermissions = useCallback(async () => {
    setPermRequested(true);
    setMicPerm("requesting");
    setCamPerm("requesting");
    setError("");

    let micGranted = false;
    let camGranted = false;

    // Request microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((t) => t.stop()); // release immediately
      setMicPerm("granted");
      micGranted = true;
    } catch (e: any) {
      setMicPerm("denied");
      console.warn("Mic denied:", e.name);
    }

    // Request camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop()); // release immediately
      setCamPerm("granted");
      camGranted = true;
    } catch (e: any) {
      setCamPerm("denied");
      console.warn("Camera denied:", e.name);
    }

    if (!micGranted || !camGranted) {
      const denied = [];
      if (!micGranted) denied.push(lang === "kn" ? "ಮೈಕ್" : "microphone");
      if (!camGranted) denied.push(lang === "kn" ? "ಕ್ಯಾಮೆರಾ" : "camera");
      setError(
        lang === "kn"
          ? `${denied.join(" ಮತ್ತು ")} ಅನುಮತಿ ನೀಡಿ. ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ನಲ್ಲಿ ಅನುಮತಿ ಆನ್ ಮಾಡಿ.`
          : `Please allow ${denied.join(" and ")} access. Go to browser Settings → Site Settings to enable.`
      );
    }
  }, [lang]);

  const handleSubmit = async () => {
    // If permissions not yet granted, request them first
    if (!bothGranted) {
      await requestPermissions();
      return;
    }

    if (!form.name.trim() || !form.trade || !form.district) {
      setError(t("fillAllFields", lang));
      return;
    }

    setLoading(true);
    setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/session/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: form.name,
          trade: form.trade,
          district: form.district,
          preferred_language: lang,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      sessionStorage.setItem(
        "km_session",
        JSON.stringify({ session_id: data.session_id, ...form, language: lang })
      );
      router.push(`/candidate/interview?session=${data.session_id}`);
    } catch {
      setError(t("connectionError", lang));
    } finally {
      setLoading(false);
    }
  };

  // Button label and colour logic
  const getButtonConfig = () => {
    if (loading) return { label: t("pleaseWait", lang), cls: "bg-gray-400 cursor-not-allowed" };
    if (requesting) return {
      label: lang === "kn" ? "⏳ ಅನುಮತಿ ಕಾಯುತ್ತಿದೆ..." : "⏳ Requesting permissions...",
      cls: "bg-yellow-500 cursor-wait",
    };
    if (bothGranted) return {
      label: lang === "kn" ? "✅ ಮುಂದೆ → ಸಂದರ್ಶನ" : "✅ Continue → Interview",
      cls: "bg-blue-600 hover:bg-blue-500",
    };
    if (anyDenied) return {
      label: lang === "kn" ? "🔒 ಅನುಮತಿ ನೀಡಿ — ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ" : "🔒 Allow permissions — Try again",
      cls: "bg-orange-500 hover:bg-orange-400",
    };
    // idle — not yet requested
    return {
      label: lang === "kn" ? "📷🎤 ಅನುಮತಿ ನೀಡಿ ಮತ್ತು ಮುಂದೆ ಹೋಗಿ" : "📷🎤 Allow & Continue",
      cls: "bg-green-700 hover:bg-green-600",
    };
  };

  const btn = getButtonConfig();

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-900 to-green-700 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/candidate/language")}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← {t("back", lang)}
          </button>
          <div className="text-center flex-1">
            <div className="text-3xl mb-1">📝</div>
            <h2 className="text-lg font-bold text-green-900">{t("registration", lang)}</h2>
          </div>
          <div className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
            {lang === "kn" ? "ಕನ್ನಡ" : "EN"}
          </div>
        </div>

        <div className="space-y-4">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("name", lang)}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("namePlaceholder", lang)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Trade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("trade", lang)}
            </label>
            <div className="flex gap-2">
              {TRADES.map((tr) => (
                <button
                  key={tr.value}
                  onClick={() => setForm({ ...form, trade: tr.value })}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.trade === tr.value
                      ? "bg-green-700 text-white border-green-700"
                      : "border-gray-300 text-gray-600 hover:border-green-400"
                  }`}
                >
                  {lang === "kn" ? tr.kn : tr.en}
                </button>
              ))}
            </div>
          </div>

          {/* District */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("district", lang)}
            </label>
            <select
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">{t("districtPlaceholder", lang)}</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Permission status indicators */}
          {permRequested && (
            <div className="grid grid-cols-2 gap-2">
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                micPerm === "granted" ? "bg-green-50 text-green-700" :
                micPerm === "denied"  ? "bg-red-50 text-red-600" :
                "bg-yellow-50 text-yellow-700"
              }`}>
                <span>{micPerm === "granted" ? "✅" : micPerm === "denied" ? "❌" : "⏳"}</span>
                <span>{lang === "kn" ? "ಮೈಕ್" : "Microphone"}</span>
              </div>
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                camPerm === "granted" ? "bg-green-50 text-green-700" :
                camPerm === "denied"  ? "bg-red-50 text-red-600" :
                "bg-yellow-50 text-yellow-700"
              }`}>
                <span>{camPerm === "granted" ? "✅" : camPerm === "denied" ? "❌" : "⏳"}</span>
                <span>{lang === "kn" ? "ಕ್ಯಾಮೆರಾ" : "Camera"}</span>
              </div>
            </div>
          )}

          {/* Browser instructions when denied */}
          {anyDenied && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700 space-y-1">
              <p className="font-medium">
                {lang === "kn" ? "ಅನುಮತಿ ಹೇಗೆ ನೀಡುವುದು:" : "How to allow permissions:"}
              </p>
              <p>
                {lang === "kn"
                  ? "Chrome: ಅಡ್ರೆಸ್ ಬಾರ್ ನಲ್ಲಿ 🔒 ಐಕಾನ್ → Site settings → Allow"
                  : "Chrome: Click 🔒 in address bar → Site settings → Allow camera & mic"}
              </p>
              <p>
                {lang === "kn"
                  ? "Safari: Settings → Websites → Camera & Microphone → Allow"
                  : "Safari: Settings → Websites → Camera & Microphone → Allow"}
              </p>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || requesting}
            className={`w-full text-white font-bold text-base py-4 rounded-2xl transition-all active:scale-95 mt-2 disabled:opacity-60 ${btn.cls}`}
          >
            {loading ? t("pleaseWait", lang) : btn.label}
          </button>

          {/* Helper text */}
          {!permRequested && (
            <p className="text-xs text-gray-400 text-center">
              {lang === "kn"
                ? "📷 ಕ್ಯಾಮೆರಾ ಮತ್ತು 🎤 ಮೈಕ್ ಅನುಮತಿ ಸಂದರ್ಶನಕ್ಕೆ ಅಗತ್ಯ"
                : "📷 Camera and 🎤 mic access are required for the interview"}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
