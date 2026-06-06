"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ArrowLeft, Trophy, Play, RotateCcw, AlertTriangle, Volume2, VolumeX, ShieldAlert, Check, HelpCircle, Lock, Flame, ShoppingBag, Eye, Zap, Shield, Sparkles, RefreshCw, Star, MessageSquare } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { adjustCoins, onCoinsChange, loadProgress, saveProgress } from "@/lib/playlab-coins"

// ─── TYPES & INTERFACES ──────────────────────────────────────────────────────
type GamePhase = "SETUP" | "MULTIPLAYER_LOBBY" | "PLAYING" | "DUEL" | "RESULTS"
type TileType = "NEUTRAL" | "TRAP" | "SNAKE" | "TREASURE" | "QUEST" | "MARKETPLACE" | "RARE_ITEM" | "DUEL" | "EVENT" | "THRONE"

interface PlayerState {
  id: string
  name: string
  emoji: string
  isBot: boolean
  tileIndex: number // 0 to 30
  coins: number
  inventory: string[]
  shieldActive: boolean // immune to next trap/snake
  snakeImmunity: boolean // snake charm
  duelBonus: boolean // duel advantage (+2 modifier)
  color: string
  jailTurns: number // stuns
  activeQuest: {
    type: "explore" | "trap" | "treasure" | "duel" | "snake"
    progress: number
    target: number
    rewardCoins: number
    rewardItem?: string
    description: string
  }
}

interface TileState {
  index: number
  type: TileType
  revealed: boolean
  placedTrapBy?: string // player ID who placed a trap here
}

interface DuelState {
  active: boolean
  challengerId: string
  defenderId: string
  challengerRoll: number | null
  defenderRoll: number | null
  logs: string[]
}

interface ChatLog {
  id: string
  sender: string
  message: string
  type: "system" | "commentator" | "rare" | "danger"
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const EMOJIS = ["🦁", "🦅", "🐊", "🐉", "🐺", "🦊", "🦄", "🐙"]
const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#eab308", "#a855f7", "#ec4899"]

const QUEST_TEMPLATES = [
  { type: "explore" as const, target: 4, rewardCoins: 40, rewardItem: "Foresight Eye", description: "Explore 4 hidden tiles" },
  { type: "trap" as const, target: 1, rewardCoins: 50, rewardItem: "Immunity Shield", description: "Trigger/Survive 1 Trap" },
  { type: "treasure" as const, target: 2, rewardCoins: 30, rewardItem: "Warp Scroll", description: "Collect 2 Treasure caches" },
  { type: "duel" as const, target: 1, rewardCoins: 60, rewardItem: "Duel Crest", description: "Engage in 1 Duel" },
  { type: "snake" as const, target: 1, rewardCoins: 40, rewardItem: "Snake Charm", description: "Encounter 1 Snake setback" }
]

const COMMENTATOR_LINES = {
  trap: [
    "Boom! A hidden trap snaps shut!",
    "Direct hit! That explorer walked right into a pitfall!",
    "Oh, the agony! A trap has been triggered!",
    "Trap activated! Announcers are holding their breath!"
  ],
  snake: [
    "Watch out! The snake strikes again!",
    "Sliding backward! The snake coils around their plans!",
    "Oh no! Slipped all the way back down a snake's tail!",
    "The snake claims another victim!"
  ],
  duel: [
    "Conflict arises! Two explorers collide!",
    "Let the battle commence! A duel has begun!",
    "Roll for glory! They stand face to face!",
    "A legendary duel is taking place!"
  ],
  win: [
    "VICTORY! The Sovereign crown is claimed!",
    "Ascension complete! We have our champion!",
    "Unbelievable race! The Throne has been seized!"
  ]
}

// Helper to layout winding path index to x, y coords in a 6-col grid
const getTileCoords = (index: number) => {
  const cols = 6
  const row = Math.floor(index / cols)
  const col = index % cols
  const isReversed = row % 2 === 1
  const x = isReversed ? (cols - 1 - col) : col
  const y = row
  return { x, y }
}

export default function KingdomRushboardPage() {
  // Session & Global States
  const [userId, setUserId] = useState<string | null>(null)
  const [globalCoins, setGlobalCoins] = useState(100)
  const [username, setUsername] = useState("Player")
  const [phase, setPhase] = useState<GamePhase>("SETUP")
  const [soundMuted, setSoundMuted] = useState(false)
  
  // Lobby States
  const [roomCode, setRoomCode] = useState("")
  const [roomCodeInput, setRoomCodeInput] = useState("")
  const [isLobbyHost, setIsLobbyHost] = useState(false)
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([])
  const [myPresenceId, setMyPresenceId] = useState("")
  const [isReady, setIsReady] = useState(false)

  // Game Engine States
  const [board, setBoard] = useState<TileState[]>([])
  const [players, setPlayers] = useState<PlayerState[]>([])
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0)
  const [logs, setLogs] = useState<ChatLog[]>([])
  const [shakeScreen, setShakeScreen] = useState(false)
  const [placingTrap, setPlacingTrap] = useState(false)
  const [shoppingPlayerId, setShoppingPlayerId] = useState<string | null>(null)

  // Dice roll states
  const [isRolling, setIsRolling] = useState(false)
  const [diceRoll, setDiceRoll] = useState<number | null>(null)
  const [diceDisplayValue, setDiceDisplayValue] = useState(1)

  // Duel states
  const [duel, setDuel] = useState<DuelState>({
    active: false,
    challengerId: "",
    defenderId: "",
    challengerRoll: null,
    defenderRoll: null,
    logs: []
  })

