"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ArrowLeft, Brain, Zap, Trophy, Play, RotateCcw, Crown, TrendingUp, Users, AlertTriangle, Check, Lock, Sparkles, Heart, Sword, Shield, Activity, Plus, LogIn, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { readCoins, adjustCoins, onCoinsChange, loadProgress, saveProgress, saveHighScore } from "@/lib/playlab-coins"

// ─── Types ─────────────────────────────────────────────────────────────────────
type GamePhase = "MENU" | "MULTIPLAYER_SETUP" | "MULTIPLAYER_LOBBY" | "PLAYING_SOLO" | "PLAYING_PVP" | "PLAYING_COOP" | "RESULTS"
type MutationId = "wings" | "acid_blood" | "emp_skin" | "camouflage" | "magnetic_tail" | "spiked_carapace" | "venomous_stinger" | "regenerative_core"

interface Mutation {
  id: MutationId
  name: string
  emoji: string
  description: string
  cost: number
  stats: { attack: number; defense: number; speed: number; HPMax: number }
  specialEffect: string
  glowColor: string
  branch: "offensive" | "defensive" | "auxiliary"
}

interface Creature {
  name: string
  level: number
  dna: number
  hp: number
  hpMax: number
  attack: number
  defense: number
  speed: number
  mutations: MutationId[]
}

interface Enemy {
  name: string
  flag: string
  hp: number
  hpMax: number
  attack: number
  defense: number
  speed: number
  isBoss: boolean
}

