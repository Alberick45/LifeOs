"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Sword, Shield, Home, Users, Trophy, Play, RotateCcw, AlertTriangle, MessageSquare, Volume2, VolumeX, ShieldAlert, Check, HelpCircle, UserPlus, Lock, Flame } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { readCoins, adjustCoins, onCoinsChange, loadProgress, saveProgress } from "@/lib/playlab-coins"

// ─── TYPES ───────────────────────────────────────────────────────────────────
type GamePhase = "SETUP" | "MULTIPLAYER_LOBBY" | "PLAYING" | "DUEL" | "RESULTS"
type BuildingType = "houses" | "castle" | "jail" | "walls" | "market"
type CitizenType = "workers" | "soldiers" | "scouts" | "engineers" | "merchants"
type RoadType = "Safe" | "Risky" | "Resource" | "Portal"

interface PlayerState {
  id: string
  name: string
  emoji: string
  isBot: boolean
  kingdom: "Auroria" | "Pyria" | "Terrania" | "Zephyria"
  tileIndex: number // 0 (start) to 10 (Throne)
  hp: number
  gold: number
  wood: number
  stone: number
  population: Record<CitizenType, number>
  buildings: Record<BuildingType, number>
  inJailBy: string | null // ID of the player whose jail they are in
  jailTurns: number
  color: string
}

interface DuelState {
  active: boolean
  challengerId: string
  defenderId: string
  challengerPos: number // 0 to 5
  defenderPos: number // 5 to 0
  laneTiles: { type: "Trap" | "Reward" | "Special" | "Neutral"; resolved: boolean; description: string }[]
  turnId: string // whose turn in duel
  logs: string[]
  winnerId: string | null
}

interface ChatLog {
  id: string
  sender: string
  message: string
  type: "system" | "hype" | "roast" | "emote"
}

