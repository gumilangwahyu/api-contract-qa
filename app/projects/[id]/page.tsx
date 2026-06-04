import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'
import db from '../../../lib/db'
import { FileUploadZone } from '../../../components/FileUploadZone'
import { RealTimeCounter } from '../../../components/RealTimeCounter'

type Props = {
  params: { id: string }
}

export default async function ProjectPage({ params }: Props) {
  const idOrSlug = params.id

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as any
  const isAdmin = user.role === 'admin'

  const project = await db.project.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      userId: isAdmin ? undefined : user.id, // normal user can only view their own
    },
    include: {
      endpoints: { orderBy: { createdAt: 'desc' } },
      testCases: { orderBy: { createdAt: 'desc' } },
      uploadedFiles: true,
    },
  })

  if (!project) return notFound()

  // Helper to color-code HTTP methods
  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'POST':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      case 'PUT':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      case 'PATCH':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Link href="/dashboard" className="hover:text-blue-400 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-200">{project.name}</span>
        </div>

        {/* Header Block */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                {project.name}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                {project.slug}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              {project.description || 'Tidak ada deskripsi proyek.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Link
              href={`/projects/${project.slug}/endpoints`}
              className="flex-1 md:flex-none text-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all active:scale-[0.98]"
            >
              Kelola Endpoints
            </Link>
            <Link
              href={`/projects/${project.slug}/tests`}
              className="flex-1 md:flex-none text-center px-4 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
            >
              Uji Kontrak (Test Suite)
            </Link>
            <a
              href={`/api/${project.slug}/users`}
              className="flex-1 md:flex-none text-center px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
              target="_blank"
              rel="noreferrer"
            >
              Coba Mock API
            </a>
          </div>
        </header>

        {/* Stats Section */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Endpoints</span>
            <span className="text-2xl font-black text-white mt-1 block">{project.endpoints.length}</span>
          </div>
          <div className="p-4 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Test Cases</span>
            <span className="text-2xl font-black text-white mt-1 block">{project.testCases.length}</span>
          </div>
          <div className="p-4 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hits Hari Ini</span>
            <span className="text-2xl font-black text-blue-400 mt-1 block">{project.hitsToday}</span>
          </div>
          <div className="p-4 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Hits</span>
            <span className="text-2xl font-black text-indigo-400 mt-1 block">{project.hitsTotal}</span>
          </div>
        </section>

        {/* Main Content Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Endpoints and Test Cases List (70%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Endpoints Card */}
            <div className="p-6 backdrop-blur-md bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Daftar Endpoint Mock</h3>
                <Link
                  href={`/projects/${project.slug}/endpoints`}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Lihat Semua →
                </Link>
              </div>

              <ul className="divide-y divide-slate-800/50">
                {project.endpoints.length === 0 && (
                  <li className="py-6 text-center text-slate-500 text-sm">Belum ada endpoint terdaftar.</li>
                )}
                {project.endpoints.slice(0, 5).map((ep) => (
                  <li key={ep.id} className="py-3 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getMethodBadgeClass(ep.method)}`}>
                        {ep.method}
                      </span>
                      <span className="text-sm font-semibold text-slate-200">{ep.path}</span>
                    </div>
                    <span className="text-xs text-slate-400 truncate max-w-xs">{ep.description || '-'}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Test Cases Card */}
            <div className="p-6 backdrop-blur-md bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Skenario Test QA</h3>
                <Link
                  href={`/projects/${project.slug}/tests`}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Lihat Semua →
                </Link>
              </div>

              <ul className="divide-y divide-slate-800/50">
                {project.testCases.length === 0 && (
                  <li className="py-6 text-center text-slate-500 text-sm">Belum ada test case terdaftar.</li>
                )}
                {project.testCases.slice(0, 5).map((t) => {
                  const passRate = t.totalRuns > 0 ? Math.round((t.passedRuns / t.totalRuns) * 100) : null
                  return (
                    <li key={t.id} className="py-3 flex justify-between items-center gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-200">{t.name}</div>
                        <div className="text-xs text-slate-400">{t.description || '-'}</div>
                      </div>
                      <div className="text-right">
                        {passRate !== null ? (
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                              passRate === 100
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            Pass Rate: {passRate}%
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Belum diuji</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Files Sidebar & Hits counter (30%) */}
          <div className="space-y-6">
            <RealTimeCounter projectId={project.id} />

            {/* Contract Files */}
            <div className="p-6 backdrop-blur-md bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white">Dokumen & File Kontrak</h3>
              <p className="text-xs text-slate-400">
                Unggah dokumen OpenAPI / Swagger JSON atau payload payload kontrak API Anda sebagai referensi tim.
              </p>

              {/* Upload Drop Zone */}
              <FileUploadZone projectId={project.id} type="mock-data" />

              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">File Terunggah</h4>
                <ul className="text-xs space-y-2 max-h-48 overflow-y-auto">
                  {project.uploadedFiles.length === 0 && (
                    <li className="text-slate-500 italic py-2">Belum ada file diunggah.</li>
                  )}
                  {project.uploadedFiles.map((f) => (
                    <li key={f.id} className="p-2.5 bg-slate-950 border border-slate-900 rounded-lg flex items-center justify-between gap-2">
                      <div className="truncate flex-1">
                        <a
                          href={f.blobUrl}
                          className="font-semibold text-blue-400 hover:text-blue-300 transition-colors block truncate"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {f.name}
                        </a>
                        <span className="text-[10px] text-slate-500">{(f.size || 0)} bytes</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}