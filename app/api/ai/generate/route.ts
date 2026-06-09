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

    const { schema, method, path, description, arrayLength, arrayLengths } = await request.json()

    if (!schema) {
      return NextResponse.json({ error: 'Schema is required' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY tidak ditemukan di environment. Silakan tambahkan GEMINI_API_KEY=your_key di file .env Anda.'
      }, { status: 400 })
    }

    let arrayInstructions = ''
    if (arrayLengths && typeof arrayLengths === 'object') {
      const entries = Object.entries(arrayLengths).filter(([k]) => k !== '__globalDefault')
      const globalDefault = arrayLengths['__globalDefault'] ?? arrayLength ?? 5
      
      arrayInstructions = `Specifically, for the following array paths, generate EXACTLY the requested number of items:\n`
      for (const [pathKey, len] of entries) {
        const l = typeof len === 'number' ? Math.min(Math.max(len, 1), 10) : 5
        arrayInstructions += `- Array path "${pathKey}": generate exactly ${l} items.\n`
      }
      arrayInstructions += `- All other array fields: generate exactly ${globalDefault} items.`
    }

    if (!arrayInstructions) {
      const finalArrayLength = typeof arrayLength === 'number' ? Math.min(Math.max(arrayLength, 1), 10) : 5
      arrayInstructions = `If the schema defines any array fields, generate exactly ${finalArrayLength} items/elements in those arrays (no more, no less).`
    }

    // Call Gemini API (gemini-1.5-flash)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    const prompt = `Hasilkan data JSON tiruan realistis yang sesuai dengan Skema JSON ini:\n${JSON.stringify(schema, null, 2)}\n\nKonteks:\n- Metode HTTP: ${method || 'GET'}\n- Jalur API: ${path || '/'}\n- Deskripsi: ${description || ''}\n\nPersyaratan Ketat untuk Kualitas Data Tiruan:\n1. Semua field string HARUS dicocokkan dan dihasilkan secara dinamis dalam bahasa Indonesia sesuai dengan arti nama properti/field. Untuk semua objek string, analisis nama/kuncinya dan hasilkan nilai yang sangat familiar dan relevan di Indonesia. Misalnya:\n - Jika kuncinya adalah "pesan" / "pesan": Buat pesan respons/status dalam bahasa Indonesia yang sudah dikenal (misalnya, "Berhasil mengambil data", "Data berhasil", "Sukses").\n - Jika kuncinya adalah "event" / "nama_event": Buat nama acara dalam bahasa Indonesia yang sangat dikenal (misalnya, "Konser Tulus Jakarta", "Festival Kuliner Nusantara", "Pameran Buku Bandung").\n - Jika kuncinya adalah "aktivitas_event" / "deskripsi": Buat detail deskripsi aktivitas/acara dalam bahasa Indonesia yang realistis (misalnya, "Sesi tanya jawab dengan pembicara utama", "Registrasi peserta dan Pembagian merchandise").\n - Jika kuncinya adalah "genre": Buat genre produk/konten yang familier dalam bahasa Indonesia (misalnya, "Musik", "Edukasi", "Komedi", "Teknologi").\n - Jika kuncinya adalah "range_tanggal_kebijakan": Buat rentang tanggal kebijakan/acara yang diformat dalam bahasa Indonesia (misalnya, "1 Januari - 31 Desember 2026", "Awal Bulan Depan").\n - Jika kuncinya adalah "gambar" / image/photo: Hasilkan URL gambar placeholder/stok yang valid (misalnya, "https://picsum.photos/600/400", "https://images.unsplash.com/photo-1501854140801-50d01698950b"). Jangan menghasilkan kata-kata acak.\n - Terapkan pemetaan dinamis ini ke SEMUA bidang string lain dalam skema untuk memastikan bidang tersebut sesuai dengan konteks Indonesia pada umumnya.\n2. Untuk bidang pengidentifikasi numerik apa pun (seperti "id", "genre_id", atau bidang ID/indeks lainnya, terutama di dalam array): JANGAN menghasilkan angka acak atau float yang sangat besar (misalnya, 50414785.24). Sebaliknya, angka tersebut HARUS dimulai dari 1 dan bertambah secara berurutan (1, 2, 3, dst.) untuk setiap item dalam array.\n3. Pastikan nilai yang dihasilkan di semua objek/array koheren, terhubung secara logis, dan konsisten satu sama lain. Item pesanan, harga, detail pengguna, dan alamat harus terkait secara logis dan masuk akal sebagai satu skenario realistis. Jangan menghasilkan objek yang tidak cocok secara acak.\n4. Gunakan nama-nama umum Indonesia (misalnya, Budi, Agus, Siti, Dewi, Joko) dan lokasi nyata di Indonesia (misalnya, Jakarta, Bandung, Surabaya, Jakarta Selatan, dll.) untuk kolom nama dan alamat.\n5. Data harus sangat sesuai dengan konteks API Path dan Deskripsi yang diberikan.\n6. ${arrayInstructions}\n\nKembalikan HANYA objek JSON. Jangan membungkusnya dalam blok kode markdown.`

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
