import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { gameId, category, difficulty, count = 10 } = await request.json()
    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      // Fallback generator when API Key is missing
      const fallbackWords = getFallbackWords(gameId, category, difficulty, count)
      return NextResponse.json({ success: true, words: fallbackWords, fallback: true })
    }

    const gameName = gameId === "reverse_hangman" ? "Reverse Hangman Survival" : "Chaos Alphabet Arena"
    
    let prompt = `Generate a JSON array of exactly ${count} educational, interesting, and clean words and clues/categories for the game "${gameName}".
Only respond with a valid, raw JSON array of objects. Do not write markdown, backticks, or any conversational text.

`

    if (gameId === "reverse_hangman") {
      prompt += `Each object MUST have the following schema:
{
  "word": "UPPERCASE_WORD",
  "category": "${category || 'any interesting category'}",
  "hint": "A creative, descriptive clue that helps players guess this word.",
  "difficulty": "${difficulty || 'Normal'}"
}
Note: For difficulty "Beginner", use simple, short words (4-6 letters). For "Normal", use medium words (6-8 letters). For "Expert", use long, rare, or complex words (8-14 letters).`
    } else {
      prompt += `Each object MUST have the following schema:
{
  "word": "UPPERCASE_WORD",
  "category": "${category || 'one of: country, animal, food, profession, sports, scientist, planet, language, chemical, invention, media, book, music, celebrity, city, river, mountain, landmark'}",
  "hint": "",
  "difficulty": null
}
Ensure the word matches the category provided and starts with a random letter from the alphabet.`
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error("Gemini API call failed:", errText)
      throw new Error("Gemini API error")
    }

    const resJson = await response.json()
    const textContent = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "[]"
    
    // Parse generated JSON
    let words = JSON.parse(textContent.trim())
    if (!Array.isArray(words)) {
      if (typeof words === "object" && words !== null && Array.isArray((words as any).words)) {
        words = (words as any).words
      } else {
        throw new Error("Gemini output is not an array")
      }
    }

    // Double check uppercase words
    words = words.map((w: any) => ({
      ...w,
      word: String(w.word).toUpperCase().replace(/[^A-Z]/g, "")
    }))

    return NextResponse.json({ success: true, words, fallback: false })
  } catch (error: any) {
    console.error("Error generating words:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate words" },
      { status: 500 }
    )
  }
}

interface FallbackWord {
  word: string
  category: string
  hint: string
  difficulty: string | null
}

// Simple pre-compiled fallback generator to ensure functionality even without API key
function getFallbackWords(gameId: string, category: string, difficulty: string, count: number) {
  const hangmanPool: FallbackWord[] = [
    { word: "NEXTJS", category: "Technology", hint: "A React framework for server-rendered apps.", difficulty: "Beginner" },
    { word: "TYPESCRIPT", category: "Technology", hint: "A typed superset of JavaScript.", difficulty: "Normal" },
    { word: "LEOPARD", category: "Animals", hint: "A large spotted wild cat of Africa and Asia.", difficulty: "Beginner" },
    { word: "AVOCADO", category: "Food", hint: "A pear-shaped fruit with a rough green skin and oily edible flesh.", difficulty: "Beginner" },
    { word: "ASTRONOMY", category: "Science", hint: "The branch of science that deals with space and celestial bodies.", difficulty: "Normal" },
    { word: "EINSTEIN", category: "Science", hint: "Famous physicist who developed the theory of relativity.", difficulty: "Normal" },
    { word: "VAPORIZATION", category: "Physics", hint: "The process of converting a liquid into a gas.", difficulty: "Expert" },
    { word: "PHOTOSYNTHESIS", category: "Biology", hint: "How plants transform carbon dioxide and water into food using sunlight.", difficulty: "Expert" },
    { word: "CYBERSECURITY", category: "Technology", hint: "Protection of computer systems and networks from information disclosure.", difficulty: "Expert" },
    { word: "PORTUGAL", category: "Geography", hint: "European country located on the Iberian Peninsula, bordering Spain.", difficulty: "Beginner" }
  ]

  const alphabetPool: FallbackWord[] = [
    { word: "GHANA", category: "country", hint: "", difficulty: null },
    { word: "CHEETAH", category: "animal", hint: "", difficulty: null },
    { word: "LASAGNA", category: "food", hint: "", difficulty: null },
    { word: "ENGINEER", category: "profession", hint: "", difficulty: null },
    { word: "BADMINTON", category: "sports", hint: "", difficulty: null },
    { word: "NEWTON", category: "scientist", hint: "", difficulty: null },
    { word: "SATURN", category: "planet", hint: "", difficulty: null },
    { word: "PYTHON", category: "language", hint: "", difficulty: null },
    { word: "AIRPLANE", category: "invention", hint: "", difficulty: null },
    { word: "INCEPTION", category: "media", hint: "", difficulty: null }
  ]

  const pool = gameId === "reverse_hangman" ? hangmanPool : alphabetPool
  let filtered = pool
  
  if (category) {
    filtered = filtered.filter(item => item.category.toLowerCase() === category.toLowerCase())
  }
  if (difficulty && gameId === "reverse_hangman") {
    filtered = filtered.filter(item => item.difficulty && item.difficulty.toLowerCase() === difficulty.toLowerCase())
  }

  // If filter is too restrictive, default back
  if (filtered.length === 0) filtered = pool

  // Shuffle and take count
  return [...filtered].sort(() => 0.5 - Math.random()).slice(0, count)
}
