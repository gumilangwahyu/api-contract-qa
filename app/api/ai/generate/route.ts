import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import db from '../../../../lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null)
    let userId = (session?.user as any)?.id as string | undefined

    if (!userId) {
      // fallback to demo user
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@local'
      const demoUser = await db.user.findUnique({ where: { email: demoEmail } })
      if (demoUser) userId = demoUser.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { schema, method, path, description } = await request.json()

    if (!schema) {
      return NextResponse.json({ error: 'Schema is required' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY tidak ditemukan di environment. Silakan tambahkan GEMINI_API_KEY=your_key di file .env Anda.'
      }, { status: 400 })
    }

    // Call Gemini API (gemini-1.5-flash)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    const prompt = `Generate realistic mock JSON data that strictly matches this JSON Schema:\n${JSON.stringify(schema, null, 2)}\n\nContext:\n- HTTP Method: ${method || 'GET'}\n- API Path: ${path || '/'}\n- Description: ${description || ''}\n\nStrict Requirements for Mock Data Quality:\n1. All text fields, descriptions, titles, categories, addresses, messages, and names MUST be generated in Indonesian (Bahasa Indonesia).\n2. Ensure the generated values across all objects/arrays are coherent, logically connected, and consistent with each other (e.g., if there is a customer and their orders/transactions, the order items, prices, user details, and addresses should be logically related and make sense together as a single realistic scenario. Do not generate random mismatched objects).\n3. Use typical Indonesian names (e.g., Budi, Agus, Siti, Dewi, Joko) and real Indonesian locations (e.g., Jakarta, Bandung, Surabaya, Jakarta Selatan, etc.) for name and address fields.\n4. The data must highly align with the provided API Path and Description context.\n\nReturn ONLY the JSON object. Do not wrap in markdown code blocks.`

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        }
      })
    })

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      console.error('Gemini API Error:', errText)
      return NextResponse.json({ error: `Gemini API error: ${geminiResponse.statusText}` }, { status: 500 })
    }

    const data = await geminiResponse.json()
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textOutput) {
      return NextResponse.json({ error: 'Tidak mendapatkan response dari Gemini AI.' }, { status: 500 })
    }

    // Parse to ensure it is valid JSON
    let parsedResult
    try {
      parsedResult = JSON.parse(textOutput.trim())
    } catch (e) {
      try {
        const cleanText = textOutput.replace(/```json/g, '').replace(/```/g, '').trim()
        parsedResult = JSON.parse(cleanText)
      } catch (e2) {
        console.error('Failed to parse Gemini output:', textOutput)
        return NextResponse.json({ error: 'Format JSON dari AI tidak valid.' }, { status: 500 })
      }
    }

    return NextResponse.json({ data: parsedResult })
  } catch (error: any) {
    console.error('AI Generate Route Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
