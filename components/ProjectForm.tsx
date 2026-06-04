'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ProjectFormProps = {
  onCreated?: (projectSlug: string) => void
}

export function ProjectForm({ onCreated }: ProjectFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function slugify(v: string) {
    return v
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name || !slug) {
      setError('Nama proyek dan slug wajib diisi.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, description }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Gagal membuat proyek.')
      } else {
        onCreated?.(json.slug)
        router.push(`/projects/${json.slug}`)
        router.refresh()
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan jaringan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 p-6 md:p-8 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl max-w-xl"
    >
      <div>
        <h3 className="text-xl font-bold text-white">Detail Proyek Baru</h3>
        <p className="text-xs text-slate-400 mt-1">
          Lengkapi formulir di bawah ini untuk membuat project API mock baru.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="pname" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Nama Proyek
          </label>
          <input
            id="pname"
            className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-white outline-none transition-all placeholder-slate-700 text-sm"
            placeholder="Contoh: Regarmarket App"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (!slug) setSlug(slugify(e.target.value))
            }}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="pslug" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Slug Proyek
          </label>
          <input
            id="pslug"
            className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-white font-mono outline-none transition-all placeholder-slate-700 text-sm"
            placeholder="contoh-slug-proyek"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            required
            disabled={loading}
          />
          <p className="text-[10px] text-slate-500 mt-1.5">
            Slug digunakan sebagai bagian dari URL mock Anda (contoh: <code>/api/contoh-slug-proyek/users</code>)
          </p>
        </div>

        <div>
          <label htmlFor="pdesc" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Deskripsi Proyek (Opsional)
          </label>
          <textarea
            id="pdesc"
            rows={3}
            className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-white outline-none transition-all placeholder-slate-700 text-sm resize-none"
            placeholder="Tulis penjelasan singkat mengenai cakupan proyek ini..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/10 disabled:opacity-50 text-sm active:scale-[0.98]"
        >
          {loading ? 'Membuat...' : 'Buat Proyek'}
        </button>
        <button
          type="button"
          disabled={loading}
          className="py-3 px-5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-semibold rounded-xl transition-all text-sm active:scale-[0.98]"
          onClick={() => {
            setName('')
            setSlug('')
            setDescription('')
            setError(null)
          }}
        >
          Reset
        </button>
      </div>
    </form>
  )
}

export default ProjectForm