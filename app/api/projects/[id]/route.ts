import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import db from '../../../../lib/db'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const idOrSlug = params.id

    const session = await getServerSession(authOptions).catch(() => null)
    const s = session as any
    let userId = s?.user?.id as string | undefined

    if (!userId) {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const project = await db.project.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { endpoints: true, testCases: true, uploadedFiles: true },
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdmin = s?.user?.role === 'admin'
    if (project.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(project)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const idOrSlug = params.id
    const body = await request.json()

    const session = await getServerSession(authOptions).catch(() => null)
    const s = session as any
    let userId = s?.user?.id as string | undefined

    if (!userId) {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const project = await db.project.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdmin = s?.user?.role === 'admin'
    if (project.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allowed: any = {}
    if ('name' in body) allowed.name = body.name
    if ('slug' in body) allowed.slug = body.slug
    if ('description' in body) allowed.description = body.description

    const updated = await db.project.update({ where: { id: project.id }, data: allowed })
    return NextResponse.json(updated)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 400 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const idOrSlug = params.id

    const session = await getServerSession(authOptions).catch(() => null)
    const s = session as any
    let userId = s?.user?.id as string | undefined

    if (!userId) {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const project = await db.project.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdmin = s?.user?.role === 'admin'
    if (project.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.project.delete({ where: { id: project.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 400 })
  }
}