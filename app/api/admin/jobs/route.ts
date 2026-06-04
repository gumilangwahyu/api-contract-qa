import { NextRequest, NextResponse } from 'next/server'
import { listJobs } from '../../../../lib/job-queue'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'

function isAdminSession(session: any) {
  if (!session) return false
  // allow explicit role flag
  if (session.user && (session.user as any).role === 'admin') return true
  const email = session.user?.email
  if (!email) return false
  const adminsEnv = process.env.ADMIN_USERS || process.env.ADMIN_EMAILS || ''
  const admins = adminsEnv.split(',').map((s) => s.trim()).filter(Boolean)
  if (admins.includes(email)) return true
  return false
}

export async function GET(request: NextRequest) {
  // require admin
  const session = await getServerSession(authOptions).catch(() => null)
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(request.url)
  const status = url.searchParams.get('status') ?? undefined
  const limit = Number(url.searchParams.get('limit') ?? '50')
  const jobs = await listJobs(limit, { status })
  return NextResponse.json({ ok: true, jobs })
}