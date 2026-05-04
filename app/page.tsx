"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-900 to-green-700 text-white px-4">
      {/* Logo / Title */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🎓</div>
        <h1 className="text-4xl font-bold mb-1">KaushalMitra</h1>
        <p className="text-2xl font-kannada text-green-200 mb-2">ಕೌಶಲ ಮಿತ್ರ</p>
        <p className="text-green-300 text-sm">Skill Companion · EDCS Karnataka</p>
      </div>

      {/* Description */}
      <div className="bg-white/10 rounded-2xl p-6 max-w-sm w-full text-center mb-8">
        <p className="text-lg font-kannada mb-2">
          ನಿಮ್ಮ ಕೌಶಲ ಮೌಲ್ಯಮಾಪನಕ್ಕೆ ಸ್ವಾಗತ
        </p>
        <p className="text-green-200 text-sm">
          Welcome to your skill assessment
        </p>
        <div className="mt-4 text-xs text-green-300 space-y-1">
          <p>✅ ಕ್ಯಾಮೆರಾ ಮತ್ತು ಮೈಕ್ ಅಗತ್ಯವಿದೆ</p>
          <p>✅ Camera & microphone required</p>
          <p>⏱️ ~8 ನಿಮಿಷ · ~8 minutes</p>
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/candidate/language"
        className="bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold text-lg px-10 py-4 rounded-2xl shadow-lg transition-all active:scale-95"
      >
        ಪ್ರಾರಂಭಿಸಿ · Start
      </Link>

      {/* Admin link */}
      <Link
        href="/admin"
        className="mt-6 text-green-300 text-sm underline"
      >
        Admin Dashboard →
      </Link>

      {/* Karnataka Govt branding */}
      <div className="absolute bottom-6 text-center text-green-400 text-xs">
        <p>Directorate of Electronic Delivery of Citizen Services</p>
        <p>Government of Karnataka</p>
      </div>
    </main>
  );
}
