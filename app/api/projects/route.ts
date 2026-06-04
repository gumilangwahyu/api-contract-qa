import { NextRequest, NextResponse } from 'next/server'
import db from '../../../lib/db'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'

const createProjectSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  userId: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions).catch(() => null)
    const s = session as any
    let userId = s?.user?.id as string | undefined

    if (!userId) {
      // fallback to demo user for demo mode
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = s?.user?.role === 'admin'

    const projects = await db.project.findMany({
      where: isAdmin ? undefined : { userId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(projects)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createProjectSchema.parse(body)

    // Try to resolve userId from session or fallback demo user
    let userId = parsed.userId

    // 1) If signed in via NextAuth, use session user id
    try {
      const session = await getServerSession(authOptions)
      const s = session as any
      if (!userId && s?.user?.id) userId = s.user.id
    } catch (e) {
      // ignore session errors, continue to fallback
    }

    // 2) Fallback: connect to demo user by email (use env or default)
    if (!userId) {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'No user available to own the project. Please login or set DEMO_USER_EMAIL.' }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description ?? '',
        userId,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/projects error:', err)
    return NextResponse.json({ error: err?.message || 'Bad request' }, { status: 400 })
  }
}