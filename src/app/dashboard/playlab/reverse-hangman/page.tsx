"use client"

import { useState, useEffect, useRef } from "react"
import { Timer, Trophy, Play, ArrowLeft, RefreshCw, Sparkles, AlertTriangle, User, Bot, Zap, Star, ShieldAlert, Check, HelpCircle, Eye, ShoppingBag, Lock, Flame, Shield, Compass, Waves, Sun, Crosshair } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

type GameState = "MENU" | "SOLO_PLAY" | "DM_SETUP" | "DM_PLAY" | "RESULTS"
type Difficulty = "Beginner" | "Normal" | "Expert"
type EnvironmentType = "volcano" | "submarine" | "space"

interface LeaderboardEntry {
  name: string
  score: number
  environment: string
  difficulty: string
  date: string
}

const ENVIRONMENT_METADATA = {
  volcano: {
    name: "Volcano Caldera",
    icon: <Flame className="h-5 w-5 text-red-500" />,
    description: "Guarding a geothermal research center inside an active volcano.",
    stages: [
      "Environment stable. Heat readings normal.",
      "Warning: Heat levels rising. Micro-tremors detected.",
      "Alert: Lava leak in Sector C. Minor chamber damage.",
      "Critical: Structural cracks formatting. Magma filling pipes.",
      "CATACLYSM: Caldera collapse! Total destruction."
    ],
    colors: "from-red-950/60 to-orange-950/40 border-red-500/30",
    glowColor: "shadow-red-500/20"
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
    colors: "from-blue-950/60 to-cyan-950/40 border-blue-500/30",
    glowColor: "shadow-blue-500/20"
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
    colors: "from-yellow-950/60 to-amber-950/40 border-yellow-500/30",
    glowColor: "shadow-yellow-500/20"
  }
}

// Word database divided by difficulty
const WORD_DB: Record<Difficulty, Array<{ word: string; category: string; hint: string }>> = {
  Beginner: [
    { word: "REACT", category: "Technology", hint: "A popular front-end UI framework." },
    { word: "APPLE", category: "Food", hint: "A red or green crunchy fruit." },
    { word: "COFFEE", category: "Drink", hint: "Morning energy beverage." },
    { word: "GUITAR", category: "Music", hint: "Six-string acoustic instrument." },
    { word: "DOCTOR", category: "Profession", hint: "Treats patients and writes prescriptions." }
  ],
  Normal: [
    { word: "DATABASE", category: "Technology", hint: "Stores structures of relationship tables." },
    { word: "VOLCANO", category: "Nature", hint: "Erupts with magma and volcanic ash." },
    { word: "ASTRONAUT", category: "Science", hint: "Travels beyond Earth's atmosphere." },
    { word: "CHIMPANZEE", category: "Animals", hint: "Intelligent primate sharing 98% human DNA." },
    { word: "SUBMARINE", category: "Vehicle", hint: "Operates deep under the ocean surface." }
  ],
  Expert: [
    { word: "ALGORITHM", category: "Mathematics", hint: "Set of rules to solve code problems." },
    { word: "VAPORIZATION", category: "Science", hint: "Phase transition from liquid to gas." },
    { word: "DECOMPRESSION", category: "Physics", hint: "Reduction in ambient pressure on container." },
    { word: "PHOTOSYNTHESIS", category: "Biology", hint: "How green plants make food from sunlight." },
    { word: "RELATIONSHIP", category: "HumanOS", hint: "Connection or association between people." }
  ]
}

