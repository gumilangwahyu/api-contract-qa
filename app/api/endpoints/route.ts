import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'
import db from '../../../lib/db'
import { z } from 'zod'

const createSchema = z.object({
  projectId: z.string(),
  method: z.string(),
  path: z.string(),
  description: z.string().optional(),
  mockData: z.string().optional(),
  statusCode: z.number().optional(),
  delay: z.number().optional(),
  requestSchema: z.string().optional(),
  responseSchema: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createSchema.parse(body)

    const session = await getServerSession(authOptions).catch(() => null)
    let userId = (session?.user as any)?.id as string | undefined

    if (!userId) {
      // fallback to demo user
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const project = await db.project.findUnique({ where: { id: parsed.projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (project.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const existing = await db.endpoint.findFirst({
      where: { projectId: project.id, method: parsed.method, path: parsed.path }
    })
    if (existing) {
      return NextResponse.json({ error: 'An endpoint with this method and path already exists in this project.' }, { status: 409 })
    }

    const endpoint = await db.endpoint.create({
      data: {
        method: parsed.method,
        path: parsed.path,
        description: parsed.description ?? '',
        mockData: parsed.mockData ?? '{}',
        statusCode: parsed.statusCode ?? 200,
        delay: parsed.delay ?? 0,
        requestSchema: parsed.requestSchema ?? '{}',
        responseSchema: parsed.responseSchema ?? '{}',
        projectId: project.id,
      },
    })

    return NextResponse.json(endpoint, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/endpoints error:', err)
    return NextResponse.json({ error: err?.message || 'Bad request' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

    const session = await getServerSession(authOptions).catch(() => null)
    const s = session as any
    let userId = s?.user?.id as string | undefined

    if (!userId) {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const isAdmin = s?.user?.role === 'admin'
    if (project.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const endpoints = await db.endpoint.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(endpoints)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}