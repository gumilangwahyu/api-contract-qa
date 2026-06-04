import { NextRequest, NextResponse } from 'next/server'
import { cancelJob } from '../../../../../../lib/job-queue'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../../lib/auth'

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

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions).catch(() => null)
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const job = await cancelJob(params.id)
    return NextResponse.json({ ok: true, job })
  } catch (err: any) {
    console.error('admin cancel error', err)
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 })
  }
}