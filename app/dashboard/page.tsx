import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../lib/auth'
import db from '../../lib/db'
import { RealTimeCounter } from '../../components/RealTimeCounter'

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as any
  const isAdmin = user.role === 'admin'

  // Fetch projects (admin sees all, normal user sees only theirs)
  const projects = await db.project.findMany({
    where: isAdmin ? {} : { userId: user.id },
    include: {
      endpoints: {
        select: { id: true, path: true, method: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Calculate statistics
  const totalProjects = projects.length
  const totalEndpoints = projects.reduce((acc, p) => acc + p.endpoints.length, 0)
  const totalHitsToday = projects.reduce((acc, p) => acc + p.hitsToday, 0)
  const totalHitsTotal = projects.reduce((acc, p) => acc + p.hitsTotal, 0)

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-10 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Dashboard
              </h1>
              {isAdmin && (
                <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                  Admin Access
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Selamat datang kembali, <span className="text-blue-400 font-semibold">{user.name || user.email}</span>. Kelola API mock dan pengujian kontrak Anda di sini.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/10 active:scale-[0.98]"
          >
            <span>+</span> Buat Proyek Baru
          </Link>
        </header>

        {/* Statistics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Proyek
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-white">{totalProjects}</span>
              <span className="text-xs text-slate-500">terdaftar</span>
            </div>
          </div>

          <div className="p-5 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Endpoint Mock
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-white">{totalEndpoints}</span>
              <span className="text-xs text-slate-500">endpoint aktif</span>
            </div>
          </div>

          <div className="p-5 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Hits API Hari Ini
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-blue-400">{totalHitsToday}</span>
              <span className="text-xs text-slate-500">panggilan</span>
            </div>
          </div>

          <div className="p-5 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Akumulasi Hits
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-indigo-400">{totalHitsTotal}</span>
              <span className="text-xs text-slate-500">kumulatif</span>
            </div>
          </div>
        </section>

        {/* Main Content Split Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects List (70%) */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Daftar Proyek Anda
            </h2>

            {projects.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                <span className="text-3xl block mb-3">📁</span>
                <h3 className="text-base font-bold text-slate-300">Belum ada proyek</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Mulailah dengan membuat proyek baru untuk meletakkan endpoint mock kontrak API Anda.
                </p>
                <Link
                  href="/projects/new"
                  className="mt-4 inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-all border border-slate-700"
                >
                  Buat Proyek Pertama
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="group relative p-6 backdrop-blur-md bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 rounded-2xl transition-all hover:shadow-xl hover:-translate-y-[2px] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                          {p.name}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-slate-950 border border-slate-800 text-slate-400">
                          {p.slug}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 min-h-[2rem] mb-4">
                        {p.description || 'Tidak ada deskripsi.'}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Stats badges */}
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="px-2.5 py-1 bg-slate-950/80 border border-slate-800/50 rounded-lg text-slate-300 flex items-center gap-1.5">
                          🔗 {p.endpoints.length} Endpoints
                        </span>
                        <span className="px-2.5 py-1 bg-slate-950/80 border border-slate-800/50 rounded-lg text-slate-300 flex items-center gap-1.5">
                          📈 {p.hitsToday} Hits Hari Ini
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
                        <Link
                          href={`/projects/${p.slug}`}
                          className="py-2 px-3 text-center bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all"
                        >
                          Detail Proyek
                        </Link>
                        <Link
                          href={`/projects/${p.slug}/endpoints`}
                          className="py-2 px-3 text-center bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/30 rounded-xl text-xs font-bold transition-all"
                        >
                          Kelola API
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions & Guidelines (30%) */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Aksi Cepat & Info
            </h2>

            {/* Realtime metric counter for first project if exists */}
            {projects.length > 0 && (
              <RealTimeCounter projectId={projects[0].id} />
            )}

            <div className="p-6 backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Panduan Cepat Mock API
              </h3>
              <ol className="list-decimal pl-4 text-xs text-slate-400 space-y-2">
                <li>
                  Buat proyek atau gunakan proyek demo yang sudah ada.
                </li>
                <li>
                  Tambahkan endpoint mock baru (misal: <code>/users</code>).
                </li>
                <li>
                  Tulis **Response Schema (JSON)** kesepakatan FE/BE.
                </li>
                <li>
                  Klik **Generate with AI (Gemini)** untuk mengisi data dummy yang logis secara otomatis.
                </li>
                <li>
                  Panggil url mock dari Frontend Anda untuk mencoba.
                </li>
              </ol>
            </div>

            {isAdmin && (
              <div className="p-6 border border-red-500/15 bg-red-500/5 rounded-2xl space-y-3">
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">
                  Panel Admin
                </h3>
                <p className="text-xs text-slate-400">
                  Anda memiliki akses ke admin queue untuk memantau background jobs dan pengujian otomatis.
                </p>
                <Link
                  href="/admin/queue"
                  className="inline-flex w-full justify-center items-center py-2 px-3 bg-red-950/30 hover:bg-red-950/50 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-xl text-xs font-semibold transition-all"
                >
                  Buka Antrean Admin
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}