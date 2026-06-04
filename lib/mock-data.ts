import { faker } from '@faker-js/faker'

export function generateMockData(schema: Record<string, any>): any {
  const out: any = {}
  for (const [k, v] of Object.entries(schema || {})) {
    const t = (v as any).type || typeof v
    if (t === 'string') {
      if ((v as any).format === 'email') out[k] = faker.internet.email()
      else out[k] = faker.lorem.word()
    } else if (t === 'number') out[k] = faker.number.int({ min: 0, max: 1000 })
    else if (t === 'boolean') out[k] = faker.datatype.boolean()
    else if (t === 'array') out[k] = [generateMockData((v as any).items || {})]
    else if (t === 'object') out[k] = generateMockData((v as any).properties || {})
    else out[k] = null
  }
  return out
}

export function getMockDataForEndpoint(mockDataString: string) {
  try { return JSON.parse(mockDataString) } catch { return {} }
}