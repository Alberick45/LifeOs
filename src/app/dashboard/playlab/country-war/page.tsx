"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ArrowLeft, Globe, Sword, Shield, Zap, Trophy, Star, ShoppingBag, Play, RotateCcw, Crown, TrendingUp, Users, AlertTriangle, Check, Lock, Crosshair, HandshakeIcon, Plus, LogIn, RefreshCw, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { readCoins, adjustCoins, onCoinsChange, loadProgress, saveProgress, saveHighScore } from "@/lib/playlab-coins"

// ─── Types ─────────────────────────────────────────────────────────────────────
type GamePhase = "MENU" | "MULTIPLAYER_SETUP" | "MULTIPLAYER_LOBBY" | "PLAYING" | "RESULTS"
type DiplomacyStatus = "neutral" | "allied" | "war" | "sanctioned"

interface Nation {
  id: string
  name: string
  flag: string
  color: string
  borderColor: string
  glowColor: string
  description: string
  startBonus: { gold: number; food: number; military: number; influence: number }
  trait: string
  traitDesc: string
}

interface AICountry {
  id: string
  name: string
  flag: string
  gold: number
  food: number
  military: number
  influence: number
  hp: number
  personality: "aggressive" | "economic" | "diplomatic"
  diplomacy: DiplomacyStatus
  color: string
}

interface GameEvent {
  id: string
  turn: number
  message: string
  type: "war" | "alliance" | "economy" | "spy" | "event" | "victory" | "defeat"
}

