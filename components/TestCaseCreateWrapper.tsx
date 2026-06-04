'use client'
import { useState } from 'react'
import TestCaseForm from './TestCaseForm'

export default function TestCaseCreateWrapper({ projectId, endpoints }: { projectId: string; endpoints: any[] }) {
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(endpoints?.[0]?.id || null)
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-3">Create Test Case</h3>

      <div className="mb-4">
        <label className="label">Select Endpoint</label>
        <select className="input" value={selectedEndpointId || ''} onChange={(e) => setSelectedEndpointId(e.target.value)}>
          <option value="">-- choose endpoint --</option>
          {endpoints.map((ep) => (
            <option key={ep.id} value={ep.id}>
              {ep.method} {ep.path}
            </option>
          ))}
        </select>
      </div>

      {selectedEndpointId ? (
        <TestCaseForm projectId={projectId} endpointId={selectedEndpointId} onCreated={() => {
          // do nothing — TestCaseForm will refresh server via router on success
        }} />
      ) : (
        <div className="text-sm text-gray-400">Pilih endpoint terlebih dahulu untuk membuat test case.</div>
      )}
    </div>
  )
}