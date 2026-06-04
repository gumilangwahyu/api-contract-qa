import db from './db'
import { backupProjectToGitHub, syncProjectsIndex } from './github'

export async function cleanupOldTestResults() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const deleted = await db.testResult.deleteMany({ where: { createdAt: { lt: cutoff } } })
  return deleted
}

export async function resetDailyHitCounts() {
  await db.project.updateMany({ data: { hitsToday: 0 } })
  return true
}

export async function backupAllProjects() {
  const projects = await db.project.findMany({ select: { id: true } })
  for (const p of projects) {
    await backupProjectToGitHub(p.id)
    await new Promise((r) => setTimeout(r, 500))
  }
  return projects.length
}

export async function syncAllProjects() {
  await syncProjectsIndex()
  return true
}

export async function healthCheckEndpoints() {
  const endpoints = await db.endpoint.findMany({ select: { id: true, path: true, method: true } })
  return endpoints.length
}

export async function generateDailyReport() {
  // Example: aggregate today's metrics
  return []
}