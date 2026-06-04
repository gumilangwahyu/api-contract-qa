import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../lib/auth'
import db from '../../../../../lib/db'
import { runTestById } from '../../../../../lib/test-runner'
import { enqueueTestRun } from '@/lib/job-queue'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const testId = params.id
  const url = new URL(request.url)
  const background = url.searchParams.get('background') === 'true'

  try {
    const session = await getServerSession(authOptions).catch(() => null)
    const s = session as any
    let userId = s?.user?.id as string | undefined

    if (!userId) {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const testCase = await db.testCase.findUnique({
      where: { id: testId },
      include: { project: true },
    })

    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 })
    }

    const isAdmin = s?.user?.role === 'admin'
    if (testCase.project.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (background) {
      const job = await enqueueTestRun(testId, {
        delayMs: 0,
        maxAttempts: Number(process.env.JOB_MAX_ATTEMPTS ?? 3),
      })
      return NextResponse.json({ ok: true, jobId: job.id, enqueued: true })
    }

    // immediate run
    const res = await runTestById(testId)
    return NextResponse.json({ ok: true, result: res })
  } catch (err: any) {
    console.error('POST /api/tests/[id]/run error', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}