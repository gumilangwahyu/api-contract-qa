// lib/test-runner.ts
// Robust runner usable from both API and a standalone worker.
// Avoid depending on Next.js server-only APIs here to keep it runnable via ts-node.

import { PrismaClient } from '@prisma/client'

type RunResult = {
  passed: boolean
  status: number
  body: string
  duration: number
  error?: string | null
  saved?: boolean
}

async function loadDb(): Promise<any> {
  // Try CommonJS require first (fast in many run modes), otherwise dynamic import.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const maybe = require('./db')
    return maybe?.default ?? maybe
  } catch {
    try {
      // dynamic ESM import fallback
      // @ts-ignore
      const mod = await import('./db')
      return mod?.default ?? mod
    } catch (e) {
      // Last fallback: create a fresh PrismaClient (if lib/db is just a thin wrapper)
      return new PrismaClient()
    }
  }
}

export async function runTestById(testCaseId: string): Promise<RunResult> {
  const db = await loadDb()

  const testCase = await db.testCase.findUnique({
    where: { id: testCaseId },
    include: { endpoint: true, project: true },
  })
  if (!testCase) throw new Error('Test case not found')

  const endpoint = testCase.endpoint
  const project = testCase.project
  if (!endpoint || !project) throw new Error('Invalid test case relation')

  // Resolve userId fallback (worker can't use Next session)
  let userId: string | undefined
  const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
  try {
    const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
    if (demoUser) userId = demoUser.id
  } catch {
    // ignore
  }
  if (!userId) userId = project.userId

  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || `http://localhost:${process.env.PORT || 3000}`
  const targetUrl = `${base}/api/${project.slug}${endpoint.path}`

  const method = endpoint.method || 'GET'
  const headers: Record<string, string> = { accept: 'application/json' }

  if (testCase.headers) {
    try {
      const p = JSON.parse(testCase.headers)
      if (p && typeof p === 'object') for (const [k, v] of Object.entries(p)) headers[k] = String(v)
    } catch {
      // ignore invalid headers
    }
  }

  let url = targetUrl
  if (testCase.queryParams) {
    try {
      const qp = JSON.parse(testCase.queryParams)
      const u = new URL(url)
      for (const [k, v] of Object.entries(qp)) u.searchParams.set(k, String(v))
      url = u.toString()
    } catch {
      // ignore
    }
  }

  const body = testCase.requestBody ? (typeof testCase.requestBody === 'string' ? testCase.requestBody : JSON.stringify(testCase.requestBody)) : undefined
  if (body && !headers['content-type']) headers['content-type'] = 'application/json'

  const start = Date.now()
  let respStatus = 0
  let respText = ''
  let passed = false
  let error: string | null = null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const resp = await fetch(url, { method, headers, body, signal: controller.signal })
    clearTimeout(timeoutId)
    respStatus = resp.status
    try { respText = await resp.text() } catch { respText = '' }

    const expectedStatus = testCase.expectedStatus ?? endpoint.statusCode ?? 200
    const expectedBodyRaw = testCase.expectedBody ?? undefined

    let actualBody: any = null
    let expectedBody: any = undefined
    try { actualBody = JSON.parse(respText) } catch { actualBody = respText }
    if (expectedBodyRaw !== undefined && expectedBodyRaw !== null) {
      try { expectedBody = JSON.parse(expectedBodyRaw) } catch { expectedBody = expectedBodyRaw }
    }

    const statusMatch = respStatus === expectedStatus
    let bodyMatch = true
    if (expectedBody !== undefined) {
      try { bodyMatch = JSON.stringify(expectedBody) === JSON.stringify(actualBody) } catch { bodyMatch = String(expectedBody) === String(actualBody) }
    }
    passed = statusMatch && bodyMatch
  } catch (e: any) {
    clearTimeout(timeoutId)
    error = e.name === 'AbortError' ? 'Request timed out after 10000ms' : String(e.message || e)
  }
  const duration = Date.now() - start

  // Persist TestResult. result fields in DB may be typed, adjust accordingly.
  let saved = false
  try {
    await db.testResult.create({
      data: {
        actualStatus: respStatus,
        actualBody: respText,
        passed,
        error,
        duration,
        testCaseId: testCase.id,
        endpointId: endpoint.id,
        userId: userId!,
      },
    })
    saved = true
  } catch (e) {
    try {
      // fallback to project owner
      await db.testResult.create({
        data: {
          actualStatus: respStatus,
          actualBody: respText,
          passed,
          error,
          duration,
          testCaseId: testCase.id,
          endpointId: endpoint.id,
          userId: project.userId,
        },
      })
      saved = true
    } catch (e2) {
      console.error('Failed to persist TestResult', e2)
    }
  }

  // update counters on TestCase
  try {
    await db.testCase.update({
      where: { id: testCase.id },
      data: { totalRuns: { increment: 1 }, passedRuns: passed ? { increment: 1 } : undefined },
    })
  } catch {
    // ignore
  }

  return { passed, status: respStatus, body: respText, duration, error, saved }
}