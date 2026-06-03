import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini API
// Use a dummy key if env var is missing during build time, but it will fail at runtime if truly missing.
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || 'MISSING_KEY')

export async function POST(req: Request) {
  try {
    const { type, person, interactions } = await req.json()

    if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY is not set in your .env.local file." },
        { status: 500 }
      )
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // Build context about the person
    let contextStr = `This person's name is ${person.name}. They are my ${person.relationship_type}.`
    if (person.birthday) {
      contextStr += ` Their birthday is ${new Date(person.birthday).toLocaleDateString()}.`
    }
    if (interactions && interactions.length > 0) {
      contextStr += ` Here are some notes from our past interactions: ${interactions.map((i: any) => i.notes).filter(Boolean).join('. ')}.`
    }

    let prompt = ''

    if (type === 'gift') {
      prompt = `${contextStr} Based on this, generate 5 highly personalized, creative, and thoughtful gift ideas for them. Format it as a list.`
    } else if (type === 'message') {
      prompt = `${contextStr} Based on this, write a heartfelt, warm, and personalized message I can send them. Make it sound natural and human, not overly formal.`
    } else if (type === 'poem') {
      prompt = `${contextStr} Write a short, touching, and creative poem about our relationship.`
    } else if (type === 'website') {
      prompt = `${contextStr} Generate a very short, raw HTML snippet (just the body content, using inline CSS for a futuristic cyberpunk or sleek glassmorphic style) that acts as a personalized "appreciation" mini-website for them. Make it visually stunning. Do not include markdown \`\`\`html tags, just the raw HTML string.`
    } else {
      return NextResponse.json({ error: "Invalid AI generation type." }, { status: 400 })
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ result: text })
  } catch (error: any) {
    console.error("AI Generation Error:", error)
    return NextResponse.json(
      { error: "Failed to generate AI content.", details: error.message },
      { status: 500 }
    )
  }
}
