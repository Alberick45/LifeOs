import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: Request) {
  try {
    const { type, person, interactions, tags, userApiKey } = await req.json()

    // Priority: Custom User Key > Global Env Key > Fallback Error
    const systemApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    const finalKey = userApiKey || systemApiKey

    if (!finalKey) {
      return NextResponse.json(
        { error: "No API key found. Please add one in Settings or the .env.local file." },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(finalKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // Build context about the person
    let contextStr = `This person's name is ${person.name}. They are my ${person.relationship_type}.`
    if (person.birthday) {
      contextStr += ` Their birthday is ${new Date(person.birthday).toLocaleDateString()}.`
    }
    if (tags && tags.length > 0) {
      contextStr += ` Here are some specific details, traits, and interests about them: ${tags.map((t: any) => t.name).join(', ')}.`
    }
    if (interactions && interactions.length > 0) {
      contextStr += ` Here are some notes from our past interactions: ${interactions.map((i: any) => i.notes).filter(Boolean).join('. ')}.`
    }

    let prompt = ''

    if (type === 'gift') {
      prompt = `${contextStr} Generate 5 highly personalized gift ideas for them (include both physical and digital/experience options). Ensure they are relevant to their interests, our emotional tone, and explain briefly WHY each is a good fit. Format with emojis and bullet points.`
    } else if (type === 'message') {
      prompt = `${contextStr} Write a warm, natural, and highly personalized birthday message for them based on their personality traits and our relationship history. Avoid generic phrases. Make it feel authentic.`
    } else if (type === 'summary') {
      prompt = `${contextStr} Summarize the overall history and current health of this relationship based on the interactions provided. Suggest 2-3 specific, actionable ways I can improve our connection quality.`
    } else if (type === 'conflict') {
      prompt = `${contextStr} Based on the negative or conflict interactions in our history, suggest calm, respectful, and emotionally intelligent communication strategies I can use to resolve tension and improve the relationship.`
    } else if (type === 'poem') {
      prompt = `${contextStr} Write a short, touching, and creative poem about our relationship.`
    } else if (type === 'website') {
      prompt = `${contextStr} Generate a very short, raw HTML snippet (just the body content, using inline CSS for a futuristic cyberpunk or sleek glassmorphic style) that acts as a personalized "appreciation" mini-website for them. Make it visually stunning. Do not include markdown \`\`\`html tags, just the raw HTML string.`
    } else {
      prompt = `${contextStr} Give me a brief, insightful summary about this person.`
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ result: text })
  } catch (error: any) {
    console.error("AI Generation Error:", error)
    
    // Check if it's a rate limit or high demand error
    if (error.message?.includes("503") || error.message?.includes("Service Unavailable")) {
      return NextResponse.json(
        { error: "The AI is currently experiencing high demand. Please wait a moment and try again, or add your own custom API key in Settings!" },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: "Failed to generate AI content.", details: error.message },
      { status: 500 }
    )
  }
}
