import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import db from '../../../lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'

const createSchema = z.object({
  projectId: z.string(),
  endpointId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  requestBody: z.string().optional(),
  queryParams: z.string().optional(),
  headers: z.string().optional(),
  expectedStatus: z.number(),
  expectedBody: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createSchema.parse(body)

    const session = await getServerSession(authOptions).catch(() => null)
    let userId = (session?.user as any)?.id as string | undefined

    if (!userId) {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const endpoint = await db.endpoint.findUnique({ where: { id: parsed.endpointId } })
    if (!endpoint) return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })

    const project = await db.project.findUnique({ where: { id: parsed.projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (project.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (endpoint.projectId !== project.id) {
      return NextResponse.json({ error: 'Endpoint does not belong to this project' }, { status: 400 })
    }

    const testCase = await db.testCase.create({
      data: {
        name: parsed.name,
        description: parsed.description ?? '',
        requestBody: parsed.requestBody ?? null,
        queryParams: parsed.queryParams ?? null,
        headers: parsed.headers ?? null,
        expectedStatus: parsed.expectedStatus,
        expectedBody: parsed.expectedBody ?? null,
        endpointId: endpoint.id,
        projectId: project.id,
      },
    })

    return NextResponse.json(testCase, { status: 201 })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message || 'Bad request' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const endpointId = url.searchParams.get('endpointId')
    const projectId = url.searchParams.get('projectId')

    const session = await getServerSession(authOptions).catch(() => null)
    const s = session as any
    let userId = s?.user?.id as string | undefined

    if (!userId) {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let resolvedProjectId = projectId
    if (!resolvedProjectId && endpointId) {
      const ep = await db.endpoint.findUnique({ where: { id: endpointId } })
      if (ep) resolvedProjectId = ep.projectId
    }

    if (!resolvedProjectId) {
      return NextResponse.json({ error: 'projectId or endpointId is required' }, { status: 400 })
    }

    const project = await db.project.findUnique({ where: { id: resolvedProjectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const isAdmin = s?.user?.role === 'admin'
    if (project.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const where: any = {}
    if (endpointId) where.endpointId = endpointId
    if (projectId) where.projectId = projectId

    const testCases = await db.testCase.findMany({ where, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(testCases)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}