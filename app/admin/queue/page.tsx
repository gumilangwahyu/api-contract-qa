'use server'
import db from '../../../lib/db'
import dynamic from 'next/dynamic'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'
import { redirect } from 'next/navigation'

const AdminJobDashboard = dynamic(() => import('../../../components/AdminJobDashboard'), { ssr: false })

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

export default async function AdminQueuePage() {
  const session = await getServerSession(authOptions).catch(() => null)
  if (!isAdminSession(session)) {
    // redirect to home or show not found to hide page from non-admins
    redirect('/')
  }

  // Try to get grouped counts; ensure we always have an array to iterate
  let countsRaw: any = []
  try {
    countsRaw = await db.testRunJob.groupBy({
      by: ['status'],
      _count: { _all: true },
    })
  } catch (e) {
    // If groupBy fails for any reason, fallback to empty array
    console.error('Failed to load job counts (groupBy)', e)
    countsRaw = []
  }

  const countsArr = Array.isArray(countsRaw) ? countsRaw : []

  const map: Record<string, number> = {}
  countsArr.forEach((r: any) => {
    try {
      const status = r.status ?? '(unknown)'
      const cnt = (r._count && typeof r._count._all === 'number') ? r._count._all : (r._count?._all ?? 0)
      map[status] = cnt
    } catch {
      // ignore malformed rows
    }
  })

  return <AdminJobDashboard counts={map} />
}