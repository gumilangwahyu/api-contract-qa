'use client'

import ProjectForm from '../../../components/ProjectForm'
import Link from 'next/link'

export default function NewProjectPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-10 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Link href="/dashboard" className="hover:text-blue-400 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-200">Buat Proyek Baru</span>
        </div>

        <header className="border-b border-slate-900 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Buat Proyek Baru
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Proyek ini akan bertindak sebagai namespace penampung endpoint mock dan daftar skenario pengujian QA Anda.
          </p>
        </header>

        <section className="py-2">
          <ProjectForm />
        </section>

        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}