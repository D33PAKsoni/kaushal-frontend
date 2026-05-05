"use client";

import { useRouter } from "next/navigation";

export default function LanguagePage() {
  const router = useRouter();

  const choose = (lang: "kn" | "en") => {
    sessionStorage.setItem("km_lang", lang);
    router.push("/candidate/register");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-900 to-green-700 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">🎓</div>
        <h1 className="text-3xl font-bold text-white">KaushalMitra</h1>
        <p className="text-green-300 text-sm mt-1">ಕೌಶಲ ಮಿತ್ರ · Skill Companion</p>
      </div>

      {/* Language card */}
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-center text-gray-700 font-semibold text-lg mb-1">
          ಭಾಷೆ ಆಯ್ಕೆ ಮಾಡಿ
        </h2>
        <p className="text-center text-gray-400 text-sm mb-6">
          Select Language
        </p>

        <div className="space-y-3">
          {/* Kannada */}
          <button
            onClick={() => choose("kn")}
            className="w-full flex items-center gap-4 border-2 border-green-200 hover:border-green-600 hover:bg-green-50 rounded-2xl px-5 py-4 transition-all active:scale-95 group"
          >
            <span className="text-3xl">🇮🇳</span>
            <div className="text-left">
              <p className="text-lg font-bold text-green-800 group-hover:text-green-900">
                ಕನ್ನಡ
              </p>
              <p className="text-sm text-gray-400">Kannada</p>
            </div>
            <span className="ml-auto text-green-400 group-hover:text-green-600 text-xl">
              →
            </span>
          </button>

          {/* English */}
          <button
            onClick={() => choose("en")}
            className="w-full flex items-center gap-4 border-2 border-blue-200 hover:border-blue-600 hover:bg-blue-50 rounded-2xl px-5 py-4 transition-all active:scale-95 group"
          >
            <span className="text-3xl">🔤</span>
            <div className="text-left">
              <p className="text-lg font-bold text-blue-800 group-hover:text-blue-900">
                English
              </p>
              <p className="text-sm text-gray-400">ಇಂಗ್ಲಿಷ್</p>
            </div>
            <span className="ml-auto text-blue-400 group-hover:text-blue-600 text-xl">
              →
            </span>
          </button>
        </div>
      </div>

      {/* Govt branding */}
      <p className="mt-8 text-green-400 text-xs text-center">
        Directorate of Electronic Delivery of Citizen Services
        <br />
        Government of Karnataka
      </p>
    </main>
  );
}
