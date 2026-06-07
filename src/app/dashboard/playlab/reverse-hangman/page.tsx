"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Trophy, Play, ArrowLeft, AlertTriangle, Bot, Zap, Star, ShieldAlert, Check, ShoppingBag, Lock, Flame, Shield, Compass, Waves, Sun, Crosshair } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { readCoins, adjustCoins, onCoinsChange, loadProgress, saveProgress, saveHighScore } from "@/lib/playlab-coins"
import { getRandomDictionaryWord } from "@/lib/playlab-words-dictionary"

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



interface LevelData {
  level: number
  word: string
  category: string
  hint: string
  difficulty: Difficulty
}

const CAMPAIGN_LEVELS: Record<EnvironmentType, LevelData[]> = {
  volcano: [
    { level: 1, word: "LAVA", category: "Nature", hint: "Molten rock expelled by a volcano during an eruption.", difficulty: "Beginner" },
    { level: 2, word: "MAGMA", category: "Nature", hint: "Extremely hot liquid and semi-liquid rock located under Earth's surface.", difficulty: "Beginner" },
    { level: 3, word: "CRATER", category: "Nature", hint: "A bowl-shaped cavity at the mouth of a volcano.", difficulty: "Beginner" },
    { level: 4, word: "TEPHRA", category: "Geology", hint: "Rock fragments and particles ejected by a volcanic eruption.", difficulty: "Normal" },
    { level: 5, word: "GEYSER", category: "Nature", hint: "A hot spring in which water intermittently boils, sending a tall column of water and steam into the air.", difficulty: "Normal" },
    { level: 6, word: "ERUPTION", category: "Nature", hint: "An explosion of steam and lava from a volcano.", difficulty: "Normal" },
    { level: 7, word: "OBSIDIAN", category: "Geology", hint: "A hard, dark, glasslike volcanic rock formed by the rapid solidification of lava.", difficulty: "Normal" },
    { level: 8, word: "CALDERA", category: "Geology", hint: "A large volcanic crater, especially one formed by the collapse of a volcano.", difficulty: "Expert" },
    { level: 9, word: "PYROCLASTIC", category: "Geology", hint: "Fast-moving current of hot gas and volcanic matter that flows away from a volcano.", difficulty: "Expert" },
    { level: 10, word: "SUPERVOLCANO", category: "Geology", hint: "An unusually large volcano having the potential to produce an eruption of massive magnitude.", difficulty: "Expert" }
  ],
  submarine: [
    { level: 1, word: "FISH", category: "Animals", hint: "A limbless cold-blooded vertebrate animal with gills and fins living wholly in water.", difficulty: "Beginner" },
    { level: 2, word: "SHARK", category: "Animals", hint: "A large voracious marine fish with a cartilaginous skeleton and multiple rows of teeth.", difficulty: "Beginner" },
    { level: 3, word: "ABYSS", category: "Oceanography", hint: "A deep or seemingly bottomless chasm in the ocean.", difficulty: "Normal" },
    { level: 4, word: "SUBMARINE", category: "Vehicle", hint: "A watercraft capable of independent operation underwater.", difficulty: "Normal" },
    { level: 5, word: "IMPLOSION", category: "Physics", hint: "A violent collapse inward due to intense external ocean pressure.", difficulty: "Expert" }
  ],
  space: [
    { level: 1, word: "STAR", category: "Science", hint: "A luminous globe of gas, mostly hydrogen and helium, held together by its own gravity.", difficulty: "Beginner" },
    { level: 2, word: "SOLAR", category: "Science", hint: "Relating to or determined by the sun.", difficulty: "Beginner" },
    { level: 3, word: "FLARE", category: "Science", hint: "A brief eruption of intense high-energy radiation from the sun's surface.", difficulty: "Normal" },
    { level: 4, word: "STATION", category: "Sci-Fi", hint: "A large artificial satellite used as a base for scientific research in outer space.", difficulty: "Normal" },
    { level: 5, word: "DECOMPRESSION", category: "Physics", hint: "The fatal reduction of air pressure inside a sealed spaceship vacuum environment.", difficulty: "Expert" }
  ]
}

