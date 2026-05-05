"use client";
import { useState, useEffect } from "react";
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

export default function RegisterPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("kn");
  const [form, setForm] = useState({ name: "", trade: "", district: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("km_lang") as Lang | null;
    if (!stored) { router.replace("/candidate/language"); return; }
    setLang(stored);
  }, [router]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.trade || !form.district) {
      setError(t("fillAllFields", lang)); return;
    }
    setLoading(true); setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/session/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: form.name, trade: form.trade,
          district: form.district, preferred_language: lang,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      sessionStorage.setItem("km_session", JSON.stringify({
        session_id: data.session_id, ...form, language: lang,
      }));
      router.push(`/candidate/interview?session=${data.session_id}`);
    } catch {
      setError(t("connectionError", lang));
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-900 to-green-700 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push("/candidate/language")}
            className="text-gray-400 hover:text-gray-600 text-sm">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("name", lang)}</label>
            <input type="text" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("namePlaceholder", lang)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("trade", lang)}</label>
            <div className="flex gap-2">
              {TRADES.map((tr) => (
                <button key={tr.value} onClick={() => setForm({ ...form, trade: tr.value })}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.trade === tr.value
                      ? "bg-green-700 text-white border-green-700"
                      : "border-gray-300 text-gray-600 hover:border-green-400"
                  }`}>
                  {lang === "kn" ? tr.kn : tr.en}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("district", lang)}</label>
            <select value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">{t("districtPlaceholder", lang)}</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-2xl transition-all active:scale-95 mt-2">
            {loading ? t("pleaseWait", lang) : `${t("continue", lang)} →`}
          </button>
        </div>
      </div>
    </main>
  );
}
