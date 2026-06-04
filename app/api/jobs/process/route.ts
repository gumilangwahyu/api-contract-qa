import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { claimNextJob, finalizeJob } from '../../../../lib/job-queue'
import { runTestById } from '../../../../lib/test-runner'

function isAdminSession(session: any) {
  if (!session) return false
  if (session.user && (session.user as any).role === 'admin') return true
  const email = session.user?.email
  if (!email) return false
  const adminsEnv = process.env.ADMIN_USERS || process.env.ADMIN_EMAILS || ''
  const admins = adminsEnv.split(',').map((s) => s.trim()).filter(Boolean)
  if (admins.includes(email)) return true
  return false
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let authorized = false

    if (authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      authorized = true
    } else {
      const session = await getServerSession(authOptions).catch(() => null)
      if (isAdminSession(session)) authorized = true
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const job = await claimNextJob()
    if (!job) return NextResponse.json({ ok: true, message: 'no-job' })

    try {
      // run the test via runner
      const res = await runTestById(job.testCaseId)
      // finalize (schedules retry if failed)
      await finalizeJob(job.id, { passed: !!res.passed, result: res, error: res.error ?? undefined, duration: res.duration })
      return NextResponse.json({ ok: true, jobId: job.id, outcome: res })
    } catch (jobErr: any) {
      console.error(`Error executing job ${job.id}:`, jobErr)
      await finalizeJob(job.id, { passed: false, result: {}, error: String(jobErr?.message || jobErr) })
      return NextResponse.json({ ok: false, jobId: job.id, error: String(jobErr?.message || jobErr) })
    }
  } catch (err: any) {
    console.error('process-job error', err)
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 })
  }
}