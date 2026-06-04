"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Trophy, Play, ArrowLeft, AlertTriangle, Bot, Zap, Star, ShieldAlert, Check, ShoppingBag, Lock, Flame, Shield, Compass, Waves, Sun, Crosshair } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { readCoins, adjustCoins, onCoinsChange, loadProgress, saveProgress, saveHighScore } from "@/lib/playlab-coins"

type GameState = "MENU" | "SOLO_PLAY" | "DM_PLAY" | "RESULTS"
type Difficulty = "Beginner" | "Normal" | "Expert"
type EnvironmentType = "volcano" | "submarine" | "space"

interface LeaderboardEntry {
  name: string
  score: number
  environment: string
  difficulty: string
  date: string
}

// ─── CSS injected once ─────────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes shake {
  0%,100%{ transform:translate(0,0) rotate(0deg); }
  15%{ transform:translate(-6px,4px) rotate(-1.5deg); }
  30%{ transform:translate(5px,-3px) rotate(1deg); }
  45%{ transform:translate(-4px,5px) rotate(-0.5deg); }
  60%{ transform:translate(6px,-2px) rotate(1deg); }
  75%{ transform:translate(-3px,4px) rotate(-1deg); }
}
@keyframes lava-rise {
  0%{ transform:scaleX(1.15) translateY(0); opacity:.7; }
  50%{ transform:scaleX(1) translateY(-6px); opacity:.9; }
  100%{ transform:scaleX(1.15) translateY(0); opacity:.7; }
}
@keyframes bubble-float {
  0%{ transform:translateY(0) translateX(0) scale(.8); opacity:.7; }
  50%{ transform:translateY(-60px) translateX(8px) scale(1); opacity:.4; }
  100%{ transform:translateY(-120px) translateX(-4px) scale(.6); opacity:0; }
}
@keyframes solar-pulse {
  0%,100%{ transform:scale(1); opacity:.4; }
  50%{ transform:scale(1.4); opacity:.9; }
}
@keyframes crack-appear {
  0%{ opacity:0; clip-path:inset(100% 0 0 0); }
  100%{ opacity:1; clip-path:inset(0 0 0 0); }
}
@keyframes flicker {
  0%,100%{ opacity:1; } 20%{ opacity:.5; } 40%{ opacity:.9; } 60%{ opacity:.3; } 80%{ opacity:.8; }
}
@keyframes death-fade {
  0%{ opacity:0; transform:scale(1.08); } 100%{ opacity:1; transform:scale(1); }
}
@keyframes float-particle {
  0%{ transform:translateY(0) translateX(0) rotate(0deg); opacity:1; }
  100%{ transform:translateY(-180px) translateX(var(--dx,20px)) rotate(720deg); opacity:0; }
}
.anim-shake{ animation: shake .45s ease-in-out; }
.anim-death{ animation: death-fade .6s ease-out forwards; }
`

const ENVIRONMENT_METADATA = {
  volcano: {
    name: "Volcano Caldera",
    icon: <Flame className="h-5 w-5 text-red-500" />,
    description: "Guarding a geothermal research center inside an active volcano.",
    stages: [
      "Environment stable. Heat readings normal.",
      "Warning: Heat levels rising. Micro-tremors detected.",
      "Alert: Lava leak in Sector C. Minor chamber damage.",
      "Critical: Structural cracks forming. Magma filling pipes.",
      "CATACLYSM: Caldera collapse! Total destruction."
    ],
    colors: "from-red-950/80 via-orange-950/60 to-black border-red-500/40",
    particleColor: "bg-gradient-to-t from-orange-600 to-red-500",
    glowColor: "shadow-red-500/30"
  },
  submarine: {
    name: "Deep Sea Abyss",
    icon: <Waves className="h-5 w-5 text-blue-500" />,
    description: "Sinking submarine pod below 5,000 meters under ocean pressure.",
    stages: [
      "Hull pressurized. Oxygen scrubbers nominal.",
      "Warning: Pressure rising. Tiny leak in ballast tanks.",
      "Alert: Hull integrity declining. Water spray in room.",
      "Critical: Flood alarms active. Power grid failure.",
      "IMPLOSION: Submarine hull crushed by ocean abyss!"
    ],
    colors: "from-blue-950/80 via-cyan-950/60 to-black border-blue-500/40",
    particleColor: "bg-cyan-400",
    glowColor: "shadow-blue-500/30"
  },
  space: {
    name: "Solar Flare Station",
    icon: <Sun className="h-5 w-5 text-yellow-500" />,
    description: "Solar research station facing a radioactive solar storm.",
    stages: [
      "Shields active. Magnetic field generator holding.",
      "Warning: Radiation levels rising. Minor solar storm.",
      "Alert: Shield battery depleted. Secondary generator damaged.",
      "Critical: Hull temperature extreme. Comm towers destroyed.",
      "DECOMPRESSION: Station shields collapsed! Vaporization imminent."
    ],
    colors: "from-yellow-950/80 via-amber-950/60 to-black border-yellow-500/40",
    particleColor: "bg-yellow-400",
    glowColor: "shadow-yellow-500/30"
  }
}

const WORD_DB: Record<Difficulty, Array<{ word: string; category: string; hint: string }>> = {
  Beginner: [
    { word: "REACT", category: "Technology", hint: "A popular front-end UI framework." },
    { word: "APPLE", category: "Food", hint: "A red or green crunchy fruit." },
    { word: "COFFEE", category: "Drink", hint: "Morning energy beverage." },
    { word: "GUITAR", category: "Music", hint: "Six-string acoustic instrument." },
    { word: "DOCTOR", category: "Profession", hint: "Treats patients and writes prescriptions." },
    { word: "PLANET", category: "Science", hint: "Orbits a star in the solar system." },
    { word: "BRIDGE", category: "Engineering", hint: "Connects two land masses over water." },
  ],
  Normal: [
    { word: "DATABASE", category: "Technology", hint: "Stores structures of relationship tables." },
    { word: "VOLCANO", category: "Nature", hint: "Erupts with magma and volcanic ash." },
    { word: "ASTRONAUT", category: "Science", hint: "Travels beyond Earth's atmosphere." },
    { word: "CHIMPANZEE", category: "Animals", hint: "Intelligent primate sharing 98% human DNA." },
    { word: "SUBMARINE", category: "Vehicle", hint: "Operates deep under the ocean surface." },
    { word: "HURRICANE", category: "Weather", hint: "Tropical storm with violent rotating winds." },
    { word: "PARLIAMENT", category: "Politics", hint: "Legislative body that makes laws for a country." },
  ],
  Expert: [
    { word: "ALGORITHM", category: "Mathematics", hint: "Set of rules to solve code problems." },
    { word: "VAPORIZATION", category: "Science", hint: "Phase transition from liquid to gas." },
    { word: "DECOMPRESSION", category: "Physics", hint: "Reduction in ambient pressure on container." },
    { word: "PHOTOSYNTHESIS", category: "Biology", hint: "How green plants make food from sunlight." },
    { word: "RELATIONSHIP", category: "HumanOS", hint: "Connection or association between people." },
    { word: "EXTRATERRESTRIAL", category: "Sci-Fi", hint: "Life or matter originating beyond Earth." },
    { word: "METAMORPHOSIS", category: "Biology", hint: "Butterfly transforming from a caterpillar." },
  ]
}

// ─── Particle Components ───────────────────────────────────────────────────────
function LavaParticles({ count }: { count: number }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden pointer-events-none z-20">
      {/* Lava blob rising */}
      <div
        className="absolute bottom-0 left-0 right-0 h-10 rounded-t-full opacity-80"
        style={{
          background: "radial-gradient(ellipse at 50% 100%, #ef4444 0%, #dc2626 40%, #b91c1c 100%)",
          animation: "lava-rise 2s ease-in-out infinite",
          transformOrigin: "bottom center"
        }}
      />
      {/* Lava droplets */}
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute bottom-8 rounded-full"
          style={{
            left: `${10 + (i * 13) % 80}%`,
            width: `${6 + (i * 7) % 10}px`,
            height: `${6 + (i * 7) % 10}px`,
            background: i % 2 === 0 ? "#f97316" : "#ef4444",
            animation: `float-particle ${1.5 + (i * 0.3) % 1.5}s ease-out ${(i * 0.2) % 1}s infinite`,
            "--dx": `${-20 + (i * 17) % 40}px`
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

function BubbleParticles({ count }: { count: number }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden pointer-events-none z-20">
      {/* Water rising base */}
      <div
        className="absolute bottom-0 left-0 right-0 h-8 opacity-60"
        style={{
          background: "linear-gradient(to top, #0ea5e9, #06b6d4 40%, transparent)",
          animation: "lava-rise 2.5s ease-in-out infinite",
          transformOrigin: "bottom center"
        }}
      />
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute bottom-4 rounded-full border-2 border-cyan-400/60 bg-cyan-400/20"
          style={{
            left: `${5 + (i * 11) % 85}%`,
            width: `${5 + (i * 5) % 12}px`,
            height: `${5 + (i * 5) % 12}px`,
            animation: `bubble-float ${2 + (i * 0.4) % 2}s ease-out ${(i * 0.3) % 1.5}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function SolarParticles({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-yellow-400/80"
          style={{
            top: `${10 + (i * 17) % 80}%`,
            left: `${(i * 23) % 90}%`,
            width: `${3 + (i * 3) % 7}px`,
            height: `${3 + (i * 3) % 7}px`,
            animation: `solar-pulse ${1 + (i * 0.3) % 1.5}s ease-in-out ${(i * 0.2) % 1}s infinite`,
            boxShadow: "0 0 8px 4px rgba(251,191,36,0.4)"
          }}
        />
      ))}
    </div>
  )
}

// ─── Crack overlay SVG ─────────────────────────────────────────────────────────
function CrackOverlay({ intensity }: { intensity: number }) {
  if (intensity < 2) return null
  return (
    <div className="absolute inset-0 pointer-events-none z-10" style={{ animation: "crack-appear 0.5s ease-out forwards" }}>
      <svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="none" className="opacity-30">
        {intensity >= 2 && <polyline points="50,0 80,60 40,80 90,150 60,200" stroke="#ef4444" strokeWidth="2" fill="none" />}
        {intensity >= 2 && <polyline points="350,0 320,50 370,100 310,180 360,250" stroke="#ef4444" strokeWidth="1.5" fill="none" />}
        {intensity >= 3 && <polyline points="200,0 180,80 220,120 160,200 200,300" stroke="#dc2626" strokeWidth="2.5" fill="none" />}
        {intensity >= 3 && <polyline points="100,30 140,90 110,130 150,200" stroke="#b91c1c" strokeWidth="1" fill="none" />}
        {intensity >= 3 && <polyline points="300,20 260,100 290,150 250,250" stroke="#b91c1c" strokeWidth="1" fill="none" />}
      </svg>
    </div>
  )
}

// ─── Keyboard Row component ────────────────────────────────────────────────────
function KeyRow({ letters, guessedLetters, secretWord, onGuess }: {
  letters: string; guessedLetters: string[]; secretWord: string; onGuess: (l: string) => void
}) {
  return (
    <div className="flex justify-center gap-1.5 flex-wrap">
      {letters.split("").map(letter => {
        const guessed = guessedLetters.includes(letter)
        const correct = guessed && secretWord.includes(letter)
        return (
          <button
            key={letter}
            disabled={guessed}
            onClick={() => onGuess(letter)}
            className={`w-9 h-11 sm:w-10 sm:h-12 text-xs font-black rounded-xl transition-all duration-200 select-none
              ${guessed
                ? correct
                  ? "bg-green-500/25 border-2 border-green-400 text-green-300 shadow-md shadow-green-500/20 scale-95"
                  : "bg-red-500/20 border-2 border-red-500/50 text-red-400/60 scale-90"
                : "bg-white/8 border border-white/15 text-gray-200 hover:bg-white/15 hover:scale-110 hover:border-white/30 active:scale-95"
              }`}
          >
            {letter}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ReverseHangmanPage() {
  const [gameState, setGameState] = useState<GameState>("MENU")
  const [userId, setUserId] = useState<string>("local")
  const [coins, setCoins] = useState<number>(250)
  const [highScore, setHighScore] = useState<number>(0)
  const [selectedEnv, setSelectedEnv] = useState<EnvironmentType>("volcano")
  const [difficulty, setDifficulty] = useState<Difficulty>("Normal")
  const [secretWord, setSecretWord] = useState<string>("")
  const [category, setCategory] = useState<string>("")
  const [hint, setHint] = useState<string>("")
  const [guessedLetters, setGuessedLetters] = useState<string[]>([])
  const [mistakes, setMistakes] = useState<number>(0)
  const [shieldActive, setShieldActive] = useState<boolean>(false)
  const [shieldsCount, setShieldsCount] = useState<number>(1)
  const [scoreEarned, setScoreEarned] = useState<number>(0)
  const [coinsEarned, setCoinsEarned] = useState<number>(0)
  const [isGameWon, setIsGameWon] = useState<boolean>(false)
  const [isShaking, setIsShaking] = useState<boolean>(false)
  const [unlockedEnvironments, setUnlockedEnvironments] = useState<string[]>(["volcano", "submarine"])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  // DM mode
  const [dmWord, setDmWord] = useState<string>("")
  const [dmCategory, setDmCategory] = useState<string>("")
  const [dmHint, setDmHint] = useState<string>("")
  const [dmEnvironment, setDmEnvironment] = useState<EnvironmentType>("volcano")
  const [dmLogs, setDmLogs] = useState<string[]>([])
  const [activeEnv, setActiveEnv] = useState<EnvironmentType>("volcano")

  // Inject CSS once
  useEffect(() => {
    const id = "hangman-anim-css"
    if (!document.getElementById(id)) {
      const s = document.createElement("style")
      s.id = id
      s.textContent = ANIM_CSS
      document.head.appendChild(s)
    }
  }, [])

  // Load persisted data
  useEffect(() => {
    let resolvedUserId: string | null = null
    let unsubCoins: (() => void) | null = null

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        resolvedUserId = session.user.id
        setUserId(session.user.id)
      }

      // Load progress from Supabase + localStorage
      const progress = await loadProgress(resolvedUserId)
      setCoins(progress.coins)
      setHighScore(progress.high_scores?.reverse_hangman ?? 0)
      setUnlockedEnvironments(progress.rh_unlocked_envs ?? ["volcano", "submarine"])

      const lbRaw = localStorage.getItem("reverse_hangman_leaderboard")
      if (lbRaw) setLeaderboard(JSON.parse(lbRaw))

      // Subscribe to coin updates using the resolved user ID
      unsubCoins = onCoinsChange(resolvedUserId, (newBal) => setCoins(newBal))
    }
    init()

    return () => {
      if (unsubCoins) unsubCoins()
    }
  }, [])

  const updateCoins = useCallback((amount: number) => {
    const next = adjustCoins(userId, amount)
    setCoins(next)
  }, [userId])

  const triggerShake = () => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }

  const getDangerLevel = (m = mistakes) => {
    if (m >= 7) return 4
    if (m >= 5) return 3
    if (m >= 3) return 2
    if (m >= 1) return 1
    return 0
  }

  const particleCount = Math.min(mistakes * 2, 12)

  // ── game control ──────────────────────────────────────────────────────────────
  const startSoloGame = () => {
    const list = WORD_DB[difficulty]
    const item = list[Math.floor(Math.random() * list.length)]
    setSecretWord(item.word.toUpperCase())
    setCategory(item.category)
    setHint(item.hint)
    setGuessedLetters([])
    setMistakes(0)
    setShieldActive(false)
    setActiveEnv(selectedEnv)
    setGameState("SOLO_PLAY")
  }

  const startDmGame = () => {
    if (!dmWord.trim()) return
    setSecretWord(dmWord.toUpperCase().trim())
    setCategory(dmCategory || "Custom")
    setHint(dmHint || "Dungeon Master Challenge")
    setGuessedLetters([])
    setMistakes(0)
    setShieldActive(false)
    setActiveEnv(dmEnvironment)
    setDmLogs([`Simulation started in ${ENVIRONMENT_METADATA[dmEnvironment].name}. Decoding team assembled.`])
    setGameState("DM_PLAY")
  }

  const triggerGameOver = useCallback((won: boolean, currentMistakes: number, currentGuessed: string[]) => {
    setIsGameWon(won)
    let score = 0, earnedCoins = 0
    if (won) {
      const dm = difficulty === "Beginner" ? 100 : difficulty === "Normal" ? 250 : 500
      const envBonus = activeEnv === "volcano" ? 50 : activeEnv === "submarine" ? 100 : 200
      score = Math.max(50, dm + envBonus - currentMistakes * 20)
      earnedCoins = Math.round(score / 10)
      updateCoins(earnedCoins)
      if (score > highScore) {
        setHighScore(score)
        saveHighScore(userId, "reverse_hangman", score)
      }
      const newEntry: LeaderboardEntry = {
        name: "You",
        score,
        environment: ENVIRONMENT_METADATA[activeEnv].name,
        difficulty,
        date: new Date().toISOString().split("T")[0]
      }
      setLeaderboard(prev => {
        const updated = [newEntry, ...prev].sort((a, b) => b.score - a.score).slice(0, 5)
        localStorage.setItem("reverse_hangman_leaderboard", JSON.stringify(updated))
        return updated
      })
    }
    setScoreEarned(score)
    setCoinsEarned(earnedCoins)
    setGameState("RESULTS")
  }, [difficulty, activeEnv, highScore, userId, updateCoins])

  const makeSoloGuess = useCallback((letter: string) => {
    if (guessedLetters.includes(letter) || mistakes >= 7) return
    const isCorrect = secretWord.includes(letter)
    const newGuessed = [...guessedLetters, letter]
    setGuessedLetters(newGuessed)

    if (!isCorrect) {
      if (shieldActive) {
        setShieldActive(false)
      } else {
        const nextMistakes = mistakes + 1
        setMistakes(nextMistakes)
        triggerShake()
        if (nextMistakes >= 7) {
          setTimeout(() => triggerGameOver(false, nextMistakes, newGuessed), 600)
          return
        }
      }
    } else {
      const allGuessed = secretWord.split("").every(l => newGuessed.includes(l))
      if (allGuessed) {
        setTimeout(() => triggerGameOver(true, mistakes, newGuessed), 300)
      }
    }
  }, [guessedLetters, mistakes, secretWord, shieldActive, triggerGameOver])

  const useScan = () => {
    if (coins < 50) return
    const unrevealed = secretWord.split("").filter(l => !guessedLetters.includes(l))
    if (unrevealed.length === 0) return
    updateCoins(-50)
    const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)]
    makeSoloGuess(pick)
  }

  const activateShield = () => {
    if (shieldsCount > 0 && !shieldActive) {
      setShieldsCount(p => p - 1)
      setShieldActive(true)
    }
  }

  const buyShield = () => {
    if (coins >= 80) { updateCoins(-80); setShieldsCount(p => p + 1) }
  }

  const buySpace = () => {
    if (coins >= 200 && !unlockedEnvironments.includes("space")) {
      updateCoins(-200)
      const updated = [...unlockedEnvironments, "space"]
      setUnlockedEnvironments(updated)
      saveProgress(userId, { rh_unlocked_envs: updated }, true)
    }
  }

  const makeDmSimGuess = () => {
    if (mistakes >= 7) return
    const unrevealed = secretWord.split("").filter(l => !guessedLetters.includes(l))
    if (unrevealed.length === 0) return
    const correct = Math.random() < 0.6
    let pick = ""
    if (correct) {
      pick = unrevealed[Math.floor(Math.random() * unrevealed.length)]
      const newGuessed = [...guessedLetters, pick]
      setGuessedLetters(newGuessed)
      setDmLogs(prev => [`✅ AI guessed correct: "${pick}"`, ...prev])
      if (secretWord.split("").every(l => newGuessed.includes(l))) {
        setTimeout(() => triggerGameOver(true, mistakes, newGuessed), 300)
      }
    } else {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
      const wrong = alphabet.filter(l => !secretWord.includes(l) && !guessedLetters.includes(l))
      pick = wrong[Math.floor(Math.random() * wrong.length)] || ""
      if (pick) {
        const newGuessed = [...guessedLetters, pick]
        const nextM = mistakes + 1
        setGuessedLetters(newGuessed)
        setMistakes(nextM)
        triggerShake()
        setDmLogs(prev => [`💀 AI wrong: "${pick}"! Damage rising.`, ...prev])
        if (nextM >= 7) setTimeout(() => triggerGameOver(false, nextM, newGuessed), 600)
      }
    }
  }

  const envMeta = ENVIRONMENT_METADATA[activeEnv]
  const danger = getDangerLevel()

  // ── border color per env/danger ───────────────────────────────────────────────
  const borderGlow =
    danger >= 3
      ? activeEnv === "submarine" ? "shadow-blue-500/50 border-blue-400" : activeEnv === "space" ? "shadow-yellow-500/50 border-yellow-400" : "shadow-red-500/60 border-red-400"
      : danger >= 2
        ? activeEnv === "submarine" ? "shadow-blue-500/30 border-blue-500/60" : activeEnv === "space" ? "shadow-yellow-500/30 border-yellow-500/60" : "shadow-red-500/40 border-red-500/60"
        : activeEnv === "submarine" ? "border-blue-500/30" : activeEnv === "space" ? "border-yellow-500/30" : "border-red-500/30"

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/playlab" className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all">
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </Link>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-red-500">PlayLab Experience</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Reverse Hangman Survival</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-black text-white">{coins}</span>
            <span className="text-[10px] font-bold uppercase text-yellow-500">Coins</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-bold text-gray-300">PB: {highScore} pts</span>
          </div>
        </div>
      </div>

      {/* ── MENU ──────────────────────────────────────────────────────────────── */}
      {gameState === "MENU" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Arena Card */}
            <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-950/20 via-black to-zinc-950 p-8">
              <div className="relative z-10 space-y-5">
                <span className="px-2.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">
                  Primary Arena
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">Select Threat Environment & Play</h2>
                <p className="text-sm text-gray-300 max-w-lg">
                  Every wrong letter guess damages your station&apos;s structural integrity. Crack the code before total environmental breakdown.
                </p>

                {/* Difficulty */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-400 block">Difficulty Level</span>
                  <div className="grid grid-cols-3 gap-3">
                    {(["Beginner", "Normal", "Expert"] as Difficulty[]).map(d => (
                      <button key={d} onClick={() => setDifficulty(d)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${difficulty === d ? "bg-red-500/20 border-red-500 text-white shadow-md shadow-red-500/20" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Environment */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-400 block">Threat Environment</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(Object.keys(ENVIRONMENT_METADATA) as EnvironmentType[]).map(envKey => {
                      const env = ENVIRONMENT_METADATA[envKey]
                      const unlocked = unlockedEnvironments.includes(envKey)
                      return (
                        <div key={envKey} onClick={() => unlocked && setSelectedEnv(envKey)}
                          className={`relative border rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between h-32 ${!unlocked ? "opacity-40 cursor-not-allowed bg-black/40 border-white/5" : selectedEnv === envKey ? `bg-gradient-to-b ${env.colors} shadow-lg ${env.glowColor}` : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                          <div className="flex items-start justify-between">
                            <div className="p-2 bg-white/5 rounded-xl">{env.icon}</div>
                            {!unlocked && <Lock className="h-4 w-4 text-gray-500" />}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white mt-2">{env.name}</h4>
                            <p className="text-[9px] text-gray-400 line-clamp-2 mt-1 leading-relaxed">{env.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <Button onClick={startSoloGame}
                    className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-extrabold px-8 py-6 rounded-2xl text-base shadow-lg shadow-red-500/20 hover:scale-[1.02] transition-all gap-2">
                    <Play className="h-5 w-5 fill-white" /> Start Solo Survival
                  </Button>
                </div>
              </div>
            </div>

            {/* DM Setup Card */}
            <div className="rounded-3xl border border-white/5 bg-white/5 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-red-400" />
                <h3 className="text-lg font-bold text-white">Dungeon Master Mode</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">Design a secret word and watch AI partners race against the environment to decode it.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Secret Word</label>
                  <input type="password" placeholder="Enter word…" value={dmWord}
                    onChange={e => setDmWord(e.target.value.replace(/[^A-Za-z]/g, ""))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Category</label>
                  <input type="text" placeholder="e.g. Technology" value={dmCategory}
                    onChange={e => setDmCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Clue / Hint</label>
                <input type="text" placeholder="e.g. Essential web framework" value={dmHint}
                  onChange={e => setDmHint(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <Button onClick={startDmGame} disabled={!dmWord}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl px-4 py-2 border border-white/10 disabled:opacity-40">
                  Initialize Custom Disaster
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-5">
            {/* Armory */}
            <div className="rounded-3xl border border-white/5 bg-white/5 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-red-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Survival Armory</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Shield className="h-8 w-8 text-yellow-400 bg-yellow-500/10 p-1.5 rounded-lg" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Hazmat Shield</h4>
                      <p className="text-[9px] text-gray-400">Absorbs 1 wrong guess</p>
                    </div>
                  </div>
                  <Button onClick={buyShield} disabled={coins < 80}
                    className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 text-xs px-2.5 py-1 h-auto font-black rounded-lg">
                    80c
                  </Button>
                </div>
                <p className="text-[10px] text-right text-gray-500">Shields owned: <span className="text-yellow-400 font-bold">{shieldsCount}</span></p>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Sun className="h-8 w-8 text-yellow-500 bg-yellow-500/10 p-1.5 rounded-lg" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Solar Flare Station</h4>
                      <p className="text-[9px] text-gray-400">Unlock space environment</p>
                    </div>
                  </div>
                  {unlockedEnvironments.includes("space") ? (
                    <span className="text-[10px] uppercase font-bold text-gray-500">Owned</span>
                  ) : (
                    <Button onClick={buySpace} disabled={coins < 200}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs px-2.5 py-1 h-auto font-black rounded-lg">
                      200c
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Quests */}
            <div className="rounded-3xl border border-white/5 bg-white/5 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400/20" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Survival Quests</h3>
              </div>
              <div className="space-y-3 text-xs">
                {[
                  { done: true, title: "First Descent", desc: "Survive your first Volcano word" },
                  { done: false, title: "Deep Diver", desc: "Survive Normal/Expert in the Deep Sea" },
                  { done: false, title: "Deflect", desc: "Use a Hazmat Shield in any run" },
                  { done: false, title: "Solar Survivor", desc: "Win in Solar Flare Station" },
                ].map(q => (
                  <div key={q.title} className="flex items-start gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                    <Check className={`h-4 w-4 mt-0.5 ${q.done ? "text-green-400" : "text-gray-600"}`} />
                    <div>
                      <h5 className="font-bold text-white">{q.title}</h5>
                      <p className="text-[10px] text-gray-400">{q.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="rounded-3xl border border-white/5 bg-white/5 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Top Survival Runs</h3>
              </div>
              <div className="space-y-2">
                {leaderboard.length === 0 ? (
                  <p className="text-[10px] text-gray-500 italic text-center py-2">No runs yet — be the first!</p>
                ) : leaderboard.map((entry, i) => (
                  <div key={i} className="flex justify-between items-center text-xs bg-white/5 p-2 rounded-xl border border-white/5">
                    <div>
                      <span className="font-bold text-white">{i + 1}. {entry.name}</span>
                      <p className="text-[10px] text-gray-400">{entry.environment} • {entry.difficulty}</p>
                    </div>
                    <span className="font-bold text-yellow-400">{entry.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SOLO PLAY ──────────────────────────────────────────────────────────── */}
      {(gameState === "SOLO_PLAY" || gameState === "DM_PLAY") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game panel */}
          <div className="lg:col-span-2 space-y-4">
            <div
              className={`rounded-3xl border p-6 bg-gradient-to-br ${envMeta.colors} space-y-5 relative overflow-hidden transition-all duration-500 shadow-2xl ${borderGlow} ${isShaking ? "anim-shake" : ""}`}
              style={{ boxShadow: danger >= 3 ? "0 0 40px 10px rgba(239,68,68,0.25)" : undefined }}
            >
              {/* Crack overlay at danger >= 2 */}
              <CrackOverlay intensity={danger} />

              {/* Lava/Bubble/Solar particles */}
              {activeEnv === "volcano" && particleCount > 0 && <LavaParticles count={particleCount} />}
              {activeEnv === "submarine" && particleCount > 0 && <BubbleParticles count={particleCount} />}
              {activeEnv === "space" && particleCount > 0 && <SolarParticles count={particleCount} />}

              {/* Flickering power-cut at danger >= 3 */}
              {danger >= 3 && (
                <div className="absolute inset-0 pointer-events-none z-0" style={{ animation: "flicker 3s linear infinite", background: "rgba(0,0,0,0.25)" }} />
              )}

              {/* Top bar */}
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] uppercase font-bold tracking-wider rounded-md">
                    {gameState === "DM_PLAY" ? "DM Mode • " : ""}{category}
                  </span>
                  <h2 className="text-xl font-extrabold mt-1 text-white">{envMeta.name}</h2>
                </div>
                <div className="flex gap-2">
                  {gameState === "SOLO_PLAY" && (
                    <>
                      <button onClick={activateShield} disabled={shieldsCount === 0 || shieldActive}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${shieldActive ? "bg-yellow-500/30 border-yellow-400 text-yellow-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 disabled:opacity-30"}`}>
                        <Shield className="h-4 w-4" />
                        {shieldActive ? "Shield ON" : `Shield (${shieldsCount})`}
                      </button>
                      <button onClick={useScan} disabled={coins < 50}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-blue-500/10 border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-all disabled:opacity-30">
                        <Compass className="h-4 w-4" />
                        Scan (-50c)
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Hint */}
              <div className="relative z-10 bg-black/50 border border-white/5 p-3 rounded-2xl">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Clue / Hint</span>
                <p className="text-sm font-semibold text-white">{hint}</p>
              </div>

              {/* Word tiles */}
              <div className="relative z-10 flex justify-center flex-wrap gap-2 py-6">
                {secretWord.split("").map((letter, idx) => {
                  const revealed = guessedLetters.includes(letter)
                  return (
                    <div key={idx}
                      className={`w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-black rounded-xl border-2 transition-all duration-300 ${revealed ? "bg-white/15 border-white text-white shadow-lg shadow-white/10 scale-105" : "bg-black/60 border-white/10 text-transparent"}`}>
                      {revealed ? letter : "_"}
                    </div>
                  )
                })}
              </div>

              {/* Keyboard */}
              {gameState === "SOLO_PLAY" && (
                <div className="relative z-10 space-y-2">
                  <KeyRow letters="QWERTYUIOP" guessedLetters={guessedLetters} secretWord={secretWord} onGuess={makeSoloGuess} />
                  <KeyRow letters="ASDFGHJKL" guessedLetters={guessedLetters} secretWord={secretWord} onGuess={makeSoloGuess} />
                  <KeyRow letters="ZXCVBNM" guessedLetters={guessedLetters} secretWord={secretWord} onGuess={makeSoloGuess} />
                </div>
              )}

              {/* DM Action */}
              {gameState === "DM_PLAY" && (
                <div className="relative z-10 bg-black/60 border border-white/5 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bot className="h-4 w-4 text-red-400" /> Simulation Controls
                  </h4>
                  <div className="flex gap-3">
                    <Button onClick={makeDmSimGuess}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl py-3 text-xs">
                      Trigger AI Guess
                    </Button>
                    <Button onClick={() => setGameState("MENU")}
                      className="bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl px-4 text-xs border border-white/10">
                      Quit
                    </Button>
                  </div>
                </div>
              )}

              {/* Abandon */}
              {gameState === "SOLO_PLAY" && (
                <div className="relative z-10 flex justify-start">
                  <Button onClick={() => setGameState("MENU")}
                    className="bg-white/5 hover:bg-white/10 text-gray-400 text-xs px-3 py-1.5 rounded-lg border border-white/5">
                    Abandon Run
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Integrity panel */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-zinc-950 to-black p-5 space-y-5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Station Integrity</h3>
              </div>

              {/* Meter */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Core Pressure</span>
                  <span className={`font-bold ${danger >= 3 ? "text-red-500 animate-pulse" : danger >= 2 ? "text-orange-400" : "text-green-400"}`}>
                    {Math.round(((7 - mistakes) / 7) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5">
                  <div className={`h-full transition-all duration-700 rounded-full ${danger >= 3 ? "bg-gradient-to-r from-red-700 to-rose-500 animate-pulse" : danger >= 2 ? "bg-gradient-to-r from-orange-500 to-amber-400" : danger >= 1 ? "bg-gradient-to-r from-yellow-500 to-lime-400" : "bg-gradient-to-r from-green-500 to-emerald-400"}`}
                    style={{ width: `${((7 - mistakes) / 7) * 100}%` }} />
                </div>
              </div>

              {/* Alert banner */}
              <div className={`p-4 rounded-2xl border text-xs leading-relaxed transition-all ${danger >= 3 ? "bg-red-500/10 border-red-500 text-red-400" : danger >= 2 ? "bg-orange-500/10 border-orange-500/60 text-orange-400" : danger >= 1 ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" : "bg-white/5 border-white/5 text-gray-400"}`}>
                <div className="flex items-center gap-2 font-black mb-1">
                  <AlertTriangle className={`h-4 w-4 ${danger >= 3 ? "animate-pulse" : ""}`} />
                  <span>{danger >= 3 ? "⚠ CRITICAL ALERT" : danger >= 2 ? "SYSTEM ABNORMAL" : danger >= 1 ? "WARNING STAGE" : "ALL SYSTEMS NOMINAL"}</span>
                </div>
                <p>{envMeta.stages[Math.min(danger, 4)]}</p>
              </div>

              {/* Stats */}
              <div className="space-y-2 bg-white/5 border border-white/5 p-3 rounded-2xl text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mistakes</span>
                  <span className="font-bold text-white">{mistakes} / 7</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Difficulty</span>
                  <span className="font-bold text-red-400">{difficulty}</span>
                </div>
                {gameState === "SOLO_PLAY" && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Shield</span>
                    <span className={`font-bold ${shieldActive ? "text-yellow-400" : "text-gray-500"}`}>{shieldActive ? "ACTIVE" : `${shieldsCount} ready`}</span>
                  </div>
                )}
              </div>
            </div>

            {/* DM Logs panel */}
            {gameState === "DM_PLAY" && (
              <div className="rounded-3xl border border-white/5 bg-zinc-950 p-5 space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Disaster Logs</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 text-xs">
                  {dmLogs.map((log, i) => (
                    <div key={i} className="p-2 bg-white/5 border border-white/5 rounded-xl text-gray-300 flex items-start gap-2 leading-relaxed">
                      <Crosshair className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RESULTS ────────────────────────────────────────────────────────────── */}
      {gameState === "RESULTS" && (
        <div className={`max-w-md mx-auto border p-8 rounded-3xl text-center space-y-6 anim-death ${isGameWon ? "bg-gradient-to-br from-zinc-900 via-zinc-800 to-black border-yellow-500/30" : "bg-gradient-to-br from-red-950/60 via-zinc-900 to-black border-red-500/40"}`}
          style={!isGameWon ? { boxShadow: "0 0 60px 20px rgba(239,68,68,0.2)" } : undefined}>

          {!isGameWon && (
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              {/* Death lava / water fill */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-30"
                style={{ background: activeEnv === "submarine" ? "linear-gradient(to top,#0ea5e9,transparent)" : activeEnv === "space" ? "linear-gradient(to top,#fbbf24,transparent)" : "linear-gradient(to top,#ef4444,#b45309,transparent)", animation: "lava-rise 2s ease-in-out infinite" }} />
            </div>
          )}

          <div className={`relative inline-flex p-4 rounded-full ${isGameWon ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
            {isGameWon ? <Trophy className="h-10 w-10 text-yellow-400" /> : <AlertTriangle className="h-10 w-10 text-red-500 animate-pulse" />}
          </div>

          <div className="space-y-2">
            <h2 className={`text-2xl font-black ${isGameWon ? "text-white" : "text-red-400"}`}>
              {isGameWon ? "🎉 Survived!" : "💀 Station Destroyed!"}
            </h2>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              {isGameWon ? "You cracked the code before the environment gave out." : `The ${envMeta.name} was overwhelmed. The word was:`}
            </p>
          </div>

          <div className="bg-black/60 border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Secret Word</span>
            <p className="text-2xl font-black text-white tracking-[0.2em]">{secretWord}</p>
          </div>

          {isGameWon && (
            <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Score</span>
                <span className="text-xl font-black text-yellow-400">+{scoreEarned} pts</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Coins</span>
                <span className="text-xl font-black text-yellow-400 flex items-center justify-center gap-1">
                  <Zap className="h-4 w-4 fill-yellow-400 text-yellow-400" /> +{coinsEarned}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={startSoloGame} className={`flex-1 ${isGameWon ? "bg-yellow-500 hover:bg-yellow-400 text-black" : "bg-red-600 hover:bg-red-500 text-white"} font-extrabold py-3.5 rounded-2xl text-sm`}>
              Play Again
            </Button>
            <Button onClick={() => setGameState("MENU")} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl py-3.5 text-sm border border-white/10">
              Menu
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
