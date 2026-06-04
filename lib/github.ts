import { Octokit } from 'octokit'
import db from './db'

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

export async function backupProjectToGitHub(projectId: string) {
  if (!process.env.GITHUB_TOKEN) {
    console.warn('GITHUB_TOKEN is not configured. Skipping backup.')
    return false
  }
  try {
    const project = await db.project.findUnique({ where: { id: projectId }, include: { endpoints: true, testCases: true } })
    if (!project) throw new Error('Project not found')

    const backup = { project, endpoints: project.endpoints, testCases: project.testCases, backupTime: new Date().toISOString() }
    const path = `data/backups/${projectId}-${Date.now()}.json`

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPO_OWNER || '',
      repo: process.env.GITHUB_REPO_NAME || '',
      path,
      message: `Backup project ${project.name}`,
      content: Buffer.from(JSON.stringify(backup, null, 2)).toString('base64'),
      branch: process.env.GITHUB_BACKUP_BRANCH || 'main',
    })

    await db.syncLog.create({ data: { action: 'backup', status: 'success', projectId } })
    return true
  } catch (err: any) {
    console.error('backup error', err)
    await db.syncLog.create({ data: { action: 'backup', status: 'failed', message: err?.message, projectId } })
    return false
  }
}

export async function syncProjectsIndex() {
  if (!process.env.GITHUB_TOKEN) {
    console.warn('GITHUB_TOKEN is not configured. Skipping index sync.')
    return false
  }
  try {
    const projects = await db.project.findMany({ select: { id: true, name: true, slug: true, description: true } })
    const data = { projects, lastSync: new Date().toISOString() }
    const path = 'data/projects-index.json'
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPO_OWNER || '',
      repo: process.env.GITHUB_REPO_NAME || '',
      path,
      message: 'Sync projects index',
      content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
      branch: process.env.GITHUB_BACKUP_BRANCH || 'main',
    })
    return true
  } catch (err: any) {
    console.error('syncProjectsIndex error', err)
    return false
  }
}