import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../../lib/auth'
import db from '../../../../../../lib/db'
import EndpointEditForm from '../../../../../../components/EndpointEditForm'

type Props = { params: { id: string, endpointId: string } }

export default async function EditEndpointPage({ params }: Props) {
  const idOrSlug = params.id
  const endpointId = params.endpointId

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as any
  const isAdmin = user.role === 'admin'

  const project = await db.project.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      userId: isAdmin ? undefined : user.id, // normal user can only edit their own project
    },
  })
  if (!project) return notFound()

  const endpoint = await db.endpoint.findUnique({
    where: { id: endpointId, projectId: project.id },
  })
  if (!endpoint) return notFound()

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
          <Link href={`/projects/${project.slug}/endpoints`} className="hover:text-blue-400 transition-colors">
            Endpoints
          </Link>
          <span>/</span>
          <span className="text-slate-200">Edit Endpoint</span>
        </div>

        <header className="flex justify-between items-center border-b border-slate-900 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Edit Endpoint
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Sesuaikan method, path, response schema, mock data, atau varian API Anda.
            </p>
          </div>
        </header>

        <section className="py-2">
          <EndpointEditForm endpoint={endpoint} projectSlug={project.slug} projectId={project.id} />
        </section>
      </div>
    </main>
  )
}