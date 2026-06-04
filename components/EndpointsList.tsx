'use client'
import EndpointForm from './EndpointForm'
import EndpointEditModal from './EndpointEditModal'

export default function EndpointsList({ endpoints, project }: any) {
  return (
    <div>
      <div id="create-endpoint" className="mb-6">
        <EndpointForm projectId={project.id} />
      </div>

      <div className="card">
        <ul className="text-sm">
          {endpoints.length === 0 && <li className="text-gray-400">No endpoints</li>}
          {endpoints.map((ep: any) => (
            <li key={ep.id} className="py-3 border-b border-slate-700 flex justify-between items-center">
              <div>
                <div className="font-medium">{ep.method} <span className="text-gray-300">{ep.path}</span></div>
                <div className="text-xs text-gray-400">{ep.description}</div>
              </div>
              <div className="flex items-center gap-3">
                <a href={`/api/${project.slug}${ep.path}`} className="text-blue-400">Try</a>
                <EndpointEditModal endpoint={ep} projectSlug={project.slug} projectId={project.id} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}