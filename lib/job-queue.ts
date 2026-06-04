import prisma from './db'

// Exponential backoff: baseMs * 2^(attempts-1)
function computeNextAttemptDelay(baseMs: number, attempts: number) {
  return Math.round(baseMs * Math.pow(2, Math.max(0, attempts - 1)))
}

export async function enqueueTestRun(testCaseId: string, opts?: { delayMs?: number, maxAttempts?: number }) {
  const baseDelay = opts?.delayMs ?? 0
  const maxAttempts = opts?.maxAttempts ?? 3
  const nextAttempt = baseDelay > 0 ? new Date(Date.now() + baseDelay) : null
  const job = await prisma.testRunJob.create({
    data: {
      testCaseId,
      status: nextAttempt ? 'scheduled' : 'pending',
      attempts: 0,
      maxAttempts,
      nextAttempt,
    },
  })
  return job
}

/**
 * Mark job as processing (returns job) or null if none available.
 * This selects a job that is due: status = 'pending' OR (status = 'scheduled' and nextAttempt <= now)
 */
export async function claimNextJob() {
  const now = new Date()
  // transactional-ish: find first due job then try to update to processing
  const candidate = await prisma.testRunJob.findFirst({
    where: {
      OR: [
        { status: 'pending' },
        { status: 'scheduled', nextAttempt: { lte: now } },
      ],
    },
    orderBy: [{ nextAttempt: 'asc' }, { createdAt: 'asc' }],
  })
  if (!candidate) return null
  try {
    const updated = await prisma.testRunJob.update({
      where: { id: candidate.id },
      data: { status: 'processing', updatedAt: new Date() },
    })
    return updated
  } catch {
    return null
  }
}

/**
 * Handle job result after running test.
 * If passed -> mark done
 * If failed and attempts < maxAttempts -> schedule nextAttempt with backoff
 * else mark failed
 */
export async function finalizeJob(jobId: string, outcome: { passed: boolean, result: any, error?: string, duration?: number }) {
  const job = await prisma.testRunJob.findUnique({ where: { id: jobId } })
  if (!job) return null

  const attempts = (job.attempts ?? 0) + 1
  const maxAttempts = job.maxAttempts ?? 3
  const baseBackoffMs = Number(process.env.JOB_BACKOFF_BASE_MS ?? 2000) // default 2s

  if (outcome.passed) {
    return prisma.testRunJob.update({
      where: { id: jobId },
      data: {
        status: 'done',
        attempts,
        result: typeof outcome.result === 'string' ? outcome.result : JSON.stringify(outcome.result ?? {}),
        error: outcome.error ?? null,
        updatedAt: new Date(),
      },
    })
  }

  // failed
  if (attempts < maxAttempts) {
    const delay = computeNextAttemptDelay(baseBackoffMs, attempts)
    const nextAttempt = new Date(Date.now() + delay)
    return prisma.testRunJob.update({
      where: { id: jobId },
      data: {
        status: 'scheduled',
        attempts,
        nextAttempt,
        error: outcome.error ? String(outcome.error) : null,
        result: typeof outcome.result === 'string' ? outcome.result : JSON.stringify(outcome.result ?? {}),
        updatedAt: new Date(),
      },
    })
  }

  // exceeded attempts
  return prisma.testRunJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      attempts,
      nextAttempt: null,
      error: outcome.error ? String(outcome.error) : 'max attempts reached',
      result: typeof outcome.result === 'string' ? outcome.result : JSON.stringify(outcome.result ?? {}),
      updatedAt: new Date(),
    },
  })
}

/** Admin actions */
export async function cancelJob(jobId: string) {
  return prisma.testRunJob.update({
    where: { id: jobId },
    data: { status: 'cancelled', updatedAt: new Date(), error: 'Cancelled by admin' },
  })
}

export async function retryJobNow(jobId: string) {
  return prisma.testRunJob.update({
    where: { id: jobId },
    data: { status: 'pending', attempts: 0, nextAttempt: null, error: null, updatedAt: new Date() },
  })
}

export async function listJobs(limit = 50, filter?: { status?: string }) {
  const where: any = {}
  if (filter?.status) where.status = filter.status
  return prisma.testRunJob.findMany({
    where,
    orderBy: [{ status: 'asc' }, { nextAttempt: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    include: { testCase: true },
  })
}