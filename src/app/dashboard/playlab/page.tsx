"use client"

import { useState } from "react"
import { Gamepad2, Brain, Zap, ArrowRight, Lock, RotateCcw, Globe, Sword, Sparkles, AlertTriangle } from "lucide-react"
import Link from "next/link"

// All game-specific localStorage keys to wipe on reset
const PLAYLAB_LS_KEYS = [
  "wordchemy_discovered",
  "wordchemy_packs",
  "reverse_hangman_leaderboard",
  "playlab_coins_local",
  "playlab_progress_local",
]
function clearPlaylabData(userId?: string | null) {
  PLAYLAB_LS_KEYS.forEach(k => localStorage.removeItem(k))
  if (userId) {
    ;[
      `playlab_coins_${userId}`,
      `playlab_progress_${userId}`,
      `reverse_hangman_score_${userId}`,
      `reverse_hangman_envs_${userId}`,
      `chaos_alphabet_score_${userId}`,
      `memory_hunter_score_${userId}`,
    ].forEach(k => localStorage.removeItem(k))
  }
}

export default function PlayLabPage() {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const handleReset = () => {
    clearPlaylabData()
    setShowResetConfirm(false)
    setResetDone(true)
    setTimeout(() => setResetDone(false), 3000)
  }

  const games = [
    {
      id: "chaos-alphabet",
      title: "Chaos Alphabet Arena",
      description: "Categories + pressure + social chaos. How fast can you name a country, food, and friend starting with the same letter?",
      icon: <Zap className="h-8 w-8 text-yellow-400" />,
      type: "Hybrid",
      color: "from-yellow-500/20 to-orange-600/20",
      borderColor: "border-yellow-500/30",
      href: "/dashboard/playlab/chaos-alphabet",
      locked: false
    },
    {
      id: "wordchemy",
      title: "Wordchemy",
      description: "Combine concepts to create new things. Test your collaborative creativity with friends.",
      icon: <Brain className="h-8 w-8 text-blue-400" />,
      type: "Hybrid",
      color: "from-blue-500/20 to-purple-600/20",
      borderColor: "border-blue-500/30",
      href: "/dashboard/playlab/wordchemy",
      locked: false
    },
    {
      id: "memory-hunter",
      title: "Memory Hunter",
      description: "Social deduction and memory quizzes fueled by your HumanOS relationship graph.",
      icon: <Brain className="h-8 w-8 text-purple-400" />,
      type: "Hybrid",
      color: "from-purple-500/20 to-indigo-600/20",
      borderColor: "border-purple-500/30",
      href: "/dashboard/playlab/memory-hunter",
      locked: false
    },
    {
      id: "reverse-hangman",
      title: "Reverse Hangman Survival",
      description: "Word puzzle + escalating environmental danger. Decode together or shape the disaster.",
      icon: <Zap className="h-8 w-8 text-red-400 animate-pulse" />,
      type: "Hybrid",
      color: "from-red-950/40 to-red-900/20",
      borderColor: "border-red-500/30",
      href: "/dashboard/playlab/reverse-hangman",
      locked: false
    },
    {
      id: "country-war",
      title: "Country War Builder",
      description: "Compete with AI nations or friends. Build armies, form alliances, launch trade wars and spy missions fueled by relationship strength.",
      icon: <Globe className="h-8 w-8 text-green-400" />,
      type: "Multiplayer",
      color: "from-green-950/40 to-emerald-900/20",
      borderColor: "border-green-500/30",
      href: "/dashboard/playlab/country-war",
      locked: false
    },
    {
      id: "secret-card-hunt",
      title: "Secret Card Hunt",
      description: "A social deduction and knowledge game. Ask questions, analyze responses, and deduce your opponents' cards before they find yours.",
      icon: <Sparkles className="h-8 w-8 text-emerald-400" />,
      type: "Hybrid",
      color: "from-emerald-950/40 to-emerald-900/20",
      borderColor: "border-emerald-500/30",
      href: "/dashboard/playlab/secret-card-hunt",
      locked: false
    },
    {
      id: "kingdom-rushboard",
      title: "Kingdom Rushboard",
      description: "A living board strategy game. Build villages, grow populations, throw enemies in jail, and face off in tactical PvP duels on the race to the Throne.",
      icon: <Sword className="h-8 w-8 text-orange-400 animate-pulse" />,
      type: "Multiplayer",
      color: "from-amber-950/40 to-orange-900/20",
      borderColor: "border-orange-500/30",
      href: "/dashboard/playlab/kingdom-rushboard",
      locked: false
    }
  ]

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-xl">
            <Gamepad2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PlayLab</h1>
            <p className="text-gray-400">Social experiences powered by relationship intelligence</p>
          </div>
        </div>

        {/* Reset Button */}
        <div className="relative">
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Game Data
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-red-300">Clear all local progress?</span>
              <button onClick={handleReset} className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all">Yes</button>
              <button onClick={() => setShowResetConfirm(false)} className="px-2 py-0.5 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-all">Cancel</button>
            </div>
          )}
          {resetDone && (
            <div className="absolute -bottom-8 right-0 text-[10px] text-green-400 font-bold whitespace-nowrap">
              ✓ Game data cleared! Fresh start ready.
            </div>
          )}
        </div>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map(game => (
          <Link
            key={game.id}
            href={game.locked ? "#" : game.href}
            className={`group relative overflow-hidden rounded-2xl border ${game.borderColor} bg-gradient-to-br ${game.color} p-6 transition-all hover:scale-[1.02] ${game.locked ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg"}`}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] -z-10" />

            <div className="flex items-start justify-between mb-4">
              {game.icon}
              <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${game.locked ? "bg-gray-800 text-gray-400" : "bg-white/10 text-white"}`}>
                {game.locked ? "COMING SOON" : game.type}
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{game.title}</h3>
            <p className="text-sm text-gray-300 mb-6">{game.description}</p>

            {!game.locked && (
              <div className="flex items-center text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
                Launch Experience <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            )}
            {game.locked && (
              <div className="flex items-center text-gray-500 text-xs font-bold gap-1">
                <Lock className="h-3.5 w-3.5" /> In Development
              </div>
            )}
          </Link>
        ))}
      </div>

      <p className="text-center text-[10px] text-gray-600 pt-2">
        💡 Having coin issues? Use <strong>Reset Game Data</strong> above to clear local conflicts, then reload.
      </p>
    </div>
  )
}
