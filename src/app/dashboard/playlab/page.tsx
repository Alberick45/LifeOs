"use client"

import { Gamepad2, Brain, Zap, ArrowRight, Lock } from "lucide-react"
import Link from "next/link"

export default function PlayLabPage() {
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
      href: "#",
      locked: true
    },
    {
      id: "memory-hunter",
      title: "Memory Hunter",
      description: "Social deduction and memory quizzes fueled by your HumanOS relationship graph.",
      icon: <Lock className="h-8 w-8 text-gray-500" />,
      type: "Multiplayer",
      color: "from-gray-800/50 to-gray-900/50",
      borderColor: "border-white/10",
      href: "#",
      locked: true
    }
  ]

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/20 rounded-xl">
          <Gamepad2 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PlayLab</h1>
          <p className="text-gray-400">Social experiences powered by relationship intelligence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map(game => (
          <Link 
            key={game.id} 
            href={game.locked ? "#" : game.href}
            className={`group relative overflow-hidden rounded-2xl border ${game.borderColor} bg-gradient-to-br ${game.color} p-6 transition-all hover:scale-[1.02] ${game.locked ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] -z-10" />
            
            <div className="flex items-start justify-between mb-4">
              {game.icon}
              <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${game.locked ? 'bg-gray-800 text-gray-400' : 'bg-white/10 text-white'}`}>
                {game.locked ? "IN DEVELOPMENT" : game.type}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">{game.title}</h3>
            <p className="text-sm text-gray-300 mb-6">{game.description}</p>
            
            {!game.locked && (
              <div className="flex items-center text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
                Launch Experience <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
