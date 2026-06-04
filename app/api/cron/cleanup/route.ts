import { NextRequest, NextResponse } from 'next/server'
import { cleanupOldTestResults } from '@/lib/cron-jobs'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await cleanupOldTestResults()
    return NextResponse.json({ success: true, deleted: res.count })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}