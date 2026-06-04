// prisma/seed.js
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function upsertAdmin(email, name = 'Admin') {
  if (!email) return null
  const e = email.trim().toLowerCase()
  return prisma.user.upsert({
    where: { email: e },
    update: { role: 'admin', name },
    create: { email: e, name, role: 'admin' },
  })
}

async function upsertDemo(email) {
  if (!email) return null
  const e = email.trim().toLowerCase()
  return prisma.user.upsert({
    where: { email: e },
    update: { role: 'admin', name: 'Demo User' },
    create: { email: e, name: 'Demo User', role: 'admin' },
  })
}

async function main() {
  const adminsEnv = process.env.ADMIN_USERS || process.env.ADMIN_EMAILS || ''
  const adminEmails = adminsEnv.split(',').map(s => s.trim()).filter(Boolean)

  console.log('Seeding admin users:', adminEmails)
  for (const email of adminEmails) {
    try {
      const u = await upsertAdmin(email)
      console.log('Upserted admin:', u?.email)
    } catch (e) {
      console.error('Failed upsert admin', email, e)
    }
  }

  const demoEmail = (process.env.DEMO_USER_EMAIL || '').trim() || 'demo@local'
  let demoUser
  try {
    demoUser = await upsertDemo(demoEmail)
    console.log('Upserted demo user:', demoUser?.email)
  } catch (e) {
    console.error('Failed upsert demo user', e)
  }

  // ensure demo project + endpoint as before
  const project = await prisma.project.upsert({
    where: { slug: 'demo-project' },
    update: {},
    create: {
      name: 'Demo Project',
      slug: 'demo-project',
      description: 'Project seeded for demo',
      userId: demoUser.id,
    },
  })

  await prisma.endpoint.upsert({
    where: { id: 'demo-get-users' },
    update: {
      mockData: JSON.stringify([{ id: 1, name: 'Alice' }]),
    },
    create: {
      id: 'demo-get-users',
      method: 'GET',
      path: '/users',
      description: 'Demo users endpoint',
      requestSchema: '{}',
      responseSchema: '{}',
      mockData: JSON.stringify([{ id: 1, name: 'Alice' }]),
      statusCode: 200,
      projectId: project.id,
    },
  })

  console.log('Seed complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })