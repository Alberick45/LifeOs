"use client"

import { useState, useEffect } from "react"
import { Timer, Trophy, Play, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

type GameState = "START" | "COUNTDOWN" | "PLAYING" | "RESULTS"

export default function ChaosAlphabetPage() {
  const [gameState, setGameState] = useState<GameState>("START")
  const [countdown, setCountdown] = useState(3)
  const [timer, setTimer] = useState(60)
  
  const [letter, setLetter] = useState("A")
  const [categories, setCategories] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [score, setScore] = useState(0)

  // Standard Pack
  const STANDARD_CATEGORIES = [
    "Country / City",
    "Animal",
    "Food / Drink",
    "Profession",
    "Movie / TV Show"
  ]

  const generateLetter = () => {
    const alphabet = "ABCDEFGHIJKLMNOPRSTW" // Excluded Q, U, V, X, Y, Z for easier MVP
    return alphabet[Math.floor(Math.random() * alphabet.length)]
  }

  const startGame = () => {
    setLetter(generateLetter())
    setCategories(STANDARD_CATEGORIES)
    setAnswers({})
    setScore(0)
    setTimer(60)
    setGameState("COUNTDOWN")
    setCountdown(3)
  }

  // Handle Countdown
  useEffect(() => {
    if (gameState === "COUNTDOWN") {
      if (countdown > 0) {
        const timeout = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(timeout)
      } else {
        setGameState("PLAYING")
      }
    }
  }, [gameState, countdown])

  // Handle Game Timer
  useEffect(() => {
    if (gameState === "PLAYING") {
      if (timer > 0) {
        const timeout = setTimeout(() => setTimer(t => t - 1), 1000)
        return () => clearTimeout(timeout)
      } else {
        finishGame()
      }
    }
  }, [gameState, timer])

  const finishGame = () => {
    // Basic scoring engine: +10 points for every answer that starts with the correct letter
    let finalScore = 0
    categories.forEach(cat => {
      const answer = answers[cat] || ""
      if (answer.trim().toLowerCase().startsWith(letter.toLowerCase())) {
        finalScore += 10
      }
    })
    setScore(finalScore)
    setGameState("RESULTS")
  }

  const handleInputChange = (category: string, value: string) => {
    setAnswers(prev => ({ ...prev, [category]: value }))
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard/playlab" className="text-gray-400 hover:text-white flex items-center transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to PlayLab
        </Link>
        <div className="font-mono text-primary font-bold tracking-widest uppercase text-sm">
          Chaos Alphabet Arena
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        
        {/* START SCREEN */}
        {gameState === "START" && (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-3xl border border-yellow-500/30">
              <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-orange-600 drop-shadow-lg">
                CHAOS
              </span>
            </div>
            <p className="text-gray-400 max-w-md mx-auto">
              You have 60 seconds to answer all categories. Every answer MUST start with the randomized letter. 
            </p>
            <Button size="lg" onClick={startGame} className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold text-lg px-12 py-6 rounded-full shadow-[0_0_40px_rgba(234,179,8,0.4)] hover:shadow-[0_0_60px_rgba(234,179,8,0.6)] transition-all hover:scale-105">
              <Play className="h-6 w-6 mr-2 fill-current" /> START MATCH
            </Button>
          </div>
        )}

        {/* COUNTDOWN SCREEN */}
        {gameState === "COUNTDOWN" && (
          <div className="text-center animate-in zoom-in duration-300">
            <div className="text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
              {countdown}
            </div>
          </div>
        )}

        {/* PLAYING SCREEN */}
        {gameState === "PLAYING" && (
          <div className="w-full h-full flex flex-col">
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 shadow-2xl backdrop-blur-xl">
              <div className="text-center">
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-1">Letter</p>
                <div className="text-6xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] leading-none">
                  {letter}
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-1">Time</p>
                <div className={`text-5xl font-mono font-bold flex items-center ${timer <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  <Timer className="h-8 w-8 mr-3 opacity-50" />
                  00:{timer.toString().padStart(2, '0')}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {categories.map((cat, idx) => (
                <div key={idx} className="bg-black/50 border border-white/10 rounded-xl p-4 focus-within:border-yellow-500/50 focus-within:shadow-[0_0_20px_rgba(234,179,8,0.1)] transition-all">
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">
                    {cat}
                  </label>
                  <input
                    type="text"
                    value={answers[cat] || ""}
                    onChange={e => handleInputChange(cat, e.target.value)}
                    placeholder={`Type a ${cat} starting with ${letter}...`}
                    className="w-full bg-transparent border-none outline-none text-xl text-white placeholder:text-gray-700"
                    autoFocus={idx === 0}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Button onClick={finishGame} className="w-full bg-white/10 hover:bg-white/20 text-white py-6 text-lg font-bold">
                SUBMIT EARLY
              </Button>
            </div>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {gameState === "RESULTS" && (
          <div className="w-full animate-in slide-in-from-bottom-8 duration-500">
            <div className="text-center mb-8">
              <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
              <h2 className="text-4xl font-black text-white">Time's Up!</h2>
              <p className="text-xl text-gray-400 mt-2">You scored <span className="text-yellow-400 font-bold">{score}</span> points</p>
            </div>

            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
              <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex justify-between items-center">
                <span className="font-bold text-sm text-gray-400 uppercase tracking-widest">Letter: {letter}</span>
                <span className="text-xs text-gray-500">MVP Scoring Engine</span>
              </div>
              <div className="divide-y divide-white/5">
                {categories.map((cat, idx) => {
                  const answer = answers[cat] || ""
                  const isValid = answer.trim().toLowerCase().startsWith(letter.toLowerCase())
                  return (
                    <div key={idx} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">{cat}</p>
                        <p className={`text-lg font-medium ${!answer ? 'text-gray-600 italic' : 'text-white'}`}>
                          {answer || "No answer provided"}
                        </p>
                      </div>
                      <div>
                        {isValid ? (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold border border-green-500/20">
                            +10 PTS
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold border border-red-500/20">
                            INVALID
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <Button onClick={startGame} className="bg-white hover:bg-gray-200 text-black font-bold px-8 py-6 rounded-full shadow-xl hover:scale-105 transition-all">
                <RefreshCw className="h-5 w-5 mr-2" /> PLAY AGAIN
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
