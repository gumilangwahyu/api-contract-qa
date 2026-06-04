'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function Home() {
  const { data: session } = useSession()

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 md:p-10 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="max-w-4xl w-full text-center space-y-12 py-12 relative">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-blue-400">
          ✨ Generasi Mock Instan dengan Gemini 1.5 & Faker
        </div>

        {/* Hero Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            API QA Contract <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Testing & Mocking Platform
            </span>
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Percepat integrasi Frontend (FE) & Backend (BE) dengan menetapkan kontrak API, membuat data mock realistis dibantu AI, serta melakukan pengujian fungsional otomatis dalam satu tempat.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          {session ? (
            <Link
              href="/dashboard"
              className="py-3.5 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/15 active:scale-[0.98]"
            >
              Buka Dashboard Anda
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="py-3.5 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/15 active:scale-[0.98]"
              >
                Mulai Secara Gratis
              </Link>
              <Link
                href="/login"
                className="py-3.5 px-8 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              >
                Login Akun Demo
              </Link>
            </>
          )}
        </div>

        {/* Core Features Showcase Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-slate-900 text-left">
          <div className="p-6 backdrop-blur-md bg-slate-900/40 border border-slate-900 rounded-2xl space-y-2">
            <div className="text-xl">🤖</div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Powered Mock</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Menganalisis JSON schema dan konteks endpoint Anda untuk menghasilkan dummy data yang realistis (didukung Gemini API).
            </p>
          </div>

          <div className="p-6 backdrop-blur-md bg-slate-900/40 border border-slate-900 rounded-2xl space-y-2">
            <div className="text-xl">🎯</div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Varian Matching</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Menghasilkan respon berbeda berdasarkan parameter query, header, hingga payload request body (POST/PUT/PATCH).
            </p>
          </div>

          <div className="p-6 backdrop-blur-md bg-slate-900/40 border border-slate-900 rounded-2xl space-y-2">
            <div className="text-xl">📊</div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">QA Test Suite</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Menjalankan skenario pengujian kontrak secara berkala untuk memvalidasi apakah mock dan server respons sesuai spesifikasi.
            </p>
          </div>
        </section>

        {/* Quick Demo Section */}
        <div className="mt-8 p-5 text-left backdrop-blur-md bg-slate-900/20 border border-slate-900 rounded-2xl max-w-xl mx-auto flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">URL Contoh Demo</span>
            <code className="text-xs font-mono text-slate-300">/api/demo-project/users</code>
          </div>
          <a
            href="/api/demo-project/users"
            className="text-xs font-semibold text-blue-400 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Buka Mock API →
          </a>
        </div>
      </div>
    </main>
  )
}