import { NextRequest, NextResponse } from 'next/server'
import { healthCheckEndpoints } from '@/lib/cron-jobs'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const count = await healthCheckEndpoints()
    return NextResponse.json({ success: true, endpointsChecked: count })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}