// ─── CONSTANTS & CONFIGS ─────────────────────────────────────────────────────
const KINGDOM_CONFIGS = {
  Auroria: { name: "Auroria", emoji: "🏰☀️", color: "text-yellow-400 border-yellow-500/30 bg-yellow-950/10 hover:bg-yellow-950/20", theme: "yellow" },
  Pyria: { name: "Pyria", emoji: "🏰🔥", color: "text-red-400 border-red-500/30 bg-red-950/10 hover:bg-red-950/20", theme: "red" },
  Terrania: { name: "Terrania", emoji: "🏰🌿", color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/10 hover:bg-emerald-950/20", theme: "emerald" },
  Zephyria: { name: "Zephyria", emoji: "🏰🌀", color: "text-blue-400 border-blue-500/30 bg-blue-950/10 hover:bg-blue-950/20", theme: "blue" }
}

const COMMENTARY_QUOTES = {
  trap: [
    "Ouch! That was a brutal placement!",
    "HE WALKED STRAIGHT INTO A DEATH TILE!",
    "Greed over safety... a classic blunder!",
    "Pitfall activated! Watch your step, explorer!",
    "Trap triggered! The announcers are cringing!"
  ],
  reward: [
    "Jackpot! An alchemical chest found!",
    "Wealth flows into their village coffers!",
    "Resource gain! A massive economic boost!",
    "Loot gathered. Strategy meets luck!"
  ],
  duel_start: [
    "A formal challenge has been issued!",
    "They are facing off in the Roulette Lane!",
    "Let the tactical duel begin!",
    "No escape now! Two kingdoms collide!"
  ],
  jail: [
    "Locked away! Throw away the key!",
    "Sent straight to the village prison!",
    "A hostage situation in kingdom territory!",
    "Imprisoned! Time to pay a heavy bribe!"
  ],
  throne_near: [
    "They are closing in on the Throne Zone!",
    "So close they can taste the crown!",
    "The Throne is in sight! Tension is sky high!"
  ],
  win: [
    "VICTORY! The new Sovereign has ascended!",
    "Unbelievable! A legendary triumph!",
    "Kingdom Rushboard has a new supreme champion!"
  ]
}

export default function KingdomRushboardPage() {
  // Session / General States
  const [userId, setUserId] = useState<string | null>(null)
  const [coins, setCoins] = useState(100)
  const [username, setUsername] = useState("Commander")
  const [phase, setPhase] = useState<GamePhase>("SETUP")
  const [soundMuted, setSoundMuted] = useState(false)
  const [isLobbyHost, setIsLobbyHost] = useState(false)
  const [roomCode, setRoomCode] = useState("")
  const [roomCodeInput, setRoomCodeInput] = useState("")
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([])
  const [myPresenceId, setMyPresenceId] = useState("")
  const myPresenceIdRef = useRef("")
  const channelRef = useRef<any>(null)

  // Game Core States
  const [players, setPlayers] = useState<PlayerState[]>([])
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0)
  const [diceRoll, setDiceRoll] = useState<number | null>(null)
  const [selectedSteps, setSelectedSteps] = useState<number>(1)
  const [selectedRoad, setSelectedRoad] = useState<RoadType>("Safe")
  const [logs, setLogs] = useState<ChatLog[]>([])
  const [shakeScreen, setShakeScreen] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Duel State
  const [duel, setDuel] = useState<DuelState>({
    active: false,
    challengerId: "",
    defenderId: "",
    challengerPos: 0,
    defenderPos: 5,
    laneTiles: [],
    turnId: "",
    logs: [],
    winnerId: null
  })

  // Alert State
  const [alertMsg, setAlertMsg] = useState<{ text: string; success: boolean } | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const triggerAlert = (text: string, success: boolean = true) => {
    setAlertMsg({ text, success })
    setTimeout(() => setAlertMsg(null), 3000)
  }

  // Voice Comm Engine using Synthesis
  const speak = (text: string) => {
    if (soundMuted || typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel() // Stop any previous speech
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.05
    utterance.pitch = 0.95
    window.speechSynthesis.speak(utterance)
  }

  const pushLog = (message: string, type: ChatLog["type"] = "system") => {
    const newLog: ChatLog = {
      id: `${Date.now()}-${Math.random()}`,
      sender: type === "system" ? "📢 Announcer" : type === "hype" ? "🔥 Hype Bot" : type === "roast" ? "💀 Roast Bot" : "👑 Player",
      message,
      type
    }
    setLogs(prev => [...prev, newLog])

    // Speech trigger for major pings
    if (type === "hype" || type === "roast" || type === "system") {
      speak(message)
    }
  }

  // Auto scroll logs
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  // Database / Session load
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

      const progress = await loadProgress(resolvedUserId)
      setCoins(progress.coins)
      unsubCoins = onCoinsChange(resolvedUserId, (newBal) => setCoins(newBal))
    }
    init()

    return () => {
      if (unsubCoins) unsubCoins()
      if (channelRef.current) channelRef.current.unsubscribe()
    }
  }, [])

  // ─── LOBBY SETUP & BOT FILL ─────────────────────────────────────────────────
  const hostLobby = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase()
    setRoomCode(code)
    setIsLobbyHost(true)
    joinMultiplayerLobby(code, true)
  }

  const joinLobbyByCode = () => {
    const code = roomCodeInput.trim().toUpperCase()
    if (code.length === 4) {
      setRoomCode(code)
      setIsLobbyHost(false)
      joinMultiplayerLobby(code, false)
    } else {
      triggerAlert("Invalid Room Code!", false)
    }
  }

  const joinMultiplayerLobby = (code: string, amHost: boolean) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    const myPresId = Math.random().toString(36).substring(2, 9)
    setMyPresenceId(myPresId)
    myPresenceIdRef.current = myPresId
    setLobbyPlayers([])
    setIsReady(false)

    const channel = supabase.channel(`rushboard:${code}`, {
      config: {
        presence: { key: myPresId },
        broadcast: { self: true }
      }
    })

    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState()
      const mapped: any[] = []

      Object.keys(presenceState).forEach(key => {
        const pres = presenceState[key] as any[]
        if (pres.length > 0) {
          mapped.push({
            presenceId: pres[0].presenceId || key,
            name: pres[0].name || "Explorer",
            isHost: pres[0].isHost || false,
            isReady: pres[0].isReady || false
          })
        }
      })
      setLobbyPlayers(mapped)
    })

    channel.on('broadcast', { event: 'start-match' }, ({ payload }) => {
      const { playersList } = payload
      
      // Map local user ID to 'player'
      const mapped = playersList.map((p: any) => {
        if (p.id === myPresenceIdRef.current) {
          return { ...p, id: "player" }
        }
        return p
      })

      setPlayers(mapped)
      setPhase("PLAYING")
      setCurrentPlayerIdx(0)
      setLogs([])
      pushLog("🏰 Welcome to Kingdom Rushboard Arena! Race to the Throne has begun!", "system")
      pushLog("🎙️ ANN-1 Commentator Engine Activated. Speech synthesizers loaded.", "hype")
    })

    channel.on('broadcast', { event: 'game-event' }, ({ payload }) => {
      // Sync gameplay steps triggered by remote players
      if (payload.players) setPlayers(payload.players)
      if (payload.currentPlayerIdx !== undefined) setCurrentPlayerIdx(payload.currentPlayerIdx)
      if (payload.logs) {
        payload.logs.forEach((l: any) => {
          setLogs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, sender: l.sender, message: l.message, type: l.type }])
          if (l.type === "hype" || l.type === "roast" || l.type === "system") speak(l.message)
        })
      }
      if (payload.duel) setDuel(payload.duel)
      if (payload.phase) setPhase(payload.phase)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          presenceId: myPresId,
          name: username,
          isHost: amHost,
          isReady: false
        })
      }
    })

    setPhase("MULTIPLAYER_LOBBY")
  }

  const toggleReady = () => {
    const nextReady = !isReady
    setIsReady(nextReady)
    if (channelRef.current) {
      channelRef.current.track({
        presenceId: myPresenceIdRef.current,
        name: username,
        isHost: isLobbyHost,
        isReady: nextReady
      })
    }
  }

  const startMatch = () => {
    if (!isLobbyHost || !channelRef.current) return

    const initialKingdoms: ("Auroria" | "Pyria" | "Terrania" | "Zephyria")[] = ["Auroria", "Pyria", "Terrania", "Zephyria"]
    const colors = ["#facc15", "#f87171", "#34d399", "#60a5fa"]

    // Build human players
    const playersList: PlayerState[] = lobbyPlayers.map((lp, idx) => ({
      id: lp.presenceId,
      name: lp.name,
      emoji: "🦠",
      isBot: false,
      kingdom: initialKingdoms[idx % 4],
      tileIndex: 0,
      hp: 100,
      gold: 150,
      wood: 80,
      stone: 50,
      population: { workers: 5, soldiers: 2, scouts: 1, engineers: 0, merchants: 0 },
      buildings: { houses: 1, castle: 1, jail: 0, walls: 0, market: 0 },
      inJailBy: null,
      jailTurns: 0,
      color: colors[idx % 4]
    }))

    // Fill remaining spots with bots up to 4 players
    const botNames = [
      { name: "Sovereign AI (Bot)", emoji: "🤖" },
      { name: "Sir Lancelot (Bot)", emoji: "🛡️" },
      { name: "Lady Gwendolyn (Bot)", emoji: "🔮" },
      { name: "King Midas (Bot)", emoji: "🪙" }
    ]

    let kingdomIdx = lobbyPlayers.length
    while (playersList.length < 4) {
      const bot = botNames[playersList.length % botNames.length]
      playersList.push({
        id: `bot-${playersList.length}`,
        name: bot.name,
        emoji: bot.emoji,
        isBot: true,
        kingdom: initialKingdoms[kingdomIdx % 4],
        tileIndex: 0,
        hp: 100,
        gold: 100,
        wood: 50,
        stone: 30,
        population: { workers: 3, soldiers: 1, scouts: 0, engineers: 1, merchants: 0 },
        buildings: { houses: 1, castle: 1, jail: 0, walls: 0, market: 0 },
        inJailBy: null,
        jailTurns: 0,
        color: colors[playersList.length % 4]
      })
      kingdomIdx++
    }

    channelRef.current.send({
      type: 'broadcast',
      event: 'start-match',
      payload: { playersList }
    })
  }

  // ─── ACTION LOGIC ──────────────────────────────────────────────────────────
  const syncGameState = (updatedPlayers: PlayerState[], nextPlayerIdx: number, newLogs: any[] = [], extraPayload = {}) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'game-event',
        payload: {
          players: updatedPlayers,
          currentPlayerIdx: nextPlayerIdx,
          logs: newLogs,
          ...extraPayload
        }
      })
    } else {
      // Local fallback (Single Match mode simulated)
      setPlayers(updatedPlayers)
      setCurrentPlayerIdx(nextPlayerIdx)
      newLogs.forEach(l => {
        setLogs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, sender: l.sender, message: l.message, type: l.type }])
        if (l.type === "hype" || l.type === "roast" || l.type === "system") speak(l.message)
      })
    }
  }

  const rollDice = () => {
    if (diceRoll !== null) return
    const roll = Math.floor(Math.random() * 6) + 1
    setDiceRoll(roll)
    setSelectedSteps(roll)
    speak(`You rolled a ${roll}!`)
  }

  const advancePlayerTurn = () => {
    setDiceRoll(null)
    const nextIdx = (currentPlayerIdx + 1) % players.length
    
    // Resource Economy Tick for the next player
    const nextPlayer = players[nextIdx]
    const updated = players.map((p, idx) => {
      if (idx === nextIdx) {
        // Gold / Wood / Stone generated from market, population, buildings
        const goldGen = 10 + p.population.workers * 2 + p.buildings.market * 15
        const woodGen = 5 + p.buildings.houses * 3
        const stoneGen = 2 + p.buildings.castle * 2
        return {
          ...p,
          gold: p.gold + goldGen,
          wood: p.wood + woodGen,
          stone: p.stone + stoneGen
        }
      }
      return p
    })

    // If bot, execute simulated bot decision
    if (updated[nextIdx]?.isBot) {
      setTimeout(() => {
        executeBotTurn(nextIdx, updated)
      }, 1500)
    } else {
      syncGameState(updated, nextIdx)
    }
  }

  // Choose steps and advance on road
  const executeMove = () => {
    if (diceRoll === null) return
    const activePlayer = players[currentPlayerIdx]
    if (activePlayer.inJailBy) {
      triggerAlert("You are in jail! Escape first.", false)
      return
    }

    const nextTileIndex = Math.min(10, activePlayer.tileIndex + selectedSteps)
    const isThrone = nextTileIndex === 10

    let hpDiff = 0
    let goldDiff = 0
    let woodDiff = 0
    let stoneDiff = 0
    let newPrisonerStatus = false
    let tileEventMsg = ""
    let commentaryType: ChatLog["type"] = "system"

    // Road event resolution
    if (selectedRoad === "Safe") {
      goldDiff = 10
      tileEventMsg = `${activePlayer.name} travelled the Safe Road and gathered 10 Gold.`
    } else if (selectedRoad === "Risky") {
      const roll = Math.random()
      if (roll < 0.45) {
        hpDiff = -30
        setShakeScreen(true)
        setTimeout(() => setShakeScreen(false), 500)
        tileEventMsg = `${activePlayer.name} triggered a Pitfall trap! Lost 30 HP.`
        commentaryType = "roast"
      } else {
        goldDiff = 40
        woodDiff = 20
        tileEventMsg = `${activePlayer.name} bypassed the risks and retrieved a Golden Cache (+40 Gold, +20 Wood).`
        commentaryType = "hype"
      }
    } else if (selectedRoad === "Resource") {
      woodDiff = 15
      stoneDiff = 15
      tileEventMsg = `${activePlayer.name} navigated the Quarry Paths, collecting 15 Wood and 15 Stone.`
    } else if (selectedRoad === "Portal") {
      const portalRoll = Math.random()
      if (portalRoll < 0.3) {
        newPrisonerStatus = true
        tileEventMsg = `${activePlayer.name} was caught in a Void Trap and locked in prison!`
        commentaryType = "roast"
      } else {
        goldDiff = 50
        tileEventMsg = `${activePlayer.name} teleported safely, finding ancient relics (+50 Gold).`
        commentaryType = "hype"
      }
    }

    const updated = players.map((p, idx) => {
      if (idx === currentPlayerIdx) {
        const nextHp = Math.max(0, p.hp + hpDiff)
        const inJail = newPrisonerStatus ? "bot-1" : p.inJailBy // default jailer
        return {
          ...p,
          tileIndex: nextTileIndex,
          hp: nextHp,
          gold: Math.max(0, p.gold + goldDiff),
          wood: Math.max(0, p.wood + woodDiff),
          stone: Math.max(0, p.stone + stoneDiff),
          inJailBy: inJail,
          jailTurns: newPrisonerStatus ? 2 : p.jailTurns
        }
      }
      return p
    })

    const newLogsList = [
      { sender: "📢 Announcer", message: tileEventMsg, type: commentaryType }
    ]

    // Check Sovereign Victory
    if (isThrone) {
      newLogsList.push({
        sender: "📢 Announcer",
        message: `👑 Sovereign Ascension! ${activePlayer.name} reached the central Throne Zone!`,
        type: "hype"
      })
      syncGameState(updated, currentPlayerIdx, newLogsList, { phase: "RESULTS" })
      setPhase("RESULTS")
      
      // Sync coins award
      if (activePlayer.id === "player") {
        adjustCoins(userId, 30) // +30 coins
      }
      return
    }

    syncGameState(updated, currentPlayerIdx, newLogsList)
    advancePlayerTurn()
  }

  // Village Upgrades
  const buildStructure = (type: BuildingType) => {
    const activePlayer = players[currentPlayerIdx]
    let goldCost = 30
    let woodCost = 20
    let stoneCost = 10

    if (type === "castle") { goldCost = 80; woodCost = 50; stoneCost = 40 }
    if (type === "jail") { goldCost = 40; woodCost = 20; stoneCost = 30 }
    if (type === "market") { goldCost = 50; woodCost = 30; stoneCost = 10 }
    if (type === "walls") { goldCost = 40; woodCost = 10; stoneCost = 40 }

    if (activePlayer.gold < goldCost || activePlayer.wood < woodCost || activePlayer.stone < stoneCost) {
      triggerAlert("Insufficient materials!", false)
      return
    }

    const updated = players.map((p, idx) => {
      if (idx === currentPlayerIdx) {
        return {
          ...p,
          gold: p.gold - goldCost,
          wood: p.wood - woodCost,
          stone: p.stone - stoneCost,
          buildings: {
            ...p.buildings,
            [type]: p.buildings[type] + 1
          }
        }
      }
      return p
    })

    const upgradeMsg = `${activePlayer.name} upgraded their ${type.toUpperCase()} in the village.`
    syncGameState(updated, currentPlayerIdx, [{ sender: "📢 Announcer", message: upgradeMsg, type: "system" }])
  }

  // Jail Escape Trials
  const executeJailAction = (actionType: "Bribe" | "Dice") => {
    const activePlayer = players[currentPlayerIdx]
    if (!activePlayer.inJailBy) return

    let escaped = false
    let goldCost = 0
    let msg = ""

    if (actionType === "Bribe") {
      goldCost = 50
      if (activePlayer.gold < goldCost) {
        triggerAlert("Not enough Gold for bribe!", false)
        return
      }
      escaped = true
      msg = `${activePlayer.name} bribed the guards with 50 Gold and escaped jail!`
    } else {
      const roll = Math.floor(Math.random() * 6) + 1
      if (roll >= 5) {
        escaped = true
        msg = `${activePlayer.name} rolled a ${roll} in the Dice Trial and escaped!`
      } else {
        msg = `${activePlayer.name} rolled a ${roll} and failed the Dice Trial, staying locked in jail.`
      }
    }

    const updated = players.map((p, idx) => {
      if (idx === currentPlayerIdx) {
        return {
          ...p,
          gold: Math.max(0, p.gold - goldCost),
          inJailBy: escaped ? null : p.inJailBy,
          jailTurns: escaped ? 0 : p.jailTurns - 1
        }
      }
      return p
    })

    syncGameState(updated, currentPlayerIdx, [{ sender: "📢 Announcer", message: msg, type: escaped ? "hype" : "roast" }])
    
    // Spend turn
    advancePlayerTurn()
  }

  // ─── BOT PLAYGROUND DECISIONS ──────────────────────────────────────────────
  const executeBotTurn = (botIdx: number, currentPlayersList: PlayerState[]) => {
    const bot = currentPlayersList[botIdx]
    if (!bot) return

    let updated = [...currentPlayersList]
    let logMsg = ""
    let commentaryType: ChatLog["type"] = "system"

    if (bot.inJailBy) {
      // Jail escape logic
      if (bot.gold >= 50) {
        updated = updated.map((p, idx) => {
          if (idx === botIdx) {
            return { ...p, gold: p.gold - 50, inJailBy: null, jailTurns: 0 }
          }
          return p
        })
        logMsg = `🤖 ${bot.name} paid a bribe of 50 Gold and escaped jail.`
      } else {
        const roll = Math.floor(Math.random() * 6) + 1
        const success = roll >= 5
        updated = updated.map((p, idx) => {
          if (idx === botIdx) {
            return {
              ...p,
              inJailBy: success ? null : p.inJailBy,
              jailTurns: success ? 0 : p.jailTurns - 1
            }
          }
          return p
        })
        logMsg = `🎲 ${bot.name} rolled a ${roll} during trial. ${success ? "Escaped!" : "Failed."}`
        commentaryType = success ? "hype" : "roast"
      }
    } else {
      // Movement choice
      const randomSteps = Math.floor(Math.random() * 4) + 1
      const roads: RoadType[] = ["Safe", "Risky", "Resource", "Portal"]
      const chosenRoad = roads[Math.floor(Math.random() * roads.length)]
      const nextTile = Math.min(10, bot.tileIndex + randomSteps)

      let hpChange = 0
      let goldChange = 0

      if (chosenRoad === "Risky" && Math.random() < 0.5) {
        hpChange = -20
        logMsg = `🤖 ${bot.name} rolled and moved ${randomSteps} tiles along the Risky Road. Hit a trap (-20 HP).`
        commentaryType = "roast"
      } else {
        goldChange = 15
        logMsg = `🤖 ${bot.name} rolled and moved ${randomSteps} tiles along the ${chosenRoad} Road.`
      }

      updated = updated.map((p, idx) => {
        if (idx === botIdx) {
          return {
            ...p,
            tileIndex: nextTile,
            hp: Math.max(0, p.hp + hpChange),
            gold: p.gold + goldChange
          }
        }
        return p
      })

      // Check Throne win
      if (nextTile === 10) {
        const winLogs = [
          { sender: "📢 Announcer", message: logMsg, type: "system" },
          { sender: "📢 Announcer", message: `👑 Victory! ${bot.name} ascended the central Throne!`, type: "hype" }
        ]
        syncGameState(updated, botIdx, winLogs, { phase: "RESULTS" })
        setPhase("RESULTS")
        return
      }
    }

    const nextIdx = (botIdx + 1) % players.length
    
    // Add economy yield
    const nextPlayer = updated[nextIdx]
    if (nextPlayer) {
      updated = updated.map((p, idx) => {
        if (idx === nextIdx) {
          return {
            ...p,
            gold: p.gold + 10 + p.population.workers * 2,
            wood: p.wood + 5 + p.buildings.houses * 2,
            stone: p.stone + 2
          }
        }
        return p
      })
    }

    // Broadcast bot changes
    if (updated[nextIdx]?.isBot) {
      syncGameState(updated, botIdx, [{ sender: "📢 Announcer", message: logMsg, type: commentaryType }])
      setTimeout(() => {
        executeBotTurn(nextIdx, updated)
      }, 1500)
    } else {
      syncGameState(updated, nextIdx, [{ sender: "📢 Announcer", message: logMsg, type: commentaryType }])
    }
  }

  // ─── CHALLENGE & DUEL SYSTEM ────────────────────────────────────────────────
  const triggerDuelChallenge = (targetId: string) => {
    const challenger = players.find(p => p.id === "player")!
    const defender = players.find(p => p.id === targetId)!

    // Secret Risk spin setup (Roulette Lane)
    const types: ("Trap" | "Reward" | "Special" | "Neutral")[] = ["Trap", "Reward", "Special", "Neutral"]
    const generatedLane = Array.from({ length: 6 }).map((_, idx) => {
      const type = types[Math.floor(Math.random() * types.length)]
      return {
        type,
        resolved: false,
        description: type === "Trap" ? "Hidden Pitfall" : type === "Reward" ? "Chest of Gold" : type === "Special" ? "Warp Portal" : "Safe Zone"
      }
    })

    const initialDuel: DuelState = {
      active: true,
      challengerId: challenger.id,
      defenderId: defender.id,
      challengerPos: 0,
      defenderPos: 5,
      laneTiles: generatedLane,
      turnId: challenger.id,
      logs: [`⚔️ A duel challenge was started between ${challenger.name} and ${defender.name}!`],
      winnerId: null
    }

    setDuel(initialDuel)
    setPhase("DUEL")
    
    // Announcer Speak
    speak(`A formal challenge was issued by ${challenger.name}! Duel lane generated.`)
  }

  const rollDuelDice = () => {
    const duelRoll = Math.floor(Math.random() * 3) + 1 // max 3 step choices for tactical duels
    const isChallengerTurn = duel.turnId === duel.challengerId

    let currentPos = isChallengerTurn ? duel.challengerPos : duel.defenderPos
    let direction = isChallengerTurn ? 1 : -1
    let nextPos = currentPos + (duelRoll * direction)

    // Bound position
    if (isChallengerTurn && nextPos > 5) nextPos = 5
    if (!isChallengerTurn && nextPos < 0) nextPos = 0

    // Resolve tile event
    const steppedTile = duel.laneTiles[nextPos]
    let resolutionMsg = ""
    let pointsWon = 0

    if (steppedTile) {
      if (steppedTile.type === "Trap") {
        resolutionMsg = `stepped on a Trap and lost ground! (Stunned)`
      } else if (steppedTile.type === "Reward") {
        resolutionMsg = `found a speed token! (Gained gold)`
        pointsWon = 20
      } else {
        resolutionMsg = `advanced safely.`
      }
    }

    const activePlayerName = players.find(p => p.id === duel.turnId)?.name || "Player"
    const nextLogs = [...duel.logs, `🎲 ${activePlayerName} rolled a ${duelRoll} and ${resolutionMsg}`]

    // Check win condition (cross to other side)
    const hasWon = (isChallengerTurn && nextPos === 5) || (!isChallengerTurn && nextPos === 0)
    let winner: string | null = null
    let nextPhase = phase

    if (hasWon) {
      winner = duel.turnId
      nextLogs.push(`👑 Duel Victory! ${activePlayerName} crossed the lane boundary successfully!`)
      nextPhase = "PLAYING"
      triggerAlert(`${activePlayerName} won the duel!`, true)

      // Apply inJail status change or free prisoner
      const updated = players.map(p => {
        if (p.id === (isChallengerTurn ? duel.defenderId : duel.challengerId)) {
          // Imprison the loser
          return { ...p, inJailBy: winner, jailTurns: 2 }
        }
        if (p.id === winner) {
          // Reward winner
          return { ...p, gold: p.gold + 40 }
        }
        return p
      })
      setPlayers(updated)
    }

    const nextTurnId = isChallengerTurn ? duel.defenderId : duel.challengerId

    // If opponent is bot, simulate automatic bot response
    const nextPlayerObj = players.find(p => p.id === nextTurnId)

    const updatedDuel: DuelState = {
      ...duel,
      challengerPos: isChallengerTurn ? nextPos : duel.challengerPos,
      defenderPos: !isChallengerTurn ? nextPos : duel.defenderPos,
      logs: nextLogs,
      turnId: nextTurnId,
      winnerId: winner,
      active: !hasWon
    }

    setDuel(updatedDuel)
    
    if (hasWon) {
      setPhase("PLAYING")
      pushLog(`⚔️ Duel concluded. ${activePlayerName} conquered the lane.`, "hype")
      advancePlayerTurn()
    } else {
      if (nextPlayerObj?.isBot) {
        setTimeout(() => {
          simulateBotDuelStep(updatedDuel)
        }, 1500)
      }
    }
  }

  const simulateBotDuelStep = (activeDuel: DuelState) => {
    const duelRoll = Math.floor(Math.random() * 2) + 1
    const isChallengerTurn = activeDuel.turnId === activeDuel.challengerId

    let currentPos = isChallengerTurn ? activeDuel.challengerPos : activeDuel.defenderPos
    let direction = isChallengerTurn ? 1 : -1
    let nextPos = currentPos + (duelRoll * direction)

    if (isChallengerTurn && nextPos > 5) nextPos = 5
    if (!isChallengerTurn && nextPos < 0) nextPos = 0

    const botName = players.find(p => p.id === activeDuel.turnId)?.name || "Bot"
    const nextLogs = [...activeDuel.logs, `🤖 ${botName} rolled a ${duelRoll} and advanced.`]

    const hasWon = (isChallengerTurn && nextPos === 5) || (!isChallengerTurn && nextPos === 0)
    let winner: string | null = null

    if (hasWon) {
      winner = activeDuel.turnId
      nextLogs.push(`👑 Duel Victory! ${botName} crossed the lane boundary successfully!`)
      
      const updated = players.map(p => {
        if (p.id === (isChallengerTurn ? activeDuel.defenderId : activeDuel.challengerId)) {
          return { ...p, inJailBy: winner, jailTurns: 2 }
        }
        if (p.id === winner) {
          return { ...p, gold: p.gold + 40 }
        }
        return p
      })
      setPlayers(updated)
    }

    const updatedDuel: DuelState = {
      ...activeDuel,
      challengerPos: isChallengerTurn ? nextPos : activeDuel.challengerPos,
      defenderPos: !isChallengerTurn ? nextPos : activeDuel.defenderPos,
      logs: nextLogs,
      turnId: isChallengerTurn ? activeDuel.defenderId : activeDuel.challengerId,
      winnerId: winner,
      active: !hasWon
    }

    setDuel(updatedDuel)

    if (hasWon) {
      setPhase("PLAYING")
      pushLog(`⚔️ Duel concluded. ${botName} conquered the lane.`, "roast")
      advancePlayerTurn()
    }
  }

  const handleReset = () => {
    setPhase("SETUP")
    setPlayers([])
    setLogs([])
  }

  return (
    <div className={`space-y-6 max-w-6xl mx-auto pb-10 ${shakeScreen ? "animate-bounce" : ""}`}>
      {/* Dynamic alert banner */}
      {alertMsg && (
        <div className={`p-4 rounded-xl border text-xs font-bold animate-in slide-in-from-top duration-300 ${alertMsg.success ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400" : "bg-red-950/40 border-red-500/20 text-red-400"}`}>
          {alertMsg.text}
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/playlab" className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all">
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </Link>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400">PlayLab Experience</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              🏰 Kingdom Rushboard
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
          <button onClick={() => setSoundMuted(!soundMuted)} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 transition-colors">
            {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-sm font-black text-white">{coins} Coins</span>
        </div>
      </div>

      {/* ── PHASE: SETUP CONFIGURATION ───────────────────────────────────────── */}
      {phase === "SETUP" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          <div className="lg:col-span-2 rounded-3xl border border-orange-500/20 bg-gradient-to-br from-amber-950/20 via-black to-zinc-950 p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">
                  Multiplayer Lobby
                </span>
                <h2 className="text-2xl font-black text-white mt-3">Configure Kingdom Arena</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Build your village, throw opponents in jail, engage in Russian Roulette duels, and race to the central Throne!
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Input Display Name</label>
                <input
                  type="text"
                  placeholder="Enter name..."
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none text-white focus:border-orange-500/50 text-sm"
                />
              </div>

              <div className="border-t border-white/5 pt-4 flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="CODE"
                  value={roomCodeInput}
                  onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                  className="w-24 px-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none text-white focus:border-orange-500/50 text-center font-black tracking-widest text-lg"
                />
                <Button onClick={joinLobbyByCode} className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl">
                  Join Room
                </Button>
                <Button onClick={hostLobby} className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold">
                  Host Room
                </Button>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 text-center">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">No Single-player mode</span>
              <p className="text-xs text-gray-400 mt-1">Starting host matchmaking auto-fills missing slots with tactical AI bots.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-gray-300 tracking-widest">Village Buildings Info</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <p>🏠 <b>Houses</b>: Increases wood/stone yields per turn.</p>
                <p>🧱 <b>Walls</b>: Minimizes damage/losses in duels.</p>
                <p>🛒 <b>Market</b>: Adds passive gold yields per turn.</p>
                <p>⚖️ <b>Jail</b>: Imprison captured explorers who hit traps.</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── PHASE: MULTIPLAYER LOBBY SCREEN ─────────────────────────────────── */}
      {phase === "MULTIPLAYER_LOBBY" && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch animate-in fade-in duration-300">
          <div className="lg:col-span-2 bg-zinc-950 p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div>
                <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">
                  Match Lobby
                </span>
                <h2 className="text-2xl font-black text-white mt-1">Lobby Room: {roomCode || "Hosting..."}</h2>
                <p className="text-xs text-gray-400">
                  {isLobbyHost ? "Invite friends. Fills empty slots with bots automatically when you launch." : "Waiting for host to launch matchmaking."}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/5">
              <Button onClick={toggleReady} 
                className={`flex-1 py-4 text-white rounded-xl font-bold transition-all ${isReady ? "bg-orange-600 hover:bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]" : "bg-zinc-800 hover:bg-zinc-700"}`}>
                {isReady ? "✓ Ready" : "Set Ready"}
              </Button>
              {isLobbyHost && (
                <Button onClick={startMatch} className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-extrabold">
                  Launch Duel Arena
                </Button>
              )}
              <Button onClick={handleReset} className="bg-red-950/40 hover:bg-red-900/40 text-red-400 px-4 rounded-xl border border-red-500/20">
                Cancel
              </Button>
            </div>
          </div>

          <div className="bg-zinc-950 p-6 rounded-3xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Connected Explorers ({lobbyPlayers.length})</h3>
            <div className="space-y-2">
              {lobbyPlayers.map(p => (
                <div key={p.presenceId} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-xs font-bold text-white">{p.name} {p.isHost && "👑"}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.isReady ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {p.isReady ? "Ready" : "Not Ready"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PHASE: PLAYING THE MATCH ────────────────────────────────────────── */}
      {phase === "PLAYING" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start animate-in fade-in duration-500">
          
          {/* Main Map View & Action Board */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* World Map Road representation */}
            <div className="rounded-3xl border border-orange-500/20 p-6 bg-gradient-to-br from-amber-950/10 to-zinc-950 space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider">World Map Paths</span>
                  <h3 className="text-lg font-black text-white">Race to the Center Throne</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gray-400 block">Active Turn</span>
                  <span className="text-sm font-black text-orange-400 flex items-center gap-1.5 justify-end">
                    {players[currentPlayerIdx]?.emoji} {players[currentPlayerIdx]?.name}
                  </span>
                </div>
              </div>

              {/* Path Progress Tracker */}
              <div className="space-y-4">
                {players.map(p => {
                  const isTurn = players[currentPlayerIdx]?.id === p.id
                  return (
                    <div key={p.id} className={`p-4 rounded-2xl border transition-all ${isTurn ? "border-orange-500 bg-orange-950/10 shadow-[0_0_15px_rgba(249,115,22,0.1)]" : "border-white/5 bg-white/5"}`}>
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span>{p.emoji}</span>
                          {p.name} {p.id === "player" && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 rounded">You</span>}
                          {p.inJailBy && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 rounded flex items-center gap-0.5"><ShieldAlert className="h-3 w-3" /> JAILED</span>}
                        </span>
                        <span className="text-gray-400 font-mono">Node {p.tileIndex} / 10</span>
                      </div>
                      
                      {/* Node track */}
                      <div className="flex gap-1.5 items-center w-full">
                        {Array.from({ length: 11 }).map((_, stepIdx) => {
                          const isCurrent = p.tileIndex === stepIdx
                          const isVisited = p.tileIndex > stepIdx
                          return (
                            <div key={stepIdx} 
                              className={`flex-1 h-3.5 rounded-lg border transition-all ${
                                isCurrent ? "bg-orange-500 border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.6)]" :
                                isVisited ? "bg-amber-900 border-amber-950 opacity-40" : "bg-zinc-900 border-white/5"
                              } ${stepIdx === 10 ? "relative flex items-center justify-center font-bold text-[8px] border-yellow-500 bg-yellow-950/20" : ""}`}
                            >
                              {stepIdx === 10 && "👑"}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Local player spatial Village dashboard & Action Center */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Village Buildings */}
              <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5"><Home className="h-4 w-4 text-orange-400" /> Your Kingdom Village</h3>
                
                {(() => {
                  const meObj = players.find(p => p.id === "player")
                  if (!meObj) return null
                  return (
                    <div className="space-y-4">
                      {/* Resource counters */}
                      <div className="grid grid-cols-3 gap-3 bg-white/5 border border-white/5 p-3 rounded-2xl text-center">
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold">Gold</span>
                          <span className="text-sm font-black text-yellow-400">{meObj.gold}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold">Wood</span>
                          <span className="text-sm font-black text-orange-400">{meObj.wood}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold">Stone</span>
                          <span className="text-sm font-black text-zinc-300">{meObj.stone}</span>
                        </div>
                      </div>

                      {/* Upgrade options */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Construct Upgrades</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => buildStructure("houses")} className="p-3 bg-white/5 border border-white/5 rounded-xl hover:border-orange-500/30 text-left text-xs transition-colors">
                            <h5 className="font-bold text-white">🏠 Houses ({meObj.buildings.houses})</h5>
                            <p className="text-[9px] text-gray-500 mt-0.5">Cost: 30G, 20W, 10S</p>
                          </button>
                          <button onClick={() => buildStructure("market")} className="p-3 bg-white/5 border border-white/5 rounded-xl hover:border-orange-500/30 text-left text-xs transition-colors">
                            <h5 className="font-bold text-white">🛒 Market ({meObj.buildings.market})</h5>
                            <p className="text-[9px] text-gray-500 mt-0.5">Cost: 50G, 30W, 10S</p>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Action Console */}
              <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5"><Sword className="h-4 w-4 text-orange-400" /> Action Console</h3>
                
                {(() => {
                  const meObj = players.find(p => p.id === "player")
                  if (!meObj) return null
                  const isMyTurn = players[currentPlayerIdx]?.id === "player"

                  if (meObj.inJailBy) {
                    return (
                      <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
                          <ShieldAlert className="h-4 w-4" /> Locked in Prison!
                        </h4>
                        <p className="text-xs text-gray-400">You must escape the jail boundaries before moving.</p>
                        <div className="flex gap-2">
                          <Button onClick={() => executeJailAction("Bribe")} size="sm" className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-black">
                            Bribe (50 Gold)
                          </Button>
                          <Button onClick={() => executeJailAction("Dice")} size="sm" className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold">
                            Dice Trial (5+)
                          </Button>
                        </div>
                      </div>
                    )
                  }

                  if (!isMyTurn) {
                    return (
                      <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-center text-xs text-gray-500">
                        ⏳ Announcer is commentating... Waiting for opponent's turn.
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      {diceRoll === null ? (
                        <Button onClick={rollDice} className="w-full py-6 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold rounded-2xl shadow-lg flex items-center justify-center gap-2">
                          🎲 Roll Movement Dice
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-center text-xs text-orange-400 font-bold">
                            You rolled a {diceRoll}! Choose route and steps to move.
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Road Type</label>
                              <select value={selectedRoad} onChange={e => setSelectedRoad(e.target.value as RoadType)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none">
                                <option value="Safe">Safe Road</option>
                                <option value="Risky">Risky Road</option>
                                <option value="Resource">Resource Road</option>
                                <option value="Portal">Portal Route</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Step Count</label>
                              <select value={selectedSteps} onChange={e => setSelectedSteps(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none">
                                {Array.from({ length: diceRoll }).map((_, i) => (
                                  <option key={i + 1} value={i + 1}>{i + 1} Step(s)</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button onClick={executeMove} className="flex-grow bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5">
                              ✓ Move Explorer
                            </Button>
                            <Button onClick={() => setDiceRoll(null)} variant="outline" className="border-white/10 text-gray-300 text-xs py-2.5">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Challenge option */}
                      <div className="border-t border-white/5 pt-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Issue Duel Challenge</span>
                        <div className="flex gap-2">
                          {players.filter(p => p.id !== "player").map(p => (
                            <button key={p.id} onClick={() => triggerDuelChallenge(p.id)} className="flex-1 py-2 bg-red-950/20 hover:bg-red-900/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-bold">
                              ⚔️ Challenge {p.name.split(" ")[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

            </div>

          </div>

          {/* Commentary Chronicle Log Feed */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 space-y-4 flex flex-col justify-between max-h-[450px]">
              <h3 className="text-xs font-black uppercase text-gray-300 border-b border-white/5 pb-2 flex items-center gap-1.5">
                🎙️ Arena Voice Chronicle
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[300px]">
                {logs.map(log => (
                  <div key={log.id} className={`p-2.5 rounded-xl border text-xs leading-relaxed ${log.type === "hype" ? "bg-orange-500/10 border-orange-500/20 text-orange-300 font-bold" : log.type === "roast" ? "bg-red-950/20 border-red-500/20 text-red-400 font-bold" : "bg-white/5 border-white/5 text-gray-400"}`}>
                    <span className="font-extrabold mr-1 text-[10px] text-gray-500">{log.sender}:</span>
                    {log.message}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── PHASE: PvP DUEL LANE SCREEN ──────────────────────────────────────── */}
      {phase === "DUEL" && (
        <div className="max-w-3xl mx-auto rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-950/10 via-black to-zinc-950 p-8 space-y-8 animate-in zoom-in duration-500">
          
          <div className="text-center space-y-2 border-b border-red-500/20 pb-4">
            <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs uppercase tracking-widest font-black rounded-full">
              ⚔️ PVP DUEL ARENA
            </span>
            <h2 className="text-3xl font-black text-white">Roulette duel lane</h2>
            <p className="text-xs text-gray-400">First explorer to reach the opponent's side wins the duel and conquers territory.</p>
          </div>

          {/* Duel lane rendering (6 tiles) */}
          <div className="space-y-4 py-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block text-center">Roulette Risk Lane (6 Tiles)</span>
            
            <div className="grid grid-cols-6 gap-2">
              {duel.laneTiles.map((tile, idx) => {
                const isChallengerPos = duel.challengerPos === idx
                const isDefenderPos = duel.defenderPos === idx
                return (
                  <div key={idx} className={`h-28 rounded-2xl border flex flex-col items-center justify-between p-2.5 transition-all ${
                    isChallengerPos ? "border-yellow-500 bg-yellow-950/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]" :
                    isDefenderPos ? "border-blue-500 bg-blue-950/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]" :
                    "border-white/5 bg-white/5"
                  }`}>
                    <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Tile {idx + 1}</span>
                    
                    {/* Character position indicators */}
                    <div className="flex flex-col gap-1 items-center">
                      {isChallengerPos && <span className="text-2xl animate-pulse">👑</span>}
                      {isDefenderPos && <span className="text-2xl animate-pulse">🤖</span>}
                      {!isChallengerPos && !isDefenderPos && <span className="text-lg opacity-25">❓</span>}
                    </div>

                    <span className="text-[9px] font-bold text-gray-400">{tile.type}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Duel interaction panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch border-t border-white/5 pt-6">
            
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-gray-300 tracking-wider">Duel Chronicle Feed</h4>
              <div className="bg-black/60 border border-white/5 p-4 rounded-2xl max-h-[150px] overflow-y-auto space-y-1.5 text-xs text-gray-400">
                {duel.logs.map((l, i) => <p key={i}>{l}</p>)}
              </div>
            </div>

            <div className="flex flex-col justify-center items-center space-y-4">
              {duel.turnId === "player" ? (
                <Button onClick={rollDuelDice} className="w-full py-6 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-2">
                  🎲 Roll Duel Dice (1-3)
                </Button>
              ) : (
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center text-xs text-gray-500">
                  ⏳ Announcer is commentating... Opponent is rolling.
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ── PHASE: RESULTS SCREEN ────────────────────────────────────────────── */}
      {phase === "RESULTS" && (
        <div className="max-w-md mx-auto border p-8 rounded-3xl text-center space-y-6 bg-gradient-to-br from-orange-900/40 via-zinc-900 to-black border-orange-500/30"
          style={{ boxShadow: "0 0 60px 20px rgba(249,115,22,0.1)" }}>
          <div className="inline-flex p-4 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 animate-bounce">
            <Trophy className="h-10 w-10 text-yellow-400" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">Match Concluded</h2>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-2 leading-relaxed">
              Ascension records successfully finalized. PlayLab Coins awarded.
            </p>
          </div>

          {/* Ranking list */}
          <div className="bg-black/60 border border-white/5 p-4 rounded-2xl space-y-3 text-left">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rankings</h4>
            <div className="space-y-1.5 text-xs text-white">
              {players
                .sort((a, b) => b.tileIndex - a.tileIndex)
                .map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🐾"}</span>
                      {p.name} {p.id === "player" && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1 rounded">You</span>}
                    </span>
                    <span className="text-gray-400">Node {p.tileIndex}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl text-xs text-orange-300 font-bold">
            🪙 PlayLab Coins sync completed successfully!
          </div>

          <div className="flex gap-3">
            <Button onClick={handleReset} className="flex-grow bg-orange-600 hover:bg-orange-500 text-white py-3.5 rounded-2xl text-xs font-bold">
              <RotateCcw className="h-4 w-4 mr-1 inline-block" /> Re-launch Arena
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