  // Refs
  const myPresenceIdRef = useRef("")
  const channelRef = useRef<any>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // ─── AUDIO COMMENTATOR Synthesis ──────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (soundMuted || typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.05
    utterance.pitch = 0.95
    window.speechSynthesis.speak(utterance)
  }, [soundMuted])

  const pushLog = useCallback((message: string, type: ChatLog["type"] = "system") => {
    const newLog: ChatLog = {
      id: `${Date.now()}-${Math.random()}`,
      sender: type === "system" ? "📢 Announcer" : type === "commentator" ? "🎙️ Commentator" : type === "rare" ? "💎 Rare Drop" : "🧨 Hazard",
      message,
      type
    }
    setLogs(prev => [...prev, newLog])
    if (type === "commentator" || type === "danger" || type === "rare") {
      speak(message)
    }
  }, [speak])

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  // ─── INIT PROFILE & COINS ──────────────────────────────────────────────────
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
      setGlobalCoins(progress.coins)
      unsubCoins = onCoinsChange(resolvedUserId, (newBal) => setGlobalCoins(newBal))
    }
    init()

    return () => {
      if (unsubCoins) unsubCoins()
      if (channelRef.current) channelRef.current.unsubscribe()
    }
  }, [])

  // ─── BOARD GENERATION ──────────────────────────────────────────────────────
  const generateBoard = (): TileState[] => {
    return Array.from({ length: 31 }).map((_, idx) => {
      if (idx === 0) return { index: idx, type: "NEUTRAL", revealed: true }
      if (idx === 30) return { index: idx, type: "THRONE", revealed: true }
      
      let type: TileType = "NEUTRAL"
      if (idx === 5 || idx === 15 || idx === 25) type = "MARKETPLACE"
      else if (idx === 8 || idx === 18 || idx === 28) type = "SNAKE"
      else if (idx === 4 || idx === 12 || idx === 22) type = "TRAP"
      else if (idx === 3 || idx === 11 || idx === 21) type = "TREASURE"
      else if (idx === 7 || idx === 16 || idx === 24) type = "DUEL"
      else if (idx === 9 || idx === 17 || idx === 26) type = "QUEST"
      else if (idx === 14 || idx === 27) type = "RARE_ITEM"
      else if (idx === 10 || idx === 20 || idx === 29) type = "EVENT"
      
      return { index: idx, type, revealed: false }
    })
  }

  // ─── QUEST TEMPLATES ───────────────────────────────────────────────────────
  const generateQuest = () => {
    const template = QUEST_TEMPLATES[Math.floor(Math.random() * QUEST_TEMPLATES.length)]
    return {
      ...template,
      progress: 0
    }
  }

  // ─── SYNC STATE ACROSS MULTIPLAYER ─────────────────────────────────────────
  const syncGameState = (
    updatedPlayers: PlayerState[],
    nextPlayerIdx: number,
    newLogs: any[] = [],
    updatedBoard: TileState[] = board,
    extraPayload = {}
  ) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'game-event',
        payload: {
          players: updatedPlayers,
          currentPlayerIdx: nextPlayerIdx,
          logs: newLogs,
          board: updatedBoard,
          ...extraPayload
        }
      })
    } else {
      setPlayers(updatedPlayers)
      setCurrentPlayerIdx(nextPlayerIdx)
      setBoard(updatedBoard)
      newLogs.forEach(l => {
        setLogs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, sender: l.sender, message: l.message, type: l.type }])
        speak(l.message)
      })
    }
  }

  // ─── MULTIPLAYER LOBBY HANDLERS ────────────────────────────────────────────
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
      alert("Invalid Room Code!")
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
      const { playersList, boardInit } = payload
      
      const mapped = playersList.map((p: any) => {
        if (p.id === myPresenceIdRef.current) {
          return { ...p, id: "player" }
        }
        return p
      })

      setPlayers(mapped)
      setBoard(boardInit)
      setPhase("PLAYING")
      setCurrentPlayerIdx(0)
      setLogs([])
      pushLog("🏰 Welcome to Kingdom Rushboard Arena! Race to the Throne has begun!", "system")
      pushLog("🎙️ ANN-1 Commentator Engine Loaded. Visual board online.", "commentator")
    })

    channel.on('broadcast', { event: 'game-event' }, ({ payload }) => {
      if (payload.players) setPlayers(payload.players)
      if (payload.currentPlayerIdx !== undefined) setCurrentPlayerIdx(payload.currentPlayerIdx)
      if (payload.board) setBoard(payload.board)
      if (payload.logs) {
        payload.logs.forEach((l: any) => {
          setLogs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, sender: l.sender, message: l.message, type: l.type }])
          speak(l.message)
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

    const initialBoard = generateBoard()
    const playersList: PlayerState[] = lobbyPlayers.map((lp, idx) => ({
      id: lp.presenceId,
      name: lp.name,
      emoji: EMOJIS[idx % EMOJIS.length],
      isBot: false,
      tileIndex: 0,
      coins: 100,
      inventory: ["Trap Shield"], // Start with a basic shield
      shieldActive: false,
      snakeImmunity: false,
      duelBonus: false,
      color: COLORS[idx % COLORS.length],
      jailTurns: 0,
      activeQuest: generateQuest()
    }))

    // Fill with bots up to 4 players
    const botNames = ["Sir Alistair (Bot)", "Lady Vanessa (Bot)", "King Richard (Bot)", "Dwarf Grom (Bot)"]
    while (playersList.length < 4) {
      const bIdx = playersList.length
      playersList.push({
        id: `bot-${bIdx}`,
        name: botNames[bIdx % botNames.length],
        emoji: EMOJIS[bIdx % EMOJIS.length],
        isBot: true,
        tileIndex: 0,
        coins: 100,
        inventory: ["Trap Shield"],
        shieldActive: false,
        snakeImmunity: false,
        duelBonus: false,
        color: COLORS[bIdx % COLORS.length],
        jailTurns: 0,
        activeQuest: generateQuest()
      })
    }

    channelRef.current.send({
      type: 'broadcast',
      event: 'start-match',
      payload: { playersList, boardInit: initialBoard }
    })
  }

  // ─── PLAYING TURNS & BOT TURNS ─────────────────────────────────────────────
  const advanceTurn = (currentList: PlayerState[]) => {
    setDiceRoll(null)
    const nextIdx = (currentPlayerIdx + 1) % currentList.length
    const nextPlayer = currentList[nextIdx]

    if (nextPlayer.jailTurns > 0) {
      const updated = currentList.map((p, idx) => {
        if (idx === nextIdx) {
          return { ...p, jailTurns: p.jailTurns - 1 }
        }
        return p
      })
      pushLog(`⏳ ${nextPlayer.name} is stunned/skipping turn! (${nextPlayer.jailTurns} turns remaining)`, "danger")
      syncGameState(updated, nextIdx)
      setTimeout(() => advanceTurn(updated), 1500)
      return
    }

    if (nextPlayer.isBot) {
      syncGameState(currentList, nextIdx)
      setTimeout(() => executeBotTurn(nextIdx, currentList), 2000)
    } else {
      syncGameState(currentList, nextIdx)
    }
  }

  // ─── DICE ROLLING ANIMATION ────────────────────────────────────────────────
  const rollDice = () => {
    if (isRolling || diceRoll !== null) return
    setIsRolling(true)
    let rollResult = Math.floor(Math.random() * 6) + 1

    const interval = setInterval(() => {
      setDiceDisplayValue(Math.floor(Math.random() * 6) + 1)
    }, 60)

    setTimeout(() => {
      clearInterval(interval)
      setDiceDisplayValue(rollResult)
      setDiceRoll(rollResult)
      setIsRolling(false)
      pushLog(`🎲 ${players[currentPlayerIdx]?.name} rolled a ${rollResult}! Choose a tile to move to.`, "system")
    }, 1200)
  }

  // ─── HAZARD RESOLUTIONS (TRAP, SNAKE, DUELS, TREASURE) ──────────────────────
  const resolveTileTrigger = (
    playerIdx: number,
    targetTileIndex: number,
    currentList: PlayerState[],
    currentBoard: TileState[]
  ) => {
    const player = currentList[playerIdx]
    const tile = currentBoard[targetTileIndex]
    let updatedPlayers = [...currentList]
    let updatedBoard = [...currentBoard]
    let logMsg = ""
    let logsType: ChatLog["type"] = "system"

    // Mark tile as permanently revealed
    updatedBoard[targetTileIndex] = { ...tile, revealed: true }

    // Quest progression for exploration
    if (player.activeQuest.type === "explore") {
      const wasRevealed = tile.revealed
      if (!wasRevealed) {
        updatedPlayers = updatedPlayers.map((p, idx) => {
          if (idx === playerIdx) {
            const nextProgress = p.activeQuest.progress + 1
            return {
              ...p,
              activeQuest: { ...p.activeQuest, progress: nextProgress }
            }
          }
          return p
        })
      }
    }

    // Resolve specific tile contents
    switch (tile.type) {
      case "TREASURE":
        const goldGain = Math.floor(Math.random() * 30) + 30
        updatedPlayers = updatedPlayers.map((p, idx) => {
          if (idx === playerIdx) {
            let nextCoins = p.coins + goldGain
            let qProgress = p.activeQuest.progress
            if (p.activeQuest.type === "treasure") {
              qProgress = Math.min(p.activeQuest.target, qProgress + 1)
            }
            return { ...p, coins: nextCoins, activeQuest: { ...p.activeQuest, progress: qProgress } }
          }
          return p
        })
        logMsg = `💰 Treasure! ${player.name} retrieved an ancient vault (+${goldGain} Coins).`
        break

      case "TRAP":
        // Check shield protection
        if (player.shieldActive) {
          updatedPlayers = updatedPlayers.map((p, idx) => {
            if (idx === playerIdx) {
              return { ...p, shieldActive: false }
            }
            return p
          })
          logMsg = `🛡️ Trap Shield absorbed the dangerous blast for ${player.name}!`
        } else {
          // Trigger actual trap
          const lines = COMMENTATOR_LINES.trap
          const quote = lines[Math.floor(Math.random() * lines.length)]
          
          // Trap outcome: lost turn or move back 2 spaces
          const trapOutcome = Math.random() < 0.5 ? "back" : "stun"
          if (trapOutcome === "back") {
            const backIndex = Math.max(0, targetTileIndex - 2)
            updatedPlayers = updatedPlayers.map((p, idx) => {
              if (idx === playerIdx) {
                return { ...p, tileIndex: backIndex }
              }
              return p
            })
            logMsg = `🧨 ${quote} ${player.name} was blasted backward to tile ${backIndex}.`
          } else {
            updatedPlayers = updatedPlayers.map((p, idx) => {
              if (idx === playerIdx) {
                return { ...p, jailTurns: 1 }
              }
              return p
            })
            logMsg = `🧨 ${quote} ${player.name} was stunned and loses their next turn!`
          }
          logsType = "danger"

          // Update Quest progress for trap survived
          updatedPlayers = updatedPlayers.map((p, idx) => {
            if (idx === playerIdx && p.activeQuest.type === "trap") {
              return { ...p, activeQuest: { ...p.activeQuest, progress: Math.min(p.activeQuest.target, p.activeQuest.progress + 1) } }
            }
            return p
          })
        }
        setShakeScreen(true)
        setTimeout(() => setShakeScreen(false), 500)
        break

      case "SNAKE":
        if (player.snakeImmunity || player.shieldActive) {
          updatedPlayers = updatedPlayers.map((p, idx) => {
            if (idx === playerIdx) {
              return { ...p, shieldActive: false, snakeImmunity: false }
            }
            return p
          })
          logMsg = `🛡️ ${player.name} bypassed the giant viper thanks to their protective items!`
        } else {
          const lines = COMMENTATOR_LINES.snake
          const quote = lines[Math.floor(Math.random() * lines.length)]
          const targetIndex = Math.max(0, targetTileIndex - 5)
          updatedPlayers = updatedPlayers.map((p, idx) => {
            if (idx === playerIdx) {
              return { ...p, tileIndex: targetIndex }
            }
            return p
          })
          logMsg = `🐍 ${quote} ${player.name} slid all the way back to tile ${targetIndex}.`
          logsType = "danger"

          // Update Quest progress
          updatedPlayers = updatedPlayers.map((p, idx) => {
            if (idx === playerIdx && p.activeQuest.type === "snake") {
              return { ...p, activeQuest: { ...p.activeQuest, progress: Math.min(p.activeQuest.target, p.activeQuest.progress + 1) } }
            }
            return p
          })
        }
        break

      case "RARE_ITEM":
        const rarePool = ["Foresight Eye", "Warp Scroll", "Immunity Shield", "Duel Crest", "Snake Charm"]
        const droppedItem = rarePool[Math.floor(Math.random() * rarePool.length)]
        updatedPlayers = updatedPlayers.map((p, idx) => {
          if (idx === playerIdx) {
            return { ...p, inventory: [...p.inventory, droppedItem] }
          }
          return p
        })
        logMsg = `💎 Rare drop! ${player.name} uncovered a mythical [${droppedItem}]!`
        logsType = "rare"
        break

      case "MARKETPLACE":
        logMsg = `🛒 ${player.name} entered the mystical merchant Marketplace!`
        if (!player.isBot) {
          setShoppingPlayerId(player.id)
        } else {
          // Bot Marketplace purchases logic
          if (player.coins >= 80) {
            updatedPlayers = updatedPlayers.map((p, idx) => {
              if (idx === playerIdx) {
                return { ...p, coins: p.coins - 80, inventory: [...p.inventory, "Trap Shield"] }
              }
              return p
            })
            logMsg += ` Bot purchased a [Trap Shield] for 80 coins.`
          }
        }
        break

      case "QUEST":
        const questGift = Math.floor(Math.random() * 20) + 15
        updatedPlayers = updatedPlayers.map((p, idx) => {
          if (idx === playerIdx) {
            return { ...p, coins: p.coins + questGift }
          }
          return p
        })
        logMsg = `🧭 Quest shrine! ${player.name} received a coin boon (+${questGift} Coins).`
        break

      case "EVENT":
        const eventId = Math.floor(Math.random() * 3)
        if (eventId === 0) {
          logMsg = `🌀 Event: Temporal Rift! Everyone receives a teleportation gift (+1 tile forward).`
          updatedPlayers = updatedPlayers.map(p => ({
            ...p,
            tileIndex: Math.min(30, p.tileIndex + 1)
          }))
        } else if (eventId === 1) {
          logMsg = `🌀 Event: Taxes of the Realm! Everyone loses 15 coins to the vault.`
          updatedPlayers = updatedPlayers.map(p => ({
            ...p,
            coins: Math.max(0, p.coins - 15)
          }))
        } else {
          logMsg = `🌀 Event: Winds of Chaos! The player in last place receives a coin bounty (+40 coins).`
          let lastPlayerIdx = 0
          let minTiles = 99
          updatedPlayers.forEach((p, idx) => {
            if (p.tileIndex < minTiles) {
              minTiles = p.tileIndex
              lastPlayerIdx = idx
            }
          })
          updatedPlayers = updatedPlayers.map((p, idx) => {
            if (idx === lastPlayerIdx) {
              return { ...p, coins: p.coins + 40 }
            }
            return p
          })
        }
        break

      default:
        logMsg = `👣 ${player.name} stopped safely on tile ${targetTileIndex}.`
        break
    }

    // Check placed traps on this tile
    if (tile.placedTrapBy && tile.placedTrapBy !== player.id) {
      if (player.shieldActive) {
        updatedPlayers = updatedPlayers.map((p, idx) => {
          if (idx === playerIdx) {
            return { ...p, shieldActive: false }
          }
          return p
        })
        logMsg += ` The shield blocked a player-laid trap!`
      } else {
        const victimIndex = Math.max(0, targetTileIndex - 3)
        updatedPlayers = updatedPlayers.map((p, idx) => {
          if (idx === playerIdx) {
            return { ...p, tileIndex: victimIndex }
          }
          return p
        })
        logMsg += ` Stumbled on a custom trap laid by an opponent! Blasted back to tile ${victimIndex}.`
      }
      // Remove custom trap after trigger
      updatedBoard[targetTileIndex] = { ...tile, placedTrapBy: undefined }
    }

    // Check for Duels (forced duel if landing on same tile as another player)
    const occupants = updatedPlayers.filter((p, idx) => idx !== playerIdx && p.tileIndex === targetTileIndex && targetTileIndex > 0 && targetTileIndex < 30)
    if (occupants.length > 0 && phase !== "DUEL") {
      const opponent = occupants[0]
      const duelLines = COMMENTATOR_LINES.duel
      const duelQuote = duelLines[Math.floor(Math.random() * duelLines.length)]
      
      const newLogs = [
        { sender: "📢 Announcer", message: logMsg, type: logsType },
        { sender: "🎙️ Commentator", message: `⚔️ ${duelQuote} Duel triggered between ${player.name} and ${opponent.name}!`, type: "danger" }
      ]

      const nextDuel: DuelState = {
        active: true,
        challengerId: player.id,
        defenderId: opponent.id,
        challengerRoll: null,
        defenderRoll: null,
        logs: [`Challenger: ${player.name} • Defender: ${opponent.name}`]
      }

      setDuel(nextDuel)
      setPhase("DUEL")
      syncGameState(updatedPlayers, playerIdx, newLogs, updatedBoard, { duel: nextDuel, phase: "DUEL" })
      return
    }

    // Quest completion check
    updatedPlayers = updatedPlayers.map((p, idx) => {
      if (idx === playerIdx && p.activeQuest.progress >= p.activeQuest.target) {
        const giftCoins = p.activeQuest.rewardCoins
        let updatedInv = [...p.inventory]
        if (p.activeQuest.rewardItem) {
          updatedInv.push(p.activeQuest.rewardItem)
        }
        pushLog(`🧭 Quest Completed! ${p.name} completed [${p.activeQuest.description}]! (+${giftCoins}c, +${p.activeQuest.rewardItem || ""})`, "rare")
        return {
          ...p,
          coins: p.coins + giftCoins,
          inventory: updatedInv,
          activeQuest: generateQuest()
        }
      }
      return p
    })

    // Check Victory
    if (targetTileIndex === 30) {
      const winLines = COMMENTATOR_LINES.win
      const winQuote = winLines[Math.floor(Math.random() * winLines.length)]
      const victoryLogs = [
        { sender: "📢 Announcer", message: logMsg, type: "system" },
        { sender: "🎙️ Commentator", message: `👑 ${winQuote} ${player.name} reaches the Throne!`, type: "hype" }
      ]
      setPhase("RESULTS")
      syncGameState(updatedPlayers, playerIdx, victoryLogs, updatedBoard, { phase: "RESULTS" })
      
      if (player.id === "player") {
        adjustCoins(userId, 40) // +40 global account coins
      }
      return
    }

    // Sync and proceed to next turn
    syncGameState(updatedPlayers, playerIdx, [{ sender: "📢 Announcer", message: logMsg, type: logsType }], updatedBoard)
    advanceTurn(updatedPlayers)
  }

  // ─── PLAYER MOVE SUBMISSION (CLICK TILE) ───────────────────────────────────
  const movePlayerToTile = (targetTileIndex: number) => {
    if (diceRoll === null || phase !== "PLAYING") return
    const activePlayer = players[currentPlayerIdx]
    if (activePlayer.id !== "player") return

    // Execute move
    let updatedPlayers = players.map((p, idx) => {
      if (idx === currentPlayerIdx) {
        return { ...p, tileIndex: targetTileIndex }
      }
      return p
    })

    resolveTileTrigger(currentPlayerIdx, targetTileIndex, updatedPlayers, board)
  }

  // ─── BOT MOVEMENT CHOICES ──────────────────────────────────────────────────
  const executeBotTurn = (botIdx: number, currentList: PlayerState[]) => {
    const bot = currentList[botIdx]
    if (!bot || phase !== "PLAYING") return

    // Roll movement
    const steps = Math.floor(Math.random() * 6) + 1
    // Choose tactical step: bot evaluates the safety of future tiles
    let pickedStep = steps
    for (let s = 1; s <= steps; s++) {
      const targetIndex = Math.min(30, bot.tileIndex + s)
      const tile = board[targetIndex]
      // Smart bot avoids known Traps/Snakes if possible
      if (tile.revealed && (tile.type === "TRAP" || tile.type === "SNAKE")) {
        continue
      }
      pickedStep = s
    }

    const nextIndex = Math.min(30, bot.tileIndex + pickedStep)
    pushLog(`🤖 ${bot.name} rolled a ${steps} and tactically chose to move ${pickedStep} space(s) to tile ${nextIndex}.`, "system")

    let updatedPlayers = currentList.map((p, idx) => {
      if (idx === botIdx) {
        return { ...p, tileIndex: nextIndex }
      }
      return p
    })

    setTimeout(() => {
      resolveTileTrigger(botIdx, nextIndex, updatedPlayers, board)
    }, 1200)
  }

  // ─── INVENTORY ITEM ACTIVATION ─────────────────────────────────────────────
  const useInventoryItem = (itemName: string) => {
    const activePlayer = players[currentPlayerIdx]
    if (activePlayer.id !== "player" || phase !== "PLAYING") return

    let nextInv = [...activePlayer.inventory]
    const idx = nextInv.indexOf(itemName)
    if (idx < 0) return
    nextInv.splice(idx, 1)

    let updatedPlayers = players.map((p, index) => {
      if (index === currentPlayerIdx) {
        let shield = p.shieldActive
        let snake = p.snakeImmunity
        let duelB = p.duelBonus

        if (itemName === "Trap Shield" || itemName === "Immunity Shield") {
          shield = true
          pushLog(`🛡️ ${p.name} activated a Shield! Protected from the next trap hazard.`, "system")
        } else if (itemName === "Snake Charm") {
          snake = true
          pushLog(`🧿 ${p.name} activated a Snake Charm! Searing immunity to snakes.`, "system")
        } else if (itemName === "Duel Crest") {
          duelB = true
          pushLog(`⚔️ ${p.name} activated a Duel Crest! +2 modifier on the next duel battle.`, "system")
        } else if (itemName === "Warp Scroll") {
          // Instantly warp forward
          const jump = Math.floor(Math.random() * 3) + 3
          const targetIndex = Math.min(30, p.tileIndex + jump)
          pushLog(`🌀 ${p.name} read a Warp Scroll and teleported forward +${jump} spaces!`, "system")
          
          const warpedPlayers = players.map((pl, i) => {
            if (i === currentPlayerIdx) {
              return { ...pl, tileIndex: targetIndex, inventory: nextInv }
            }
            return pl
          })
          resolveTileTrigger(currentPlayerIdx, targetIndex, warpedPlayers, board)
          return { ...p, tileIndex: targetIndex, inventory: nextInv }
        } else if (itemName === "Reveal Vision" || itemName === "Foresight Eye") {
          // Reveal next 3 tiles
          const startIdx = p.tileIndex + 1
          const nextBoard = board.map((t) => {
            if (t.index >= startIdx && t.index <= startIdx + 2) {
              return { ...t, revealed: true }
            }
            return t
          })
          setBoard(nextBoard)
          pushLog(`👁️ ${p.name} casted Foresight! The next 3 tiles are now fully revealed.`, "system")
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'game-event',
              payload: { board: nextBoard }
            })
          }
        } else if (itemName === "Trap Token") {
          setPlacingTrap(true)
          pushLog(`🧨 Choose a tile on the board to place your hidden explosive trap.`, "system")
          return { ...p, inventory: nextInv }
        } else if (itemName === "Reroll Token") {
          setDiceRoll(null)
          pushLog(`🎲 ${p.name} used a Reroll Token! The dice has reset.`, "system")
        }

        return {
          ...p,
          inventory: nextInv,
          shieldActive: shield,
          snakeImmunity: snake,
          duelBonus: duelB
        }
      }
      return p
    })

    if (itemName !== "Warp Scroll") {
      setPlayers(updatedPlayers)
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'game-event',
          payload: { players: updatedPlayers }
        })
      }
    }
  }

  // Trap placing action click
  const handleBoardTileClickForTrap = (tileIndex: number) => {
    if (!placingTrap) return
    const activePlayer = players[currentPlayerIdx]
    
    // Check constraints: cannot place on Start, Throne, or tiles with players on them
    if (tileIndex === 0 || tileIndex === 30) {
      alert("Cannot place traps on Start or Throne tiles!")
      return
    }

    const nextBoard = board.map(t => {
      if (t.index === tileIndex) {
        return { ...t, placedTrapBy: activePlayer.id }
      }
      return t
    })
    setBoard(nextBoard)
    setPlacingTrap(false)
    pushLog(`🧨 Hidden trap successfully armed on tile ${tileIndex}!`, "system")
    
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'game-event',
        payload: { board: nextBoard }
      })
    }
  }

  // ─── PVP DUELING SYSTEM ────────────────────────────────────────────────────
  const rollDuelDiceForActive = () => {
    const isChallenger = duel.challengerId === players[currentPlayerIdx]?.id
    const roll = Math.floor(Math.random() * 6) + 1
    const playerObj = players.find(p => p.id === (isChallenger ? duel.challengerId : duel.defenderId))!

    let updatedDuel = { ...duel }
    if (isChallenger) {
      updatedDuel.challengerRoll = roll
      updatedDuel.logs = [...duel.logs, `🎲 Challenger ${playerObj.name} rolled: ${roll}`]
    } else {
      updatedDuel.defenderRoll = roll
      updatedDuel.logs = [...duel.logs, `🎲 Defender ${playerObj.name} rolled: ${roll}`]
    }

    setDuel(updatedDuel)

    // Evaluate if both rolled
    if (updatedDuel.challengerRoll !== null && updatedDuel.defenderRoll !== null) {
      const challenger = players.find(p => p.id === duel.challengerId)!
      const defender = players.find(p => p.id === duel.defenderId)!

      let chScore = updatedDuel.challengerRoll + (challenger.duelBonus ? 2 : 0)
      let defScore = updatedDuel.defenderRoll + (defender.duelBonus ? 2 : 0)

      if (challenger.duelBonus) updatedDuel.logs.push(`🛡️ Challenger ${challenger.name} duel modifier (+2) applied.`)
      if (defender.duelBonus) updatedDuel.logs.push(`🛡️ Defender ${defender.name} duel modifier (+2) applied.`)

      if (chScore === defScore) {
        updatedDuel.logs.push("⚖️ A perfect tie! Rolling again...")
        updatedDuel.challengerRoll = null
        updatedDuel.defenderRoll = null
        setDuel(updatedDuel)
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'game-event',
            payload: { duel: updatedDuel }
          })
        }
        return
      }

      const challengerWon = chScore > defScore
      const winner = challengerWon ? challenger : defender
      const loser = challengerWon ? defender : challenger

      // Apply pushback penalty of 3 tiles to the loser
      const backIndex = Math.max(0, loser.tileIndex - 3)
      
      const updatedPlayers = players.map(p => {
        let duelBonusUsed = p.duelBonus
        if (p.id === challenger.id) duelBonusUsed = false // consume bonus
        if (p.id === defender.id) duelBonusUsed = false

        if (p.id === loser.id) {
          return { ...p, tileIndex: backIndex, duelBonus: duelBonusUsed }
        }
        if (p.id === winner.id) {
          // Reward winner with coins and Quest progress
          let qProgress = p.activeQuest.progress
          if (p.activeQuest.type === "duel") {
            qProgress = Math.min(p.activeQuest.target, qProgress + 1)
          }
          return { ...p, coins: p.coins + 30, duelBonus: duelBonusUsed, activeQuest: { ...p.activeQuest, progress: qProgress } }
        }
        return p
      })

      updatedDuel.logs.push(`👑 Winner: ${winner.name}! ${loser.name} is knocked back to tile ${backIndex}.`)
      updatedDuel.active = false

      setDuel(updatedDuel)
      setPhase("PLAYING")
      pushLog(`⚔️ Duel concluded. ${winner.name} conquered the duel lane.`, "commentator")

      syncGameState(updatedPlayers, currentPlayerIdx, [
        { sender: "📢 Announcer", message: `⚔️ Duel winner: ${winner.name}! Loser knocked back 3 spaces.`, type: "system" }
      ], board, { phase: "PLAYING", duel: updatedDuel })

      // Proceed turn
      advanceTurn(updatedPlayers)
    } else {
      // Prompt bot defender to roll automatically
      const defenderObj = players.find(p => p.id === duel.defenderId)!
      if (defenderObj.isBot && !isChallenger) {
        setTimeout(() => {
          rollDuelDiceForBot(updatedDuel)
        }, 1500)
      } else if (defenderObj.isBot && isChallenger) {
        // Trigger bot defensive roll
        setTimeout(() => {
          rollDuelDiceForBot(updatedDuel)
        }, 1500)
      }
    }
  }

  // Simulating Bot duel dice roll
  const rollDuelDiceForBot = (activeDuel: DuelState) => {
    const roll = Math.floor(Math.random() * 6) + 1
    const isChallenger = activeDuel.challengerId === players[currentPlayerIdx]?.id
    const opponentId = isChallenger ? activeDuel.defenderId : activeDuel.challengerId
    const opponentObj = players.find(p => p.id === opponentId)!

    let updatedDuel = { ...activeDuel }
    if (opponentId === activeDuel.challengerId) {
      updatedDuel.challengerRoll = roll
      updatedDuel.logs = [...activeDuel.logs, `🎲 Bot Challenger ${opponentObj.name} rolled: ${roll}`]
    } else {
      updatedDuel.defenderRoll = roll
      updatedDuel.logs = [...activeDuel.logs, `🎲 Bot Defender ${opponentObj.name} rolled: ${roll}`]
    }

    setDuel(updatedDuel)

    // Evaluate
    if (updatedDuel.challengerRoll !== null && updatedDuel.defenderRoll !== null) {
      const challenger = players.find(p => p.id === activeDuel.challengerId)!
      const defender = players.find(p => p.id === activeDuel.defenderId)!

      let chScore = updatedDuel.challengerRoll + (challenger.duelBonus ? 2 : 0)
      let defScore = updatedDuel.defenderRoll + (defender.duelBonus ? 2 : 0)

      if (chScore === defScore) {
        updatedDuel.logs.push("⚖️ A perfect tie! Rolling again...")
        updatedDuel.challengerRoll = null
        updatedDuel.defenderRoll = null
        setDuel(updatedDuel)
        return
      }

      const challengerWon = chScore > defScore
      const winner = challengerWon ? challenger : defender
      const loser = challengerWon ? defender : challenger

      const backIndex = Math.max(0, loser.tileIndex - 3)
      
      const updatedPlayers = players.map(p => {
        let duelBonusUsed = p.duelBonus
        if (p.id === challenger.id) duelBonusUsed = false
        if (p.id === defender.id) duelBonusUsed = false

        if (p.id === loser.id) {
          return { ...p, tileIndex: backIndex, duelBonus: duelBonusUsed }
        }
        if (p.id === winner.id) {
          return { ...p, coins: p.coins + 30, duelBonus: duelBonusUsed }
        }
        return p
      })

      updatedDuel.logs.push(`👑 Winner: ${winner.name}! ${loser.name} is knocked back to tile ${backIndex}.`)
      updatedDuel.active = false

      setDuel(updatedDuel)
      setPhase("PLAYING")
      pushLog(`⚔️ Duel concluded. ${winner.name} conquered the duel lane.`, "system")

      syncGameState(updatedPlayers, currentPlayerIdx, [
        { sender: "📢 Announcer", message: `⚔️ Duel winner: ${winner.name}! Loser knocked back 3 spaces.`, type: "system" }
      ], board, { phase: "PLAYING", duel: updatedDuel })

      advanceTurn(updatedPlayers)
    }
  }

  // ─── SHOPPING MARKETPLACE ACTIONS ──────────────────────────────────────────
  const buyShopItem = (itemName: string, cost: number) => {
    const pIdx = players.findIndex(p => p.id === shoppingPlayerId)
    if (pIdx < 0) return
    const buyer = players[pIdx]

    if (buyer.coins < cost) {
      alert("Not enough coins!")
      return
    }

    const updatedPlayers = players.map((p, idx) => {
      if (idx === pIdx) {
        return {
          ...p,
          coins: p.coins - cost,
          inventory: [...p.inventory, itemName]
        }
      }
      return p
    })

    setPlayers(updatedPlayers)
    setShoppingPlayerId(null)
    pushLog(`🛒 ${buyer.name} bought a [${itemName}] from the Marketplace.`, "system")

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'game-event',
        payload: { players: updatedPlayers }
      })
    }
  }

  const handleReset = () => {
    setPhase("SETUP")
    setPlayers([])
    setBoard([])
    setLogs([])
  }

  return (
    <div className={`space-y-6 max-w-6xl mx-auto pb-10 ${shakeScreen ? "animate-bounce" : ""}`}>
      
      {/* Header Panel */}
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
          <span className="text-sm font-black text-white flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-yellow-400 fill-yellow-400" /> {globalCoins} Coins
          </span>
        </div>
      </div>

      {/* ─── PHASE: SETUP ────────────────────────────────────────────────────── */}
      {phase === "SETUP" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 rounded-3xl border border-orange-500/20 bg-gradient-to-br from-amber-950/20 via-black to-zinc-950 p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">
                  Competitive Board Race
                </span>
                <h2 className="text-2xl font-black text-white mt-3">Enter the Rushboard Duel</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Roll dice, make strategic movement decisions, trigger hidden snakes or traps, complete quests, buy powerful items, and race to claim the central Throne!
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Input Display Name</label>
                <input
                  type="text"
                  placeholder="Enter name..."
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none text-white focus:border-orange-500/50 text-sm font-bold"
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
                <Button onClick={joinLobbyByCode} className="bg-zinc-850 hover:bg-zinc-750 border border-white/5 text-white rounded-xl">
                  Join Room
                </Button>
                <Button onClick={hostLobby} className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-md shadow-orange-600/20">
                  Host Room
                </Button>
              </div>
            </div>
            <div className="border-t border-white/5 pt-4 text-left">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Competitive Balance</span>
              <p className="text-[11px] text-gray-400 mt-1">1 player per token. Fully competitive hidden-path board race. Bots fill empty slots.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-gray-300 tracking-widest">Board Tile Encyclopedia</h3>
              <div className="space-y-3.5 text-xs text-gray-400">
                <p>💰 <b>Treasure</b>: Grants random Coin boosts.</p>
                <p>🪤 <b>Traps</b>: Hidden bombs that stun or blow you backward.</p>
                <p>🐍 <b>Snakes</b>: Severe setback slides sending you back 5 slots.</p>
                <p>🛒 <b>Marketplace</b>: Land here to purchase protective shields and foresight spells.</p>
                <p>💎 <b>Rare Items</b>: Low drop rate chest holding scrolls and charms.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PHASE: MULTIPLAYER LOBBY ────────────────────────────────────────── */}
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
                  {isLobbyHost ? "Invite friends. Auto-fills remaining spots with bots when you launch." : "Waiting for host to launch matchmaking."}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/5">
              <Button onClick={toggleReady} 
                className={`flex-1 py-4 text-white rounded-xl font-bold transition-all ${isReady ? "bg-orange-600 hover:bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]" : "bg-zinc-800 hover:bg-zinc-700"}`}>
                {isReady ? "✓ Ready" : "Set Ready"}
              </Button>
              {isLobbyHost && (
                <Button onClick={startMatch} className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-extrabold shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                  Launch Board Arena
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

      {/* ─── PHASE: PLAYING THE MATCH ────────────────────────────────────────── */}
      {phase === "PLAYING" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start animate-in fade-in duration-500">
          
          {/* Visual Path Winding Board */}
          <div className="lg:col-span-3 space-y-6">
            <div className="rounded-3xl border border-orange-500/10 p-6 bg-gradient-to-br from-zinc-950 to-black space-y-5">
              
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider">Interactive Path Board</span>
                  <h3 className="text-lg font-black text-white">Land on Hidden Tiles • Race to the Throne</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">Active Turn</span>
                  <span className="text-xs font-black text-orange-400 flex items-center gap-1 mt-0.5">
                    {players[currentPlayerIdx]?.emoji} {players[currentPlayerIdx]?.name}
                  </span>
                </div>
              </div>

              {/* Graphical Grid Board representation (6x6 snake path) */}
              <div className="grid grid-cols-6 gap-3 pt-2 relative">
                {board.map((tile) => {
                  const occupants = players.filter(p => p.tileIndex === tile.index)
                  const isCurrentPlayerLanded = players[currentPlayerIdx]?.tileIndex === tile.index
                  
                  // Compute if this tile is a valid destination choice
                  const isMyTurn = players[currentPlayerIdx]?.id === "player"
                  const maxAllowedStep = diceRoll !== null ? diceRoll : 0
                  const playerPos = players[currentPlayerIdx]?.tileIndex || 0
                  const isSelectableDestination = isMyTurn && diceRoll !== null && tile.index > playerPos && tile.index <= Math.min(30, playerPos + maxAllowedStep)

                  // Styles
                  let tileColors = "border-white/5 bg-zinc-900/60"
                  if (tile.index === 0) tileColors = "border-orange-500/30 bg-orange-950/20"
                  else if (tile.index === 30) tileColors = "border-yellow-500/40 bg-yellow-950/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                  else if (tile.revealed) {
                    if (tile.type === "TRAP") tileColors = "border-red-500/30 bg-red-950/20 text-red-400"
                    else if (tile.type === "SNAKE") tileColors = "border-purple-500/30 bg-purple-950/20 text-purple-400"
                    else if (tile.type === "TREASURE") tileColors = "border-yellow-500/30 bg-yellow-950/20 text-yellow-400"
                    else if (tile.type === "MARKETPLACE") tileColors = "border-blue-500/30 bg-blue-950/20 text-blue-400"
                    else if (tile.type === "RARE_ITEM") tileColors = "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                    else if (tile.type === "DUEL") tileColors = "border-pink-500/30 bg-pink-950/20 text-pink-400"
                    else if (tile.type === "EVENT") tileColors = "border-cyan-500/30 bg-cyan-950/20 text-cyan-400"
                    else if (tile.type === "QUEST") tileColors = "border-orange-500/30 bg-orange-950/20 text-orange-400"
                  }

                  const { x, y } = getTileCoords(tile.index)

                  return (
                    <div
                      key={tile.index}
                      onClick={() => {
                        if (placingTrap) {
                          handleBoardTileClickForTrap(tile.index)
                        } else if (isSelectableDestination) {
                          movePlayerToTile(tile.index)
                        }
                      }}
                      style={{ gridColumnStart: x + 1, gridRowStart: y + 1 }}
                      className={`h-20 sm:h-24 rounded-2xl border flex flex-col justify-between p-2 select-none relative transition-all duration-300
                        ${tileColors}
                        ${isSelectableDestination ? "shadow-[0_0_15px_rgba(16,185,129,0.5)] border-emerald-400 scale-[1.03] cursor-pointer hover:bg-emerald-950/20" : ""}
                        ${placingTrap && tile.index > 0 && tile.index < 30 ? "shadow-[0_0_15px_rgba(239,68,68,0.5)] border-red-500 scale-[1.03] cursor-pointer hover:bg-red-950/20 animate-pulse" : ""}
                      `}
                    >
                      <div className="flex justify-between items-center text-[9px] font-mono font-bold text-gray-500">
                        <span>#{tile.index}</span>
                        {tile.placedTrapBy && <span className="text-red-400 animate-pulse">🧨</span>}
                      </div>

                      {/* Token occupants representation */}
                      <div className="flex flex-wrap gap-1 justify-center items-center">
                        {occupants.map(p => (
                          <span key={p.id} className="text-xl sm:text-2xl animate-bounce drop-shadow" style={{ color: p.color }}>
                            {p.emoji}
                          </span>
                        ))}
                      </div>

                      {/* Revealed details or question mark */}
                      <div className="text-[9px] font-bold text-center uppercase tracking-widest text-gray-400">
                        {tile.index === 0 ? (
                          <span className="text-orange-400">START</span>
                        ) : tile.index === 30 ? (
                          <span className="text-yellow-400 font-black">THRONE</span>
                        ) : tile.revealed ? (
                          <span>{tile.type}</span>
                        ) : (
                          <span className="text-gray-600">?</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

            </div>

            {/* Dashboard & Interactions Console */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Dynamic Interactive Dice roller */}
              <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 flex flex-col items-center justify-between space-y-4">
                <div className="w-full border-b border-white/5 pb-2 flex justify-between items-center">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Interactive Dice Engine</h3>
                  <span className="text-[10px] text-gray-500 font-bold">SPIN TO MOVE</span>
                </div>

                <div className="flex flex-col items-center justify-center space-y-5 my-4">
                  {/* Visual 3D style CSS dice face */}
                  <div
                    onClick={() => {
                      if (players[currentPlayerIdx]?.id === "player") rollDice()
                    }}
                    className={`w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-3xl shadow-xl flex items-center justify-center border-2 border-orange-400/40 cursor-pointer select-none transition-transform duration-300
                      ${isRolling ? "animate-spin scale-110" : "hover:scale-105 active:scale-95"}
                    `}
                  >
                    {/* Render visual die dots based on current display value */}
                    <div className="grid grid-cols-3 gap-1.5 p-3.5 w-full h-full justify-items-center items-center">
                      {diceDisplayValue === 1 && (
                        <>
                          <div /><div /><div />
                          <div /><div className="w-2.5 h-2.5 bg-white rounded-full" /><div />
                          <div /><div /><div />
                        </>
                      )}
                      {diceDisplayValue === 2 && (
                        <>
                          <div className="w-2.5 h-2.5 bg-white rounded-full" /><div /><div />
                          <div /><div /><div />
                          <div /><div /><div className="w-2.5 h-2.5 bg-white rounded-full" />
                        </>
                      )}
                      {diceDisplayValue === 3 && (
                        <>
                          <div className="w-2.5 h-2.5 bg-white rounded-full" /><div /><div />
                          <div /><div className="w-2.5 h-2.5 bg-white rounded-full" /><div />
                          <div /><div /><div className="w-2.5 h-2.5 bg-white rounded-full" />
                        </>
                      )}
                      {diceDisplayValue === 4 && (
                        <>
                          <div className="w-2.5 h-2.5 bg-white rounded-full" /><div /><div className="w-2.5 h-2.5 bg-white rounded-full" />
                          <div /><div /><div />
                          <div className="w-2.5 h-2.5 bg-white rounded-full" /><div /><div className="w-2.5 h-2.5 bg-white rounded-full" />
                        </>
                      )}
                      {diceDisplayValue === 5 && (
                        <>
                          <div className="w-2.5 h-2.5 bg-white rounded-full" /><div /><div className="w-2.5 h-2.5 bg-white rounded-full" />
                          <div /><div className="w-2.5 h-2.5 bg-white rounded-full" /><div />
                          <div className="w-2.5 h-2.5 bg-white rounded-full" /><div /><div className="w-2.5 h-2.5 bg-white rounded-full" />
                        </>
                      )}
                      {diceDisplayValue === 6 && (
                        <>
                          <div className="w-2.5 h-2.5 bg-white rounded-full" /><div /><div className="w-2.5 h-2.5 bg-white rounded-full" />
                          <div className="w-2.5 h-2.5 bg-white rounded-full" /><div /><div className="w-2.5 h-2.5 bg-white rounded-full" />
                          <div className="w-2.5 h-2.5 bg-white rounded-full" /><div /><div className="w-2.5 h-2.5 bg-white rounded-full" />
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 text-center font-bold">
                    {isRolling ? "Spinning..." : "Click dice to roll"}
                  </p>
                </div>

                {players[currentPlayerIdx]?.id === "player" && diceRoll !== null && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[11px] text-center text-emerald-400 font-bold">
                    💡 Click on one of the glowing board tiles to complete your move!
                  </div>
                )}
              </div>

              {/* Inventory Management Panel */}
              <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 space-y-4">
                <div className="border-b border-white/5 pb-2 flex justify-between items-center">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="h-4 w-4 text-orange-400" /> Backpack Inventory
                  </h3>
                  <span className="text-[10px] text-yellow-400 font-bold font-mono">
                    {players.find(p => p.id === "player")?.coins} COINS
                  </span>
                </div>

                {(() => {
                  const me = players.find(p => p.id === "player")
                  if (!me) return null
                  return (
                    <div className="space-y-4">
                      {/* Active Status protections */}
                      <div className="flex gap-2">
                        {me.shieldActive && (
                          <span className="text-[9px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                            <Shield className="h-3 w-3" /> Hazmat Shield Active
                          </span>
                        )}
                        {me.snakeImmunity && (
                          <span className="text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                            🧿 Snake Charm Active
                          </span>
                        )}
                        {me.duelBonus && (
                          <span className="text-[9px] bg-pink-500/10 border border-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                            ⚔️ Duel bonus (+2) Active
                          </span>
                        )}
                      </div>

                      {/* Items grid list */}
                      {me.inventory.length === 0 ? (
                        <p className="text-xs text-gray-500 italic py-4 text-center">Your backpack is empty. Stop at Marketplace tiles to buy gear.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {me.inventory.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => useInventoryItem(item)}
                              disabled={players[currentPlayerIdx]?.id !== "player" || placingTrap}
                              className="p-3 bg-white/5 border border-white/5 hover:border-orange-500/30 text-left rounded-xl transition-all disabled:opacity-40"
                            >
                              <h5 className="font-bold text-white text-xs">{item}</h5>
                              <p className="text-[9px] text-gray-500 mt-0.5">Click to activate</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

            </div>
          </div>

          {/* Announcer chronicles logs & active quests sidebar */}
          <div className="space-y-6">
            
            {/* Quest Panel */}
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 space-y-4">
              <h3 className="text-xs font-black uppercase text-gray-300 tracking-wider flex items-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-500" /> Active Quests
              </h3>
              {(() => {
                const me = players.find(p => p.id === "player")
                if (!me) return null
                const q = me.activeQuest
                return (
                  <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl space-y-3.5 text-xs">
                    <div>
                      <h4 className="font-black text-white">{q.description}</h4>
                      <span className="text-[9px] text-gray-400 uppercase tracking-widest block mt-0.5">Reward: +{q.rewardCoins} coins {q.rewardItem ? `, +${q.rewardItem}` : ""}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                        <span>Progress</span>
                        <span>{q.progress} / {q.target}</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${(q.progress / q.target) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Commentary Chronicle Logs */}
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 space-y-4 flex flex-col justify-between max-h-[350px]">
              <h3 className="text-xs font-black uppercase text-gray-300 border-b border-white/5 pb-2 flex items-center gap-1.5">
                🎙️ Commentator Chronicle
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-[200px]">
                {logs.map(log => (
                  <div key={log.id} className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                    log.type === "commentator" ? "bg-orange-500/10 border-orange-500/20 text-orange-300 font-bold" :
                    log.type === "danger" ? "bg-red-950/20 border-red-500/20 text-red-400 font-bold animate-pulse" :
                    log.type === "rare" ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 font-bold" :
                    "bg-white/5 border-white/5 text-gray-400"
                  }`}>
                    <span className="font-extrabold mr-1 text-[10px] text-gray-500">{log.sender}:</span>
                    {log.message}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─── PHASE: PVP DUEL SCORING SCREEN ──────────────────────────────────── */}
      {phase === "DUEL" && (
        <div className="max-w-2xl mx-auto rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-950/10 via-black to-zinc-950 p-8 space-y-8 animate-in zoom-in duration-500">
          <div className="text-center space-y-2 border-b border-red-500/20 pb-4">
            <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs uppercase tracking-widest font-black rounded-full">
              ⚔️ PVP DUEL ARENA
            </span>
            <h2 className="text-3xl font-black text-white">Board Conflict Duel</h2>
            <p className="text-xs text-gray-400">Roll the highest number to win and knock back your opponent 3 slots.</p>
          </div>

          <div className="grid grid-cols-2 gap-6 text-center">
            {/* Challenger info */}
            {(() => {
              const challenger = players.find(p => p.id === duel.challengerId)!
              const isChallengerActive = players[currentPlayerIdx]?.id === duel.challengerId
              return (
                <div className="p-5 rounded-2xl border border-white/5 bg-white/5 space-y-4">
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block">Challenger</span>
                  <div className="text-4xl">{challenger.emoji}</div>
                  <h4 className="text-lg font-black text-white">{challenger.name}</h4>
                  {challenger.duelBonus && <span className="text-[10px] text-yellow-400 font-bold">Crest Active (+2)</span>}
                  
                  <div className="h-16 flex items-center justify-center border border-white/10 rounded-xl bg-black/40">
                    {duel.challengerRoll !== null ? (
                      <span className="text-3xl font-black text-white">{duel.challengerRoll}</span>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Waiting...</span>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Defender info */}
            {(() => {
              const defender = players.find(p => p.id === duel.defenderId)!
              const isDefenderActive = players[currentPlayerIdx]?.id === duel.defenderId
              return (
                <div className="p-5 rounded-2xl border border-white/5 bg-white/5 space-y-4">
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block">Defender</span>
                  <div className="text-4xl">{defender.emoji}</div>
                  <h4 className="text-lg font-black text-white">{defender.name}</h4>
                  {defender.duelBonus && <span className="text-[10px] text-yellow-400 font-bold">Crest Active (+2)</span>}
                  
                  <div className="h-16 flex items-center justify-center border border-white/10 rounded-xl bg-black/40">
                    {duel.defenderRoll !== null ? (
                      <span className="text-3xl font-black text-white">{duel.defenderRoll}</span>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Waiting...</span>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Interactive roll controls */}
          <div className="border-t border-white/5 pt-6 flex flex-col justify-center items-center space-y-4">
            <div className="bg-black/60 border border-white/5 p-4 rounded-2xl w-full max-h-[120px] overflow-y-auto space-y-1 text-xs text-gray-400">
              {duel.logs.map((l, i) => <p key={i}>{l}</p>)}
            </div>

            {((duel.challengerId === players[currentPlayerIdx]?.id && duel.challengerRoll === null) ||
              (duel.defenderId === players[currentPlayerIdx]?.id && duel.defenderRoll === null)) ? (
              <Button onClick={rollDuelDiceForActive} className="w-full py-5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-2">
                🎲 Roll Duel Die
              </Button>
            ) : (
              <p className="text-xs text-gray-500 italic">Narrator commentating on duel rolls...</p>
            )}
          </div>
        </div>
      )}

      {/* ─── PHASE: RESULTS SCREEN ────────────────────────────────────────────── */}
      {phase === "RESULTS" && (
        <div className="max-w-md mx-auto border p-8 rounded-3xl text-center space-y-6 bg-gradient-to-br from-orange-950/40 via-zinc-950 to-black border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.1)] animate-in zoom-in duration-500">
          <div className="inline-flex p-4 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 animate-bounce">
            <Trophy className="h-10 w-10 text-yellow-400" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">Match Concluded</h2>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-2 leading-relaxed">
              Ascension records finalized. PlayLab Coins awarded.
            </p>
          </div>

          {/* Ranking list */}
          <div className="bg-black/60 border border-white/5 p-4 rounded-2xl space-y-3 text-left">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Final Leaderboard</h4>
            <div className="space-y-2 text-xs text-white">
              {players
                .sort((a, b) => b.tileIndex - a.tileIndex)
                .map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "👣"}</span>
                      {p.name} {p.id === "player" && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1 rounded">You</span>}
                    </span>
                    <span className="text-gray-400 font-mono">Tile #{p.tileIndex}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl text-xs text-orange-300 font-bold">
            🪙 PlayLab Coins sync completed successfully!
          </div>

          <div className="flex gap-3">
            <Button onClick={handleReset} className="flex-grow bg-orange-600 hover:bg-orange-500 text-white py-3.5 rounded-2xl text-xs font-bold">
              <RotateCcw className="h-4 w-4 mr-1 inline-block" /> Re-launch Duel Arena
            </Button>
          </div>
        </div>
      )}

      {/* ─── MODAL: Marketplace Shop Buy items ───────────────────────────────── */}
      {shoppingPlayerId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-orange-400" /> Marketplace Merchant
              </h3>
              <span className="text-[10px] text-yellow-400 font-bold font-mono">
                {players.find(p => p.id === shoppingPlayerId)?.coins}c
              </span>
            </div>

            <p className="text-xs text-gray-400">Select an item to buy using your earned match coins:</p>

            <div className="space-y-2.5">
              {[
                { name: "Trap Shield", desc: "Absorbs next trap blast", cost: 80 },
                { name: "Snake Charm", desc: "Grants immunity to snakes", cost: 60 },
                { name: "Duel Crest", desc: "Gain +2 roll bonus on next duel", cost: 65 },
                { name: "Reveal Vision", desc: "Reveals next 3 tiles ahead", cost: 50 },
                { name: "Trap Token", desc: "Place a custom trap on the board", cost: 70 },
                { name: "Warp Scroll", desc: "Jump forward +3-5 spaces", cost: 90 },
              ].map(item => {
                const buyer = players.find(p => p.id === shoppingPlayerId)!
                const canBuy = buyer.coins >= item.cost
                return (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl">
                    <div>
                      <h5 className="font-bold text-white text-xs">{item.name}</h5>
                      <p className="text-[9px] text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                    <Button
                      onClick={() => buyShopItem(item.name, item.cost)}
                      disabled={!canBuy}
                      className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 text-xs px-2.5 h-7 font-black rounded-lg"
                    >
                      {item.cost}c
                    </Button>
                  </div>
                )
              })}
            </div>

            <Button onClick={() => setShoppingPlayerId(null)} className="w-full bg-white/5 hover:bg-white/10 text-gray-400 text-xs py-2 rounded-xl">
              Close Merchant
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