interface BattleLog {
  id: string
  round: number
  message: string
  type: "attack" | "defend" | "heal" | "status" | "victory" | "defeat"
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const MUTATIONS: Mutation[] = [
  {
    id: "wings",
    name: "Aero-Wings",
    emoji: "🦋",
    description: "Bio-membranes offering extreme agility and airborne evasion.",
    cost: 40,
    stats: { attack: 5, defense: 5, speed: 30, HPMax: 10 },
    specialEffect: "Evade 25% of ground-based enemy physical attacks",
    glowColor: "shadow-cyan-500/20 border-cyan-500/30 text-cyan-400 bg-cyan-950/20",
    branch: "auxiliary"
  },
  {
    id: "acid_blood",
    name: "Corrosive Acid Blood",
    emoji: "🧪",
    description: "Highly corrosive fluid that splashes on attackers when damaged.",
    cost: 50,
    stats: { attack: 20, defense: 5, speed: 5, HPMax: 15 },
    specialEffect: "Deals 15 retaliation acid damage to attackers when hit",
    glowColor: "shadow-green-500/20 border-green-500/30 text-green-400 bg-green-950/20",
    branch: "offensive"
  },
  {
    id: "emp_skin",
    name: "EMP Cyber-Skin",
    emoji: "⚡",
    description: "Dermal bio-conductors emitting electromagnetic pulses.",
    cost: 60,
    stats: { attack: 10, defense: 25, speed: 10, HPMax: 20 },
    specialEffect: "Chance to stun robotic or mechanical enemies for 1 turn",
    glowColor: "shadow-yellow-500/20 border-yellow-500/30 text-yellow-400 bg-yellow-950/20",
    branch: "defensive"
  },
  {
    id: "camouflage",
    name: "Chameleon Camouflage",
    emoji: "🦎",
    description: "Adaptive chromatophores allowing near-perfect environmental stealth.",
    cost: 45,
    stats: { attack: 5, defense: 15, speed: 15, HPMax: 10 },
    specialEffect: "Increase overall evasion chance by 30%",
    glowColor: "shadow-teal-500/20 border-teal-500/30 text-teal-400 bg-teal-950/20",
    branch: "auxiliary"
  },
  {
    id: "magnetic_tail",
    name: "Magnetic Tail-Whip",
    emoji: "🧬",
    description: "Biogenic magnetic coils to manipulate iron and gather loose DNA.",
    cost: 50,
    stats: { attack: 15, defense: 10, speed: 10, HPMax: 15 },
    specialEffect: "+50% DNA points earned from defeating creatures",
    glowColor: "shadow-pink-500/20 border-pink-500/30 text-pink-400 bg-pink-950/20",
    branch: "auxiliary"
  },
  {
    id: "spiked_carapace",
    name: "Spiked Carapace",
    emoji: "🐚",
    description: "Hardened chitin plates covered in sharp biological spikes.",
    cost: 55,
    stats: { attack: 10, defense: 30, speed: -5, HPMax: 25 },
    specialEffect: "Reflect 20% of all incoming physical damage back to target",
    glowColor: "shadow-rose-500/20 border-rose-500/30 text-rose-400 bg-rose-950/20",
    branch: "defensive"
  },
  {
    id: "venomous_stinger",
    name: "Venomous Stinger",
    emoji: "🦂",
    description: "A tail-mounted stinger that injects neurotoxic organic compound.",
    cost: 65,
    stats: { attack: 35, defense: 5, speed: 5, HPMax: 10 },
    specialEffect: "Applies 12 poison damage per turn to target for 3 turns",
    glowColor: "shadow-purple-500/20 border-purple-500/30 text-purple-400 bg-purple-950/20",
    branch: "offensive"
  },
  {
    id: "regenerative_core",
    name: "Regenerative Core",
    emoji: "🌋",
    description: "Central organic furnace capable of knitting flesh back together.",
    cost: 70,
    stats: { attack: 5, defense: 15, speed: 0, HPMax: 30 },
    specialEffect: "Heals 15 HP at the end of every round automatically",
    glowColor: "shadow-orange-500/20 border-orange-500/30 text-orange-400 bg-orange-950/20",
    branch: "defensive"
  }
]

const WILD_PREDATORS: Enemy[] = [
  { name: "Phyto-Parasite", flag: "🦠", hp: 60, hpMax: 60, attack: 12, defense: 5, speed: 10, isBoss: false },
  { name: "Scylla Stalker", flag: "🦀", hp: 80, hpMax: 80, attack: 15, defense: 18, speed: 8, isBoss: false },
  { name: "Giga-Hornet", flag: "🐝", hp: 70, hpMax: 70, attack: 22, defense: 8, speed: 25, isBoss: false },
  { name: "Apex Raptor", flag: "🦎", hp: 120, hpMax: 120, attack: 28, defense: 15, speed: 18, isBoss: false }
]

const BOSS_PREDATORS: Enemy[] = [
  { name: "Crustacean Behemoth", flag: "🦂", hp: 220, hpMax: 220, attack: 32, defense: 35, speed: 10, isBoss: true },
  { name: "Nebula Aero-Queen", flag: "🦇", hp: 350, hpMax: 350, attack: 45, defense: 25, speed: 35, isBoss: true },
  { name: "Cyber-Vortex Dragon", flag: "🐉", hp: 500, hpMax: 500, attack: 58, defense: 40, speed: 45, isBoss: true }
]

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CreatureForgePage() {
  const [phase, setPhase] = useState<GamePhase>("MENU")
  const [userId, setUserId] = useState<string | null>(null)
  const [coins, setCoins] = useState(100)
  const [highScore, setHighScore] = useState(0)
  const [score, setScore] = useState<number>(0)
  const [alertMsg, setAlertMsg] = useState<{ text: string; success: boolean } | null>(null)

  const triggerAlert = (text: string, success: boolean) => {
    setAlertMsg({ text, success })
    setTimeout(() => {
      setAlertMsg(null)
    }, 3000)
  }

  // Player Creature State
  const [creature, setCreature] = useState<Creature>({
    name: "Protozoa-01",
    level: 1,
    dna: 50,
    hp: 100,
    hpMax: 100,
    attack: 20,
    defense: 10,
    speed: 15,
    mutations: []
  })

  // Selected mutation details preview
  const [previewMutation, setPreviewMutation] = useState<Mutation | null>(null)

  // Combat States
  const [activeEnemy, setActiveEnemy] = useState<Enemy | null>(null)
  const [campaignStage, setCampaignStage] = useState(0)
  const [battleLogs, setBattleLogs] = useState<BattleLog[]>([])
  const [turn, setTurn] = useState(1)
  const [combatOutcome, setCombatOutcome] = useState<"victory" | "defeat" | null>(null)
  const [actionUsed, setActionUsed] = useState(false)
  const [poisonTurnsLeft, setPoisonTurnsLeft] = useState(0)

  // Multiplayer Specific
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [roomCode, setRoomCode] = useState("")
  const [roomInput, setRoomInput] = useState("")
  const [username, setUsername] = useState("Commander")
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState<any[]>([])
  const [myPresenceId, setMyPresenceId] = useState("")
  const [turnSubmitted, setTurnSubmitted] = useState(false)

  // Co-op Raid Specific
  const [raidBoss, setRaidBoss] = useState<{ name: string; hp: number; hpMax: number; attack: number } | null>(null)

  const channelRef = useRef<any>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Load user details + database progress
  useEffect(() => {
    let resolvedUserId: string | null = null
    let unsubCoins: (() => void) | null = null

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        resolvedUserId = session.user.id
        setUserId(session.user.id)
        if (session.user.user_metadata?.full_name) {
          setUsername(session.user.user_metadata.full_name)
        } else if (session.user.email) {
          setUsername(session.user.email.split("@")[0])
        }
      }

      // Load progress
      const progress = await loadProgress(resolvedUserId)
      setCoins(progress.coins)
      setHighScore(progress.high_scores?.creature_forge ?? 0)

      // Subscribe to updates
      unsubCoins = onCoinsChange(resolvedUserId, (newBal) => setCoins(newBal))
    }
    init()

    return () => {
      if (unsubCoins) unsubCoins()
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [])

  // Auto scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [battleLogs])

  // Log battle chronicle
  const logBattle = (message: string, type: BattleLog["type"]) => {
    setBattleLogs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, round: turn, message, type }])
  }

  // ── Start Campaign ──────────────────────────────────────────────────────────
  const startCampaign = () => {
    setIsMultiplayer(false)
    setCampaignStage(0)
    setTurn(1)
    setScore(0)
    setCombatOutcome(null)
    setPoisonTurnsLeft(0)

    const baseCreature: Creature = {
      name: "Proto-Leviathan",
      level: 1,
      dna: 50,
      hp: 100,
      hpMax: 100,
      attack: 20,
      defense: 10,
      speed: 15,
      mutations: []
    }
    setCreature(baseCreature)
    setActiveEnemy({ ...WILD_PREDATORS[0] })
    setBattleLogs([{ id: "start", round: 0, message: `🌱 Organism spawned. Wild environment detected. Combat initialized!`, type: "status" }])
    setPhase("PLAYING_SOLO")
  }

  // ── Solo Combat Actions ──────────────────────────────────────────────────────
  const handleAttack = () => {
    if (!activeEnemy || combatOutcome) return

    // 1. Player attack roll
    const damage = Math.max(5, Math.floor(creature.attack * (0.8 + Math.random() * 0.4) - activeEnemy.defense * 0.5))
    const nextEnemyHp = Math.max(0, activeEnemy.hp - damage)
    logBattle(`⚔️ You attacked ${activeEnemy.name} dealing ${damage} physical damage!`, "attack")

    // Venom check
    let extraDmg = 0
    if (creature.mutations.includes("venomous_stinger")) {
      extraDmg = 12
      logBattle(`🦂 Neurotoxins deal +12 poison damage to ${activeEnemy.name}!`, "status")
    }

    const finalEnemyHp = Math.max(0, nextEnemyHp - extraDmg)
    setActiveEnemy(prev => prev ? { ...prev, hp: finalEnemyHp } : null)

    if (finalEnemyHp <= 0) {
      handleCombatVictory()
      return
    }

    // 2. Enemy counter-attack
    executeEnemyTurn(finalEnemyHp)
  }

  const executeEnemyTurn = (enemyHp: number) => {
    if (!activeEnemy) return

    setTimeout(() => {
      // Check Evasion
      let evasionChance = 0.05
      if (creature.mutations.includes("wings")) evasionChance += 0.25
      if (creature.mutations.includes("camouflage")) evasionChance += 0.30

      if (Math.random() < evasionChance) {
        logBattle(`💨 You swiftly evaded ${activeEnemy.name}'s attack!`, "status")
      } else {
        const rawDamage = Math.max(5, Math.floor(activeEnemy.attack * (0.8 + Math.random() * 0.4) - creature.defense * 0.5))
        
        // Carapace reflection
        let reflected = 0
        if (creature.mutations.includes("spiked_carapace")) {
          reflected = Math.floor(rawDamage * 0.2)
        }

        const actualDamage = Math.max(1, rawDamage - reflected)
        const nextPlayerHp = Math.max(0, creature.hp - actualDamage)
        
        logBattle(`💥 ${activeEnemy.name} hit you for ${actualDamage} damage!`, "defend")
        if (reflected > 0) {
          logBattle(`🐚 Spikes reflected ${reflected} damage back to ${activeEnemy.name}!`, "status")
          setActiveEnemy(prev => prev ? { ...prev, hp: Math.max(0, prev.hp - reflected) } : null)
        }

        // Acid blood splash
        if (creature.mutations.includes("acid_blood")) {
          logBattle(`🧪 Corrosive Acid splash deals 15 damage to ${activeEnemy.name}!`, "status")
          setActiveEnemy(prev => prev ? { ...prev, hp: Math.max(0, prev.hp - 15) } : null)
        }

        setCreature(prev => ({ ...prev, hp: nextPlayerHp }))

        if (nextPlayerHp <= 0) {
          setCombatOutcome("defeat")
          logBattle(`💀 Your organism collapsed! Evolutionary path terminated.`, "defeat")
          saveResult(score)
          return
        }
      }

      // Regenerative core
      if (creature.mutations.includes("regenerative_core")) {
        setCreature(prev => {
          const healed = Math.min(prev.hpMax, prev.hp + 15)
          logBattle(`🌋 Core regenerated +15 HP!`, "heal")
          return { ...prev, hp: healed }
        })
      }

      setTurn(t => t + 1)
    }, 800)
  }

  const handleDefend = () => {
    if (!activeEnemy || combatOutcome) return
    logBattle(`🛡️ Shield barrier raised. Defense increased temporarily!`, "defend")
    
    // Temporarily triple defense for enemy's next hit
    const tempCreature = { ...creature, defense: creature.defense * 3 }
    
    setTimeout(() => {
      const rawDamage = Math.max(2, Math.floor(activeEnemy.attack * (0.8 + Math.random() * 0.4) - tempCreature.defense * 0.5))
      const nextHp = Math.max(0, creature.hp - rawDamage)
      logBattle(`💥 ${activeEnemy.name} hit your shield for ${rawDamage} damage!`, "defend")
      setCreature(prev => ({ ...prev, hp: nextHp }))

      if (nextHp <= 0) {
        setCombatOutcome("defeat")
        logBattle(`💀 Your organism collapsed!`, "defeat")
        saveResult(score)
        return
      }

      setTurn(t => t + 1)
    }, 600)
  }

  // Combat victory
  const handleCombatVictory = () => {
    setCombatOutcome("victory")
    logBattle(`🏆 Victory! ${activeEnemy?.name} defeated.`, "victory")

    let dnaEarned = 25
    if (creature.mutations.includes("magnetic_tail")) {
      dnaEarned = Math.floor(dnaEarned * 1.5)
    }

    setCreature(prev => ({
      ...prev,
      dna: prev.dna + dnaEarned,
      level: prev.level + 1,
      hp: prev.hpMax // full heal on victory
    }))
    setScore(s => s + (activeEnemy?.isBoss ? 150 : 50))
    saveResult(score + (activeEnemy?.isBoss ? 150 : 50))
  }

  // Evolve mutation
  const evolveMutation = (mut: Mutation) => {
    if (creature.dna < mut.cost) return
    if (creature.mutations.includes(mut.id)) return

    const updatedMutations = [...creature.mutations, mut.id]
    setCreature(prev => ({
      ...prev,
      dna: prev.dna - mut.cost,
      attack: prev.attack + mut.stats.attack,
      defense: prev.defense + mut.stats.defense,
      speed: prev.speed + mut.stats.speed,
      hpMax: prev.hpMax + mut.stats.HPMax,
      hp: prev.hp + mut.stats.HPMax,
      mutations: updatedMutations
    }))
    triggerAlert(`Successfully evolved: ${mut.name}!`, true)
  }

  // Next level opponent selection
  const nextCampaignMatch = () => {
    const nextStage = campaignStage + 1
    setCampaignStage(nextStage)
    setTurn(1)
    setCombatOutcome(null)

    // Select boss or predator
    let nextOpp: Enemy
    if (nextStage % 3 === 0) {
      const idx = Math.min(BOSS_PREDATORS.length - 1, Math.floor(nextStage / 3) - 1)
      nextOpp = { ...BOSS_PREDATORS[idx] }
    } else {
      nextOpp = { ...WILD_PREDATORS[Math.floor(Math.random() * WILD_PREDATORS.length)] }
      // scale stats slightly based on stage
      nextOpp.hp += nextStage * 10
      nextOpp.hpMax += nextStage * 10
      nextOpp.attack += nextStage * 2
      nextOpp.defense += nextStage * 1
    }

    setActiveEnemy(nextOpp)
    setBattleLogs([{ id: `start-${nextStage}`, round: 0, message: `🌍 Advanced to Stage ${nextStage}. Enemy encountered: ${nextOpp.flag} ${nextOpp.name}!`, type: "status" }])
  }

  // Unified save handler
  const saveResult = (finalScore: number) => {
    if (finalScore > highScore) {
      setHighScore(finalScore)
      saveHighScore(userId, "creature_forge", finalScore)
    }
    const earned = Math.floor(finalScore / 25)
    if (earned > 0) {
      const next = adjustCoins(userId, earned)
      setCoins(next)
    }
  }

  // ── Multiplayer Lobbies ──────────────────────────────────────────────────────
  const createRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase()
    setRoomCode(code)
    setIsHost(true)
    joinLobby(code, true)
  }

  const handleJoinRoom = () => {
    const code = roomInput.trim().toUpperCase()
    if (code.length === 4) {
      setRoomCode(code)
      setIsHost(false)
      joinLobby(code, false)
    }
  }

  const joinLobby = (code: string, amHost: boolean) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    const myPresId = Math.random().toString(36).substring(2, 9)
    setMyPresenceId(myPresId)
    setPlayers([])
    setTurnSubmitted(false)

    const channel = supabase.channel(`creature-forge:${code}`, {
      config: {
        presence: {
          key: myPresId,
        },
        broadcast: {
          self: true,
        },
      },
    })

    channelRef.current = channel

    // Sync presence command centers
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState()
      const mappedPlayers: any[] = []

      Object.keys(presenceState).forEach(key => {
        const presences = presenceState[key] as any[]
        if (presences.length > 0) {
          const pres = presences[0]
          mappedPlayers.push({
            presenceId: key,
            name: pres.name || "Commander",
            isHost: pres.isHost || false,
            isReady: pres.isReady || false,
            turnSubmitted: pres.turnSubmitted || false,
            creature: pres.creature || { hp: 100, hpMax: 100, attack: 20, defense: 10, speed: 15, mutations: [] }
          })
        }
      })

      setPlayers(mappedPlayers)
    })

    // Listen for start and action broadcasts
    channel.on('broadcast', { event: 'start-coop' }, ({ payload }) => {
      setRaidBoss(payload.boss || { name: "Ecosystem Hive Mind", hp: 1000, hpMax: 1000, attack: 45 })
      setBattleLogs([{ id: "coop-start", round: 1, message: `🌍 Joined Co-op Raid. Colossal Behemoth: ${payload.boss?.name} spotted!`, type: "status" }])
      setTurn(1)
      setTurnSubmitted(false)
      setIsMultiplayer(true)
      setPhase("PLAYING_COOP")
    })

    channel.on('broadcast', { event: 'raid-action' }, ({ payload }) => {
      addEventRaid(payload.message, payload.type)
      if (payload.action === "heal-team") {
        // Heal teammates slightly
        setCreature(prev => ({ ...prev, hp: Math.min(prev.hpMax, prev.hp + 20) }))
      }
    })

    channel.on('broadcast', { event: 'boss-turn' }, ({ payload }) => {
      const { targetId, damage, eventMsg } = payload
      addEventRaid(eventMsg, "defend")
      if (targetId === myPresId) {
        setCreature(prev => {
          const nextHp = Math.max(0, prev.hp - damage)
          if (nextHp <= 0) {
            setPhase("RESULTS")
            setCombatOutcome("defeat")
            saveResult(score)
          }
          return { ...prev, hp: nextHp }
        })
      }
    })

    channel.on('broadcast', { event: 'boss-damaged' }, ({ payload }) => {
      setRaidBoss(prev => prev ? { ...prev, hp: Math.max(0, prev.hp - payload.damage) } : null)
      if (payload.bossHp <= 0) {
        setPhase("RESULTS")
        setCombatOutcome("victory")
        saveResult(score + 200)
      }
    })

    channel.on('broadcast', { event: 'submit-turn' }, ({ payload }) => {
      setPlayers(prev => prev.map(p => p.presenceId === payload.presenceId ? { ...p, turnSubmitted: true } : p))
    })

    channel.on('broadcast', { event: 'next-round' }, () => {
      setTurn(t => t + 1)
      setTurnSubmitted(false)
      // core regen
      if (creature.mutations.includes("regenerative_core")) {
        setCreature(prev => ({ ...prev, hp: Math.min(prev.hpMax, prev.hp + 15) }))
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          name: username,
          isHost: amHost,
          isReady: false,
          turnSubmitted: false,
          creature
        })
      }
    })

    setPhase("MULTIPLAYER_LOBBY")
  }

  // Lobby Ready toggler
  const toggleReady = () => {
    const me = players.find(p => p.presenceId === myPresenceId)
    if (!me) return
    const nextReady = !me.isReady
    if (channelRef.current) {
      channelRef.current.track({
        name: username,
        isHost,
        isReady: nextReady,
        creature
      })
    }
  }

  // Start Co-op Raid (Host only)
  const startCoopRaid = () => {
    if (!isHost || !channelRef.current) return
    const boss = { name: "Abyssal Leviathan", hp: 800 + players.length * 200, hpMax: 800 + players.length * 200, attack: 40 + players.length * 5 }
    channelRef.current.send({
      type: 'broadcast',
      event: 'start-coop',
      payload: { boss }
    })
  }

  // Add event helper to raid logs
  const addEventRaid = (msg: string, type: BattleLog["type"]) => {
    setBattleLogs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, round: turn, message: msg, type }])
  }

  // Co-op player actions
  const performRaidAttack = () => {
    if (!raidBoss || turnSubmitted) return
    const baseDamage = Math.max(5, Math.floor(creature.attack * (0.8 + Math.random() * 0.4) - 10))
    const dmg = creature.mutations.includes("venomous_stinger") ? baseDamage + 12 : baseDamage

    channelRef.current.send({
      type: 'broadcast',
      event: 'boss-damaged',
      payload: { damage: dmg, bossHp: raidBoss.hp - dmg }
    })

    channelRef.current.send({
      type: 'broadcast',
      event: 'raid-action',
      payload: { message: `⚔️ ${username} dealt ${dmg} damage to the Boss!`, type: 'attack' }
    })

    setScore(s => s + 20)
    setTurnSubmitted(true)

    channelRef.current.send({
      type: 'broadcast',
      event: 'submit-turn',
      payload: { presenceId: myPresenceId }
    })
  }

  const performRaidHeal = () => {
    if (!raidBoss || turnSubmitted) return
    if (!creature.mutations.includes("regenerative_core")) {
      triggerAlert("Need Regenerative Core mutation to heal teammates!", false)
      return
    }

    channelRef.current.send({
      type: 'broadcast',
      event: 'raid-action',
      payload: { message: `🌋 ${username} activated biosonic heal, healing team for +20 HP!`, type: 'heal', action: 'heal-team' }
    })

    setScore(s => s + 30)
    setTurnSubmitted(true)

    channelRef.current.send({
      type: 'broadcast',
      event: 'submit-turn',
      payload: { presenceId: myPresenceId }
    })
  }

  // Host checks turn submissions and runs Boss turn logic
  useEffect(() => {
    if (!isMultiplayer || !isHost || !channelRef.current || !raidBoss) return
    const activePlayers = players.filter(p => p.hp > 0 || p.creature.hp > 0)
    if (activePlayers.length === 0) return

    const allSubmitted = activePlayers.every(p => {
      if (p.presenceId === myPresenceId) return turnSubmitted
      return p.turnSubmitted
    })

    if (allSubmitted) {
      // Boss attacks a random target
      const target = activePlayers[Math.floor(Math.random() * activePlayers.length)]
      const dmg = Math.max(10, Math.floor(raidBoss.attack * (0.7 + Math.random() * 0.5)))
      const msg = `⚡ Boss unleashed seismic slam targeting ${target.name} for ${dmg} damage!`

      channelRef.current.send({
        type: 'broadcast',
        event: 'boss-turn',
        payload: { targetId: target.presenceId, damage: dmg, eventMsg: msg }
      })

      // Advance round
      setTimeout(() => {
        channelRef.current.send({
          type: 'broadcast',
          event: 'next-round'
        })
      }, 800)
    }
  }, [players, turnSubmitted, isMultiplayer, isHost, raidBoss])

  const leaveLobby = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    setIsMultiplayer(false)
    setPhase("MENU")
  }

  // ── BUILD JSX ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/playlab" className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all">
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </Link>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">PlayLab Experience</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              🦠 Creature Forge
            </h1>
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

      {/* Alert toast banner */}
      {alertMsg && (
        <div className={`p-4 rounded-xl border text-sm font-bold animate-in slide-in-from-top duration-300 ${alertMsg.success ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400" : "bg-red-950/40 border-red-500/20 text-red-400"}`}>
          {alertMsg.text}
        </div>
      )}

      {/* ── MENU PHASE ───────────────────────────────────────────────────────── */}
      {phase === "MENU" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-black to-zinc-950 p-8 space-y-6">
              <div>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">Evolution Chamber</span>
                <h2 className="text-xl font-black text-white mt-3">Design & Evolve Organisms</h2>
                <p className="text-sm text-gray-400 mt-1">Mutate wings, spiked carapace, venomous stingers, or regenerative core. Advance through campaign stages or form co-op teams to raid ecosystem bosses.</p>
              </div>

              {/* Mutation Quick Preview Tree */}
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">Biological Mutations Available</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MUTATIONS.map(m => (
                    <div key={m.id} onClick={() => setPreviewMutation(m)}
                      className={`p-3 border rounded-xl cursor-pointer hover:bg-white/10 transition-all text-center ${previewMutation?.id === m.id ? "border-emerald-500/50 bg-emerald-950/20" : "border-white/5 bg-white/5"}`}>
                      <span className="text-2xl block mb-1">{m.emoji}</span>
                      <span className="text-[10px] font-black text-white block truncate">{m.name}</span>
                    </div>
                  ))}
                </div>

                {previewMutation && (
                  <div className={`p-4 rounded-xl border animate-in fade-in duration-200 ${previewMutation.glowColor}`}>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">{previewMutation.emoji} {previewMutation.name}</h4>
                    <p className="text-xs text-gray-400 mt-1">{previewMutation.description}</p>
                    <p className="text-[10px] text-yellow-400 font-extrabold mt-2">⚡ Special: {previewMutation.specialEffect}</p>
                    <div className="grid grid-cols-4 gap-2 mt-3 text-[10px] text-gray-400">
                      <span>⚔️ Att: +{previewMutation.stats.attack}</span>
                      <span>🛡️ Def: +{previewMutation.stats.defense}</span>
                      <span>💨 Spd: +{previewMutation.stats.speed}</span>
                      <span>❤️ HP: +{previewMutation.stats.HPMax}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={startCampaign} className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold py-6 rounded-2xl text-base shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all gap-2">
                  <Activity className="h-5 w-5 animate-pulse" /> Solo Campaign
                </Button>
                <Button onClick={() => setPhase("MULTIPLAYER_SETUP")} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-6 rounded-2xl text-base shadow-lg shadow-purple-500/20 hover:scale-[1.02] transition-all gap-2">
                  <Users className="h-5 w-5" /> Co-op Raid Lobby
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/5 bg-white/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Organism Apex Stages</h3>
              </div>
              {BOSS_PREDATORS.map(b => (
                <div key={b.name} className="flex items-start gap-2 p-2 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-xl">{b.flag}</span>
                  <div>
                    <h5 className="text-xs font-bold text-white">{b.name}</h5>
                    <p className="text-[10px] text-gray-400">⚔️ {b.attack} | 🛡️ {b.defense} | HP: {b.hpMax}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-white/5 bg-white/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Evolution Records</h3>
              </div>
              {highScore > 0 ? (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <p className="text-xs font-bold text-yellow-400">Personal Best Score</p>
                  <p className="text-xl font-black text-white">{highScore} pts</p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-500 italic text-center py-2">No campaign records completed yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MULTIPLAYER SETUP SCREEN ────────────────────────────────────────────── */}
      {phase === "MULTIPLAYER_SETUP" && (
        <div className="w-full max-w-md mx-auto bg-zinc-950 p-8 rounded-3xl border border-white/10 space-y-6 animate-in fade-in duration-300">
          <div className="text-center space-y-2">
            <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs uppercase tracking-widest font-black rounded-full">
              Real-Time Raid Setup
            </span>
            <h2 className="text-2xl font-black text-white">Raid Command Room</h2>
            <p className="text-xs text-gray-400">Assemble team of mutated organisms to take down bosses.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Your Display Name</label>
              <input
                type="text"
                placeholder="Enter name..."
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none text-white focus:border-purple-500/50 text-sm"
              />
            </div>

            <div className="border-t border-white/5 pt-4 grid grid-cols-1 gap-3">
              <Button
                onClick={createRoom}
                disabled={!username.trim()}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Host New Ecosystem Raid
              </Button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-[10px] text-gray-500 uppercase font-black">OR JOIN WITH CODE</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="CODE"
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value.toUpperCase())}
                  className="flex-1 min-w-0 px-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none text-white focus:border-purple-500/50 text-center font-black tracking-widest text-lg"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={!username.trim() || roomInput.length !== 4}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <LogIn className="h-4 w-4" /> Join
                </Button>
              </div>
            </div>

            <Button onClick={() => setPhase("MENU")} className="w-full bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/5">
              Back to Menu
            </Button>
          </div>
        </div>
      )}

      {/* ── MULTIPLAYER LOBBY SCREEN ────────────────────────────────────────────── */}
      {phase === "MULTIPLAYER_LOBBY" && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch animate-in fade-in duration-300">
          <div className="lg:col-span-2 bg-zinc-950 p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div>
                <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">
                  Match Lobby
                </span>
                <h2 className="text-2xl font-black text-white mt-1">Raid Room: {roomCode}</h2>
                <p className="text-xs text-gray-400">
                  {isHost ? "You are the host. Choose starting mutations and launch raid." : "Waiting for host to start the ecosystem raid."}
                </p>
              </div>

              {/* Lobby Mutation quick purchase */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase">Mutate Organism (DNA: {creature.dna})</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {MUTATIONS.map(m => {
                    const owned = creature.mutations.includes(m.id)
                    return (
                      <div key={m.id} onClick={() => {
                        if (!owned && creature.dna >= m.cost) {
                          evolveMutation(m)
                          // track presence update
                          if (channelRef.current) {
                            channelRef.current.track({
                              name: username,
                              isHost,
                              isReady: players.find(p => p.presenceId === myPresenceId)?.isReady || false,
                              creature: { ...creature, mutations: [...creature.mutations, m.id] }
                            })
                          }
                        }
                      }}
                        className={`p-3 border rounded-xl cursor-pointer transition-all ${owned ? "border-emerald-500 bg-emerald-950/20" : "bg-white/5 border-white/5 hover:bg-white/10"}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{m.emoji} {m.name}</span>
                          <span className="text-[10px] text-emerald-400">{owned ? "Active" : `${m.cost} DNA`}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
              <Button onClick={toggleReady} className={`flex-1 py-4 rounded-xl font-bold ${players.find(p => p.presenceId === myPresenceId)?.isReady ? "bg-green-600 hover:bg-green-500" : "bg-zinc-800 hover:bg-zinc-700"} text-white`}>
                {players.find(p => p.presenceId === myPresenceId)?.isReady ? "Ready! ✓" : "Set Ready"}
              </Button>
              {isHost && (
                <Button onClick={startCoopRaid} disabled={players.length < 2 || !players.every(p => p.isReady)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-4 rounded-xl disabled:opacity-35">
                  ⚔️ Launch Raid
                </Button>
              )}
              <Button onClick={leaveLobby} className="bg-red-950/40 hover:bg-red-900/40 text-red-400 px-4 rounded-xl border border-red-500/20">
                Leave
              </Button>
            </div>
          </div>

          <div className="bg-zinc-950 p-6 rounded-3xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Raid Commanders ({players.length})</h3>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.presenceId} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🦠</span>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {p.name} {p.isHost && <Crown className="h-3 w-3 text-yellow-400" />}
                      </h4>
                      <p className="text-[10px] text-gray-400">Mutations: {p.creature?.mutations?.length || 0}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.isReady ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {p.isReady ? "Ready" : "Lobby"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PLAYING SOLO SCREEN ────────────────────────────────────────────────── */}
      {phase === "PLAYING_SOLO" && activeEnemy && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          <div className="lg:col-span-2 space-y-5">

            {/* Creature status card */}
            <div className="rounded-3xl border border-emerald-500/30 p-6 bg-gradient-to-br from-emerald-950/30 to-zinc-900 space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest">Stage {campaignStage} (Solo Campaign)</span>
                  <h2 className="text-xl font-black text-white">🦠 {creature.name} (Lv.{creature.level})</h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">DNA Points</span>
                  <span className="text-2xl font-black text-emerald-400">{creature.dna}</span>
                </div>
              </div>

              {/* HP Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-bold">🧬 Organism Integrity</span>
                  <span className="font-black text-white">{creature.hp} / {creature.hpMax} HP</span>
                </div>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-green-500 transition-all duration-500" style={{ width: `${(creature.hp / creature.hpMax) * 100}%` }} />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Attack</span>
                  <span className="font-bold text-white">{creature.attack}</span>
                </div>
                <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Defense</span>
                  <span className="font-bold text-white">{creature.defense}</span>
                </div>
                <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Speed</span>
                  <span className="font-bold text-white">{creature.speed}</span>
                </div>
                <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Mutations</span>
                  <span className="font-bold text-emerald-400">{creature.mutations.length} / 8</span>
                </div>
              </div>

              {/* Visual active mutations */}
              {creature.mutations.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {creature.mutations.map(mId => {
                    const m = MUTATIONS.find(x => x.id === mId)
                    return (
                      <span key={mId} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-lg flex items-center gap-1">
                        {m?.emoji} {m?.name}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Action buttons */}
              {combatOutcome ? (
                <div className="pt-2">
                  {combatOutcome === "victory" ? (
                    <Button onClick={nextCampaignMatch} className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold py-3.5 rounded-2xl">
                      Next Battle Stage <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={() => setPhase("MENU")} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-2xl">
                      Back to Evolution Menu
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button onClick={handleAttack} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl gap-1.5">
                    <Sword className="h-4 w-4" /> Physical Attack
                  </Button>
                  <Button onClick={handleDefend} className="bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-bold py-4 rounded-xl gap-1.5">
                    <Shield className="h-4 w-4" /> Shield Block
                  </Button>
                </div>
              )}
            </div>

            {/* Battle log chronicle */}
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" /> Evolutionary Chronicle
              </h3>
              <div ref={logContainerRef} className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {battleLogs.map(log => (
                  <div key={log.id} className={`p-2.5 rounded-xl border text-xs leading-relaxed ${log.type === "attack" ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" : log.type === "defend" ? "bg-blue-950/20 border-blue-500/20 text-blue-300" : log.type === "heal" ? "bg-orange-950/20 border-orange-500/20 text-orange-300" : log.type === "victory" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300 font-bold" : log.type === "defeat" ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-white/5 border-white/5 text-gray-400"}`}>
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar: DNA mutations tree */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/5 bg-white/5 p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5"><Plus className="h-4 w-4 text-emerald-400" /> Evolve Organism</h3>
              <div className="space-y-2">
                {MUTATIONS.map(mut => {
                  const owned = creature.mutations.includes(mut.id)
                  const cannotAfford = creature.dna < mut.cost
                  return (
                    <div key={mut.id} className={`p-3 rounded-xl border ${owned ? "border-emerald-500/40 bg-emerald-950/20" : "border-white/5 bg-white/5"} flex justify-between items-center transition-all`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{mut.emoji}</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">{mut.name}</h4>
                          <p className="text-[8px] text-gray-400 truncate max-w-[120px]">{mut.description}</p>
                        </div>
                      </div>
                      <button
                        disabled={owned || cannotAfford || combatOutcome !== null}
                        onClick={() => evolveMutation(mut)}
                        className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${owned ? "bg-emerald-500/10 text-emerald-400 cursor-default" : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30"}`}>
                        {owned ? "Active" : `${mut.cost} DNA`}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Target Opponent Card */}
            {activeEnemy && (
              <div className="rounded-3xl border border-white/5 bg-zinc-950 p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-red-500 font-bold">Wild Threat</span>
                    <h3 className="text-sm font-black text-white">{activeEnemy.flag} {activeEnemy.name}</h3>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${activeEnemy.isBoss ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-white/5 text-gray-400"}`}>
                    {activeEnemy.isBoss ? "Stage Boss" : "Wild Predator"}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Threat Integrity</span>
                    <span>{activeEnemy.hp} / {activeEnemy.hpMax} HP</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: `${(activeEnemy.hp / activeEnemy.hpMax) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PLAYING COOP SCREEN ────────────────────────────────────────────────── */}
      {phase === "PLAYING_COOP" && raidBoss && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          <div className="lg:col-span-2 space-y-5">

            {/* Boss Threat status */}
            <div className="rounded-3xl border border-red-500/30 p-6 bg-gradient-to-br from-red-950/20 to-zinc-950 space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-red-400 tracking-widest">Colossal Threat Raid</span>
                  <h2 className="text-xl font-black text-white">👿 {raidBoss.name}</h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">Round</span>
                  <span className="text-2xl font-black text-white">{turn}</span>
                </div>
              </div>

              {/* Boss HP Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-bold">🔴 Colossus HP</span>
                  <span className="font-black text-white">{raidBoss.hp} / {raidBoss.hpMax} HP</span>
                </div>
                <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-700 to-rose-500 transition-all duration-500" style={{ width: `${(raidBoss.hp / raidBoss.hpMax) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Co-op Player own panel */}
            <div className="rounded-3xl border border-emerald-500/20 bg-zinc-900 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-white">🦠 Your Organism Stats</h3>
                <span className="text-xs text-gray-400">{creature.hp} / {creature.hpMax} HP</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(creature.hp / creature.hpMax) * 100}%` }} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button onClick={performRaidAttack} disabled={turnSubmitted || creature.hp <= 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl">
                  ⚔️ Broadcast Attack
                </Button>
                <Button onClick={performRaidHeal} disabled={turnSubmitted || creature.hp <= 0}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl">
                  🌋 Team Heal (+20 HP)
                </Button>
              </div>

              {turnSubmitted && (
                <p className="text-[10px] text-gray-400 text-center italic animate-pulse">Action locked in. Awaiting other commanders...</p>
              )}
            </div>

            {/* Chronicle logs */}
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Raid Feed</h3>
              <div ref={logContainerRef} className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {battleLogs.map(log => (
                  <div key={log.id} className={`p-2.5 rounded-xl border text-xs leading-relaxed ${log.type === "attack" ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" : log.type === "defend" ? "bg-red-950/20 border-red-500/20 text-red-300" : log.type === "heal" ? "bg-green-950/20 border-green-500/20 text-green-300 font-extrabold" : "bg-white/5 border-white/5 text-gray-400"}`}>
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar: Teammates status */}
          <div className="bg-zinc-950 p-6 rounded-3xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Co-op Squad</h3>
            <div className="space-y-3">
              {players.map(p => (
                <div key={p.presenceId} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{p.name}</span>
                    <span className="text-[10px] text-gray-400">{p.creature.hp} HP</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(p.creature.hp / p.creature.hpMax) * 100}%` }} />
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${p.turnSubmitted ? "bg-purple-500/20 text-purple-400 animate-pulse" : "bg-white/5 text-gray-500"}`}>
                    {p.turnSubmitted ? "Locked In" : "Deciding"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS PHASE ──────────────────────────────────────────────────────── */}
      {phase === "RESULTS" && (
        <div className={`max-w-md mx-auto border p-8 rounded-3xl text-center space-y-6 ${combatOutcome === "defeat" ? "bg-gradient-to-br from-red-950/60 via-zinc-900 to-black border-red-500/40" : "bg-gradient-to-br from-emerald-900 via-zinc-800 to-black border-emerald-500/30"}`}
          style={combatOutcome !== "defeat" ? { boxShadow: "0 0 60px 20px rgba(16,185,129,0.15)" } : undefined}>
          <div className={`inline-flex p-4 rounded-full ${combatOutcome === "defeat" ? "bg-red-500/10 border border-red-500/30 text-red-500" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 animate-bounce"}`}>
            {combatOutcome === "defeat" ? <AlertTriangle className="h-10 w-10 animate-pulse" /> : <Crown className="h-10 w-10" />}
          </div>
          <div>
            <h2 className={`text-2xl font-black ${combatOutcome === "defeat" ? "text-red-400" : "text-white"}`}>
              {combatOutcome === "defeat" ? "💀 Evolutionary Failure!" : "🏆 Apex Species Created!"}
            </h2>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-2 leading-relaxed">
              {combatOutcome === "defeat" ? "Your organism failed to adapt and collapsed." : "Your organism conquered the ecosystem."}
            </p>
          </div>
          <div className="bg-black/60 border border-white/5 p-4 rounded-2xl grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Campaign Score</span>
              <span className="text-2xl font-black text-yellow-400">{score}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Creature Level</span>
              <span className="text-2xl font-black text-white">{creature.level}</span>
            </div>
          </div>
          {combatOutcome !== "defeat" && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-300 font-bold">
              🪙 +{Math.max(1, Math.floor(score / 25))} PlayLab Coins earned!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => {
              if (isMultiplayer) {
                setPhase("MULTIPLAYER_LOBBY")
              } else {
                startCampaign()
              }
            }} className={`flex-1 ${combatOutcome === "defeat" ? "bg-red-700 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-500"} font-extrabold py-3.5 rounded-2xl text-sm text-white`}>
              <RotateCcw className="h-4 w-4 mr-1 animate-spin" /> {isMultiplayer ? "Back to Lobby" : "Evolve Again"}
            </Button>
            <Button onClick={leaveLobby} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl py-3.5 text-sm border border-white/10">
              Main Menu
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