export default function ReverseHangmanPage() {
  // Navigation & configuration states
  const [gameState, setGameState] = useState<GameState>("MENU")
  const [userId, setUserId] = useState<string>("local")
  const [coins, setCoins] = useState<number>(100)
  const [highScore, setHighScore] = useState<number>(0)
  
  // Game Loop states
  const [selectedEnv, setSelectedEnv] = useState<EnvironmentType>("volcano")
  const [difficulty, setDifficulty] = useState<Difficulty>("Normal")
  const [secretWord, setSecretWord] = useState<string>("")
  const [category, setCategory] = useState<string>("")
  const [hint, setHint] = useState<string>("")
  const [guessedLetters, setGuessedLetters] = useState<string[]>([])
  const [mistakes, setMistakes] = useState<number>(0)
  const [shieldActive, setShieldActive] = useState<boolean>(false)
  const [scoreEarned, setScoreEarned] = useState<number>(0)
  const [coinsEarned, setCoinsEarned] = useState<number>(0)
  const [isGameWon, setIsGameWon] = useState<boolean>(false)
  
  // Dungeon Master mode states
  const [dmWord, setDmWord] = useState<string>("")
  const [dmCategory, setDmCategory] = useState<string>("")
  const [dmHint, setDmHint] = useState<string>("")
  const [dmEnvironment, setDmEnvironment] = useState<EnvironmentType>("volcano")
  const [dmGuesses, setDmGuesses] = useState<string[]>([])
  const [dmMistakes, setDmMistakes] = useState<number>(0)
  const [dmLogs, setDmLogs] = useState<string[]>([])

  // Store purchases
  const [unlockedEnvironments, setUnlockedEnvironments] = useState<string[]>(["volcano", "submarine"])
  const [shieldsCount, setShieldsCount] = useState<number>(1)
  
  // Stats
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  // Load user data & coins
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      const uId = user ? user.id : "local"
      setUserId(uId)

      // Sync global coins
      const coinsKey = `playlab_coins_${uId}`
      const storedCoins = localStorage.getItem(coinsKey)
      if (storedCoins) {
        setCoins(parseInt(storedCoins))
      } else {
        localStorage.setItem(coinsKey, "250")
        setCoins(250)
      }

      // Sync high score
      const scoreKey = `reverse_hangman_score_${uId}`
      const storedScore = localStorage.getItem(scoreKey)
      if (storedScore) {
        setHighScore(parseInt(storedScore))
      }

      // Load unlocked environments
      const envKey = `reverse_hangman_envs_${uId}`
      const storedEnvs = localStorage.getItem(envKey)
      if (storedEnvs) {
        setUnlockedEnvironments(JSON.parse(storedEnvs))
      }

      // Load leaderboard
      const leaderboardKey = `reverse_hangman_leaderboard`
      const storedLeaderboard = localStorage.getItem(leaderboardKey)
      if (storedLeaderboard) {
        setLeaderboard(JSON.parse(storedLeaderboard))
      } else {
        const dummy: LeaderboardEntry[] = [
          { name: "Alberick", score: 850, environment: "Volcano Caldera", difficulty: "Expert", date: "2026-06-03" },
          { name: "Sasha", score: 620, environment: "Deep Sea Abyss", difficulty: "Normal", date: "2026-06-04" },
          { name: "Cortana", score: 400, environment: "Solar Flare Station", difficulty: "Beginner", date: "2026-06-02" }
        ]
        localStorage.setItem(leaderboardKey, JSON.stringify(dummy))
        setLeaderboard(dummy)
      }
    }
    loadUser()
  }, [])

  // Sync coins helper
  const updateCoins = (amount: number) => {
    const nextCoins = Math.max(0, coins + amount)
    setCoins(nextCoins)
    localStorage.setItem(`playlab_coins_${userId}`, nextCoins.toString())
  }

  // Buy powerup/environment
  const buyShield = () => {
    if (coins >= 80) {
      updateCoins(-80)
      setShieldsCount(prev => prev + 1)
    }
  }

  const buySpaceEnvironment = () => {
    if (coins >= 200 && !unlockedEnvironments.includes("space")) {
      updateCoins(-200)
      const updated = [...unlockedEnvironments, "space"]
      setUnlockedEnvironments(updated)
      localStorage.setItem(`reverse_hangman_envs_${userId}`, JSON.stringify(updated))
    }
  }

  // Setup Solo Game
  const startSoloGame = () => {
    const list = WORD_DB[difficulty]
    const item = list[Math.floor(Math.random() * list.length)]
    setSecretWord(item.word.toUpperCase())
    setCategory(item.category)
    setHint(item.hint)
    setGuessedLetters([])
    setMistakes(0)
    setShieldActive(false)
    setGameState("SOLO_PLAY")
  }

  // Setup DM Game
  const startDmGame = () => {
    if (!dmWord) return
    setSecretWord(dmWord.toUpperCase().trim())
    setCategory(dmCategory || "Custom")
    setHint(dmHint || "Dungeon Master Challenge")
    setGuessedLetters([])
    setMistakes(0)
    setShieldActive(false)
    setDmLogs([`Dungeon Master loaded word. Simulation initiated on environment ${ENVIRONMENT_METADATA[dmEnvironment].name}.`])
    setGameState("DM_PLAY")
  }

  // Make Solo Guess
  const makeSoloGuess = (letter: string) => {
    if (guessedLetters.includes(letter) || mistakes >= 7) return
    
    const isCorrect = secretWord.includes(letter)
    setGuessedLetters(prev => [...prev, letter])

    if (!isCorrect) {
      if (shieldActive) {
        setShieldActive(false) // consume shield
      } else {
        const nextMistakes = mistakes + 1
        setMistakes(nextMistakes)
        if (nextMistakes >= 7) {
          triggerGameOver(false)
        }
      }
    } else {
      // Check if all letters guessed
      const allGuessed = secretWord.split("").every(l => [...guessedLetters, letter].includes(l))
      if (allGuessed) {
        triggerGameOver(true)
      }
    }
  }

  // Use Shield during gameplay
  const activateGameplayShield = () => {
    if (shieldsCount > 0 && !shieldActive) {
      setShieldsCount(prev => prev - 1)
      setShieldActive(true)
    }
  }

  // Use Scan (reveal letter)
  const useScan = () => {
    if (coins >= 50) {
      // Find unrevealed letters
      const unrevealed = secretWord.split("").filter(l => !guessedLetters.includes(l))
      if (unrevealed.length > 0) {
        updateCoins(-50)
        const randomLetter = unrevealed[Math.floor(Math.random() * unrevealed.length)]
        makeSoloGuess(randomLetter)
      }
    }
  }

  // Game over handler
  const triggerGameOver = (won: boolean) => {
    setIsGameWon(won)
    let calculatedScore = 0
    let calculatedCoins = 0

    if (won) {
      const difficultyMultiplier = difficulty === "Beginner" ? 100 : difficulty === "Normal" ? 250 : 500
      const environmentBonus = selectedEnv === "volcano" ? 50 : selectedEnv === "submarine" ? 100 : 200
      const mistakesPenalty = mistakes * 20
      calculatedScore = Math.max(50, difficultyMultiplier + environmentBonus - mistakesPenalty)
      calculatedCoins = Math.round(calculatedScore / 10)
      
      updateCoins(calculatedCoins)

      // Check high score
      if (calculatedScore > highScore) {
        setHighScore(calculatedScore)
        localStorage.setItem(`reverse_hangman_score_${userId}`, calculatedScore.toString())
      }

      // Add to local leaderboard
      const newEntry: LeaderboardEntry = {
        name: userId === "local" ? "Player (Local)" : "Me",
        score: calculatedScore,
        environment: ENVIRONMENT_METADATA[selectedEnv].name,
        difficulty: difficulty,
        date: new Date().toISOString().split("T")[0]
      }
      const updatedLeaderboard = [newEntry, ...leaderboard].sort((a, b) => b.score - a.score).slice(0, 5)
      setLeaderboard(updatedLeaderboard)
      localStorage.setItem(`reverse_hangman_leaderboard`, JSON.stringify(updatedLeaderboard))
    } else {
      calculatedCoins = 0
      calculatedScore = 0
    }

    setScoreEarned(calculatedScore)
    setCoinsEarned(calculatedCoins)
    setGameState("RESULTS")
  }

  // Make simulated AI Dungeon Master / partner guess
  const makeDmSimGuess = () => {
    if (mistakes >= 7) return
    const unrevealed = secretWord.split("").filter(l => !guessedLetters.includes(l))
    if (unrevealed.length === 0) return

    // AI will guess either correctly or incorrectly based on a simulation factor
    const aiAccuracy = 0.6 // 60% chance to pick correct letter
    let guessLetter = ""

    if (Math.random() < aiAccuracy) {
      guessLetter = unrevealed[Math.floor(Math.random() * unrevealed.length)]
      setGuessedLetters(prev => [...prev, guessLetter])
      setDmLogs(prev => [`AI Partner guessed correct letter: "${guessLetter}"!`, ...prev])
    } else {
      // Pick random letter from alphabet that is NOT in the word and not guessed
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
      const unusedIncorrect = alphabet.filter(l => !secretWord.includes(l) && !guessedLetters.includes(l))
      guessLetter = unusedIncorrect.length > 0 ? unusedIncorrect[Math.floor(Math.random() * unusedIncorrect.length)] : ""
      if (guessLetter) {
        setGuessedLetters(prev => [...prev, guessLetter])
        const nextMistakes = mistakes + 1
        setMistakes(nextMistakes)
        setDmLogs(prev => [`AI Partner made a MISTAKE with letter: "${guessLetter}"!`, ...prev])
        if (nextMistakes >= 7) {
          triggerGameOver(false)
        }
      }
    }

    // Check if won
    const allGuessed = secretWord.split("").every(l => [...guessedLetters, guessLetter].includes(l))
    if (allGuessed && mistakes < 7) {
      triggerGameOver(true)
    }
  }

  // Visual threat helper
  const getDangerLevel = () => {
    if (mistakes >= 7) return 4
    if (mistakes >= 5) return 3
    if (mistakes >= 3) return 2
    if (mistakes >= 1) return 1
    return 0
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/playlab" className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all">
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </Link>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-red-500">PlayLab Experience</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Reverse Hangman Survival
            </h1>
          </div>
        </div>

        {/* Global coins display */}
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

      {/* --------------------------------MENU SCREEN-------------------------------- */}
      {gameState === "MENU" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT PANEL: Game Modes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-950/20 via-black to-zinc-950 p-8">
              <div className="absolute inset-0 bg-radial-gradient from-red-500/5 to-transparent pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <span className="px-2.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">
                  Primary Arena
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">Select Threat Environment & Play</h2>
                <p className="text-sm text-gray-300 max-w-lg">
                  Every incorrect letter guess damages the structural integrity of your station. Match the word before total environmental breakdown.
                </p>

                {/* Difficulty Selector */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-gray-400 block">Difficulty Level</span>
                  <div className="grid grid-cols-3 gap-3">
                    {(["Beginner", "Normal", "Expert"] as Difficulty[]).map(d => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${difficulty === d ? 'bg-red-500/20 border-red-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Environment Selector */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-gray-400 block">Threat Environment</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(Object.keys(ENVIRONMENT_METADATA) as EnvironmentType[]).map(envKey => {
                      const env = ENVIRONMENT_METADATA[envKey]
                      const isUnlocked = unlockedEnvironments.includes(envKey)
                      return (
                        <div
                          key={envKey}
                          onClick={() => isUnlocked && setSelectedEnv(envKey)}
                          className={`relative border rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between h-32 ${!isUnlocked ? 'opacity-40 cursor-not-allowed bg-black/40 border-white/5' : selectedEnv === envKey ? `bg-gradient-to-b ${env.colors} border-red-500/60 shadow-lg ${env.glowColor}` : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="p-2 bg-white/5 rounded-xl">
                              {env.icon}
                            </div>
                            {!isUnlocked && <Lock className="h-4 w-4 text-gray-500" />}
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

                {/* Play Button */}
                <div className="pt-4">
                  <Button onClick={startSoloGame} className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-extrabold px-8 py-6 rounded-2xl text-base shadow-lg shadow-red-500/20 hover:scale-[1.02] transition-all gap-2">
                    <Play className="h-5 w-5 fill-white" /> Start Solo Survival
                  </Button>
                </div>
              </div>
            </div>

            {/* Dungeon Master Setup Card */}
            <div className="rounded-3xl border border-white/5 bg-white/5 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-red-400" />
                <h3 className="text-lg font-bold text-white">Dungeon Master Mode</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Design custom words and initiate survival challenges. Challenge yourself with custom concepts, or play with AI partners who guess along with you.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Secret Word</label>
                  <input
                    type="password"
                    placeholder="Enter word..."
                    value={dmWord}
                    onChange={(e) => setDmWord(e.target.value.replace(/[^A-Za-z]/g, ""))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Technology"
                    value={dmCategory}
                    onChange={(e) => setDmCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Clue / Hint</label>
                <input
                  type="text"
                  placeholder="e.g. Essential web framework"
                  value={dmHint}
                  onChange={(e) => setDmHint(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button onClick={startDmGame} disabled={!dmWord} className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl px-4 py-2 border border-white/10 disabled:opacity-40">
                  Initialize Custom Disaster
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR PANEL */}
          <div className="space-y-6">
            {/* Disaster Packs Shop */}
            <div className="rounded-3xl border border-white/5 bg-white/5 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-red-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Survival Armory</h3>
              </div>
              <div className="space-y-3">
                {/* Buy Shield */}
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Shield className="h-8 w-8 text-yellow-400 bg-yellow-500/10 p-1.5 rounded-lg" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Hazmat Shield</h4>
                      <p className="text-[9px] text-gray-400">Absorbs 1 incorrect letter guess</p>
                    </div>
                  </div>
                  <Button onClick={buyShield} disabled={coins < 80} className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 text-xs px-2.5 py-1 h-auto font-black rounded-lg">
                    80 Coins
                  </Button>
                </div>
                <div className="text-[10px] text-right text-gray-400">Owned Shields: <span className="text-yellow-400 font-bold">{shieldsCount}</span></div>

                <div className="h-px bg-white/5" />

                {/* Unlock Space Arena */}
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Sun className="h-8 w-8 text-yellow-500 bg-yellow-500/10 p-1.5 rounded-lg" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Solar Flare Station</h4>
                      <p className="text-[9px] text-gray-400">Unlock space station environment</p>
                    </div>
                  </div>
                  {unlockedEnvironments.includes("space") ? (
                    <span className="text-[10px] uppercase font-bold text-gray-500">Unlocked</span>
                  ) : (
                    <Button onClick={buySpaceEnvironment} disabled={coins < 200} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs px-2.5 py-1 h-auto font-black rounded-lg">
                      200 Coins
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Quests Widget */}
            <div className="rounded-3xl border border-white/5 bg-white/5 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400/20" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Survival Quests</h3>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                  <Check className="h-4 w-4 text-green-400 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-white">First Descent</h5>
                    <p className="text-[10px] text-gray-400">Survive your first word inside the Volcano</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                  <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-white">Deep diver</h5>
                    <p className="text-[10px] text-gray-400">Survive a Normal or Expert word in the Deep Sea</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                  <Star className="h-4 w-4 text-yellow-500 mt-0.5 opacity-40" />
                  <div>
                    <h5 className="font-bold text-white">Deflect</h5>
                    <p className="text-[10px] text-gray-400">Use a Hazmat Shield inside any game mode</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Leaderboard Widget */}
            <div className="rounded-3xl border border-white/5 bg-white/5 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Top Survival Runs</h3>
              </div>
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center text-xs bg-white/5 p-2 rounded-xl border border-white/5">
                    <div>
                      <span className="font-bold text-white">{entry.name}</span>
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

      {/* --------------------------------SOLO PLAYING SCREEN-------------------------------- */}
      {gameState === "SOLO_PLAY" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Gameplay details & Word display */}
          <div className="lg:col-span-2 space-y-6">
            <div className={`rounded-3xl border p-6 bg-gradient-to-br ${ENVIRONMENT_METADATA[selectedEnv].colors} space-y-6 relative overflow-hidden transition-all duration-500 shadow-xl ${ENVIRONMENT_METADATA[selectedEnv].glowColor}`}>
              
              {/* Tremor / Hazard Overlay effect if danger increases */}
              {getDangerLevel() >= 2 && (
                <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
              )}

              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] uppercase font-bold tracking-wider rounded-md">
                    Category: {category}
                  </span>
                  <h2 className="text-xl font-extrabold mt-1 text-white">{ENVIRONMENT_METADATA[selectedEnv].name}</h2>
                </div>

                <div className="flex gap-2">
                  {/* Shield Status */}
                  <button
                    onClick={activateGameplayShield}
                    disabled={shieldActive || shieldsCount === 0}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${shieldActive ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 disabled:opacity-40'}`}
                  >
                    <Shield className="h-4 w-4" />
                    {shieldActive ? "Shield Active" : `Use Shield (${shieldsCount})`}
                  </button>

                  {/* Scan Powerup */}
                  <button
                    onClick={useScan}
                    disabled={coins < 50}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-blue-500/10 border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-all disabled:opacity-40"
                  >
                    <Compass className="h-4 w-4" />
                    Scan (-50c)
                  </button>
                </div>
              </div>

              {/* CLUE CARD */}
              <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Clue / Hint</span>
                <p className="text-sm font-semibold text-white">{hint}</p>
              </div>

              {/* WORD TILES */}
              <div className="flex justify-center flex-wrap gap-2 py-8">
                {secretWord.split("").map((letter, idx) => {
                  const revealed = guessedLetters.includes(letter)
                  return (
                    <div
                      key={idx}
                      className={`w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-black rounded-xl border-2 transition-all ${revealed ? 'bg-white/10 border-white text-white shadow-lg' : 'bg-black/60 border-white/10 text-transparent'}`}
                    >
                      {revealed ? letter : "?"}
                    </div>
                  )
                })}
              </div>

              {/* VIRTUAL KEYBOARD */}
              <div className="space-y-2">
                <div className="flex justify-center gap-1.5 flex-wrap">
                  {"QWERTYUIOP".split("").map(letter => {
                    const guessed = guessedLetters.includes(letter)
                    const correct = secretWord.includes(letter)
                    return (
                      <button
                        key={letter}
                        disabled={guessed}
                        onClick={() => makeSoloGuess(letter)}
                        className={`w-8 h-10 sm:w-10 sm:h-12 text-xs font-black rounded-lg transition-all ${guessed ? correct ? 'bg-green-500/20 border border-green-500/40 text-green-400' : 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:scale-105'}`}
                      >
                        {letter}
                      </button>
                    )
                  })}
                </div>
                <div className="flex justify-center gap-1.5 flex-wrap">
                  {"ASDFGHJKL".split("").map(letter => {
                    const guessed = guessedLetters.includes(letter)
                    const correct = secretWord.includes(letter)
                    return (
                      <button
                        key={letter}
                        disabled={guessed}
                        onClick={() => makeSoloGuess(letter)}
                        className={`w-8 h-10 sm:w-10 sm:h-12 text-xs font-black rounded-lg transition-all ${guessed ? correct ? 'bg-green-500/20 border border-green-500/40 text-green-400' : 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:scale-105'}`}
                      >
                        {letter}
                      </button>
                    )
                  })}
                </div>
                <div className="flex justify-center gap-1.5 flex-wrap">
                  {"ZXCVBNM".split("").map(letter => {
                    const guessed = guessedLetters.includes(letter)
                    const correct = secretWord.includes(letter)
                    return (
                      <button
                        key={letter}
                        disabled={guessed}
                        onClick={() => makeSoloGuess(letter)}
                        className={`w-8 h-10 sm:w-10 sm:h-12 text-xs font-black rounded-lg transition-all ${guessed ? correct ? 'bg-green-500/20 border border-green-500/40 text-green-400' : 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:scale-105'}`}
                      >
                        {letter}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Back out button */}
              <div className="flex justify-start pt-4">
                <Button onClick={() => setGameState("MENU")} className="bg-white/5 hover:bg-white/10 text-gray-400 text-xs px-3 py-1.5 rounded-lg border border-white/5">
                  Abandon Run
                </Button>
              </div>
            </div>
          </div>

          {/* Right panel: Environment Integrity Visualizer */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-zinc-950 to-black p-6 space-y-6">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Station Integrity</h3>
              </div>

              {/* Visual meter */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Core Pressure</span>
                  <span className={`font-bold ${mistakes >= 5 ? 'text-red-500 animate-pulse' : mistakes >= 3 ? 'text-orange-400' : 'text-green-400'}`}>
                    {Math.round(((7 - mistakes) / 7) * 100)}% Integrity
                  </span>
                </div>
                <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${mistakes >= 5 ? 'bg-gradient-to-r from-red-600 to-rose-600 animate-pulse' : mistakes >= 3 ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`}
                    style={{ width: `${((7 - mistakes) / 7) * 100}%` }}
                  />
                </div>
              </div>

              {/* Danger Warning Banner */}
              <div className={`p-4 rounded-2xl border text-xs leading-relaxed transition-all ${mistakes >= 5 ? 'bg-red-500/10 border-red-500 text-red-400' : mistakes >= 3 ? 'bg-orange-500/10 border-orange-500 text-orange-400' : mistakes >= 1 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-white/5 border-white/5 text-gray-400'}`}>
                <div className="flex items-center gap-2 font-black mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{mistakes >= 5 ? "CRITICAL ALERT" : mistakes >= 3 ? "SYSTEM ABNORMAL" : mistakes >= 1 ? "WARNING STAGE" : "ALL SYSTEMS NOMINAL"}</span>
                </div>
                <p>{ENVIRONMENT_METADATA[selectedEnv].stages[getDangerLevel()]}</p>
              </div>

              {/* Guess statistics */}
              <div className="space-y-3 bg-white/5 border border-white/5 p-4 rounded-2xl text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mistakes:</span>
                  <span className="font-bold text-white">{mistakes} / 7</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Difficulty:</span>
                  <span className="font-bold text-red-400">{difficulty}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------DUNGEON MASTER PLAYING SCREEN-------------------------------- */}
      {gameState === "DM_PLAY" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className={`rounded-3xl border p-6 bg-gradient-to-br ${ENVIRONMENT_METADATA[dmEnvironment].colors} space-y-6 shadow-xl`}>
              
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase font-bold tracking-wider rounded-md">
                    Custom Category: {category}
                  </span>
                  <h2 className="text-xl font-extrabold mt-1 text-white">DM Simulator: {ENVIRONMENT_METADATA[dmEnvironment].name}</h2>
                </div>
                
                <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-gray-400">Secret word: </span>
                  <span className="font-black text-red-400 tracking-widest">{secretWord}</span>
                </div>
              </div>

              {/* WORD TILES */}
              <div className="flex justify-center flex-wrap gap-2 py-8">
                {secretWord.split("").map((letter, idx) => {
                  const revealed = guessedLetters.includes(letter)
                  return (
                    <div
                      key={idx}
                      className={`w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-black rounded-xl border-2 transition-all ${revealed ? 'bg-white/10 border-white text-white shadow-lg' : 'bg-black/60 border-white/10 text-transparent'}`}
                    >
                      {revealed ? letter : "?"}
                    </div>
                  )
                })}
              </div>

              {/* DM ACTION / AI CHAT */}
              <div className="bg-black/60 border border-white/5 p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Bot className="h-4 w-4 text-red-400" />
                  Simulate Partner Guesses
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Trigger simulated guesses by your AI decoding team. If they fail 7 times, the station is compromised!
                </p>
                <div className="flex gap-3">
                  <Button onClick={makeDmSimGuess} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl py-3 text-xs">
                    Trigger Next Guess
                  </Button>
                  <Button onClick={() => setGameState("MENU")} className="bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl px-4 text-xs">
                    Quit DM Mode
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar: DM Logs & disaster status */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/5 bg-zinc-950 p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Disaster Logs</h3>
                <p className="text-[10px] text-gray-500 mt-1">Real-time cohort activity log</p>
              </div>

              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${((7 - mistakes) / 7) * 100}%` }}
                />
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
                {dmLogs.map((log, index) => (
                  <div key={index} className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-gray-300 flex items-start gap-2 leading-relaxed">
                    <Crosshair className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------RESULTS SCREEN-------------------------------- */}
      {gameState === "RESULTS" && (
        <div className="max-w-md mx-auto glass-panel border border-red-500/20 bg-gradient-to-br from-red-950/20 via-zinc-900 to-black p-8 rounded-3xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
          
          <div className="inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/20">
            {isGameWon ? (
              <Trophy className="h-10 w-10 text-yellow-400" />
            ) : (
              <AlertTriangle className="h-10 w-10 text-red-500" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">
              {isGameWon ? "Survival Successful!" : "Station Compromised!"}
            </h2>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              {isGameWon 
                ? "You decoded the command code before environmental failure." 
                : "The structural integrity collapsed, resulting in environment catastrophe."
              }
            </p>
          </div>

          {/* Core Word Reveal */}
          <div className="bg-black/60 border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Secret Word</span>
            <p className="text-lg font-black text-white tracking-widest">{secretWord}</p>
          </div>

          {/* Score & rewards info */}
          {isGameWon && (
            <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Score Earned</span>
                <span className="text-lg font-black text-yellow-400">+{scoreEarned} pts</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Coins Found</span>
                <span className="text-lg font-black text-yellow-400 flex items-center justify-center gap-1">
                  <Zap className="h-4 w-4 text-yellow-400 fill-yellow-400" /> +{coinsEarned}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4">
            <Button onClick={startSoloGame} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-extrabold py-3.5 rounded-2xl text-xs">
              Play Again
            </Button>
            <Button onClick={() => setGameState("MENU")} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl py-3.5 text-xs border border-white/10">
              Return to Menu
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
