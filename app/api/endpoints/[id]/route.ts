import { NextRequest, NextResponse } from 'next/server'
import db from '../../../../lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const endpoint = await db.endpoint.findUnique({ where: { id: params.id }, include: { project: true } })
    if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const session = await getServerSession(authOptions).catch(() => null)
    const s = session as any
    let userId = s?.user?.id as string | undefined

    if (!userId) {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = s?.user?.role === 'admin'
    if (endpoint.project.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(endpoint)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const endpoint = await db.endpoint.findUnique({ where: { id: params.id }, include: { project: true } })
    if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // owner check
    let userId: string | undefined = undefined
    try {
      const session = await getServerSession(authOptions).catch(() => null)
      const s = session as any
      if (s?.user?.id) userId = s.user.id
    } catch {}

    if (!userId) {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (endpoint.project.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // update allowed fields
    const allowed: any = {}
    if ('method' in body) allowed.method = body.method
    if ('path' in body) allowed.path = body.path
    if ('description' in body) allowed.description = body.description
    if ('mockData' in body) allowed.mockData = body.mockData
    if ('statusCode' in body) allowed.statusCode = body.statusCode
    if ('delay' in body) allowed.delay = body.delay
    if ('requestSchema' in body) allowed.requestSchema = body.requestSchema
    if ('responseSchema' in body) allowed.responseSchema = body.responseSchema

    if (allowed.method !== undefined || allowed.path !== undefined) {
      const checkMethod = allowed.method !== undefined ? allowed.method : endpoint.method
      const checkPath = allowed.path !== undefined ? allowed.path : endpoint.path
      const existing = await db.endpoint.findFirst({
        where: {
          projectId: endpoint.projectId,
          method: checkMethod,
          path: checkPath,
          NOT: { id: endpoint.id }
        }
      })
      if (existing) {
        return NextResponse.json({ error: 'Another endpoint with this method and path already exists in this project.' }, { status: 409 })
      }
    }

    const updated = await db.endpoint.update({ where: { id: params.id }, data: allowed })
    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('PUT /api/endpoints/[id] error:', err)
    return NextResponse.json({ error: err?.message || 'Bad request' }, { status: 400 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const endpoint = await db.endpoint.findUnique({ where: { id: params.id }, include: { project: true } })
    if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // owner check
    let userId: string | undefined = undefined
    try {
      const session = await getServerSession(authOptions).catch(() => null)
      const s = session as any
      if (s?.user?.id) userId = s.user.id
    } catch {}

    if (!userId) {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (endpoint.project.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await db.endpoint.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/endpoints/[id] error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 400 })
  }
}