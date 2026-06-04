import { z } from 'zod'

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
})

export const createEndpointSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string().min(1).max(255),
  description: z.string().optional(),
  requestSchema: z.string().optional(),
  responseSchema: z.string().optional(),
  mockData: z.string().optional().default('{}'),
  statusCode: z.number().min(100).max(599).default(200),
  delay: z.number().min(0).max(10000).default(0),
})

export const createTestCaseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  requestBody: z.string().optional(),
  queryParams: z.string().optional(),
  headers: z.string().optional(),
  expectedStatus: z.number().min(100).max(599),
  expectedBody: z.string().optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type CreateEndpointInput = z.infer<typeof createEndpointSchema>
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>