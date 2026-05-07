"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FITMENT_BADGE: Record<string, string> = {
  job_ready:         "bg-green-100 text-green-800",
  trainable:         "bg-yellow-100 text-yellow-800",
  requires_training: "bg-orange-100 text-orange-800",
  not_suitable:      "bg-red-100 text-red-800",
  review_required:   "bg-gray-100 text-gray-800",
};

const DISTRICTS = [
  "Belagavi","Dharwad","Mysuru","Bengaluru Urban",
  "Bengaluru Rural","Dakshina Kannada","Ballari","Tumakuru",
  "Kalaburagi","Shivamogga","Hassan","Mandya",
];

const FITMENT_OPTIONS = [
  { value: "job_ready",         label: "Job Ready ✅" },
  { value: "trainable",         label: "Trainable 🟡" },
  { value: "requires_training", label: "Requires Training 🟠" },
  { value: "not_suitable",      label: "Not Suitable 🔴" },
  { value: "review_required",   label: "Review Required 🔍" },
];

interface StatCard {
  label: string;
  value: number;
  color: string;
  emoji: string;
}

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    district: "",
    trade: "",
    fitment: "",
    flagged_only: false,
    search: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "flagged" | "shortlisted">("all");
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, candidatesRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`),
        fetch(
          `${API_URL}/admin/candidates?` +
          new URLSearchParams({
            ...(filters.district && { district: filters.district }),
            ...(filters.trade && { trade: filters.trade }),
            ...(filters.fitment && { fitment: filters.fitment }),
            ...(filters.flagged_only && { flagged_only: "true" }),
            ...(activeTab === "shortlisted" && { shortlisted_only: "true" }),
            ...(filters.search && { search: filters.search }),
            limit: "100",
          })
        ),
      ]);
      setStats(await statsRes.json());
      const cd = await candidatesRes.json();
      setCandidates(cd.candidates || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleShortlist = async (sessionId: string) => {
    await fetch(`${API_URL}/admin/candidates/${sessionId}/shortlist`, { method: "POST" });
    fetchData();
  };

  const handleUnflag = async (sessionId: string) => {
    await fetch(`${API_URL}/admin/candidates/${sessionId}/unflag`, { method: "POST" });
    fetchData();
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        ...(filters.district && { district: filters.district }),
        ...(filters.trade && { trade: filters.trade }),
        ...(filters.fitment && { fitment: filters.fitment }),
      });
      const res = await fetch(`${API_URL}/admin/export/csv?${params}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kaushal_mitra_candidates.csv`;
      a.click();
    } finally {
      setExporting(false);
    }
  };

  const statCards: StatCard[] = stats ? [
    { label: "Total Assessed", value: stats.total,            color: "bg-blue-50 text-blue-700",    emoji: "👥" },
    { label: "Job Ready",      value: stats.job_ready,        color: "bg-green-50 text-green-700",  emoji: "✅" },
    { label: "Trainable",      value: stats.trainable,        color: "bg-yellow-50 text-yellow-700",emoji: "🟡" },
    { label: "Needs Training", value: stats.requires_training,color: "bg-orange-50 text-orange-700",emoji: "🟠" },
    { label: "Not Suitable",   value: stats.not_suitable,     color: "bg-red-50 text-red-700",      emoji: "🔴" },
    { label: "Flagged",        value: stats.flagged,          color: "bg-gray-50 text-gray-700",    emoji: "🔍" },
    { label: "Shortlisted",    value: stats.shortlisted,      color: "bg-purple-50 text-purple-700",emoji: "⭐" },
  ] : [];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-800 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">KaushalMitra Admin</h1>
          <p className="text-green-300 text-xs">ಕೌಶಲ ಮಿತ್ರ — District Officer Dashboard</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="bg-white text-green-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "📥 Export CSV"}
          </button>
          <button
            onClick={fetchData}
            className="bg-green-700 border border-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {statCards.map((s) => (
              <div key={s.label} className={`${s.color} rounded-xl p-3 text-center border border-white`}>
                <p className="text-2xl font-bold">{s.emoji} {s.value}</p>
                <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["all", "flagged", "shortlisted"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-green-700 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {tab === "all" ? "All Candidates" : tab === "flagged" ? "🔍 Flagged" : "⭐ Shortlisted"}
              {tab === "flagged" && stats?.flagged > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">
                  {stats.flagged}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">District</label>
              <select
                value={filters.district}
                onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Districts</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Trade</label>
              <select
                value={filters.trade}
                onChange={(e) => setFilters({ ...filters, trade: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Trades</option>
                <option value="electrician">Electrician</option>
                <option value="plumber">Plumber</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fitment</label>
              <select
                value={filters.fitment}
                onChange={(e) => setFilters({ ...filters, fitment: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Categories</option>
                {FITMENT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-1">Search Name</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search by name..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => setFilters({ district: "", trade: "", fitment: "", flagged_only: false, search: "" })}
              className="text-sm text-gray-400 hover:text-gray-600 py-2"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {loading ? "Loading..." : `${candidates.length} candidates`}
            </p>
            {selectedIds.size > 0 && (
              <p className="text-sm text-green-700 font-medium">
                {selectedIds.size} selected
              </p>
            )}
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400">
              <div className="inline-block w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p>Loading candidates...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p>No candidates found</p>
              <p className="text-xs mt-1">Adjust filters or check Supabase connection</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trade</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">District</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fitment</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Integrity</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidates.map((c) => (
                    <tr
                      key={c.session_id}
                      className={`hover:bg-gray-50 transition-colors ${c.is_flagged ? "bg-red-50/30" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.is_flagged && <span title={c.flag_reason}>🔍</span>}
                          {c.is_shortlisted && <span>⭐</span>}
                          <div>
                            <p className="font-medium text-gray-800">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.language === "kn" ? "ಕನ್ನಡ" : "EN"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600">{c.trade}</td>
                      <td className="px-4 py-3 text-gray-600">{c.district}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          FITMENT_BADGE[c.fitment_category] || "bg-gray-100 text-gray-600"
                        }`}>
                          {c.fitment_label_en || c.fitment_category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                (c.composite_score || 0) >= 8 ? "bg-green-500" :
                                (c.composite_score || 0) >= 6 ? "bg-yellow-500" :
                                (c.composite_score || 0) >= 4 ? "bg-orange-500" : "bg-red-500"
                              }`}
                              style={{ width: `${((c.composite_score || 0) / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-gray-700 font-medium">
                            {(c.composite_score || 0).toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${
                          (c.integrity_score || 0) >= 9 ? "text-green-600" :
                          (c.integrity_score || 0) >= 7 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {(c.integrity_score || 0).toFixed(1)}/10
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {!c.is_shortlisted && (
                            <button
                              onClick={() => handleShortlist(c.session_id)}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200"
                            >
                              Shortlist
                            </button>
                          )}
                          {c.is_flagged && (
                            <button
                              onClick={() => handleUnflag(c.session_id)}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-200"
                            >
                              Clear Flag
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
