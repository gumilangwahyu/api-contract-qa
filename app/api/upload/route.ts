import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { uploadFile } from '@/lib/blob'

const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '102400', 10)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const s = session as any
    if (!s?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await request.formData()
    const file = form.get('file') as File | null
    const projectId = form.get('projectId') as string | null
    const type = form.get('type') as string | null

    if (!file || !projectId || !type) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE} bytes)` }, { status: 413 })

    const userId = s.user.id
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const isAdmin = s.user.role === 'admin'
    if (project.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { url, key } = await uploadFile(file as any, projectId)
    const saved = await db.fileUpload.create({
      data: { name: (file as any).name || 'file', type, size: (file as any).size || 0, mimeType: (file as any).type || '', blobUrl: url, blobKey: key, projectId },
    })
    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}