const getLevelData = (env: EnvironmentType, lvl: number): LevelData => {
  const levelList = CAMPAIGN_LEVELS[env]
  if (levelList && levelList[lvl - 1]) {
    return levelList[lvl - 1]
  }
  
  let difficulty: Difficulty = "Normal"
  if (lvl <= 3) {
    difficulty = "Beginner"
  } else if (lvl <= 7) {
    difficulty = "Normal"
  } else if (lvl <= 12) {
    difficulty = "Expert"
  } else {
    const remainder = lvl % 3
    if (remainder === 1) difficulty = "Beginner"
    else if (remainder === 2) difficulty = "Normal"
    else difficulty = "Expert"
  }
  
  let category = "Science"
  if (env === "volcano") category = "Geology"
  else if (env === "submarine") category = "Oceanography"
  else if (env === "space") category = "Astronomy"
  
  return {
    level: lvl,
    word: "RANDOM",
    category,
    hint: `Sector Level ${lvl} simulation.`,
    difficulty
  }
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
  const [activeLevel, setActiveLevel] = useState<number>(1)
  const [levelProgress, setLevelProgress] = useState<Record<EnvironmentType, number>>({
    volcano: 1,
    submarine: 1,
    space: 1
  })
  const [secretWord, setSecretWord] = useState<string>("")
  const [category, setCategory] = useState<string>("")
  const [hint, setHint] = useState<string>("")
  const [guessedLetters, setGuessedLetters] = useState<string[]>([])
  const [mistakes, setMistakes] = useState<number>(0)
  const [shieldActive, setShieldActive] = useState<boolean>(false)
  const [shieldsCount, setShieldsCount] = useState<number>(1)
  const [scansCount, setScansCount] = useState<number>(3)
  const [scoreEarned, setScoreEarned] = useState<number>(0)
  const [coinsEarned, setCoinsEarned] = useState<number>(0)
  const [isGameWon, setIsGameWon] = useState<boolean>(false)
  const [isShaking, setIsShaking] = useState<boolean>(false)
  const [unlockedEnvironments, setUnlockedEnvironments] = useState<string[]>(["volcano", "submarine"])
  const [survivalStreak, setSurvivalStreak] = useState<number>(0)
  const [survivalScore, setSurvivalScore] = useState<number>(0)
  const [survivalSuccessMsg, setSurvivalSuccessMsg] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  // DM mode
  const [dmWord, setDmWord] = useState<string>("")
  const [dmCategory, setDmCategory] = useState<string>("")
  const [dmHint, setDmHint] = useState<string>("")
  const [dmEnvironment, setDmEnvironment] = useState<EnvironmentType>("volcano")
  const [dmLogs, setDmLogs] = useState<string[]>([])
  const [activeEnv, setActiveEnv] = useState<EnvironmentType>("volcano")

  // Campaign & Multiplayer States
  const [menuTab, setMenuTab] = useState<"campaign" | "survival" | "multiplayer">("campaign")
  const [isCampaign, setIsCampaign] = useState<boolean>(false)
  const [campaignUnlockedNextLevel, setCampaignUnlockedNextLevel] = useState<boolean>(false)

  // Multiplayer States
  const [roomCode, setRoomCode] = useState<string>("")
  const [roomCodeInput, setRoomCodeInput] = useState<string>("")
  const [roomRole, setRoomRole] = useState<"host" | "guest" | null>(null)
  const [roomPlayers, setRoomPlayers] = useState<Array<{ handle: string; isHost: boolean }>>([])
  const [multiplayerMode, setMultiplayerMode] = useState<"coop" | "dm">("coop")
  const [mpSecretWord, setMpSecretWord] = useState<string>("")
  const [mpCategory, setMpCategory] = useState<string>("")
  const [mpHint, setMpHint] = useState<string>("")
  const [mpWordSource, setMpWordSource] = useState<"catalog" | "custom">("catalog")
  const [userHandle, setUserHandle] = useState<string>("")
  const [joinedRoom, setJoinedRoom] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  // Lobby Add-Word State
  const [lobbyWord, setLobbyWord] = useState("")
  const [lobbyCategory, setLobbyCategory] = useState("")
  const [lobbyHint, setLobbyHint] = useState("")
  const [lobbyDifficulty, setLobbyDifficulty] = useState<Difficulty>("Normal")
  const [lobbySubmitSuccess, setLobbySubmitSuccess] = useState(false)
  const [lobbySubmitError, setLobbySubmitError] = useState("")

  // Refs for multiplayer sync (no reconnection on state change)
  const secretWordRef = useRef(secretWord)
  const mistakesRef = useRef(mistakes)
  const guessedLettersRef = useRef(guessedLetters)
  const roomRoleRef = useRef(roomRole)
  const multiplayerModeRef = useRef(multiplayerMode)
  const mpWordSourceRef = useRef(mpWordSource)
  const selectedEnvRef = useRef(selectedEnv)
  const difficultyRef = useRef(difficulty)
  const recentWordsRef = useRef<string[]>([])

  useEffect(() => { secretWordRef.current = secretWord }, [secretWord])
  useEffect(() => { mistakesRef.current = mistakes }, [mistakes])
  useEffect(() => { guessedLettersRef.current = guessedLetters }, [guessedLetters])
  useEffect(() => { roomRoleRef.current = roomRole }, [roomRole])
  useEffect(() => { multiplayerModeRef.current = multiplayerMode }, [multiplayerMode])
  useEffect(() => { mpWordSourceRef.current = mpWordSource }, [mpWordSource])
  useEffect(() => { selectedEnvRef.current = selectedEnv }, [selectedEnv])
  useEffect(() => { difficultyRef.current = difficulty }, [difficulty])

  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!userHandle) {
      const randId = Math.floor(1000 + Math.random() * 9000)
      setUserHandle(`Player_${randId}`)
    }
  }, [userHandle])

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

  const loadGlobalLeaderboard = useCallback(async () => {
    try {
      const { data: progressData, error: progressErr } = await supabase
        .from("playlab_progress")
        .select("user_id, high_scores")
      
      if (progressErr || !progressData) {
        console.warn("Could not load global leaderboard progress:", progressErr)
        return
      }
      
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("id, handle")
        
      const profilesMap = new Map<string, string>()
      if (!profileErr && profileData) {
        profileData.forEach(p => {
          if (p.handle) profilesMap.set(p.id, p.handle)
        })
      }
      
      const entries: LeaderboardEntry[] = []
      progressData.forEach(row => {
        const hs = row.high_scores as any
        if (hs && hs.reverse_hangman !== undefined) {
          const handle = profilesMap.get(row.user_id) || `Player_${row.user_id.substring(0, 4)}`
          entries.push({
            name: handle,
            score: hs.reverse_hangman,
            environment: hs.reverse_hangman_env || "Abyss",
            difficulty: hs.reverse_hangman_diff || "Normal",
            date: hs.reverse_hangman_date || new Date().toISOString().split("T")[0]
          })
        }
      })
      
      const sorted = entries.sort((a, b) => b.score - a.score).slice(0, 10)
      setLeaderboard(sorted)
    } catch (err) {
      console.error("Failed to load global leaderboard", err)
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
        // Fetch profile handle
        const { data: profile } = await supabase
          .from("profiles")
          .select("handle")
          .eq("id", session.user.id)
          .single()
        if (profile?.handle) {
          setUserHandle(profile.handle)
        }
      }

      // Load progress from Supabase + localStorage
      const progress = await loadProgress(resolvedUserId)
      setCoins(progress.coins)
      setHighScore(progress.high_scores?.reverse_hangman ?? 0)
      setUnlockedEnvironments(progress.rh_unlocked_envs ?? ["volcano", "submarine"])

      const todayStr = new Date().toISOString().split("T")[0]
      const lastRefill = progress.high_scores?.rh_last_refill_date
      let currentScans = progress.high_scores?.rh_scans_count
      if (currentScans === undefined) {
        currentScans = 3
      }
      if (lastRefill !== todayStr) {
        if (currentScans < 3) {
          currentScans = 3
        }
        const updatedScores = {
          ...(progress.high_scores || {}),
          rh_scans_count: currentScans,
          rh_last_refill_date: todayStr
        }
        saveProgress(resolvedUserId, { high_scores: updatedScores }, true)
      }
      setScansCount(currentScans)

      const volcanoLevel = progress.high_scores?.rh_level_volcano ?? 1
      const submarineLevel = progress.high_scores?.rh_level_submarine ?? 1
      const spaceLevel = progress.high_scores?.rh_level_space ?? 1
      setLevelProgress({
        volcano: volcanoLevel,
        submarine: submarineLevel,
        space: spaceLevel
      })

      const lbRaw = localStorage.getItem("reverse_hangman_leaderboard")
      if (lbRaw) setLeaderboard(JSON.parse(lbRaw))
      loadGlobalLeaderboard()

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
  const replenishWordsBackground = async (diff: Difficulty) => {
    try {
      const res = await fetch("/api/playlab/generate-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: "reverse_hangman",
          difficulty: diff,
          count: 10
        })
      })
      const resData = await res.json()
      if (resData.success && Array.isArray(resData.words)) {
        const rows = resData.words.map((w: any) => ({
          game_id: "reverse_hangman",
          word: w.word.toUpperCase().replace(/[^A-Z]/g, ""),
          category: w.category || "General",
          hint: w.hint || "",
          difficulty: diff,
          status: "approved"
        }))
        const { error: insertErr } = await supabase
          .from("playlab_words")
          .insert(rows)
        if (insertErr) {
          const local = localStorage.getItem("local_playlab_words")
          const parsed = local ? JSON.parse(local) : []
          const newRows = rows.map((r: any) => ({
            ...r,
            id: Math.random().toString(36).substring(2, 9),
            created_at: new Date().toISOString()
          }))
          localStorage.setItem("local_playlab_words", JSON.stringify([...parsed, ...newRows]))
        }
      }
    } catch (err) {
      console.error("Silent replenish failed", err)
    }
  }

  const startSoloGame = async (isNextWord = false) => {
    setLoading(true)
    if (!isNextWord) {
      setSurvivalStreak(0)
      setSurvivalScore(0)
      setSurvivalSuccessMsg(null)
    }
    let item = null
    try {
      const { data, error } = await supabase
        .from("playlab_words")
        .select("word, category, hint")
        .eq("game_id", "reverse_hangman")
        .eq("difficulty", difficulty)
        .eq("status", "approved")
      
      let wordList = data || []
      
      // Merge with local storage generated words
      const local = localStorage.getItem("local_playlab_words")
      if (local) {
        const parsed = JSON.parse(local).filter((w: any) => 
          w.game_id === "reverse_hangman" && 
          w.difficulty === difficulty && 
          w.status === "approved"
        )
        wordList = [...wordList, ...parsed]
      }

      if (wordList.length < 5) {
        // Silent replenish in the background
        replenishWordsBackground(difficulty)
      }

      if (wordList.length > 0) {
        let attempts = 0
        let candidate = null
        do {
          candidate = wordList[Math.floor(Math.random() * wordList.length)]
          attempts++
        } while (recentWordsRef.current.includes(candidate.word.toUpperCase()) && attempts < 15)
        item = candidate
      }
    } catch (err) {
      console.error("Failed to fetch words from DB", err)
    }

    if (!item) {
      // Fallback to static dictionary
      let attempts = 0
      let candidate = null
      do {
        candidate = getRandomDictionaryWord("survival", difficulty)
        attempts++
      } while (recentWordsRef.current.includes(candidate.word.toUpperCase()) && attempts < 15)
      item = candidate
    }

    const chosenWord = item.word.toUpperCase()
    recentWordsRef.current = [...recentWordsRef.current.slice(-15), chosenWord]

    setSecretWord(chosenWord)
    setCategory(item.category)
    setHint(item.hint || "")
    setGuessedLetters([])
    setMistakes(0)
    setShieldActive(false)
    setActiveEnv(selectedEnv)
    setIsCampaign(false)
    setGameState("SOLO_PLAY")
    setLoading(false)
  }

  const startCampaignGame = (env: EnvironmentType, lvl: number) => {
    const lvlData = getLevelData(env, lvl)

    // Draw a random word from the 1000+ words campaign dictionary for this level
    let attempts = 0
    let dictWord = null
    do {
      dictWord = getRandomDictionaryWord("campaign", env, lvl)
      attempts++
    } while (recentWordsRef.current.includes(dictWord.word.toUpperCase()) && attempts < 15)

    const chosenWord = dictWord.word.toUpperCase()
    recentWordsRef.current = [...recentWordsRef.current.slice(-15), chosenWord]

    setSecretWord(chosenWord)
    setCategory(dictWord.category)
    setHint(dictWord.hint)
    setDifficulty(lvlData.difficulty)
    setGuessedLetters([])
    setMistakes(0)
    setShieldActive(false)
    setActiveEnv(env)
    setIsCampaign(true)
    setGameState("SOLO_PLAY")
  }

  const saveCampaignProgress = (env: EnvironmentType, newProgressLevel: number) => {
    setLevelProgress(prev => {
      const updated = { ...prev, [env]: newProgressLevel }
      
      const raw = localStorage.getItem(`playlab_progress_${userId ?? "local"}`)
      let parsedHighScores = {}
      if (raw) {
        try {
          parsedHighScores = JSON.parse(raw).high_scores || {}
        } catch(e) {}
      }
      
      const updatedScores = {
        ...parsedHighScores,
        [`rh_level_${env}`]: newProgressLevel
      }
      
      saveProgress(userId, { high_scores: updatedScores }, true)
      return updated
    })
  }

  const flagClue = async () => {
    if (!secretWord) return
    try {
      const { data, error } = await supabase
        .from("playlab_words")
        .select("*")
        .eq("game_id", "reverse_hangman")
        .eq("word", secretWord)
        .limit(1)

      if (!error && data && data.length > 0) {
        const wordItem = data[0]
        const reasons = [...(wordItem.flagged_reason || []), "Incorrect or confusing clue/hint flagged by player"]
        await supabase
          .from("playlab_words")
          .update({
            flagged_count: (wordItem.flagged_count || 0) + 1,
            flagged_reason: reasons
          })
          .eq("id", wordItem.id)
      } else {
        const newFlagged = {
          game_id: "reverse_hangman",
          word: secretWord,
          category: category,
          hint: hint,
          difficulty: difficulty,
          flagged_count: 1,
          flagged_reason: ["Static word flagged by player: incorrect/confusing clue"],
          status: "approved"
        }

        const { error: insErr } = await supabase
          .from("playlab_words")
          .insert([newFlagged])

        if (insErr) {
          const local = localStorage.getItem("local_playlab_words")
          const parsed = local ? JSON.parse(local) : []
          const existingIdx = parsed.findIndex((w: any) => w.word === secretWord)
          if (existingIdx >= 0) {
            parsed[existingIdx].flagged_count = (parsed[existingIdx].flagged_count || 0) + 1
            parsed[existingIdx].flagged_reason = [...(parsed[existingIdx].flagged_reason || []), "Flagged by player"]
          } else {
            parsed.push({
              id: Math.random().toString(36).substring(2, 9),
              ...newFlagged,
              created_at: new Date().toISOString()
            })
          }
          localStorage.setItem("local_playlab_words", JSON.stringify(parsed))
        }
      }
      alert("Clue reported! The developer will review this clue shortly.")
    } catch (err) {
      console.error(err)
    }
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

  // Multiplayer Actions
  const hostRoom = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomCode(code)
    setRoomRole("host")
    setJoinedRoom(true)
    setMultiplayerMode("coop")
    setMpWordSource("catalog")
    setGameState("MENU")
  }

  const joinRoom = async (codeToJoin: string) => {
    if (!codeToJoin.trim()) return
    const code = codeToJoin.trim().toUpperCase()
    setRoomCode(code)
    setRoomRole("guest")
    setJoinedRoom(true)
  }

  const leaveRoom = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    setJoinedRoom(false)
    setRoomRole(null)
    setRoomCode("")
    setRoomPlayers([])
    if (gameState === "SOLO_PLAY" || gameState === "DM_PLAY") {
      setGameState("MENU")
    }
  }

  const selectMpMode = (mode: "coop" | "dm") => {
    setMultiplayerMode(mode)
    if (channelRef.current && roomRole === "host") {
      channelRef.current.send({
        type: "broadcast",
        event: "config-sync",
        payload: { multiplayerMode: mode }
      })
    }
  }

  const selectMpWordSource = (src: "catalog" | "custom") => {
    setMpWordSource(src)
    if (channelRef.current && roomRole === "host") {
      channelRef.current.send({
        type: "broadcast",
        event: "config-sync",
        payload: { mpWordSource: src }
      })
    }
  }

  const selectMpEnv = (env: EnvironmentType) => {
    setSelectedEnv(env)
    if (channelRef.current && roomRole === "host") {
      channelRef.current.send({
        type: "broadcast",
        event: "config-sync",
        payload: { selectedEnv: env }
      })
    }
  }

  const selectMpDiff = (diff: Difficulty) => {
    setDifficulty(diff)
    if (channelRef.current && roomRole === "host") {
      channelRef.current.send({
        type: "broadcast",
        event: "config-sync",
        payload: { difficulty: diff }
      })
    }
  }

  const submitLobbyWord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lobbyWord.trim() || !lobbyCategory.trim()) return
    setLobbySubmitError("")
    setLobbySubmitSuccess(false)
    const cleanWord = lobbyWord.toUpperCase().trim().replace(/[^A-Z]/g, "")
    const newWord = {
      game_id: "reverse_hangman",
      word: cleanWord,
      category: lobbyCategory.trim(),
      hint: lobbyHint.trim(),
      difficulty: lobbyDifficulty,
      status: "approved"
    }
    try {
      const { error } = await supabase.from("playlab_words").insert([newWord])
      if (error) {
        const local = localStorage.getItem("local_playlab_words")
        const parsed = local ? JSON.parse(local) : []
        parsed.push({
          id: Math.random().toString(36).substring(2, 9),
          ...newWord,
          created_at: new Date().toISOString()
        })
        localStorage.setItem("local_playlab_words", JSON.stringify(parsed))
      }
      setLobbyWord("")
      setLobbyCategory("")
      setLobbyHint("")
      setLobbySubmitSuccess(true)
      setTimeout(() => setLobbySubmitSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      setLobbySubmitError("Failed to submit word. Saved locally instead.")
    }
  }

  const startMultiplayerMatch = async () => {
    if (roomRole !== "host") return
    let wordToPlay = ""
    let categoryToPlay = ""
    let hintToPlay = ""
    if (mpWordSource === "catalog") {
      setLoading(true)
      let item = null
      try {
        const { data } = await supabase
          .from("playlab_words")
          .select("word, category, hint")
          .eq("game_id", "reverse_hangman")
          .eq("difficulty", difficulty)
          .eq("status", "approved")
        
        let wordList = data || []
        const local = localStorage.getItem("local_playlab_words")
        if (local) {
          const parsed = JSON.parse(local).filter((w: any) => 
            w.game_id === "reverse_hangman" && 
            w.difficulty === difficulty && 
            w.status === "approved"
          )
          wordList = [...wordList, ...parsed]
        }
        if (wordList.length > 0) {
          let attempts = 0
          let candidate = null
          do {
            candidate = wordList[Math.floor(Math.random() * wordList.length)]
            attempts++
          } while (recentWordsRef.current.includes(candidate.word.toUpperCase()) && attempts < 15)
          item = candidate
        }
      } catch (err) {
        console.error(err)
      }
      if (!item) {
        let attempts = 0
        let candidate = null
        do {
          candidate = getRandomDictionaryWord("survival", difficulty)
          attempts++
        } while (recentWordsRef.current.includes(candidate.word.toUpperCase()) && attempts < 15)
        item = candidate
      }
      wordToPlay = item.word.toUpperCase()
      categoryToPlay = item.category
      hintToPlay = item.hint || ""
      setLoading(false)
    } else {
      if (!mpSecretWord.trim()) return
      wordToPlay = mpSecretWord.toUpperCase().trim()
      categoryToPlay = mpCategory.trim() || "Custom"
      hintToPlay = mpHint.trim() || "Dungeon Master Challenge"
    }
    
    recentWordsRef.current = [...recentWordsRef.current.slice(-15), wordToPlay]
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "game-start",
        payload: {
          secretWord: wordToPlay,
          category: categoryToPlay,
          hint: hintToPlay,
          environment: selectedEnv,
          mode: multiplayerMode
        }
      })
    }

    // Immediately transition host screen locally to avoid relying on echo-back broadcast
    setSecretWord(wordToPlay)
    setCategory(categoryToPlay)
    setHint(hintToPlay)
    setGuessedLetters([])
    setMistakes(0)
    setShieldActive(false)
    setActiveEnv(selectedEnv)
    setIsCampaign(false)
    if (multiplayerMode === "dm") {
      setDmLogs([`Custom Disaster simulation started. Players are decoding...`])
    }
    setGameState("SOLO_PLAY")
  }

  const returnToLobby = () => {
    setGameState("MENU")
    if (channelRef.current && roomRole === "host") {
      channelRef.current.send({
        type: "broadcast",
        event: "return-to-lobby",
        payload: {}
      })
    }
  }

  const triggerGameOver = useCallback((won: boolean, currentMistakes: number, currentGuessed: string[]) => {
    setIsGameWon(won)
    let score = 0, earnedCoins = 0
    let nextLevelUnlocked = false

    if (won) {
      if (joinedRoom) {
        score = 100 - currentMistakes * 10
        earnedCoins = mpWordSource === "custom" ? 10 : 30
        updateCoins(earnedCoins)
      } else if (isCampaign) {
        score = 150 - currentMistakes * 10
        earnedCoins = 30
        updateCoins(earnedCoins)
        if (activeLevel === levelProgress[activeEnv]) {
          const nextLvl = activeLevel + 1
          nextLevelUnlocked = true
          saveCampaignProgress(activeEnv, nextLvl)
        }
      } else {
        const dm = difficulty === "Beginner" ? 100 : difficulty === "Normal" ? 250 : 500
        const envBonus = activeEnv === "volcano" ? 50 : activeEnv === "submarine" ? 100 : 200
        score = Math.max(50, dm + envBonus - currentMistakes * 20)
        earnedCoins = Math.round(score / 10)
        updateCoins(earnedCoins)
      }
    } else {
      if (!isCampaign && !joinedRoom) {
        score = survivalScore
        if (score > highScore) {
          setHighScore(score)
          const raw = localStorage.getItem(`playlab_progress_${userId ?? "local"}`)
          let parsedHighScores = {}
          if (raw) {
            try {
              parsedHighScores = JSON.parse(raw).high_scores || {}
            } catch(e) {}
          }
          const updatedScores = {
            ...parsedHighScores,
            reverse_hangman: score,
            reverse_hangman_env: ENVIRONMENT_METADATA[activeEnv].name,
            reverse_hangman_diff: difficulty,
            reverse_hangman_date: new Date().toISOString().split("T")[0]
          }
          saveProgress(userId, { high_scores: updatedScores }, true)
          setTimeout(() => {
            loadGlobalLeaderboard()
          }, 500)
        }
      }
    }
    setScoreEarned(score)
    setCoinsEarned(earnedCoins)
    setCampaignUnlockedNextLevel(nextLevelUnlocked)
    setGameState("RESULTS")
  }, [difficulty, activeEnv, highScore, userId, updateCoins, isCampaign, activeLevel, levelProgress, joinedRoom, mpWordSource, survivalScore, loadGlobalLeaderboard])

  const applyRemoteGuess = useCallback((letter: string) => {
    const letterUpper = letter.toUpperCase()
    const currentWord = secretWordRef.current
    
    setGuessedLetters(prev => {
      if (prev.includes(letterUpper)) return prev
      const newGuessed = [...prev, letterUpper]
      
      const isCorrect = currentWord.includes(letterUpper)
      if (!isCorrect) {
        setMistakes(prevM => {
          const nextM = prevM + 1
          triggerShake()
          if (nextM >= 7) {
            setTimeout(() => triggerGameOver(false, nextM, newGuessed), 600)
          }
          return nextM
        })
      } else {
        const allGuessed = currentWord.split("").every(l => newGuessed.includes(l))
        if (allGuessed) {
          setTimeout(() => triggerGameOver(true, mistakesRef.current, newGuessed), 300)
        }
      }
      return newGuessed
    })
  }, [triggerGameOver])

  const applyRemoteGuessRef = useRef(applyRemoteGuess)
  useEffect(() => {
    applyRemoteGuessRef.current = applyRemoteGuess
  }, [applyRemoteGuess])

  useEffect(() => {
    if (!joinedRoom || !roomCode) return

    const channel = supabase.channel(`playlab_rh_room_${roomCode}`, {
      config: {
        presence: {
          key: userHandle,
        },
        broadcast: {
          self: true
        }
      },
    })

    channelRef.current = channel

    channel
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState()
        const playersList: Array<{ handle: string; isHost: boolean }> = []
        Object.keys(presenceState).forEach(key => {
          const presences = presenceState[key] as any
          const isHostPlayer = presences.some((p: any) => p.isHost)
          playersList.push({
            handle: key,
            isHost: isHostPlayer
          })
        })
        playersList.sort((a, b) => (a.isHost ? -1 : 1))
        setRoomPlayers(playersList)
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        if (roomRoleRef.current === "host") {
          channel.send({
            type: "broadcast",
            event: "config-sync",
            payload: {
              multiplayerMode: multiplayerModeRef.current,
              mpWordSource: mpWordSourceRef.current,
              selectedEnv: selectedEnvRef.current,
              difficulty: difficultyRef.current
            }
          })
        }
      })
      .on("broadcast", { event: "config-sync" }, ({ payload }) => {
        if (roomRoleRef.current === "guest") {
          if (payload.multiplayerMode !== undefined) setMultiplayerMode(payload.multiplayerMode)
          if (payload.mpWordSource !== undefined) setMpWordSource(payload.mpWordSource)
          if (payload.selectedEnv !== undefined) setSelectedEnv(payload.selectedEnv)
          if (payload.difficulty !== undefined) setDifficulty(payload.difficulty)
        }
      })
      .on("broadcast", { event: "game-start" }, ({ payload }) => {
        if (roomRoleRef.current === "guest") {
          setSecretWord(payload.secretWord.toUpperCase())
          setCategory(payload.category)
          setHint(payload.hint)
          setGuessedLetters([])
          setMistakes(0)
          setShieldActive(false)
          setActiveEnv(payload.environment)
          setIsCampaign(false)
          setGameState("SOLO_PLAY")
        }
      })
      .on("broadcast", { event: "guess-letter" }, ({ payload }) => {
        applyRemoteGuessRef.current(payload.letter)
      })
      .on("broadcast", { event: "return-to-lobby" }, () => {
        setGameState("MENU")
      })

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          isHost: roomRoleRef.current === "host",
          onlineAt: new Date().toISOString(),
        })
      }
    })

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [joinedRoom, roomCode, userHandle])

  const makeSoloGuess = useCallback((letter: string) => {
    if (guessedLetters.includes(letter) || mistakes >= 7 || survivalSuccessMsg) return
    
    if (joinedRoom) {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "guess-letter",
          payload: { letter }
        })
      }
    }

    const isCorrect = secretWord.includes(letter)
    const newGuessed = [...guessedLetters, letter]
    setGuessedLetters(newGuessed)

    if (!isCorrect) {
      if (shieldActive && !joinedRoom) {
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
        if (!isCampaign && !joinedRoom) {
          const baseScore = difficulty === "Beginner" ? 100 : difficulty === "Normal" ? 250 : 500
          const points = Math.max(50, baseScore - mistakes * 20)
          const coinsAwarded = Math.round(points / 10)
          
          setSurvivalStreak(prev => prev + 1)
          setSurvivalScore(prev => prev + points)
          updateCoins(coinsAwarded)
          setSurvivalSuccessMsg(`🎉 Correct! +${points} pts, +${coinsAwarded}c! Next threat incoming...`)
          
          setTimeout(() => {
            setSurvivalSuccessMsg(null)
            startSoloGame(true)
          }, 1800)
        } else {
          setTimeout(() => triggerGameOver(true, mistakes, newGuessed), 300)
        }
      }
    }
  }, [guessedLetters, mistakes, secretWord, shieldActive, triggerGameOver, joinedRoom, isCampaign, difficulty, survivalSuccessMsg, updateCoins])

  // ── Physical keyboard input ─────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== "SOLO_PLAY" && gameState !== "DM_PLAY") return
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in an input / textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      const key = e.key.toUpperCase()
      if (/^[A-Z]$/.test(key)) {
        e.preventDefault()
        if (gameState === "SOLO_PLAY") {
          makeSoloGuess(key)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameState, makeSoloGuess])

  const useScan = () => {
    if (scansCount <= 0) return
    const unrevealed = secretWord.split("").filter(l => !guessedLetters.includes(l))
    if (unrevealed.length === 0) return
    
    const nextScans = scansCount - 1
    setScansCount(nextScans)
    
    const raw = localStorage.getItem(`playlab_progress_${userId ?? "local"}`)
    let parsedHighScores = {}
    if (raw) {
      try {
        parsedHighScores = JSON.parse(raw).high_scores || {}
      } catch (e) {}
    }
    const updatedScores = {
      ...parsedHighScores,
      rh_scans_count: nextScans
    }
    saveProgress(userId, { high_scores: updatedScores }, true)

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

  const getTabActiveStyle = (tab: string) => {
    if (menuTab !== tab) return "text-gray-400 hover:text-white hover:bg-white/5"
    if (selectedEnv === "submarine") {
      return "bg-blue-500/20 text-white border border-blue-500/40 shadow-sm shadow-blue-500/10"
    } else if (selectedEnv === "space") {
      return "bg-yellow-500/20 text-white border border-yellow-500/40 shadow-sm shadow-yellow-500/10"
    } else {
      return "bg-red-500/20 text-white border border-red-500/40 shadow-sm shadow-red-500/10"
    }
  }

  const envMeta = ENVIRONMENT_METADATA[activeEnv]
  const danger = getDangerLevel(mistakes)
  const borderGlow = envMeta.glowColor

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
        <div className="flex items-center gap-3">
          <Link href="/dashboard/playlab/developer" className="flex items-center gap-1.5 py-1.5 px-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-black rounded-xl transition-all">
            Developer Panel
          </Link>
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
      </div>

      {/* ── MULTIPLAYER LOBBY VIEW ───────────────────────────────────────────── */}
      {gameState === "MENU" && joinedRoom && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-6 space-y-6">
              {/* Lobby Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                  <span className="px-2.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">
                    Lobby Session
                  </span>
                  <h2 className="text-xl font-black text-white mt-1">Room Setup</h2>
                </div>
                
                {/* Room code */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Code:</span>
                  <span className="text-sm font-black text-white tracking-wider">{roomCode}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(roomCode)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="p-1 bg-white/5 hover:bg-white/10 rounded-md transition-all text-xs font-bold text-gray-300"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Host Settings or Guest Status */}
              {roomRole === "host" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-gray-500">Game Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["coop", "dm"] as const).map(m => (
                          <button
                            key={m}
                            onClick={() => selectMpMode(m)}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all
                              ${multiplayerMode === m
                                ? "bg-red-500/20 border-red-500 text-white shadow-sm"
                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                              }`}
                          >
                            {m === "coop" ? "Cooperative" : "Dungeon Master"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-gray-500">Word Source</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["catalog", "custom"] as const).map(s => (
                          <button
                            key={s}
                            onClick={() => selectMpWordSource(s)}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all
                              ${mpWordSource === s
                                ? "bg-red-500/20 border-red-500 text-white shadow-sm"
                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                              }`}
                          >
                            {s === "catalog" ? "Catalog DB" : "Custom Word"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-gray-500">Threat Environment</label>
                      <select
                        value={selectedEnv}
                        onChange={e => selectMpEnv(e.target.value as EnvironmentType)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                      >
                        <option value="volcano">Volcano Caldera</option>
                        <option value="submarine">Deep Sea Abyss</option>
                        <option value="space" disabled={!unlockedEnvironments.includes("space")}>
                          Solar Flare Station {!unlockedEnvironments.includes("space") ? "(Locked)" : ""}
                        </option>
                      </select>
                    </div>

                    {mpWordSource === "catalog" && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Difficulty</label>
                        <select
                          value={difficulty}
                          onChange={e => selectMpDiff(e.target.value as Difficulty)}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Normal">Normal</option>
                          <option value="Expert">Expert</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {mpWordSource === "custom" && (
                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-red-400" /> DM Custom Word Settings
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-gray-500">Secret Word</label>
                          <input
                            type="password"
                            placeholder="Enter word..."
                            value={mpSecretWord}
                            onChange={e => setMpSecretWord(e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase())}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-gray-500">Category</label>
                          <input
                            type="text"
                            placeholder="e.g. Science"
                            value={mpCategory}
                            onChange={e => setMpCategory(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Clue / Hint</label>
                        <input
                          type="text"
                          placeholder="e.g. Orbits a star"
                          value={mpHint}
                          onChange={e => setMpHint(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      onClick={startMultiplayerMatch}
                      disabled={loading || (mpWordSource === "custom" && !mpSecretWord.trim())}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-extrabold py-4 rounded-2xl text-xs shadow-lg shadow-red-500/20 hover:scale-[1.01] transition-all gap-1.5"
                    >
                      <Play className="h-4 w-4 fill-white" /> Start Multiplayer Match
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 bg-white/5 border border-white/5 p-6 rounded-2xl text-center">
                  <div className="animate-pulse flex flex-col items-center gap-3">
                    <Bot className="h-8 w-8 text-blue-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Awaiting Host Instructions</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-md">
                        The host is selecting the threat level, simulation mode, and database files. Secure your harness and wait for deployment.
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-left border-t border-white/5 pt-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Environment</span>
                      <p className="font-bold text-white capitalize">{selectedEnv}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Mode</span>
                      <p className="font-bold text-white capitalize">{multiplayerMode === "coop" ? "Cooperative Guessing" : "DM Challenge"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Word Source</span>
                      <p className="font-bold text-white capitalize">{mpWordSource === "catalog" ? "Catalog DB" : "Custom Word"}</p>
                    </div>
                    {mpWordSource === "catalog" && (
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Difficulty</span>
                        <p className="font-bold text-white capitalize">{difficulty}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={leaveRoom}
                  className="bg-white/5 hover:bg-white/10 text-gray-400 text-xs px-4 py-2.5 rounded-xl border border-white/5"
                >
                  Leave Lobby Room
                </Button>
              </div>
            </div>
          </div>

          {/* Lobby Crew Sidebar */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Crew Members ({roomPlayers.length})</h3>
              <div className="space-y-2">
                {roomPlayers.map(p => (
                  <div key={p.handle} className="flex justify-between items-center text-xs bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="font-black text-white">{p.handle}</span>
                    {p.isHost && (
                      <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                        Host
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contribute to global dictionary */}
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Contribute to Global Dictionary</h3>
              <form onSubmit={submitLobbyWord} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-gray-500">Word</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MAGMA"
                    value={lobbyWord}
                    onChange={e => setLobbyWord(e.target.value.replace(/[^A-Za-z]/g, ""))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-gray-500">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nature"
                    value={lobbyCategory}
                    onChange={e => setLobbyCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-gray-500">Clue / Hint</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hot molten rock beneath Earth"
                    value={lobbyHint}
                    onChange={e => setLobbyHint(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-gray-500">Difficulty</label>
                  <select
                    value={lobbyDifficulty}
                    onChange={e => setLobbyDifficulty(e.target.value as Difficulty)}
                    className="w-full bg-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Beginner">Beginner (short)</option>
                    <option value="Normal">Normal (medium)</option>
                    <option value="Expert">Expert (long/complex)</option>
                  </select>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg text-[10px]"
                >
                  Contribute Word
                </Button>
                {lobbySubmitSuccess && (
                  <p className="text-green-400 text-[10px] text-center font-bold">Word contributed successfully!</p>
                )}
                {lobbySubmitError && (
                  <p className="text-red-400 text-[10px] text-center font-bold">{lobbySubmitError}</p>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── SINGLE PLAYER MENU ────────────────────────────────────────────────── */}
      {gameState === "MENU" && !joinedRoom && (
        <div className="space-y-6">
          {/* Play Mode Tabs */}
          <div className="flex gap-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl max-w-md">
            {(["campaign", "survival", "multiplayer"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setMenuTab(tab)}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-black capitalize transition-all duration-200
                  ${menuTab === tab
                    ? getTabActiveStyle(tab)
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                {tab === "campaign" ? "Campaign" : tab === "survival" ? "Survival" : "Multiplayer"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Primary Arena Card */}
              <div className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br p-8 transition-all duration-300
                ${selectedEnv === "submarine"
                  ? "border-blue-500/20 from-blue-950/20 via-black to-zinc-950 shadow-lg shadow-blue-500/5"
                  : selectedEnv === "space"
                    ? "border-yellow-500/20 from-yellow-950/20 via-black to-zinc-950 shadow-lg shadow-yellow-500/5"
                    : "border-red-500/20 from-red-950/20 via-black to-zinc-950 shadow-lg shadow-red-500/5"
                }`}
              >
                <div className="relative z-10 space-y-5">
                  <span className={`px-2.5 py-0.5 border text-[10px] uppercase tracking-widest font-black rounded-full
                    ${selectedEnv === "submarine"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : selectedEnv === "space"
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {menuTab === "campaign" ? "Campaign Levels" : menuTab === "survival" ? "Survival Mode" : "Online Lobby Room"}
                  </span>

                  {menuTab === "campaign" && (
                    <div className="space-y-5">
                      <h2 className="text-xl sm:text-2xl font-black text-white">Threat Level Campaign</h2>
                      <p className="text-sm text-gray-300 max-w-lg">
                        Select a campaign sector below. Each level has a specific keyword and difficulty setting.
                      </p>

                      {/* Environment selector for Campaign */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-gray-400 block">Select Environment Sector</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {(Object.keys(ENVIRONMENT_METADATA) as EnvironmentType[]).map(envKey => {
                            const env = ENVIRONMENT_METADATA[envKey]
                            const unlocked = unlockedEnvironments.includes(envKey)
                            return (
                              <div key={envKey} onClick={() => unlocked && setSelectedEnv(envKey)}
                                className={`relative border rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between h-28 ${!unlocked ? "opacity-40 cursor-not-allowed bg-black/40 border-white/5" : selectedEnv === envKey ? `bg-gradient-to-b ${env.colors} shadow-lg ${env.glowColor}` : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                                <div className="flex items-start justify-between">
                                  <div className="p-2 bg-white/5 rounded-xl">{env.icon}</div>
                                  {!unlocked && <Lock className="h-4 w-4 text-gray-500" />}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-white mt-1">{env.name}</h4>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Campaign Grid */}
                      <div className="space-y-3 border-t border-white/5 pt-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-400">Available Missions</span>
                          <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2.5 py-0.5 rounded-md border border-green-500/20">
                            Cleared: {levelProgress[selectedEnv] - 1}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                          {Array.from({ length: Math.max(10, levelProgress[selectedEnv] + 1) }).map((_, i) => {
                            const lvl = i + 1
                            const isUnlocked = lvl <= levelProgress[selectedEnv]
                            const isCompleted = lvl < levelProgress[selectedEnv]
                            const isActive = lvl === activeLevel
                            
                            let btnStyle = ""
                            if (!isUnlocked) {
                              btnStyle = "bg-white/5 border-white/5 text-gray-600 cursor-not-allowed opacity-40"
                            } else if (isActive) {
                              btnStyle = selectedEnv === "submarine"
                                ? "bg-blue-500/25 border-blue-400 text-blue-200 scale-105 shadow-md shadow-blue-500/30"
                                : selectedEnv === "space"
                                  ? "bg-yellow-500/25 border-yellow-400 text-yellow-200 scale-105 shadow-md shadow-yellow-500/30"
                                  : "bg-red-500/25 border-red-400 text-red-200 scale-105 shadow-md shadow-red-500/30"
                            } else if (isCompleted) {
                              btnStyle = "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 hover:scale-105"
                            } else {
                              btnStyle = "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 hover:scale-105"
                            }

                            return (
                              <button
                                key={lvl}
                                disabled={!isUnlocked}
                                onClick={() => setActiveLevel(lvl)}
                                className={`h-10 w-10 rounded-xl border text-xs font-black transition-all flex items-center justify-center ${btnStyle}`}
                              >
                                {!isUnlocked ? <Lock className="h-3.5 w-3.5" /> : lvl}
                              </button>
                            )
                          })}
                        </div>
                        
                        {/* Level Info Preview */}
                        {(() => {
                          const lvlData = getLevelData(selectedEnv, activeLevel)
                          if (!lvlData) return null
                          return (
                            <div className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-2 mt-4">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-white">Level {lvlData.level} mission specs</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border
                                  ${lvlData.difficulty === "Beginner" ? "text-green-400 bg-green-500/10 border-green-500/20" :
                                    lvlData.difficulty === "Normal" ? "text-orange-400 bg-orange-500/10 border-orange-500/20" :
                                    "text-red-400 bg-red-500/10 border-red-500/20"}`}
                                >
                                  {lvlData.difficulty}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">
                                Crack the sequence to secure the reactor cores. Category: <span className="text-white font-semibold">{lvlData.category}</span>.
                              </p>
                              <div className="pt-2">
                                <Button
                                  onClick={() => startCampaignGame(selectedEnv, activeLevel)}
                                  className={`w-full sm:w-auto text-white font-extrabold px-6 py-4 rounded-xl text-xs shadow-md transition-all gap-1.5 hover:scale-[1.02]
                                    ${selectedEnv === "submarine"
                                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/20"
                                      : selectedEnv === "space"
                                        ? "bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 shadow-yellow-500/20"
                                        : "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-red-500/20"
                                    }`}
                                >
                                  <Play className="h-4 w-4 fill-white" /> Launch Campaign Level {activeLevel}
                                </Button>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )}

                  {menuTab === "survival" && (
                    <div className="space-y-5">
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
                        <Button onClick={() => startSoloGame(false)}
                          className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-extrabold px-8 py-6 rounded-2xl text-base shadow-lg shadow-red-500/20 hover:scale-[1.02] transition-all gap-2">
                          <Play className="h-5 w-5 fill-white" /> Start Solo Survival
                        </Button>
                      </div>
                    </div>
                  )}

                  {menuTab === "multiplayer" && (
                    <div className="space-y-5">
                      <h2 className="text-xl sm:text-2xl font-black text-white">Online Multiplayer Rooms</h2>
                      <p className="text-sm text-gray-300 max-w-lg">
                        Coordinate with your friends in real-time to decode words, or challenge them directly as a Dungeon Master with custom terms!
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {/* Host Card */}
                        <div className="border border-white/10 bg-white/5 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                          <div className="space-y-2">
                            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                              <Flame className="h-4 w-4 text-orange-400" /> Host Online Session
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Create a private game room and share the code. Host cooperative play or set custom secret words as a Dungeon Master.
                            </p>
                          </div>
                          <Button
                            onClick={hostRoom}
                            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold py-3.5 rounded-xl text-xs hover:scale-[1.02] transition-all"
                          >
                            Host Private Room
                          </Button>
                        </div>

                        {/* Join Card */}
                        <div className="border border-white/10 bg-white/5 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                          <div className="space-y-2">
                            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                              <Compass className="h-4 w-4 text-blue-400" /> Join Existing Room
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Enter a room lobby code shared by your host to join their active session.
                            </p>
                          </div>
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="ENTER ROOM CODE..."
                              value={roomCodeInput}
                              onChange={e => setRoomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-center text-sm font-black tracking-widest text-white focus:outline-none focus:border-red-500"
                            />
                            <Button
                              onClick={() => joinRoom(roomCodeInput)}
                              disabled={!roomCodeInput.trim()}
                              className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold py-3.5 rounded-xl text-xs disabled:opacity-40"
                            >
                              Join Lobby Room
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Global Survival Leaderboard */}
                      <div className="border border-white/10 bg-white/5 p-6 rounded-3xl space-y-4 mt-6">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-yellow-500" />
                          <h3 className="text-sm font-black text-white uppercase tracking-wider">Global Survival Leaderboard</h3>
                        </div>
                        <p className="text-xs text-gray-400">
                          Real-time rankings of top survival runs across all players. Solve words continuously in Survival Mode to compete!
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {leaderboard.length === 0 ? (
                            <p className="text-xs text-gray-500 italic py-2 col-span-2 text-center">No runs recorded yet. Start a Solo Survival match to submit your score!</p>
                          ) : leaderboard.map((entry, i) => (
                            <div key={i} className="flex justify-between items-center text-xs bg-black/40 p-3 rounded-xl border border-white/5">
                              <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 flex items-center justify-center font-black rounded-lg text-xs
                                  ${i === 0 ? "bg-yellow-500 text-black animate-pulse" :
                                    i === 1 ? "bg-zinc-300 text-black" :
                                    i === 2 ? "bg-amber-600 text-white" :
                                    "bg-white/10 text-gray-300"
                                  }`}
                                >
                                  {i + 1}
                                </span>
                                <div>
                                  <span className="font-black text-white">{entry.name}</span>
                                  <p className="text-[10px] text-gray-400">{entry.environment} • {entry.difficulty}</p>
                                </div>
                              </div>
                              <span className="font-black text-yellow-400 text-sm">{entry.score} pts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* DM Setup Card (only show in survival tab for backwards compatibility) */}
              {menuTab === "survival" && (
                <div className="rounded-3xl border border-white/5 bg-white/5 p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-red-400" />
                    <h3 className="text-lg font-bold text-white">Dungeon Master Mode (Local AI)</h3>
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
              )}
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

              {/* Success Overlay for Solo Survival */}
              {survivalSuccessMsg && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
                  <div className="bg-yellow-500/10 border-2 border-yellow-500/30 p-8 rounded-3xl space-y-4 max-w-sm shadow-2xl">
                    <div className="inline-flex p-3 rounded-full bg-yellow-500/20 text-yellow-400">
                      <Trophy className="h-10 w-10 text-yellow-400 animate-bounce" />
                    </div>
                    <h3 className="text-xl font-black text-white">Threat Neutralized!</h3>
                    <p className="text-sm font-semibold text-yellow-400 leading-relaxed">
                      {survivalSuccessMsg}
                    </p>
                    <div className="flex justify-center gap-6 pt-2">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">Streak</span>
                        <span className="text-lg font-black text-white">{survivalStreak} words</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Score</span>
                        <span className="text-lg font-black text-white">{survivalScore} pts</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                  {gameState === "SOLO_PLAY" && !joinedRoom && (
                    <>
                      <button onClick={activateShield} disabled={shieldsCount === 0 || shieldActive}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${shieldActive ? "bg-yellow-500/30 border-yellow-400 text-yellow-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 disabled:opacity-30"}`}>
                        <Shield className="h-4 w-4" />
                        {shieldActive ? "Shield ON" : `Shield (${shieldsCount})`}
                      </button>
                      <button onClick={useScan} disabled={scansCount === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-blue-500/10 border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-all disabled:opacity-30">
                        <Compass className="h-4 w-4" />
                        Scan ({scansCount})
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Hint */}
              <div className="relative z-10 bg-black/50 border border-white/5 p-3 rounded-2xl flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Clue / Hint</span>
                  <p className="text-sm font-semibold text-white">{hint}</p>
                </div>
                {!joinedRoom && (
                  <button
                    onClick={flagClue}
                    className="px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-[10px] font-black rounded-lg transition-all"
                  >
                    Flag Clue
                  </button>
                )}
              </div>

              {/* Word tiles */}
              <div className="relative z-10 flex justify-center flex-wrap gap-2 py-6">
                {secretWord.split("").map((letter, idx) => {
                  const isDm = roomRole === "host" && multiplayerMode === "dm"
                  const revealed = isDm || guessedLetters.includes(letter)
                  const guessed = guessedLetters.includes(letter)
                  
                  let tileStyle = ""
                  if (isDm) {
                    tileStyle = guessed
                      ? "bg-green-500/20 border-green-500 text-green-300 scale-105 shadow-md shadow-green-500/20"
                      : "bg-black/60 border-white/10 text-white/30"
                  } else {
                    tileStyle = revealed
                      ? "bg-white/15 border-white text-white shadow-lg shadow-white/10 scale-105"
                      : "bg-black/60 border-white/10 text-transparent"
                  }

                  return (
                    <div key={idx}
                      className={`w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-black rounded-xl border-2 transition-all duration-300 ${tileStyle}`}>
                      {revealed ? letter : "_"}
                    </div>
                  )
                })}
              </div>

              {/* Keyboard */}
              {gameState === "SOLO_PLAY" && !(roomRole === "host" && multiplayerMode === "dm") && (
                <div className="relative z-10 space-y-2">
                  <KeyRow letters="QWERTYUIOP" guessedLetters={guessedLetters} secretWord={secretWord} onGuess={makeSoloGuess} />
                  <KeyRow letters="ASDFGHJKL" guessedLetters={guessedLetters} secretWord={secretWord} onGuess={makeSoloGuess} />
                  <KeyRow letters="ZXCVBNM" guessedLetters={guessedLetters} secretWord={secretWord} onGuess={makeSoloGuess} />
                  <p className="text-center text-[10px] text-gray-600 pt-1 select-none">
                    ⌨️ or type on your keyboard
                  </p>
                </div>
              )}

              {/* Multiplayer DM Spectator Controls */}
              {roomRole === "host" && multiplayerMode === "dm" && (
                <div className="relative z-10 bg-black/60 border border-white/5 p-4 rounded-2xl space-y-3 text-center sm:text-left">
                  <h4 className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                    <Bot className="h-4 w-4 text-orange-400" /> Dungeon Master View
                  </h4>
                  <p className="text-xs text-gray-400">
                    You are spectating. You see the secret word in dim text, which highlights green as players guess correctly.
                  </p>
                  <div className="flex justify-center sm:justify-start gap-3">
                    <Button onClick={leaveRoom}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs px-4 py-2.5 rounded-xl font-bold">
                      End Simulation
                    </Button>
                  </div>
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
                  <Button onClick={() => joinedRoom ? leaveRoom() : setGameState("MENU")}
                    className="bg-white/5 hover:bg-white/10 text-gray-400 text-xs px-3 py-1.5 rounded-lg border border-white/5">
                    {joinedRoom ? "Leave Match" : "Abandon Run"}
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
                {gameState === "SOLO_PLAY" && !isCampaign && !joinedRoom && (
                  <>
                    <div className="h-px bg-white/5 my-1" />
                    <div className="flex justify-between text-yellow-400 font-bold">
                      <span>Run Streak</span>
                      <span>{survivalStreak} words</span>
                    </div>
                    <div className="flex justify-between text-yellow-400 font-bold">
                      <span>Run Score</span>
                      <span>{survivalScore} pts</span>
                    </div>
                  </>
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
        <div className={`max-w-md mx-auto border p-8 rounded-3xl text-center space-y-6 relative overflow-hidden anim-death ${isGameWon ? "bg-gradient-to-br from-zinc-900 via-zinc-800 to-black border-yellow-500/30" : "bg-gradient-to-br from-red-950/60 via-zinc-900 to-black border-red-500/40"}`}
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

          <div className="space-y-2 relative z-10">
            <h2 className={`text-2xl font-black ${isGameWon ? "text-white" : "text-red-400"}`}>
              {isGameWon ? "🎉 Survived!" : "💀 Station Destroyed!"}
            </h2>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              {isGameWon ? "You cracked the code before the environment gave out." : `The ${envMeta.name} was overwhelmed. The word was:`}
            </p>
          </div>

          <div className="bg-black/60 border border-white/5 p-4 rounded-2xl relative z-10">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Secret Word</span>
            <p className="text-2xl font-black text-white tracking-[0.2em]">{secretWord}</p>
          </div>

          {campaignUnlockedNextLevel && (
            <div className="relative z-10 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl flex flex-col items-center gap-1.5 max-w-xs mx-auto animate-bounce">
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 animate-pulse" />
              <div>
                <h4 className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Next Level Unlocked!</h4>
                <p className="text-[9px] text-gray-300 mt-0.5">You cleared Level {activeLevel} in {ENVIRONMENT_METADATA[activeEnv].name} Campaign.</p>
              </div>
            </div>
          )}

          {isGameWon && (
            <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 relative z-10">
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

          {!isCampaign && !joinedRoom && (
            <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 relative z-10">
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Streak Solved</span>
                <span className="text-xl font-black text-yellow-400">{survivalStreak} words</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Final Score</span>
                <span className="text-xl font-black text-yellow-400">{survivalScore} pts</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 relative z-10 w-full justify-center">
            {joinedRoom ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                {roomRole === "host" ? (
                  <Button
                    onClick={returnToLobby}
                    className={`flex-1 ${isGameWon ? "bg-yellow-500 hover:bg-yellow-400 text-black" : "bg-red-600 hover:bg-red-500 text-white"} font-extrabold py-3.5 rounded-2xl text-sm`}
                  >
                    Back to Lobby
                  </Button>
                ) : (
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-3.5 text-xs text-gray-400 font-bold flex items-center justify-center">
                    Waiting for Host to return...
                  </div>
                )}
                <Button
                  onClick={leaveRoom}
                  className="bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl py-3.5 text-sm border border-white/10 px-4"
                >
                  Leave Room
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                {isCampaign ? (
                  <>
                    <Button
                      onClick={() => startCampaignGame(activeEnv, activeLevel)}
                      className={`flex-1 ${isGameWon ? "bg-yellow-500 hover:bg-yellow-400 text-black" : "bg-red-600 hover:bg-red-500 text-white"} font-extrabold py-3.5 rounded-2xl text-sm transition-all hover:scale-[1.02]`}
                    >
                      {isGameWon ? "Continue Level" : "Retry Word"}
                    </Button>
                    {isGameWon && (
                      <Button
                        onClick={() => {
                          const nextLvl = activeLevel + 1
                          setActiveLevel(nextLvl)
                          startCampaignGame(activeEnv, nextLvl)
                        }}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-extrabold py-3.5 rounded-2xl text-sm transition-all hover:scale-[1.02]"
                      >
                        Next Level
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    onClick={() => startSoloGame(false)}
                    className={`flex-1 ${isGameWon ? "bg-yellow-500 hover:bg-yellow-400 text-black" : "bg-red-600 hover:bg-red-500 text-white"} font-extrabold py-3.5 rounded-2xl text-sm transition-all hover:scale-[1.02]`}
                  >
                    Play Again
                  </Button>
                )}
                <Button
                  onClick={() => setGameState("MENU")}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl py-3.5 text-sm border border-white/10"
                >
                  Menu
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
