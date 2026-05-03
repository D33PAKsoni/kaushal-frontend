"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TRADES = [
  { value: "electrician", label: "ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ · Electrician" },
  { value: "plumber", label: "ಪ್ಲಂಬರ್ · Plumber" },
];

const DISTRICTS = [
  "Belagavi", "Dharwad", "Mysuru", "Bengaluru Urban",
  "Bengaluru Rural", "Dakshina Kannada", "Ballari", "Tumakuru",
  "Kalaburagi", "Shivamogga", "Hassan", "Mandya",
];

const LANGUAGES = [
  { value: "kn", label: "ಕನ್ನಡ · Kannada" },
  { value: "hi", label: "हिंदी · Hindi" },
  { value: "en", label: "English" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    trade: "",
    district: "",
    language: "kn",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name || !form.trade || !form.district) {
      setError("Please fill all fields · ದಯವಿಟ್ಟು ಎಲ್ಲಾ ಮಾಹಿತಿ ತುಂಬಿರಿ");
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
          preferred_language: form.language,
        }),
      });

      if (!res.ok) throw new Error("Failed to create session");

      const data = await res.json();
      // Store session in sessionStorage for the interview page
      sessionStorage.setItem("km_session", JSON.stringify({
        session_id: data.session_id,
        ...form,
      }));

      router.push(`/candidate/interview?session=${data.session_id}`);
    } catch (err) {
      setError("Connection error. Please check backend is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-900 to-green-700 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📝</div>
          <h2 className="text-xl font-bold text-green-900">ನೋಂದಣಿ</h2>
          <p className="text-gray-500 text-sm">Registration</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ಹೆಸರು · Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ನಿಮ್ಮ ಹೆಸರು ಟೈಪ್ ಮಾಡಿ"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Trade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ವೃತ್ತಿ · Trade
            </label>
            <select
              value={form.trade}
              onChange={(e) => setForm({ ...form, trade: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">ವೃತ್ತಿ ಆಯ್ಕೆ ಮಾಡಿ</option>
              {TRADES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ಜಿಲ್ಲೆ · District
            </label>
            <select
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">ಜಿಲ್ಲೆ ಆಯ್ಕೆ ಮಾಡಿ</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ಭಾಷೆ · Language
            </label>
            <div className="flex gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setForm({ ...form, language: l.value })}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                    form.language === l.value
                      ? "bg-green-700 text-white border-green-700"
                      : "border-gray-300 text-gray-600 hover:border-green-400"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-2xl transition-all active:scale-95 mt-2"
          >
            {loading ? "⏳ ದಯವಿಟ್ಟು ನಿರೀಕ್ಷಿಸಿ..." : "ಮುಂದೆ · Continue →"}
          </button>
        </div>
      </div>
    </main>
  );
}
