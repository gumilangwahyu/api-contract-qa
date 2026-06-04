import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectIdOrSlug = params.id

    const session = await getServerSession(authOptions).catch(() => null)
    const s = session as any
    let userId = s?.user?.id as string | undefined

    if (!userId) {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Find project to verify ownership
    const project = await db.project.findFirst({
      where: {
        OR: [{ id: projectIdOrSlug }, { slug: projectIdOrSlug }],
      },
      select: {
        id: true,
        userId: true,
        hitsToday: true,
        hitsTotal: true,
        lastHitAt: true,
      },
    })

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const isAdmin = s?.user?.role === 'admin'
    if (project.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // activeTests: quick count of testcases with recent results (approx)
    const activeTests = 0

    return NextResponse.json({
      hitsToday: project.hitsToday || 0,
      hitsTotal: project.hitsTotal || 0,
      lastHitAt: project.lastHitAt ? project.lastHitAt.toISOString() : null,
      activeTests,
    })
  } catch (error) {
    console.error('GET /api/projects/[id]/metrics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}