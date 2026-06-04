'use client'
import { useState } from 'react'
import Modal from './Modal'
import EndpointEditForm from './EndpointEditForm'

export default function EndpointEditModal({ endpoint, projectSlug, projectId }: any) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="text-blue-400" onClick={() => setOpen(true)}>Edit</button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Edit ${endpoint.method} ${endpoint.path}`}>
        {/* EndpointEditForm will redirect to endpoints page on save/delete, but we keep inside modal */}
        <EndpointEditForm endpoint={endpoint} projectSlug={projectSlug} projectId={projectId} />
      </Modal>
    </>
  )
}