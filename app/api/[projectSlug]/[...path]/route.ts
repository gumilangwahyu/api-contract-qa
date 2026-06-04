import { NextRequest, NextResponse } from 'next/server'
import db from '../../../../lib/db'
import { incrementHitCount, getCachedResponse, setCachedResponse } from '../../../../lib/kv'
import { checkRateLimit } from '../../../../lib/rateLimiter'
import { renderTemplate } from '../../../../lib/mock-template'

type Variant = {
  name?: string
  when?: Record<string, any> // e.g. { "query.status": "error", "header.x-test": "1" }
  statusCode?: number
  response?: any
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-mock-variant',
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[part]
  }
  return current
}

function matchesWhen(when: Record<string, any>, req: NextRequest, bodyObj: any) {
  for (const [key, expected] of Object.entries(when || {})) {
    let actual: any = undefined
    if (key.startsWith('query.')) {
      const param = key.slice('query.'.length)
      actual = req.nextUrl.searchParams.get(param)
    } else if (key.startsWith('header.')) {
      const headerName = key.slice('header.'.length)
      actual = req.headers.get(headerName)
    } else if (key.startsWith('body.')) {
      const bodyPath = key.slice('body.'.length)
      actual = getNestedValue(bodyObj, bodyPath)
    } else {
      return false
    }

    const actualStr = actual === null || actual === undefined ? '' : String(actual)
    const expectedStr = expected === null || expected === undefined ? '' : String(expected)

    if (actualStr !== expectedStr) return false
  }
  return true
}

async function handler(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length < 2) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400, headers: corsHeaders })
    }

    const projectSlug = parts[1]
    const endpointPath = parts.length === 2 ? '/' : '/' + parts.slice(2).join('/')
    const method = request.method

    // rate limiting per project slug
    try {
      const limitPerMinute = Number(process.env.MOCK_RATE_LIMIT_PER_MINUTE || '600')
      checkRateLimit(`project:${projectSlug}`, limitPerMinute, 60_000)
    } catch (rl: any) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: rl.status || 429, headers: corsHeaders })
    }

    const project = await db.project.findUnique({ where: { slug: projectSlug } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404, headers: corsHeaders })
    }

    const normalizedPath = endpointPath.replace(/\/$/, '') || '/'
    const endpoint = await db.endpoint.findFirst({
      where: {
        projectId: project.id,
        method,
        OR: [
          { path: endpointPath },
          { path: normalizedPath },
          { path: normalizedPath === '/' ? '' : normalizedPath + '/' }
        ]
      },
    })
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404, headers: corsHeaders })
    }

    // Determine variant parameters for cache key specificity
    const variantOverride = request.nextUrl.searchParams.get('variant') || request.headers.get('x-mock-variant') || undefined
    const cacheKey = `${projectSlug}:${method}:${normalizedPath}:${variantOverride || ''}:${request.nextUrl.searchParams.toString()}`

    // If mock data contains faker templates or dynamic expressions, bypass caching
    const hasTemplates = endpoint.mockData?.includes('{{')
    if (!hasTemplates) {
      const cached = await getCachedResponse(cacheKey)
      if (cached) {
        incrementHitCount(project.id).catch(() => {})
        return new NextResponse(JSON.stringify(cached.body), {
          status: cached.statusCode || 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    }

    let bodyObj: any = {}
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const contentType = request.headers.get('content-type') || ''
        if (contentType.includes('multipart/form-data')) {
          const formData = await request.clone().formData()
          for (const [key, value] of formData.entries()) {
            if (typeof value === 'string') {
              const trimmed = value.trim()
              if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                try {
                  bodyObj[key] = JSON.parse(trimmed)
                } catch {
                  bodyObj[key] = value
                }
              } else {
                bodyObj[key] = value
              }
            } else {
              bodyObj[key] = {
                name: (value as any).name || 'file',
                size: (value as any).size || 0,
                type: (value as any).type || '',
              }
            }
          }
        } else {
          bodyObj = await request.clone().json()
        }
      } catch (e) {
        // ignore parse error
      }
    }

    let parsed: any = null
    try {
      parsed = JSON.parse(endpoint.mockData || '{}')
    } catch (e) {
      parsed = endpoint.mockData
    }

    // Determine variant (already resolved earlier)
    let selected: { statusCode?: number; response?: any } | null = null

    const tryFindVariant = (variants: Variant[] | undefined) => {
      if (!variants) return null
      if (variantOverride) {
        const byName = variants.find((v) => v.name === variantOverride)
        if (byName) return byName
      }
      for (const v of variants) {
        if (v.when && matchesWhen(v.when, request, bodyObj)) return v
      }
      const def = variants.find((v) => v.name === 'default') || variants.find((v) => !v.when)
      if (def) return def
      return null
    }

    let variants: Variant[] | undefined = undefined
    if (Array.isArray(parsed)) {
      variants = parsed as Variant[]
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.variants)) {
      variants = parsed.variants as Variant[]
    }

    if (variants) {
      const v = tryFindVariant(variants)
      if (v) {
        selected = { statusCode: v.statusCode ?? endpoint.statusCode, response: v.response }
      }
    }

    if (!selected) {
      if (parsed && typeof parsed === 'object' && ('response' in parsed || 'defaultResponse' in parsed)) {
        selected = { statusCode: parsed.statusCode ?? endpoint.statusCode, response: parsed.response ?? parsed.defaultResponse }
      } else {
        selected = { statusCode: endpoint.statusCode, response: parsed }
      }
    }

    let respBody = selected.response
    try {
      respBody = renderTemplate(respBody)
    } catch (e) {
      console.error('Template render error', e)
    }

    if (endpoint.delay && endpoint.delay > 0) await new Promise((r) => setTimeout(r, endpoint.delay))

    // update counters
    await db.endpoint.update({ where: { id: endpoint.id }, data: { hitCount: { increment: 1 }, lastHitAt: new Date() } })
    await db.project.update({ where: { id: project.id }, data: { hitsToday: { increment: 1 }, hitsTotal: { increment: 1 }, lastHitAt: new Date() } })
    incrementHitCount(project.id).catch(() => {})

    if (!hasTemplates) {
      await setCachedResponse(cacheKey, { body: respBody, statusCode: selected.statusCode ?? endpoint.statusCode }, 300)
    }

    return new NextResponse(JSON.stringify(respBody), {
      status: selected.statusCode ?? endpoint.statusCode,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error: any) {
    console.error('Mock handler error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500, headers: corsHeaders })
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
export const OPTIONS = (_request: NextRequest) =>
  new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
