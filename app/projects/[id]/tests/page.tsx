import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import db from '../../../../lib/db'

type Props = { params: { id: string } }

const ClientTestCaseCreateWrapper = dynamic(() => import('../../../../components/TestCaseCreateWrapper'), { ssr: false })
const TestRunButton = dynamic(() => import('../../../../components/TestRunButton'), { ssr: false })

export default async function TestsPage({ params }: Props) {
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
      testCases: { orderBy: { createdAt: 'desc' } },
      endpoints: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!project) return notFound()

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Link href="/dashboard" className="hover:text-blue-400 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link href={`/projects/${project.slug}`} className="hover:text-blue-400 transition-colors">
            {project.name}
          </Link>
          <span>/</span>
          <span className="text-slate-200">Tests</span>
        </div>

        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Test Suite
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Definisikan skenario pengetesan kontrak API dan uji kecocokan payload mock Anda untuk proyek <span className="text-blue-400 font-semibold">{project.name}</span>.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/projects/${project.slug}`}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
            >
              ← Detail Proyek
            </Link>
          </div>
        </header>

        {/* Client wrapper to create test cases (select endpoint then show form) */}
        <section className="py-2">
          <ClientTestCaseCreateWrapper projectId={project.id} endpoints={project.endpoints} />
        </section>

        {/* Test Cases List */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Daftar Skenario Test ({project.testCases.length})
          </h2>

          <div className="grid gap-4">
            {project.testCases.length === 0 && (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 text-slate-500 text-sm">
                Belum ada skenario test yang dibuat. Gunakan form di atas untuk menambahkan.
              </div>
            )}
            {project.testCases.map((t: any) => (
              <div
                key={t.id}
                className="p-5 backdrop-blur-md bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all"
              >
                <div>
                  <div className="font-bold text-white text-sm">{t.name}</div>
                  <div className="text-xs text-slate-400 mt-1">{t.description || 'Tidak ada deskripsi.'}</div>
                  {t.totalRuns > 0 && (
                    <div className="text-[10px] font-semibold text-slate-500 mt-2 flex gap-3">
                      <span>Total Running: {t.totalRuns}x</span>
                      <span className="text-emerald-400">Pass Rate: {Math.round((t.passedRuns / t.totalRuns) * 100)}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TestRunButton testCaseId={t.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}