interface ActiveUpgrade {
  id: string
  name: string
  effect: string
  turnsLeft: number
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const NATIONS: Nation[] = [
  {
    id: "auroria",
    name: "Auroria",
    flag: "🌟",
    color: "from-yellow-950/80 to-amber-900/60",
    borderColor: "border-yellow-500/40",
    glowColor: "shadow-yellow-500/20",
    description: "A prosperous trade empire. Born rich but lightly armed.",
    startBonus: { gold: 120, food: 80, military: 40, influence: 60 },
    trait: "Trade Mastery",
    traitDesc: "+30% gold income every turn"
  },
  {
    id: "ironclad",
    name: "Ironclad",
    flag: "⚔️",
    color: "from-red-950/80 to-rose-900/60",
    borderColor: "border-red-500/40",
    glowColor: "shadow-red-500/20",
    description: "A military superpower. Strong armies, thin coffers.",
    startBonus: { gold: 50, food: 60, military: 140, influence: 50 },
    trait: "War Machine",
    traitDesc: "+40% military strength on attacks"
  },
  {
    id: "verdania",
    name: "Verdania",
    flag: "🌿",
    color: "from-green-950/80 to-emerald-900/60",
    borderColor: "border-green-500/40",
    glowColor: "shadow-green-500/20",
    description: "A fertile agricultural nation with diplomatic finesse.",
    startBonus: { gold: 70, food: 140, military: 30, influence: 60 },
    trait: "Fertile Lands",
    traitDesc: "+25% food income, allies grow faster"
  },
  {
    id: "nexora",
    name: "Nexora",
    flag: "🔬",
    color: "from-cyan-950/80 to-blue-900/60",
    borderColor: "border-cyan-500/40",
    glowColor: "shadow-cyan-500/20",
    description: "A tech-forward nation with elite spy networks.",
    startBonus: { gold: 80, food: 60, military: 60, influence: 100 },
    trait: "Intelligence Grid",
    traitDesc: "Spy missions cost 40% less coins"
  },
]

const AI_TEMPLATES: Omit<AICountry, "diplomacy">[] = [
  { id: "kravox", name: "Kravox Empire", flag: "🦅", gold: 80, food: 70, military: 100, influence: 50, hp: 100, personality: "aggressive", color: "text-red-400" },
  { id: "solenne", name: "Solenne Republic", flag: "☀️", gold: 110, food: 90, military: 50, influence: 80, hp: 100, personality: "economic", color: "text-yellow-400" },
  { id: "meridax", name: "Meridax Pact", flag: "🌊", gold: 60, food: 80, military: 70, influence: 100, hp: 100, personality: "diplomatic", color: "text-blue-400" },
]

const SHOP_ITEMS = [
  { id: "barracks", name: "Build Barracks", cost: 60, icon: "🏰", effect: "+30 Military", field: "military" as const, value: 30 },
  { id: "granary", name: "Expand Granary", cost: 40, icon: "🌾", effect: "+25 Food", field: "food" as const, value: 25 },
  { id: "mint", name: "Open Royal Mint", cost: 50, icon: "💰", effect: "+40 Gold", field: "gold" as const, value: 40 },
  { id: "embassy", name: "Build Embassy", cost: 70, icon: "🏛️", effect: "+35 Influence", field: "influence" as const, value: 35 },
]

const RANDOM_EVENTS = [
  { message: "🌾 Bumper harvest! +20 Food.", resource: "food", value: 20 },
  { message: "💎 Gold vein discovered! +30 Gold.", resource: "gold", value: 30 },
  { message: "🌪️ Storm damages crops. -15 Food.", resource: "food", value: -15 },
  { message: "📦 Trade route established! +25 Gold.", resource: "gold", value: 25 },
  { message: "⚡ Insurgency suppressed. -10 Military.", resource: "military", value: -10 },
  { message: "🤝 Foreign envoys arrive. +20 Influence.", resource: "influence", value: 20 },
  { message: "🔥 Border fire! -20 Food.", resource: "food", value: -20 },
  { message: "🏦 Economic boom! +40 Gold.", resource: "gold", value: 40 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initAI(): AICountry[] {
  return AI_TEMPLATES.map(t => ({ ...t, diplomacy: "neutral" as DiplomacyStatus }))
}

function clamp(v: number, min = 0, max = 999) { return Math.max(min, Math.min(max, v)) }

function getNationDetails(nationId: string): Nation {
  return NATIONS.find(n => n.id === nationId) || NATIONS[0]
}

// ─── Resource Bar ─────────────────────────────────────────────────────────────
function ResourceBar({ icon, label, value, max = 300, color }: { icon: string; label: string; value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400 flex items-center gap-1">{icon} {label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CountryWarPage() {
  const [phase, setPhase] = useState<GamePhase>("MENU")
  const [userId, setUserId] = useState<string | null>(null)
  const [coins, setCoins] = useState(100)
  const [highScore, setHighScore] = useState(0)

  // Nation / player state
  const [selectedNation, setSelectedNation] = useState<Nation>(NATIONS[0])
  const [gold, setGold] = useState(0)
  const [food, setFood] = useState(0)
  const [military, setMilitary] = useState(0)
  const [influence, setInfluence] = useState(0)
  const [hp, setHp] = useState(100)
  const [turn, setTurn] = useState(1)
  const [score, setScore] = useState(0)

  // AI nations
  const [aiCountries, setAiCountries] = useState<AICountry[]>([])

  // Events log
  const [events, setEvents] = useState<GameEvent[]>([])
  const [lastEvent, setLastEvent] = useState<GameEvent | null>(null)

  // Turn action tracking
  const [actionUsed, setActionUsed] = useState(false)
  const [activeUpgrades, setActiveUpgrades] = useState<ActiveUpgrade[]>([])

  // Win/lose
  const [victoryType, setVictoryType] = useState<string>("")

  // Multiplayer specific states
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [roomCode, setRoomCode] = useState("")
  const [roomInput, setRoomInput] = useState("")
  const [username, setUsername] = useState("Player")
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState<any[]>([])
  const [myPresenceId, setMyPresenceId] = useState("")
  const [allianceProposalFrom, setAllianceProposalFrom] = useState<{ fromId: string; fromName: string } | null>(null)
  const [turnSubmitted, setTurnSubmitted] = useState(false)
  const [multiplayerDiplomacy, setMultiplayerDiplomacy] = useState<Record<string, DiplomacyStatus>>({})

  const channelRef = useRef<any>(null)

  // Load auth, sync progress from Supabase + localStorage, subscribe to coin updates
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

      // Load merged progress (Supabase wins, merged with localStorage)
      const progress = await loadProgress(resolvedUserId)
      setCoins(progress.coins)
      setHighScore(progress.high_scores?.country_war ?? 0)

      // Subscribe to coin updates using the resolved user ID
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

  // ── Log event ───────────────────────────────────────────────────────────────
  const addEvent = (message: string, type: GameEvent["type"]) => {
    const ev: GameEvent = { id: `${Date.now()}`, turn, message, type }
    setEvents(prev => [ev, ...prev].slice(0, 30))
    setLastEvent(ev)
  }

  // ── Start game (Solo Campaign) ──────────────────────────────────────────────
  const startGame = useCallback(() => {
    setIsMultiplayer(false)
    setGold(selectedNation.startBonus.gold)
    setFood(selectedNation.startBonus.food)
    setMilitary(selectedNation.startBonus.military)
    setInfluence(selectedNation.startBonus.influence)
    setHp(100)
    setTurn(1)
    setScore(0)
    setAiCountries(initAI())
    setEvents([{ id: "start", turn: 0, message: `${selectedNation.flag} ${selectedNation.name} has risen. The world is watching.`, type: "event" }])
    setLastEvent(null)
    setActionUsed(false)
    setActiveUpgrades([])
    setPhase("PLAYING")
  }, [selectedNation])

  // ── End turn: AI acts + resource income (Solo Campaign only) ────────────────
  const endTurn = useCallback(() => {
    let newGold = gold
    let newFood = food
    let newMilitary = military
    let newInfluence = influence
    let newHp = hp
    let newScore = score + 10

    // Trait bonus
    if (selectedNation.id === "auroria") newGold += Math.floor(newGold * 0.3)
    if (selectedNation.id === "verdania") newFood += Math.floor(newFood * 0.25)

    // Base income per turn
    newGold = clamp(newGold + 15)
    newFood = clamp(newFood + 10)
    newInfluence = clamp(newInfluence + 5)

    // Food feeds military (cost)
    const upkeep = Math.floor(newMilitary / 5)
    newFood = clamp(newFood - upkeep)

    // Random world event (30% chance)
    if (Math.random() < 0.3) {
      const ev = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)]
      if (ev.resource === "gold") newGold = clamp(newGold + ev.value)
      if (ev.resource === "food") newFood = clamp(newFood + ev.value)
      if (ev.resource === "military") newMilitary = clamp(newMilitary + ev.value)
      if (ev.resource === "influence") newInfluence = clamp(newInfluence + ev.value)
      addEvent(ev.message, "event")
    }

    // AI countries act
    setAiCountries(prev => {
      const updated = prev.map(ai => {
        const nextAi = { ...ai }
        nextAi.gold = clamp(nextAi.gold + 12)
        nextAi.food = clamp(nextAi.food + 8)
        nextAi.military = clamp(nextAi.military + (ai.personality === "aggressive" ? 8 : 3))
        nextAi.influence = clamp(nextAi.influence + (ai.personality === "diplomatic" ? 10 : 4))

        // Aggressive AI may attack if at war
        if (ai.diplomacy === "war" && ai.personality === "aggressive" && Math.random() < 0.4) {
          const dmg = Math.floor(ai.military * 0.15)
          newHp = clamp(newHp - dmg, 0, 100)
          nextAi.military = clamp(nextAi.military - Math.floor(newMilitary * 0.1))
          addEvent(`⚔️ ${ai.name} launched an attack! You took ${dmg} damage.`, "war")
        }

        // Diplomatic AI proposes alliance if neutral and influence high
        if (ai.diplomacy === "neutral" && ai.personality === "diplomatic" && ai.influence > 80 && newInfluence > 60 && Math.random() < 0.25) {
          nextAi.diplomacy = "allied"
          addEvent(`🤝 ${ai.name} proposed an alliance — accepted automatically.`, "alliance")
          newInfluence = clamp(newInfluence + 15)
        }

        return nextAi
      })
      return updated
    })

    // Starvation penalty
    if (newFood <= 0) {
      newHp = clamp(newHp - 10)
      addEvent("🚨 Your people are starving! HP -10", "event")
    }

    // Check defeat
    if (newHp <= 0) {
      setGold(newGold); setFood(newFood); setMilitary(newMilitary); setInfluence(newInfluence); setHp(0); setScore(newScore)
      setVictoryType("defeat")
      setPhase("RESULTS")
      saveResult(newScore)
      return
    }

    // Check economic victory (gold > 800)
    if (newGold >= 800) {
      const finalScore = newScore + newGold + newFood
      setScore(finalScore)
      setVictoryType("economic")
      setPhase("RESULTS")
      saveResult(finalScore)
      return
    }

    // Check military victory (all AI defeated)
    const aliveEnemies = aiCountries.filter(a => a.hp > 0 && a.diplomacy !== "allied")
    if (aliveEnemies.length === 0 && turn >= 3) {
      const finalScore = newScore + newMilitary * 2
      setScore(finalScore)
      setVictoryType("military")
      setPhase("RESULTS")
      saveResult(finalScore)
      return
    }

    setGold(newGold)
    setFood(newFood)
    setMilitary(newMilitary)
    setInfluence(newInfluence)
    setHp(newHp)
    setScore(newScore)
    setTurn(t => t + 1)
    setActionUsed(false)
    setActiveUpgrades(prev => prev.map(u => ({ ...u, turnsLeft: u.turnsLeft - 1 })).filter(u => u.turnsLeft > 0))
  }, [gold, food, military, influence, hp, score, turn, selectedNation, aiCountries])

  // Save result to unified high scores and adjust coins
  const saveResult = (finalScore: number) => {
    if (finalScore > highScore) {
      setHighScore(finalScore)
      saveHighScore(userId, "country_war", finalScore)
    }
    const earned = Math.floor(finalScore / 20)
    if (earned > 0) {
      const next = adjustCoins(userId, earned)
      setCoins(next)
    }
  }

  // ── Multiplayer Lobby Setup ──────────────────────────────────────────────────
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
    setMultiplayerDiplomacy({})

    const channel = supabase.channel(`country-war:${code}`, {
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

    // 1. Sync Lobby Presence
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState()
      const mappedPlayers: any[] = []

      Object.keys(presenceState).forEach(key => {
        const presences = presenceState[key] as any[]
        if (presences.length > 0) {
          const pres = presences[0]
          mappedPlayers.push({
            presenceId: key,
            name: pres.name || "Anonymous",
            isHost: pres.isHost || false,
            nationId: pres.nationId || "auroria",
            isReady: pres.isReady || false,
            turnSubmitted: pres.turnSubmitted || false,
            hp: pres.hp !== undefined ? pres.hp : 100,
            gold: pres.gold !== undefined ? pres.gold : 100,
            food: pres.food !== undefined ? pres.food : 100,
            military: pres.military !== undefined ? pres.military : 100,
            influence: pres.influence !== undefined ? pres.influence : 100,
          })
        }
      })

      setPlayers(mappedPlayers)
    })

    // 2. Broadcast listeners
    // start-game
    channel.on('broadcast', { event: 'start-game' }, ({ payload }) => {
      const hostSelectedPlayers = payload.players || []
      const myInfo = hostSelectedPlayers.find((p: any) => p.presenceId === myPresId)
      const chosenNation = NATIONS.find(n => n.id === (myInfo?.nationId || selectedNation.id)) || NATIONS[0]
      setSelectedNation(chosenNation)

      setGold(chosenNation.startBonus.gold)
      setFood(chosenNation.startBonus.food)
      setMilitary(chosenNation.startBonus.military)
      setInfluence(chosenNation.startBonus.influence)
      setHp(100)
      setTurn(1)
      setScore(0)
      setEvents([{ id: "start", turn: 0, message: `Multiplayer War has begun! ${chosenNation.flag} ${chosenNation.name} is ready.`, type: "event" }])
      setLastEvent(null)
      setActionUsed(false)
      setActiveUpgrades([])
      setIsMultiplayer(true)
      setTurnSubmitted(false)
      setPhase("PLAYING")
    })

    // multiplayer-action (chronicle logger)
    channel.on('broadcast', { event: 'multiplayer-action' }, ({ payload }) => {
      addEvent(payload.message, payload.type)
    })

    // alliance-proposal
    channel.on('broadcast', { event: 'alliance-proposal' }, ({ payload }) => {
      if (payload.toId === myPresId) {
        setAllianceProposalFrom({ fromId: payload.fromId, fromName: payload.fromName })
      }
    })

    // alliance-accepted
    channel.on('broadcast', { event: 'alliance-accepted' }, ({ payload }) => {
      const { fromId, toId } = payload
      const partnerId = fromId === myPresId ? toId : fromId
      setMultiplayerDiplomacy(prev => ({ ...prev, [partnerId]: "allied" }))
      const partnerName = players.find(p => p.presenceId === partnerId)?.name || "Opponent"

      addEvent(`🤝 Alliance formed with ${partnerName}!`, "alliance")
      setInfluence(i => clamp(i + 20))
    })

    // declare-war
    channel.on('broadcast', { event: 'declare-war' }, ({ payload }) => {
      const { fromId, toId } = payload
      if (toId === myPresId) {
        setMultiplayerDiplomacy(prev => ({ ...prev, [fromId]: "war" }))
        const enemyName = players.find(p => p.presenceId === fromId)?.name || "Opponent"
        addEvent(`⚔️ ${enemyName} declared war on you!`, "war")
      }
    })

    // sanction-imposed
    channel.on('broadcast', { event: 'sanction-imposed' }, ({ payload }) => {
      if (payload.toId === myPresId) {
        setGold(g => clamp(g - 30))
        setMultiplayerDiplomacy(prev => ({ ...prev, [payload.fromId]: "sanctioned" }))
        addEvent(`🚫 ${payload.fromName} imposed economic sanctions on you! Gold -30.`, "economy")
      }
    })

    // spy-mission-success
    channel.on('broadcast', { event: 'spy-mission-success' }, ({ payload }) => {
      if (payload.toId === myPresId) {
        const stolen = payload.goldStolen
        setGold(g => clamp(g - stolen))
        addEvent(`🕵️ A spy from ${payload.fromName} stole ${stolen} gold from you!`, "spy")
      }
    })

    // multiplayer-attack
    channel.on('broadcast', { event: 'multiplayer-attack' }, ({ payload }) => {
      if (payload.defenderId === myPresId) {
        const attackerName = payload.attackerName
        const myDefPower = military * (selectedNation.id === "verdania" ? 1.25 : 1.0)
        const attPower = payload.militaryPower
        const roll = Math.random()
        const winChance = attPower / (attPower + myDefPower)

        const isSuccess = roll < winChance
        if (isSuccess) {
          const dmg = Math.floor(myDefPower * 0.2) + 10
          const nextHp = clamp(hp - dmg, 0, 100)
          setHp(nextHp)
          setMilitary(m => clamp(m - 15))
          addEvent(`💥 Attack from ${attackerName} succeeded! Took ${dmg} stability damage.`, "war")

          channel.send({
            type: 'broadcast',
            event: 'multiplayer-attack-resolved',
            payload: {
              attackerId: payload.attackerId,
              attackerName: payload.attackerName,
              defenderId: myPresId,
              defenderName: username,
              success: true,
              damage: dmg,
              defenderHp: nextHp,
            }
          })

          // Track presence update
          channel.track({
            name: username,
            isHost: amHost,
            nationId: selectedNation.id,
            isReady: true,
            turnSubmitted,
            hp: nextHp,
            gold,
            food,
            military: clamp(military - 15),
            influence
          })

          if (nextHp <= 0) {
            addEvent(`💀 Your nation collapsed under the weight of ${attackerName}'s assault!`, "defeat")
            setPhase("RESULTS")
            setVictoryType("defeat")
            saveResult(score)
          }
        } else {
          addEvent(`🛡️ You successfully defended against ${attackerName}'s attack!`, "war")
          channel.send({
            type: 'broadcast',
            event: 'multiplayer-attack-resolved',
            payload: {
              attackerId: payload.attackerId,
              attackerName: payload.attackerName,
              defenderId: myPresId,
              defenderName: username,
              success: false,
              damage: 0,
              defenderHp: hp,
            }
          })
        }
      }
    })

    // multiplayer-attack-resolved
    channel.on('broadcast', { event: 'multiplayer-attack-resolved' }, ({ payload }) => {
      const { attackerId, success, damage, defenderName, attackerName } = payload
      if (success) {
        addEvent(`⚔️ ${attackerName} successfully attacked ${defenderName}! Dealt ${damage} damage.`, "war")
        if (attackerId === myPresId) {
          setScore(s => s + 50)
        }
      } else {
        addEvent(`🛡️ ${defenderName} defended against ${attackerName}'s attack.`, "war")
      }
    })

    // submit-turn
    channel.on('broadcast', { event: 'submit-turn' }, ({ payload }) => {
      setPlayers(prev => prev.map(p => p.presenceId === payload.presenceId ? { ...p, turnSubmitted: true } : p))
    })

    // turn-advance
    channel.on('broadcast', { event: 'turn-advance' }, ({ payload }) => {
      const worldEvent = payload.worldEvent

      // Local turn increment
      setTurn(t => t + 1)
      setTurnSubmitted(false)
      setActionUsed(false)
      setActiveUpgrades(prev => prev.map(u => ({ ...u, turnsLeft: u.turnsLeft - 1 })).filter(u => u.turnsLeft > 0))

      // Income calculation
      setGold(g => {
        let inc = 15
        if (selectedNation.id === "auroria") inc += Math.floor(inc * 0.3)
        return clamp(g + inc)
      })
      setFood(f => {
        let inc = 10
        if (selectedNation.id === "verdania") inc += Math.floor(inc * 0.25)
        const upkeep = Math.floor(military / 5)
        return clamp(f + inc - upkeep)
      })
      setInfluence(i => clamp(i + 5))
      setScore(s => s + 10)

      if (worldEvent) {
        setGold(g => worldEvent.resource === "gold" ? clamp(g + worldEvent.value) : g)
        setFood(f => worldEvent.resource === "food" ? clamp(f + worldEvent.value) : f)
        setMilitary(m => worldEvent.resource === "military" ? clamp(m + worldEvent.value) : m)
        setInfluence(i => worldEvent.resource === "influence" ? clamp(i + worldEvent.value) : i)
        addEvent(worldEvent.message, "event")
      }

      // Re-track fresh stats for new turn
      channel.track({
        name: username,
        isHost: amHost,
        nationId: selectedNation.id,
        isReady: true,
        turnSubmitted: false,
        hp,
        gold,
        food,
        military,
        influence
      })

      addEvent(`Turn Advanced to ${turn + 1}`, "event")
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          name: username,
          isHost: amHost,
          nationId: selectedNation.id,
          isReady: false,
          turnSubmitted: false,
          hp: 100,
          gold: selectedNation.startBonus.gold,
          food: selectedNation.startBonus.food,
          military: selectedNation.startBonus.military,
          influence: selectedNation.startBonus.influence,
        })
      }
    })

    setPhase("MULTIPLAYER_LOBBY")
  }

  // Toggle ready state in lobby
  const toggleReady = () => {
    const me = players.find(p => p.presenceId === myPresenceId)
    if (!me) return
    const nextReady = !me.isReady
    if (channelRef.current) {
      channelRef.current.track({
        name: username,
        isHost,
        nationId: selectedNation.id,
        isReady: nextReady,
        turnSubmitted: false,
        hp: 100,
        gold: selectedNation.startBonus.gold,
        food: selectedNation.startBonus.food,
        military: selectedNation.startBonus.military,
        influence: selectedNation.startBonus.influence,
      })
    }
  }

  // Host starts the game
  const startMultiplayerGame = () => {
    if (!isHost || !channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'start-game',
      payload: {
        players: players.map(p => ({ presenceId: p.presenceId, nationId: p.nationId }))
      }
    })
  }

  // Submit Turn (Simultaneous turns)
  const submitTurnMultiplayer = () => {
    setTurnSubmitted(true)
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'submit-turn',
        payload: { presenceId: myPresenceId }
      })
      // Track updated stats
      channelRef.current.track({
        name: username,
        isHost,
        nationId: selectedNation.id,
        isReady: true,
        turnSubmitted: true,
        hp,
        gold,
        food,
        military,
        influence
      })
    }
  }

  // Effect to check if all active players are ready in multiplayer
  useEffect(() => {
    if (!isMultiplayer || !isHost || !channelRef.current) return
    const activePlayers = players.filter(p => p.hp > 0)
    if (activePlayers.length === 0) return

    // Check if everyone has submitted (including host)
    const allSubmitted = activePlayers.every(p => {
      if (p.presenceId === myPresenceId) return turnSubmitted
      return p.turnSubmitted
    })

    if (allSubmitted) {
      let worldEvent = null
      if (Math.random() < 0.3) {
        worldEvent = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)]
      }
      channelRef.current.send({
        type: 'broadcast',
        event: 'turn-advance',
        payload: { worldEvent }
      })
    }
  }, [players, turnSubmitted, isMultiplayer, isHost])

  // Helper to retrieve local relation status
  const myDiplomacyRelation = (oppId: string): DiplomacyStatus => {
    return multiplayerDiplomacy[oppId] ?? "neutral"
  }

  // ── Multiplayer Actions ──────────────────────────────────────────────────────
  const declareWarMultiplayer = (opp: any) => {
    if (actionUsed || myDiplomacyRelation(opp.presenceId) === "war") return
    if (military < 30) { addEvent("⚠️ Need at least 30 Military to declare war.", "event"); return }
    setMultiplayerDiplomacy(prev => ({ ...prev, [opp.presenceId]: "war" }))
    addEvent(`⚔️ You declared war on ${opp.name}!`, "war")

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'declare-war',
        payload: { fromId: myPresenceId, toId: opp.presenceId }
      })
      channelRef.current.send({
        type: 'broadcast',
        event: 'multiplayer-action',
        payload: { message: `⚔️ ${username} declared war on ${opp.name}!`, type: 'war' }
      })
    }
    setActionUsed(true)
  }

  const proposeAllianceMultiplayer = (opp: any) => {
    if (actionUsed || myDiplomacyRelation(opp.presenceId) === "allied") return
    if (influence < 40) { addEvent("⚠️ Need at least 40 Influence to propose an alliance.", "event"); return }

    addEvent(`✉️ Sent alliance proposal to ${opp.name}...`, "event")
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'alliance-proposal',
        payload: { fromId: myPresenceId, fromName: username, toId: opp.presenceId }
      })
    }
    setActionUsed(true)
  }

  const acceptAlliance = () => {
    if (!allianceProposalFrom) return
    const partnerId = allianceProposalFrom.fromId
    setMultiplayerDiplomacy(prev => ({ ...prev, [partnerId]: "allied" }))
    addEvent(`🤝 You accepted alliance from ${allianceProposalFrom.fromName}!`, "alliance")
    setInfluence(i => clamp(i + 20))

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'alliance-accepted',
        payload: { fromId: partnerId, toId: myPresenceId }
      })
    }
    setAllianceProposalFrom(null)
  }

  const launchAttackMultiplayer = (opp: any) => {
    if (actionUsed || myDiplomacyRelation(opp.presenceId) !== "war") return
    if (military < 20) { addEvent("⚠️ Not enough Military to attack.", "event"); return }

    const myPower = military * (selectedNation.id === "ironclad" ? 1.4 : 1.0)
    setMilitary(m => clamp(m - 10))
    addEvent(`💥 Launching attack on ${opp.name}... awaiting defense report.`, "war")

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'multiplayer-attack',
        payload: {
          attackerId: myPresenceId,
          attackerName: username,
          defenderId: opp.presenceId,
          militaryPower: myPower
        }
      })
    }
    setActionUsed(true)
  }

  const imposeSanctionsMultiplayer = (opp: any) => {
    if (actionUsed || myDiplomacyRelation(opp.presenceId) === "sanctioned") return
    if (influence < 30) { addEvent("⚠️ Need 30 Influence to impose sanctions.", "event"); return }
    setMultiplayerDiplomacy(prev => ({ ...prev, [opp.presenceId]: "sanctioned" }))
    setInfluence(i => clamp(i - 20))
    addEvent(`🚫 You imposed economic sanctions on ${opp.name}.`, "economy")

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'sanction-imposed',
        payload: { fromId: myPresenceId, fromName: username, toId: opp.presenceId }
      })
      channelRef.current.send({
        type: 'broadcast',
        event: 'multiplayer-action',
        payload: { message: `🚫 ${username} imposed economic sanctions on ${opp.name}!`, type: 'economy' }
      })
    }
    setActionUsed(true)
  }

  const launchSpyMultiplayer = (opp: any) => {
    if (actionUsed) return
    const spyCost = selectedNation.id === "nexora" ? 30 : 50
    if (coins < spyCost) { addEvent(`⚠️ Need ${spyCost} coins for a spy mission.`, "event"); return }

    adjustCoins(userId, -spyCost)
    setCoins(c => c - spyCost)
    const success = Math.random() < 0.65
    if (success) {
      const stolen = Math.floor((opp.gold || 50) * 0.2)
      setGold(g => clamp(g + stolen))
      addEvent(`🕵️ Spy mission on ${opp.name} succeeded! Stole ${stolen} gold.`, "spy")

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'spy-mission-success',
          payload: { fromId: myPresenceId, fromName: username, toId: opp.presenceId, goldStolen: stolen }
        })
        channelRef.current.send({
          type: 'broadcast',
          event: 'multiplayer-action',
          payload: { message: `🕵️ A covert spy operation was reported by ${selectedNation.name}!`, type: 'spy' }
        })
      }
    } else {
      setInfluence(i => clamp(i - 15))
      addEvent(`💣 Spy mission on ${opp.name} failed and was compromised! -15 Influence.`, "spy")
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'multiplayer-action',
          payload: { message: `💣 ${username}'s spy was caught red-handed in ${opp.name}!`, type: 'spy' }
        })
      }
    }
    setActionUsed(true)
  }

  const leaveLobby = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    setIsMultiplayer(false)
    setPhase("MENU")
  }

  // ── Solo Actions ─────────────────────────────────────────────────────────────
  const declareWar = (ai: AICountry) => {
    if (actionUsed || ai.diplomacy === "war") return
    if (military < 30) { addEvent("⚠️ Need at least 30 Military to declare war.", "event"); return }
    setAiCountries(prev => prev.map(a => a.id === ai.id ? { ...a, diplomacy: "war" } : a))
    addEvent(`⚔️ You declared war on ${ai.name}!`, "war")
    setActionUsed(true)
  }

  const proposeAlliance = (ai: AICountry) => {
    if (actionUsed || ai.diplomacy === "allied") return
    if (influence < 40) { addEvent("⚠️ Need at least 40 Influence to propose an alliance.", "event"); return }
    const accepted = Math.random() < (ai.personality === "diplomatic" ? 0.75 : ai.personality === "economic" ? 0.5 : 0.25)
    if (accepted) {
      setAiCountries(prev => prev.map(a => a.id === ai.id ? { ...a, diplomacy: "allied" } : a))
      setInfluence(i => clamp(i + 20))
      addEvent(`🤝 ${ai.name} accepted your alliance proposal!`, "alliance")
    } else {
      setInfluence(i => clamp(i - 10))
      addEvent(`❌ ${ai.name} rejected your alliance proposal.`, "event")
    }
    setActionUsed(true)
  }

  const launchAttack = (ai: AICountry) => {
    if (actionUsed || ai.diplomacy !== "war") return
    if (military < 20) { addEvent("⚠️ Not enough Military to attack.", "event"); return }
    const myPower = military * (selectedNation.id === "ironclad" ? 1.4 : 1.0)
    const aiPower = ai.military
    const roll = Math.random()
    const winChance = myPower / (myPower + aiPower)

    if (roll < winChance) {
      const dmg = Math.floor(aiPower * 0.3)
      setAiCountries(prev => prev.map(a => a.id === ai.id ? { ...a, hp: clamp(a.hp - dmg, 0), military: clamp(a.military - 20, 0) } : a))
      setMilitary(m => clamp(m - 10))
      addEvent(`✅ Attack on ${ai.name} successful! Dealt ${dmg} damage.`, "war")
      setScore(s => s + 30)

      if (ai.hp - dmg <= 0) {
        setAiCountries(prev => prev.map(a => a.id === ai.id ? { ...a, hp: 0 } : a))
        addEvent(`🏳️ ${ai.name} has been defeated! Victory on this front.`, "victory")
        setGold(g => clamp(g + 50))
        setScore(s => s + 100)
      }
    } else {
      const dmg = Math.floor(aiPower * 0.2)
      setHp(h => clamp(h - dmg))
      setMilitary(m => clamp(m - 15))
      addEvent(`💀 Attack on ${ai.name} failed. You took ${dmg} damage.`, "defeat")
    }
    setActionUsed(true)
  }

  const imposeSanctions = (ai: AICountry) => {
    if (actionUsed || ai.diplomacy === "sanctioned") return
    if (influence < 30) { addEvent("⚠️ Need 30 Influence to impose sanctions.", "event"); return }
    setAiCountries(prev => prev.map(a => a.id === ai.id ? { ...a, diplomacy: "sanctioned", gold: clamp(a.gold - 30) } : a))
    setInfluence(i => clamp(i - 20))
    addEvent(`🚫 Economic sanctions imposed on ${ai.name}. Their gold -30.`, "economy")
    setActionUsed(true)
  }

  const launchSpyMission = (ai: AICountry) => {
    if (actionUsed) return
    const spyCost = selectedNation.id === "nexora" ? 30 : 50
    if (coins < spyCost) { addEvent(`⚠️ Need ${spyCost} coins for a spy mission.`, "event"); return }
    adjustCoins(userId, -spyCost)
    setCoins(c => c - spyCost)
    const success = Math.random() < 0.65
    if (success) {
      const stolen = Math.floor(ai.gold * 0.2)
      setAiCountries(prev => prev.map(a => a.id === ai.id ? { ...a, gold: clamp(a.gold - stolen) } : a))
      setGold(g => clamp(g + stolen))
      addEvent(`🕵️ Spy mission on ${ai.name} succeeded! Stole ${stolen} gold.`, "spy")
    } else {
      setInfluence(i => clamp(i - 15))
      addEvent(`💣 Spy mission on ${ai.name} was discovered! -15 Influence.`, "spy")
    }
    setActionUsed(true)
  }

  const diplomacyColor = (status: DiplomacyStatus) => {
    switch (status) {
      case "allied": return "text-green-400"
      case "war": return "text-red-400"
      case "sanctioned": return "text-orange-400"
      default: return "text-gray-400"
    }
  }

  const diplomacyBadge = (status: DiplomacyStatus) => {
    switch (status) {
      case "allied": return "🤝 Allied"
      case "war": return "⚔️ At War"
      case "sanctioned": return "🚫 Sanctioned"
      default: return "😐 Neutral"
    }
  }

  // ── BUILD JSX ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Real-time Alliance Modal proposal */}
      {allianceProposalFrom && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-green-500/30 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="inline-flex p-4 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 animate-bounce">
              <HandshakeIcon className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">Alliance Offer</h3>
              <p className="text-sm text-gray-400">
                <span className="font-extrabold text-green-400">{allianceProposalFrom.fromName}</span> has proposed a mutual military and economic alliance! Do you accept?
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={acceptAlliance} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-extrabold py-3 rounded-2xl">
                Accept 🤝
              </Button>
              <Button onClick={() => setAllianceProposalFrom(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl py-3 border border-white/10">
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/playlab" className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all">
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </Link>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-green-500">PlayLab Experience</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              🌍 Country War Builder
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

      {/* ── MENU ─────────────────────────────────────────────────────────────── */}
      {phase === "MENU" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-green-500/20 bg-gradient-to-br from-green-950/20 via-black to-zinc-950 p-8 space-y-6">
              <div>
                <span className="px-2.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">Nation Selection</span>
                <h2 className="text-xl font-black text-white mt-3">Choose Your Nation</h2>
                <p className="text-sm text-gray-400 max-w-lg mt-1">Each nation has unique traits that define your strategy. Manage resources, dominate through military, economy, or diplomacy.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {NATIONS.map(n => (
                  <div key={n.id} onClick={() => setSelectedNation(n)}
                    className={`relative border rounded-2xl p-4 cursor-pointer transition-all ${selectedNation.id === n.id ? `bg-gradient-to-br ${n.color} ${n.borderColor} shadow-lg ${n.glowColor}` : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-3xl">{n.flag}</span>
                      {selectedNation.id === n.id && <Check className="h-4 w-4 text-green-400" />}
                    </div>
                    <h4 className="font-black text-white text-sm">{n.name}</h4>
                    <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{n.description}</p>
                    <div className="mt-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-[10px] font-bold text-yellow-400">⚡ {n.trait}: </span>
                      <span className="text-[10px] text-gray-300">{n.traitDesc}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-3">
                      {[["💰", n.startBonus.gold], ["🌾", n.startBonus.food], ["⚔️", n.startBonus.military], ["🏛️", n.startBonus.influence]].map(([icon, val]) => (
                        <div key={String(icon)} className="text-center">
                          <div className="text-base">{icon}</div>
                          <div className="text-[10px] font-black text-white">{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={startGame} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-extrabold py-6 rounded-2xl text-base shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-all gap-2">
                  <Globe className="h-5 w-5" /> Solo Campaign
                </Button>
                <Button onClick={() => setPhase("MULTIPLAYER_SETUP")} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-6 rounded-2xl text-base shadow-lg shadow-purple-500/20 hover:scale-[1.02] transition-all gap-2">
                  <Users className="h-5 w-5" /> Play Multiplayer
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/5 bg-white/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Victory Conditions</h3>
              </div>
              {[
                { icon: "💰", title: "Economic Dominance", desc: "Accumulate 800 Gold" },
                { icon: "⚔️", title: "Military Victory", desc: "Defeat all opponent nations" },
                { icon: "🤝", title: "Diplomatic Supremacy", desc: "Forge strong alliances" },
              ].map(v => (
                <div key={v.title} className="flex items-start gap-2 p-2 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-lg">{v.icon}</span>
                  <div>
                    <h5 className="text-xs font-bold text-white">{v.title}</h5>
                    <p className="text-[10px] text-gray-400">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-white/5 bg-white/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Hall of Nations</h3>
              </div>
              {highScore > 0 ? (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <p className="text-xs font-bold text-yellow-400">Your Best Campaign</p>
                  <p className="text-xl font-black text-white">{highScore} pts</p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-500 italic text-center py-2">No campaigns completed yet.</p>
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
              Real-Time War Room
            </span>
            <h2 className="text-2xl font-black text-white">Multiplayer Hub</h2>
            <p className="text-xs text-gray-400">Host a global war theater or join with a room code.</p>
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
                <Plus className="h-4 w-4" /> Host New Lobby
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
                <h2 className="text-2xl font-black text-white mt-1">Lobby Room: {roomCode}</h2>
                <p className="text-xs text-gray-400">
                  {isHost ? "You are the host. Wait for everyone to ready up and start the war." : "Waiting for the host to start the game."}
                </p>
              </div>

              {/* Lobby Nation selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase block">Choose Your Starting Nation</label>
                <div className="grid grid-cols-2 gap-3">
                  {NATIONS.map(n => (
                    <div key={n.id} onClick={() => {
                      setSelectedNation(n)
                      if (channelRef.current) {
                        const me = players.find(p => p.presenceId === myPresenceId)
                        channelRef.current.track({
                          name: username,
                          isHost,
                          nationId: n.id,
                          isReady: me?.isReady || false,
                          hp: 100,
                          gold: n.startBonus.gold,
                          food: n.startBonus.food,
                          military: n.startBonus.military,
                          influence: n.startBonus.influence,
                        })
                      }
                    }}
                      className={`p-3 border rounded-xl cursor-pointer transition-all ${selectedNation.id === n.id ? `bg-gradient-to-br ${n.color} ${n.borderColor}` : "bg-white/5 border-white/5 hover:bg-white/10"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{n.flag} {n.name}</span>
                        {selectedNation.id === n.id && <Check className="h-4 w-4 text-green-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
              <Button onClick={toggleReady} className={`flex-1 py-4 rounded-xl font-bold ${players.find(p => p.presenceId === myPresenceId)?.isReady ? "bg-green-600 hover:bg-green-500" : "bg-zinc-800 hover:bg-zinc-700"} text-white`}>
                {players.find(p => p.presenceId === myPresenceId)?.isReady ? "Ready! ✓" : "Set Ready"}
              </Button>
              {isHost && (
                <Button onClick={startMultiplayerGame} disabled={players.length < 2 || !players.every(p => p.isReady)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-4 rounded-xl disabled:opacity-35">
                  🚀 Start Game
                </Button>
              )}
              <Button onClick={leaveLobby} className="bg-red-950/40 hover:bg-red-900/40 text-red-400 px-4 rounded-xl border border-red-500/20">
                <X className="h-4 w-4" /> Leave
              </Button>
            </div>
          </div>

          <div className="bg-zinc-950 p-6 rounded-3xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Connected Theater Commanders ({players.length})</h3>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.presenceId} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getNationDetails(p.nationId).flag}</span>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {p.name} {p.isHost && <Crown className="h-3 w-3 text-yellow-400" />}
                      </h4>
                      <p className="text-[10px] text-gray-400">{getNationDetails(p.nationId).name}</p>
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

      {/* ── PLAYING ────────────────────────────────────────────────────────────── */}
      {phase === "PLAYING" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {/* Left: Main game board */}
          <div className="lg:col-span-2 space-y-5">

            {/* Nation Status Card */}
            <div className={`rounded-3xl border p-6 bg-gradient-to-br ${selectedNation.color} ${selectedNation.borderColor} space-y-5 shadow-2xl ${selectedNation.glowColor}`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-300 tracking-widest">Turn {turn} {isMultiplayer && "(Multiplayer)"}</span>
                  <h2 className="text-xl font-black text-white">{selectedNation.flag} {selectedNation.name}</h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">Score</span>
                  <span className="text-2xl font-black text-yellow-400">{score}</span>
                </div>
              </div>

              {/* HP bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-bold">🏛️ Nation Stability</span>
                  <span className={`font-black ${hp < 30 ? "text-red-400 animate-pulse" : hp < 60 ? "text-orange-400" : "text-green-400"}`}>{hp}%</span>
                </div>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                  <div className={`h-full rounded-full transition-all duration-700 ${hp < 30 ? "bg-red-600 animate-pulse" : hp < 60 ? "bg-orange-500" : "bg-green-500"}`} style={{ width: `${hp}%` }} />
                </div>
              </div>

              {/* Resources */}
              <div className="grid grid-cols-2 gap-3">
                <ResourceBar icon="💰" label="Gold" value={gold} max={300} color="bg-gradient-to-r from-yellow-600 to-amber-500" />
                <ResourceBar icon="🌾" label="Food" value={food} max={300} color="bg-gradient-to-r from-green-600 to-emerald-500" />
                <ResourceBar icon="⚔️" label="Military" value={military} max={300} color="bg-gradient-to-r from-red-600 to-rose-500" />
                <ResourceBar icon="🏛️" label="Influence" value={influence} max={300} color="bg-gradient-to-r from-purple-600 to-indigo-500" />
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button onClick={() => {
                  setGold(g => clamp(g + 20))
                  setScore(s => s + 5)
                  addEvent("💰 Tax collected. +20 Gold.", "economy")
                  setActionUsed(true)
                  if (isMultiplayer && channelRef.current) {
                    channelRef.current.send({
                      type: 'broadcast',
                      event: 'multiplayer-action',
                      payload: { message: `💰 ${username} collected taxes.`, type: 'economy' }
                    })
                  }
                }}
                  disabled={actionUsed || turnSubmitted}
                  className="py-2.5 px-4 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-500/25 transition-all disabled:opacity-30">
                  💰 Collect Taxes
                </button>
                <button onClick={() => {
                  setMilitary(m => clamp(m + 15))
                  setGold(g => clamp(g - 20))
                  addEvent("⚔️ New recruits trained. +15 Military.", "event")
                  setActionUsed(true)
                  if (isMultiplayer && channelRef.current) {
                    channelRef.current.send({
                      type: 'broadcast',
                      event: 'multiplayer-action',
                      payload: { message: `⚔️ ${username} trained new troops.`, type: 'event' }
                    })
                  }
                }}
                  disabled={actionUsed || gold < 20 || turnSubmitted}
                  className="py-2.5 px-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/25 transition-all disabled:opacity-30">
                  ⚔️ Train Troops (-20g)
                </button>
                <button onClick={() => {
                  setFood(f => clamp(f + 20))
                  setScore(s => s + 5)
                  addEvent("🌾 Farms expanded. +20 Food.", "event")
                  setActionUsed(true)
                  if (isMultiplayer && channelRef.current) {
                    channelRef.current.send({
                      type: 'broadcast',
                      event: 'multiplayer-action',
                      payload: { message: `🌾 ${username} expanded their food granaries.`, type: 'economy' }
                    })
                  }
                }}
                  disabled={actionUsed || turnSubmitted}
                  className="py-2.5 px-4 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/25 transition-all disabled:opacity-30">
                  🌾 Expand Farms
                </button>
                <button onClick={() => {
                  setInfluence(i => clamp(i + 20))
                  setGold(g => clamp(g - 15))
                  addEvent("🏛️ Envoys dispatched. +20 Influence.", "event")
                  setActionUsed(true)
                  if (isMultiplayer && channelRef.current) {
                    channelRef.current.send({
                      type: 'broadcast',
                      event: 'multiplayer-action',
                      payload: { message: `🏛️ ${username} dispatched foreign envoys.`, type: 'event' }
                    })
                  }
                }}
                  disabled={actionUsed || gold < 15 || turnSubmitted}
                  className="py-2.5 px-4 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-bold hover:bg-purple-500/25 transition-all disabled:opacity-30">
                  🏛️ Send Envoys (-15g)
                </button>
              </div>

              {actionUsed && !turnSubmitted && (
                <p className="text-[10px] text-gray-300 text-center italic">Action used this turn. Submit your turn to continue.</p>
              )}

              {isMultiplayer ? (
                <Button onClick={submitTurnMultiplayer} disabled={turnSubmitted}
                  className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-extrabold py-3 rounded-2xl text-sm gap-2">
                  {turnSubmitted ? "Waiting for Others..." : `Submit Actions for Turn ${turn}`}
                </Button>
              ) : (
                <Button onClick={endTurn} className="w-full bg-gradient-to-r from-green-700 to-emerald-700 hover:from-green-600 hover:to-emerald-600 text-white font-extrabold py-3 rounded-2xl text-sm gap-2 shadow-lg shadow-green-500/10">
                  ⏭️ End Turn {turn}
                </Button>
              )}
            </div>

            {/* Opponents / World Map */}
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Globe className="h-4 w-4 text-green-400" /> World Nations
              </h3>
              <div className="space-y-3">
                {isMultiplayer ? (
                  players.filter(p => p.presenceId !== myPresenceId).map(opp => {
                    const oppNation = getNationDetails(opp.nationId)
                    const relation = myDiplomacyRelation(opp.presenceId)
                    return (
                      <div key={opp.presenceId} className={`p-4 rounded-2xl border ${opp.hp <= 0 ? "border-white/5 opacity-40" : relation === "allied" ? "border-green-500/30 bg-green-950/20" : relation === "war" ? "border-red-500/30 bg-red-950/20" : "border-white/5 bg-white/5"} transition-all`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{oppNation.flag}</span>
                            <div>
                              <h4 className={`text-sm font-bold ${opp.hp <= 0 ? "text-gray-500 line-through" : "text-white"}`}>{opp.name}</h4>
                              <span className={`text-[10px] font-bold ${diplomacyColor(relation)}`}>
                                {opp.hp <= 0 ? "🏳️ Defeated" : diplomacyBadge(relation)}
                              </span>
                            </div>
                          </div>
                          {opp.hp > 0 && (
                            <div className="text-right">
                              <span className="text-[10px] text-gray-400">HP</span>
                              <div className="w-20 h-1.5 bg-white/10 rounded-full mt-1">
                                <div className={`h-full rounded-full ${opp.hp < 30 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${opp.hp}%` }} />
                              </div>
                            </div>
                          )}
                        </div>

                        {opp.hp > 0 && (
                          <>
                            <div className="grid grid-cols-4 gap-2 text-[10px] text-gray-400 mb-3">
                              <span>💰 {opp.gold}</span>
                              <span>🌾 {opp.food}</span>
                              <span>⚔️ {opp.military}</span>
                              <span>🏛️ {opp.influence}</span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {relation !== "war" && relation !== "allied" && (
                                <button onClick={() => proposeAllianceMultiplayer(opp)} disabled={actionUsed || turnSubmitted}
                                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-30">
                                  🤝 Alliance
                                </button>
                              )}
                              {relation !== "war" && (
                                <button onClick={() => declareWarMultiplayer(opp)} disabled={actionUsed || turnSubmitted}
                                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-30">
                                  ⚔️ Declare War
                                </button>
                              )}
                              {relation === "war" && (
                                <button onClick={() => launchAttackMultiplayer(opp)} disabled={actionUsed || turnSubmitted}
                                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30 transition-all disabled:opacity-30 animate-pulse">
                                  💥 Attack!
                                </button>
                              )}
                              {relation === "neutral" && (
                                <button onClick={() => imposeSanctionsMultiplayer(opp)} disabled={actionUsed || turnSubmitted}
                                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all disabled:opacity-30">
                                  🚫 Sanction
                                </button>
                              )}
                              <button onClick={() => launchSpyMultiplayer(opp)} disabled={actionUsed || turnSubmitted}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all disabled:opacity-30">
                                🕵️ Spy ({selectedNation.id === "nexora" ? 30 : 50}c)
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })
                ) : (
                  aiCountries.map(ai => (
                    <div key={ai.id} className={`p-4 rounded-2xl border ${ai.hp <= 0 ? "border-white/5 opacity-40" : ai.diplomacy === "allied" ? "border-green-500/30 bg-green-950/20" : ai.diplomacy === "war" ? "border-red-500/30 bg-red-950/20" : "border-white/5 bg-white/5"} transition-all`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{ai.flag}</span>
                          <div>
                            <h4 className={`text-sm font-bold ${ai.hp <= 0 ? "text-gray-500 line-through" : "text-white"}`}>{ai.name}</h4>
                            <span className={`text-[10px] font-bold ${diplomacyColor(ai.diplomacy)}`}>{ai.hp <= 0 ? "🏳️ Defeated" : diplomacyBadge(ai.diplomacy)}</span>
                          </div>
                        </div>
                        {/* HP bar */}
                        {ai.hp > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] text-gray-400">HP</span>
                            <div className="w-20 h-1.5 bg-white/10 rounded-full mt-1">
                              <div className={`h-full rounded-full ${ai.hp < 30 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${ai.hp}%` }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {ai.hp > 0 && (
                        <>
                          <div className="grid grid-cols-4 gap-2 text-[10px] text-gray-400 mb-3">
                            <span>💰 {ai.gold}</span>
                            <span>🌾 {ai.food}</span>
                            <span>⚔️ {ai.military}</span>
                            <span>🏛️ {ai.influence}</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {ai.diplomacy !== "war" && ai.diplomacy !== "allied" && (
                              <button onClick={() => proposeAlliance(ai)} disabled={actionUsed}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-30">
                                🤝 Alliance
                              </button>
                            )}
                            {ai.diplomacy !== "war" && (
                              <button onClick={() => declareWar(ai)} disabled={actionUsed}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-30">
                                ⚔️ Declare War
                              </button>
                            )}
                            {ai.diplomacy === "war" && (
                              <button onClick={() => launchAttack(ai)} disabled={actionUsed}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30 transition-all disabled:opacity-30 animate-pulse">
                                💥 Attack!
                              </button>
                            )}
                            {ai.diplomacy === "neutral" && (
                              <button onClick={() => imposeSanctions(ai)} disabled={actionUsed}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all disabled:opacity-30">
                                🚫 Sanction
                              </button>
                            )}
                            <button onClick={() => launchSpyMission(ai)} disabled={actionUsed}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all disabled:opacity-30">
                              🕵️ Spy ({selectedNation.id === "nexora" ? 30 : 50}c)
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-5">
            {/* Shop */}
            <div className="rounded-3xl border border-white/5 bg-white/5 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-green-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Infrastructure</h3>
              </div>
              <div className="space-y-2">
                {SHOP_ITEMS.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <h4 className="text-xs font-bold text-white">{item.name}</h4>
                        <p className="text-[9px] text-gray-400">{item.effect}</p>
                      </div>
                    </div>
                    <button
                      disabled={gold < item.cost || turnSubmitted}
                      onClick={() => {
                        if (gold < item.cost) return
                        setGold(g => clamp(g - item.cost))
                        if (item.field === "military") setMilitary(m => clamp(m + item.value))
                        if (item.field === "food") setFood(f => clamp(f + item.value))
                        if (item.field === "gold") setGold(g => clamp(g + item.value))
                        if (item.field === "influence") setInfluence(i => clamp(i + item.value))
                        addEvent(`${item.icon} ${item.name} built! ${item.effect}`, "economy")

                        if (isMultiplayer && channelRef.current) {
                          channelRef.current.send({
                            type: 'broadcast',
                            event: 'multiplayer-action',
                            payload: { message: `🏗️ ${username} built a ${item.name}.`, type: 'economy' }
                          })
                        }
                      }}
                      className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-all disabled:opacity-30">
                      💰{item.cost}g
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Events log */}
            <div className="rounded-3xl border border-white/5 bg-zinc-950 p-5 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" /> War Chronicle
              </h3>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {events.map((ev) => (
                  <div key={ev.id} className={`p-2 rounded-xl border text-[10px] leading-relaxed ${ev.type === "war" ? "bg-red-950/20 border-red-500/20 text-red-300" : ev.type === "alliance" ? "bg-green-950/20 border-green-500/20 text-green-300" : ev.type === "spy" ? "bg-purple-950/20 border-purple-500/20 text-purple-300" : ev.type === "economy" ? "bg-yellow-950/20 border-yellow-500/20 text-yellow-300" : ev.type === "victory" ? "bg-yellow-500/10 border-yellow-400/30 text-yellow-200 font-bold" : "bg-white/5 border-white/5 text-gray-400"}`}>
                    <span className="text-gray-500 mr-1">T{ev.turn}:</span>{ev.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS ─────────────────────────────────────────────────────────────── */}
      {phase === "RESULTS" && (
        <div className={`max-w-md mx-auto border p-8 rounded-3xl text-center space-y-6 ${victoryType === "defeat" ? "bg-gradient-to-br from-red-950/60 via-zinc-900 to-black border-red-500/40" : "bg-gradient-to-br from-zinc-900 via-zinc-800 to-black border-yellow-500/30"}`}
          style={victoryType !== "defeat" ? { boxShadow: "0 0 60px 20px rgba(234,179,8,0.15)" } : undefined}>
          <div className={`inline-flex p-4 rounded-full ${victoryType === "defeat" ? "bg-red-500/10 border border-red-500/30" : "bg-yellow-500/10 border border-yellow-500/30"}`}>
            {victoryType === "defeat" ? <AlertTriangle className="h-10 w-10 text-red-500 animate-pulse" /> : <Crown className="h-10 w-10 text-yellow-400" />}
          </div>
          <div>
            <h2 className={`text-2xl font-black ${victoryType === "defeat" ? "text-red-400" : "text-white"}`}>
              {victoryType === "defeat" ? "💀 Nation Collapsed!" : victoryType === "economic" ? "💰 Economic Dominance!" : "⚔️ Military Victory!"}
            </h2>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-2 leading-relaxed">
              {victoryType === "defeat" ? "Your nation fell to ruin. Rise again." : victoryType === "economic" ? "Your treasury overwhelmed all rivals." : "Your military might crushed all opposition."}
            </p>
          </div>
          <div className="bg-black/60 border border-white/5 p-4 rounded-2xl grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Final Score</span>
              <span className="text-2xl font-black text-yellow-400">{score}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Survived</span>
              <span className="text-2xl font-black text-white">{turn} turns</span>
            </div>
          </div>
          {victoryType !== "defeat" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl text-xs text-yellow-300 font-bold">
              🪙 +{Math.max(1, Math.floor(score / 20))} coins earned from this campaign!
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => {
              if (isMultiplayer) {
                // Return to lobby
                setPhase("MULTIPLAYER_LOBBY")
              } else {
                startGame()
              }
            }} className={`flex-1 ${victoryType === "defeat" ? "bg-red-700 hover:bg-red-600" : "bg-yellow-600 hover:bg-yellow-500 text-black"} font-extrabold py-3.5 rounded-2xl text-sm text-white`}>
              <RotateCcw className="h-4 w-4 mr-1" /> {isMultiplayer ? "Back to Lobby" : "Play Again"}
            </Button>
            <Button onClick={() => {
              if (channelRef.current) {
                channelRef.current.unsubscribe()
                channelRef.current = null
              }
              setIsMultiplayer(false)
              setPhase("MENU")
            }} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl py-3.5 text-sm border border-white/10">
              Menu
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
