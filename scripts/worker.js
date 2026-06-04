#!/usr/bin/env node
// scripts/worker.js
// Worker with HTTP processing and local fallback.
// Behavior:
// 1) Try POST PROCESS_ENDPOINT (/api/jobs/process).
// 2) If fetch fails (ECONNREFUSED / network), fallback to local processing:
//    - claim job via lib/job-queue.claimNextJob
//    - run test via lib/test-runner.runTestById
//    - finalize job via lib/job-queue.finalizeJob

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const PROCESS_ENDPOINT = process.env.PROCESS_ENDPOINT || 'http://localhost:3000/api/jobs/process'
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_MS ?? 2000)

async function callProcessHttp() {
  try {
    const res = await fetch(PROCESS_ENDPOINT, { method: 'POST', timeout: 30_000 })
    const json = await res.json().catch(() => null)
    return { ok: true, via: 'http', result: json }
  } catch (err) {
    // propagate error so caller can decide fallback
    return { ok: false, error: err }
  }
}

async function processLocalOnce() {
  // dynamic import to keep compatibility with ts-node / ESM/CJS
  const jq = await import('../lib/job-queue').catch((e) => { throw new Error('Failed import lib/job-queue: ' + e) })
  const runnerMod = await import('../lib/test-runner').catch((e) => { throw new Error('Failed import lib/test-runner: ' + e) })

  const claimNextJob = jq.claimNextJob || jq.default?.claimNextJob
  const finalizeJob = jq.finalizeJob || jq.default?.finalizeJob
  const runTestById = runnerMod.runTestById || runnerMod.default?.runTestById

  if (typeof claimNextJob !== 'function' || typeof finalizeJob !== 'function' || typeof runTestById !== 'function') {
    throw new Error('Required job functions not found in libs')
  }

  const job = await claimNextJob()
  if (!job) return { ok: true, via: 'local', message: 'no-job' }

  try {
    const res = await runTestById(job.testCaseId)
    await finalizeJob(job.id, { passed: !!res.passed, result: res, error: res.error ?? null, duration: res.duration })
    return { ok: true, via: 'local', jobId: job.id, outcome: res }
  } catch (e) {
    // schedule failure via finalizeJob
    try { await finalizeJob(job.id, { passed: false, result: null, error: String(e) }) } catch (ee) { console.error('finalizeJob failed', ee) }
    return { ok: false, via: 'local', error: e }
  }
}

async function loop() {
  while (true) {
    try {
      const httpRes = await callProcessHttp()
      if (httpRes.ok) {
        console.log('process via http:', httpRes.result)
      } else {
        // network error / ECONNREFUSED etc. -> fallback to local processing
        console.warn('HTTP process failed, falling back to local processing:', httpRes.error && httpRes.error.message ? httpRes.error.message : httpRes.error)
        try {
          const local = await processLocalOnce()
          console.log('local process result:', local)
        } catch (e) {
          console.error('Local processing error:', e)
        }
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    } catch (e) {
      console.error('Worker loop unexpected error:', e)
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS * 2))
    }
  }
}

(async () => {
  console.log('Worker started; PROCESS_ENDPOINT=', PROCESS_ENDPOINT)
  try {
    await loop()
  } catch (e) {
    console.error('Worker fatal error', e)
    process.exit(1)
  }
})()