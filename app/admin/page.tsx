"use client";

import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">KaushalMitra · ಕೌಶಲ ಮಿತ್ರ</p>
          </div>
          <Link href="/" className="text-green-700 text-sm">← Back</Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Candidates", value: "–", color: "bg-blue-100 text-blue-700" },
            { label: "Job Ready ✅", value: "–", color: "bg-green-100 text-green-700" },
            { label: "Needs Training 🟡", value: "–", color: "bg-yellow-100 text-yellow-700" },
            { label: "Flagged 🔴", value: "–", color: "bg-red-100 text-red-700" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Placeholder table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center text-gray-400">
          <div className="text-4xl mb-3">📊</div>
          <p className="font-medium">Candidate data will appear here</p>
          <p className="text-sm mt-1">Full dashboard implementation: Day 3</p>
          <p className="text-xs mt-3 text-gray-300">
            Day 1 focus: ASR pipeline · Day 2: Interview loop · Day 3: Scoring + Dashboard
          </p>
        </div>
      </div>
    </main>
  );
}
