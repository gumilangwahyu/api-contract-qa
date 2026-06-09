'use client'
import { ReactNode, useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export default function Modal({ open, onClose, children, title }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl bg-slate-900 rounded p-4 shadow-lg my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}