'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useGlobalUI } from './GlobalUIProvider'

export default function AdminJobDashboard({ counts }: { counts: Record<string, number> }) {
  const { showLoader, hideLoader, showToast, handleError } = useGlobalUI()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  async function load() {
    setLoading(true)
    showLoader('Memuat data antrean sistem...')
    try {
      const q = new URLSearchParams()
      if (statusFilter) q.set('status', statusFilter)
      q.set('limit', '100')
      const res = await fetch(`/api/admin/jobs?${q.toString()}`)
      const json = await res.json()
      if (json.ok) {
        setJobs(json.jobs || [])
        showToast('Antrean berhasil dimuat!', 'success')
      } else {
        showToast(json?.error || 'Gagal memuat antrean', 'error')
      }
    } catch (e) {
      handleError(e, 'Gagal terhubung ke server antrean')
      console.error(e)
    } finally {
      setLoading(false)
      hideLoader()
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  async function retry(jobId: string) {
    showLoader('Mengulang pekerjaan...')
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/retry`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json()
        showToast(json?.error || 'Gagal mengulang pekerjaan', 'error')
      } else {
        showToast('Pekerjaan berhasil dijadwalkan ulang!', 'success')
      }
      load()
    } catch (e) {
      handleError(e, 'Gagal terhubung untuk mengulang pekerjaan')
    } finally {
      hideLoader()
    }
  }

  async function cancel(jobId: string) {
    showLoader('Membatalkan pekerjaan...')
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/cancel`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json()
        showToast(json?.error || 'Gagal membatalkan pekerjaan', 'error')
      } else {
        showToast('Pekerjaan berhasil dibatalkan!', 'success')
      }
      load()
    } catch (e) {
      handleError(e, 'Gagal terhubung untuk membatalkan pekerjaan')
    } finally {
      hideLoader()
    }
  }

  async function processOne() {
    showLoader('Memproses pekerjaan antrean...')
    try {
      const res = await fetch('/api/jobs/process', { method: 'POST' })
      const j = await res.json()
      if (j.ok) {
        showToast('Berhasil memproses satu pekerjaan antrean!', 'success')
      } else {
        showToast(j.error || 'Antrean kosong atau gagal diproses', 'warning')
      }
      load()
    } catch (e) {
      handleError(e, 'Gagal terhubung untuk memproses antrean')
    } finally {
      hideLoader()
    }
  }

  // Get status badge colors
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      case 'processing':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      case 'done':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'failed':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      case 'cancelled':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
    }
  }

  // Extract counts safely
  const pendingCount = counts?.pending ?? 0
  const processingCount = counts?.processing ?? 0
  const doneCount = counts?.done ?? 0
  const failedCount = counts?.failed ?? 0

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-10 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-900/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Link href="/dashboard" className="hover:text-blue-400 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-200">Admin Queue</span>
        </div>

        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Job Queue Dashboard
              </h1>
              <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                System Admin
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Pantau antrean latar belakang untuk pengetesan otomatis (*Background Testing Jobs*).
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
            >
              Refresh Data
            </button>
            <button
              onClick={processOne}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs transition-all active:scale-[0.98]"
            >
              Proses 1 Antrean
            </button>
          </div>
        </header>

        {/* Count Stat Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">{pendingCount}</span>
          </div>
          <div className="p-4 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Processing</span>
            <span className="text-2xl font-black text-blue-400 mt-1 block">{processingCount}</span>
          </div>
          <div className="p-4 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Done</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{doneCount}</span>
          </div>
          <div className="p-4 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Failed</span>
            <span className="text-2xl font-black text-rose-400 mt-1 block">{failedCount}</span>
          </div>
        </section>

        {/* Filter Toolbar */}
        <section className="p-4 backdrop-blur-md bg-slate-900/40 border border-slate-900 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor="filter" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Filter Status:
            </label>
            <select
              id="filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-slate-300 text-xs px-3 py-1.5 outline-none transition-colors"
            >
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="processing">Processing</option>
              <option value="done">Done</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <span className="text-xs text-slate-500">
            Menampilkan maksimal 100 antrean terbaru
          </span>
        </section>

        {/* Jobs List */}
        <section className="space-y-4">
          {loading && (
            <div className="py-8 text-center text-slate-500 text-sm animate-pulse">
              Memuat data antrean sistem...
            </div>
          )}

          {!loading && jobs.length === 0 && (
            <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 text-slate-500 text-sm">
              Tidak ada antrean pekerjaan (*job*) yang cocok.
            </div>
          )}

          {!loading && jobs.length > 0 && (
            <ul className="space-y-3">
              {jobs.map((j) => (
                <li
                  key={j.id}
                  className="p-5 backdrop-blur-md bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-2xl transition-all"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-slate-400 truncate max-w-[120px] block">
                          ID: {j.id}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getStatusBadge(j.status)}`}>
                          {j.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        TestCase ID: <span className="font-mono text-slate-300">{j.testCaseId}</span> • Percobaan:{' '}
                        <span className="text-slate-300">
                          {j.attempts}/{j.maxAttempts}
                        </span>
                      </div>
                      {j.nextAttempt && (
                        <div className="text-[10px] text-slate-500">
                          Jadwal Percobaan Berikutnya: {new Date(j.nextAttempt).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => retry(j.id)}
                        className="flex-1 sm:flex-none py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]"
                      >
                        Retry Now
                      </button>
                      <button
                        onClick={() => cancel(j.id)}
                        className="flex-1 sm:flex-none py-1.5 px-3 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {j.error && (
                    <div className="mt-3 p-3 bg-red-950/15 border border-red-950/30 rounded-xl max-h-40 overflow-y-auto">
                      <pre className="text-[10px] font-mono text-red-400 whitespace-pre-wrap">{j.error}</pre>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}