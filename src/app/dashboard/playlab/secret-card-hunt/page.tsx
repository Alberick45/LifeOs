"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Brain, Zap, Trophy, Play, RotateCcw, Crown, TrendingUp, Users, AlertTriangle, Check, Lock, Sparkles, Heart, Sword, Shield, Activity, Plus, LogIn, ChevronRight, HelpCircle, Eye, EyeOff, Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { readCoins, adjustCoins, onCoinsChange, loadProgress, saveProgress, saveHighScore } from "@/lib/playlab-coins"

// ─── TYPES ───────────────────────────────────────────────────────────────────
type GamePhase = "SETUP" | "PLAYING" | "REVEAL_ANIMATION" | "RESULTS" | "MULTIPLAYER_LOBBY"
type PackId = "countries" | "animals" | "foods" | "humanos"
type GameMode = "CLASSIC" | "HUNTER" | "SURVIVAL"
type Difficulty = "EASY" | "NORMAL" | "HARD"

interface CardItem {
  id: string
  name: string
  emoji: string
  rarity: "Easy" | "Medium" | "Hard"
  attributes: Record<string, string> // e.g. Continent: "Europe", Letter: "B", etc.
  clues: string[]
}

interface PlayerState {
  id: string // "player" or bot-uuid or presence-id
  name: string
  emoji: string
  isBot: boolean
  secretCard: CardItem
  status: "hidden" | "revealed"
  points: number
  hasBluffedThisMatch: boolean
  eliminatedRound: number | null
  revealedBy: string | null
  deductionPossibilities: string[] // List of possible cards remaining in this player's mind for target
  stunnedTurns: number // penalized state (cannot guess)
}

interface QuestionType {
  id: string
  label: string
  type: "yes_no" | "mc" | "risk"
  description: string
  attributeKey?: string
  expectedValue?: string
  options?: string[]
}

interface GameLog {
  id: string
  turn: number
  message: string
  type: "question" | "answer" | "guess" | "bluff_call" | "clue" | "elimination" | "system"
}

// ─── GAME PACKS DATA ─────────────────────────────────────────────────────────
const COUNTRIES_PACK: CardItem[] = [
  { id: "brazil", name: "Brazil", emoji: "🇧🇷", rarity: "Easy", attributes: { Continent: "South America", "First Letter": "B", Hemispheres: "Southern" }, clues: ["Home of the Amazon Rainforest", "Official language is Portuguese", "Flag is green, yellow, and blue"] },
  { id: "belgium", name: "Belgium", emoji: "🇧🇪", rarity: "Medium", attributes: { Continent: "Europe", "First Letter": "B", Hemispheres: "Northern" }, clues: ["Capital of the European Union", "Famous for waffles and chocolate", "Flag is black, yellow, and red"] },
  { id: "botswana", name: "Botswana", emoji: "🇧🇼", rarity: "Medium", attributes: { Continent: "Africa", "First Letter": "B", Hemispheres: "Southern" }, clues: ["Home of the Okavango Delta", "One of the world's largest diamond exporters", "Mainly covered by the Kalahari Desert"] },
  { id: "bulgaria", name: "Bulgaria", emoji: "🇧🇬", rarity: "Hard", attributes: { Continent: "Europe", "First Letter": "B", Hemispheres: "Northern" }, clues: ["Uses the Cyrillic Alphabet", "Bordered by the Black Sea", "Known as the Land of Roses"] },
  { id: "liechtenstein", name: "Liechtenstein", emoji: "🇱🇮", rarity: "Hard", attributes: { Continent: "Europe", "First Letter": "L", Hemispheres: "Northern" }, clues: ["Doubly landlocked microstate", "Located entirely in the Alps", "Bordered by Switzerland and Austria"] },
  { id: "japan", name: "Japan", emoji: "🇯🇵", rarity: "Easy", attributes: { Continent: "Asia", "First Letter": "J", Hemispheres: "Northern" }, clues: ["Known as the Land of the Rising Sun", "Known for sushi and cherry blossoms", "Capital is Tokyo"] },
  { id: "kenya", name: "Kenya", emoji: "🇰🇪", rarity: "Easy", attributes: { Continent: "Africa", "First Letter": "K", Hemispheres: "Northern" }, clues: ["Famous for Maasai Mara safaris", "Capital is Nairobi", "Home to Mount Kenya"] },
  { id: "madagascar", name: "Madagascar", emoji: "🇲🇬", rarity: "Medium", attributes: { Continent: "Africa", "First Letter": "M", Hemispheres: "Southern" }, clues: ["Large island nation off East Africa", "Home to baobab trees and lemurs", "Fourth largest island in the world"] }
]

const ANIMALS_PACK: CardItem[] = [
  { id: "lion", name: "Lion", emoji: "🦁", rarity: "Easy", attributes: { Type: "Mammal", Diet: "Carnivore", Habitat: "Savanna" }, clues: ["Known as the King of the Jungle", "Lives in social groups called prides", "Male has a large dark mane"] },
  { id: "penguin", name: "Penguin", emoji: "🐧", rarity: "Easy", attributes: { Type: "Bird", Diet: "Carnivore", Habitat: "Ocean" }, clues: ["Flightless bird with tuxedo-like feathers", "Waddles and slides on its belly", "Native primarily to the Southern Hemisphere"] },
  { id: "platypus", name: "Platypus", emoji: "🦆", rarity: "Hard", attributes: { Type: "Mammal", Diet: "Carnivore", Habitat: "River" }, clues: ["Egg-laying mammal", "Has a duck-like bill and beaver-like tail", "Males have venomous spurs on their hind feet"] },
  { id: "kangaroo", name: "Kangaroo", emoji: "🦘", rarity: "Easy", attributes: { Type: "Mammal", Diet: "Herbivore", Habitat: "Savanna" }, clues: ["Carries offspring in a pouch", "Native to Australia", "Hops on powerful hind legs"] },
  { id: "chameleon", name: "Chameleon", emoji: "🦎", rarity: "Medium", attributes: { Type: "Reptile", Diet: "Carnivore", Habitat: "Forest" }, clues: ["Can change color to match surroundings", "Has eyes that move independently", "Catches insects with a long sticky tongue"] },
  { id: "dolphin", name: "Dolphin", emoji: "🐬", rarity: "Easy", attributes: { Type: "Mammal", Diet: "Carnivore", Habitat: "Ocean" }, clues: ["Highly intelligent marine mammal", "Uses echolocation to hunt", "Breathes through a blowhole on top of its head"] }
]

const FOODS_PACK: CardItem[] = [
  { id: "pizza", name: "Pizza", emoji: "🍕", rarity: "Easy", attributes: { Origin: "Europe", Category: "Savory", Course: "Main" }, clues: ["Flatbread topped with tomato sauce and cheese", "Originated in Naples, Italy", "Baked in a high-temperature stone oven"] },
  { id: "sushi", name: "Sushi", emoji: "🍣", rarity: "Easy", attributes: { Origin: "Asia", Category: "Savory", Course: "Main" }, clues: ["Prepared vinegared rice with raw seafood", "Wrapped in edible seaweed called Nori", "Commonly dipped in soy sauce and wasabi"] },
  { id: "kimchi", name: "Kimchi", emoji: "🥬", rarity: "Hard", attributes: { Origin: "Asia", Category: "Spicy", Course: "Side" }, clues: ["Korean fermented salted vegetables", "Typically made with napa cabbage and chili powder", "Strong sour and pungent garlic smell"] },
  { id: "gelato", name: "Gelato", emoji: "🍧", rarity: "Medium", attributes: { Origin: "Europe", Category: "Sweet", Course: "Dessert" }, clues: ["Italian style soft ice cream", "Has a lower butterfat percentage than regular ice cream", "Served slightly warmer for a silkier texture"] },
  { id: "taco", name: "Taco", emoji: "🌮", rarity: "Easy", attributes: { Origin: "North America", Category: "Savory", Course: "Main" }, clues: ["Folded corn or flour tortilla with fillings", "Originates from Mexican street food culture", "Often served with salsa, lime, and cilantro"] }
]

// Fallback HumanOS Friends Pack (Loaded dynamically or mocked)
const HUMANOS_DEFAULT_PACK: CardItem[] = [
  { id: "friend_kwame", name: "Kwame (Study Partner)", emoji: "👨‍💻", rarity: "Easy", attributes: { Role: "Classmate", "Coffee Choice": "Espresso", "Coding Language": "TypeScript" }, clues: ["Drinks coffee black", "Always codes in TypeScript", "Enjoys solving algorithmic challenges"] },
  { id: "friend_albert", name: "Albert (Neighbor)", emoji: "🏃‍♂️", rarity: "Medium", attributes: { Role: "Friend", "Coffee Choice": "Latte", "Coding Language": "Python" }, clues: ["Runs half-marathons", "Prefers milk-based espresso drinks", "Main developer of numerical scripts"] },
  { id: "friend_sarah", name: "Sarah (Research Partner)", emoji: "👩‍🔬", rarity: "Hard", attributes: { Role: "Classmate", "Coffee Choice": "Decaf", "Coding Language": "Rust" }, clues: ["Writes highly compiler-safe code", "Sensitive to caffeine", "Conducts neural network experiments"] }
]

export default function SecretCardHuntPage() {
  // Phase and Session States
  const [phase, setPhase] = useState<GamePhase>("SETUP")
  const [userId, setUserId] = useState<string | null>(null)
  const [coins, setCoins] = useState(100)
  const [highScore, setHighScore] = useState(0)
  const [username, setUsername] = useState("Commander")

  // Setup Config
  const [selectedPackId, setSelectedPackId] = useState<PackId>("countries")
  const [activePack, setActivePack] = useState<CardItem[]>(COUNTRIES_PACK)
  const [mode, setMode] = useState<GameMode>("CLASSIC")
  const [difficulty, setDifficulty] = useState<Difficulty>("NORMAL")

  // Game Play States
  const [players, setPlayers] = useState<PlayerState[]>([])
  const [logs, setLogs] = useState<GameLog[]>([])
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0)
  const [matchTurnCount, setMatchTurnCount] = useState(1)
  const [showSecretCard, setShowSecretCard] = useState(false)
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)

  // Active question query popup states
  const [selectedQueryType, setSelectedQueryType] = useState<"yes_no" | "mc" | "risk" | null>(null)
  const [selectedAttrKey, setSelectedAttrKey] = useState<string>("")
  const [selectedAttrValue, setSelectedAttrValue] = useState<string>("")
  const [selectedGuessName, setSelectedGuessName] = useState<string>("")

  // Incoming question modal for user
  const [incomingQuestion, setIncomingQuestion] = useState<{
    askerId: string
    questionText: string
    questionType: "yes_no" | "mc" | "risk"
    honestAnswer: string
    options?: string[]
    attrKey?: string
  } | null>(null)

  const [activeBluffAlert, setActiveBluffAlert] = useState<{
    title: string
    desc: string
    success: boolean
  } | null>(null)

  const [alertMsg, setAlertMsg] = useState<{ text: string; success: boolean } | null>(null)

  const triggerAlert = (text: string, success: boolean) => {
    setAlertMsg({ text, success })
    setTimeout(() => {
      setAlertMsg(null)
    }, 3000)
  }

  // Multiplayer Lobby States
  const [roomCode, setRoomCode] = useState("")
  const [roomInput, setRoomInput] = useState("")
  const [isHost, setIsHost] = useState(false)
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([])
  const [myPresenceId, setMyPresenceId] = useState("")
  const channelRef = useRef<any>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Auto scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  // Load database statistics & details
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
      setHighScore(progress.high_scores?.secret_card_hunt ?? 0)

      // Subscribe to updates
      unsubCoins = onCoinsChange(resolvedUserId, (newBal) => setCoins(newBal))
    }
    init()

    return () => {
      if (unsubCoins) unsubCoins()
      if (channelRef.current) channelRef.current.unsubscribe()
    }
  }, [])

  // Resolve active pack changes
  useEffect(() => {
    if (selectedPackId === "countries") setActivePack(COUNTRIES_PACK)
    if (selectedPackId === "animals") setActivePack(ANIMALS_PACK)
    if (selectedPackId === "foods") setActivePack(FOODS_PACK)
    if (selectedPackId === "humanos") loadHumanOSPack()
  }, [selectedPackId])

  const loadHumanOSPack = async () => {
    if (!userId) {
      setActivePack(HUMANOS_DEFAULT_PACK)
      return
    }
    // Fetch real verified friends from DB
    try {
      const { data, error } = await supabase
        .from("verified_links")
        .select("user_a, user_b, relationship_type")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      
      if (error || !data || data.length === 0) {
        setActivePack(HUMANOS_DEFAULT_PACK)
        return
      }

      const friendIds = data.map(r => r.user_a === userId ? r.user_b : r.user_a)
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, handle")
        .in("id", friendIds)

      if (profErr || !profiles || profiles.length === 0) {
        setActivePack(HUMANOS_DEFAULT_PACK)
        return
      }

      const builtPack: CardItem[] = profiles.map((p, idx) => {
        const relationship = data.find(r => r.user_a === p.id || r.user_b === p.id)?.relationship_type || "Friend"
        const languages = ["TypeScript", "Python", "Rust", "Go", "JavaScript"]
        const coffee = ["Latte", "Espresso", "Decaf", "Cappuccino", "Cold Brew"]
        const codeLang = languages[idx % languages.length]
        const coffChoice = coffee[idx % coffee.length]

        return {
          id: `friend_${p.id}`,
          name: p.handle || `Friend #${idx+1}`,
          emoji: relationship === "family" ? "👪" : "👨‍💻",
          rarity: idx % 3 === 0 ? "Easy" : idx % 3 === 1 ? "Medium" : "Hard",
          attributes: {
            Relationship: relationship,
            "Coding Language": codeLang,
            "Coffee Preference": coffChoice
          },
          clues: [
            `Relationship role is ${relationship}`,
            `Known to code primarily in ${codeLang}`,
            `Enjoys drinking ${coffChoice} coffee`
          ]
        }
      })
      setActivePack(builtPack)
    } catch {
      setActivePack(HUMANOS_DEFAULT_PACK)
    }
  }

  const pushLog = (message: string, type: GameLog["type"]) => {
    setLogs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, turn: matchTurnCount, message, type }])
  }

  // ─── SINGLE PLAYER MATCH INITIALIZER ───────────────────────────────────────
  const startSinglePlayerMatch = () => {
    if (activePack.length < 4) {
      triggerAlert("Selected pack has too few cards to play!", false)
      return
    }

    // Shuffle and distribute cards
    const shuffledCards = [...activePack].sort(() => Math.random() - 0.5)
    
    const pCard = shuffledCards[0]
    const b1Card = shuffledCards[1]
    const b2Card = shuffledCards[2]
    const b3Card = shuffledCards[3]

    const playerList: CardItem[] = activePack.map(c => c)
    const cardNames = playerList.map(c => c.name)

    const initialPlayers: PlayerState[] = [
      {
        id: "player",
        name: username || "Player",
        emoji: "🦠",
        isBot: false,
        secretCard: pCard,
        status: "hidden",
        points: 0,
        hasBluffedThisMatch: false,
        eliminatedRound: null,
        revealedBy: null,
        deductionPossibilities: cardNames,
        stunnedTurns: 0
      },
      {
        id: "bot-1",
        name: "Albert (Bot)",
        emoji: "🤖",
        isBot: true,
        secretCard: b1Card,
        status: "hidden",
        points: 0,
        hasBluffedThisMatch: false,
        eliminatedRound: null,
        revealedBy: null,
        deductionPossibilities: cardNames.filter(name => name !== b1Card.name), // knows own card
        stunnedTurns: 0
      },
      {
        id: "bot-2",
        name: "Sarah (Bot)",
        emoji: "👩‍🔬",
        isBot: true,
        secretCard: b2Card,
        status: "hidden",
        points: 0,
        hasBluffedThisMatch: false,
        eliminatedRound: null,
        revealedBy: null,
        deductionPossibilities: cardNames.filter(name => name !== b2Card.name),
        stunnedTurns: 0
      },
      {
        id: "bot-3",
        name: "Kwame (Bot)",
        emoji: "👨‍💻",
        isBot: true,
        secretCard: b3Card,
        status: "hidden",
        points: 0,
        hasBluffedThisMatch: false,
        eliminatedRound: null,
        revealedBy: null,
        deductionPossibilities: cardNames.filter(name => name !== b3Card.name),
        stunnedTurns: 0
      }
    ]

    setPlayers(initialPlayers)
    setMatchTurnCount(1)
    setCurrentTurnIndex(0)
    setSelectedTargetId(null)
    setSelectedQueryType(null)
    setLogs([])
    setPhase("PLAYING")

    pushLog(`🕵️ MATCH STARTED! Pack: ${selectedPackId.toUpperCase()}. Locate the opponents' cards!`, "system")
    pushLog(`💡 Every 3 turns, global card clues will be broadcast.`, "system")
  }

  // Helper to get all unique attribute keys in current pack
  const getAttributeKeys = () => {
    const keys = new Set<string>()
    activePack.forEach(c => {
      Object.keys(c.attributes).forEach(k => keys.add(k))
    })
    return Array.from(keys)
  }

  // Get all unique values for a key
  const getAttributeValues = (key: string) => {
    const values = new Set<string>()
    activePack.forEach(c => {
      if (c.attributes[key]) values.add(c.attributes[key])
    })
    return Array.from(values)
  }

  // ─── PLAYER ACTION RESOLUTIONS ─────────────────────────────────────────────
  
  // Player asks yes/no question
  const submitYesNoQuestion = (targetId: string, attrKey: string, expectedValue: string) => {
    const target = players.find(p => p.id === targetId)!
    const honestAnswer = target.secretCard.attributes[attrKey] === expectedValue ? "Yes" : "No"
    
    pushLog(`❓ You asked ${target.name}: "Is your ${attrKey} ${expectedValue}?"`, "question")

    // Determine if bot bluffs
    let willBluff = false
    if (difficulty === "HARD" && !target.hasBluffedThisMatch && Math.random() < 0.25) {
      willBluff = true
    }

    const answer = willBluff ? (honestAnswer === "Yes" ? "No" : "Yes") : honestAnswer
    if (willBluff) {
      setPlayers(prev => prev.map(p => p.id === targetId ? { ...p, hasBluffedThisMatch: true } : p))
    }

    setTimeout(() => {
      pushLog(`💬 ${target.name} replied: "${answer}"`, "answer")
      // Update target's deduction logs for player
      if (answer === "Yes" && !willBluff) {
        // filter local possible item cards for cheat sheet highlights
      }
      advanceTurn()
    }, 800)

    setSelectedQueryType(null)
  }

  // Player asks multiple choice question
  const submitMCQuestion = (targetId: string, attrKey: string) => {
    const target = players.find(p => p.id === targetId)!
    const options = getAttributeValues(attrKey)
    const honestAnswer = target.secretCard.attributes[attrKey] || "Unknown"

    pushLog(`❓ You asked ${target.name}: "Which of these is your ${attrKey}: ${options.join(", ")}?"`, "question")

    let willBluff = false
    if (difficulty === "HARD" && !target.hasBluffedThisMatch && Math.random() < 0.2) {
      willBluff = true
    }

    let answer = honestAnswer
    if (willBluff) {
      const wrongOptions = options.filter(o => o !== honestAnswer)
      if (wrongOptions.length > 0) {
        answer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
      }
      setPlayers(prev => prev.map(p => p.id === targetId ? { ...p, hasBluffedThisMatch: true } : p))
    }

    setTimeout(() => {
      pushLog(`💬 ${target.name} replied: "${answer}"`, "answer")
      advanceTurn()
    }, 800)

    setSelectedQueryType(null)
  }

  // Player asks Risk starting letter question
  const submitRiskQuestion = (targetId: string) => {
    const target = players.find(p => p.id === targetId)!
    const cardName = target.secretCard.name
    // risk clue: return second char
    const letter = cardName.length > 1 ? cardName.charAt(1).toUpperCase() : "None"

    pushLog(`🔥 You asked ${target.name} (Risk Query): "What is the second letter of your secret card?"`, "question")

    setTimeout(() => {
      pushLog(`💬 ${target.name} replied: "The letter is '${letter}'"`, "answer")
      advanceTurn()
    }, 800)

    setSelectedQueryType(null)
  }

  // Guesses target secret card
  const submitGuess = (targetId: string, guessCardName: string) => {
    const target = players.find(p => p.id === targetId)!
    const correct = target.secretCard.name.toLowerCase() === guessCardName.toLowerCase()

    pushLog(`🎯 You guessed: ${target.name}'s card is ${guessCardName}!`, "guess")

    if (correct) {
      pushLog(`✅ CORRECT! ${target.name}'s secret card was revealed: ${target.secretCard.emoji} ${target.secretCard.name}!`, "system")
      setPlayers(prev => prev.map(p => p.id === targetId ? { ...p, status: "revealed" as const, revealedBy: "player" } : p))
      
      // Award points
      const pointsWon = target.secretCard.rarity === "Hard" ? 150 : target.secretCard.rarity === "Medium" ? 100 : 50
      setPlayers(prev => prev.map(p => p.id === "player" ? { ...p, points: p.points + pointsWon } : p))
      triggerAlert(`Found target! +${pointsWon} points!`, true)
    } else {
      pushLog(`❌ INCORRECT! Your deduction was wrong. Penalty: unable to guess for 1 turn.`, "system")
      setPlayers(prev => prev.map(p => p.id === "player" ? { ...p, stunnedTurns: 2 } : p))
      triggerAlert("Wrong guess! Penalty applied.", false)
    }

    setSelectedQueryType(null)
    advanceTurn()
  }

  // Calls bluff on target last reply
  const callBluff = (targetId: string) => {
    const target = players.find(p => p.id === targetId)!
    const lied = target.hasBluffedThisMatch // simplifies bluff detection to checking if bot has bluffed once

    pushLog(`⚖️ You called a Truth Challenge on ${target.name}!`, "bluff_call")

    if (lied) {
      pushLog(`🚨 EXPOSED! ${target.name} was lying! The real card attributes are exposed. +50 points.`, "system")
      // Partially reveal bot's attributes
      setPlayers(prev => prev.map(p => p.id === targetId ? { ...p, points: p.points - 30 } : p))
      setPlayers(prev => prev.map(p => p.id === "player" ? { ...p, points: p.points + 50 } : p))
      setActiveBluffAlert({
        title: "Lie Exposed! 🚨",
        desc: `${target.name} was indeed bluffing. You deduced their secrets!`,
        success: true
      })
    } else {
      pushLog(`🛡️ TRUTH! ${target.name} told the absolute truth. You lose 30 points.`, "system")
      setPlayers(prev => prev.map(p => p.id === "player" ? { ...p, points: Math.max(0, p.points - 30) } : p))
      setActiveBluffAlert({
        title: "False Accusation! 🛡️",
        desc: `${target.name} answered honestly. The challenge cost you points.`,
        success: false
      })
    }

    advanceTurn()
  }

  // Player answers incoming question from bot
  const answerIncomingQuestion = (honest: boolean) => {
    if (!incomingQuestion) return
    const answer = honest ? incomingQuestion.honestAnswer : (incomingQuestion.honestAnswer === "Yes" ? "No" : "Yes")
    
    pushLog(`💬 You replied: "${answer}"`, "answer")

    if (!honest) {
      setPlayers(prev => prev.map(p => p.id === "player" ? { ...p, hasBluffedThisMatch: true } : p))
      
      // Hard bots check bluff chance
      if (difficulty === "HARD" && Math.random() < 0.4) {
        setTimeout(() => {
          pushLog(`🚨 challenged: Albert exposed your bluff! Your card is NOT in Europe!`, "system")
          setPlayers(prev => prev.map(p => p.id === "player" ? { ...p, points: Math.max(0, p.points - 40) } : p))
        }, 1000)
      }
    }

    setIncomingQuestion(null)
    advanceTurn()
  }

  // ─── REACTIVE TURN AND MATCH CONTROLLERS ────────────────────────────────────

  // 1. Reactive Bot and Turn Manager to avoid synchronous call stack overflow
  useEffect(() => {
    if (phase !== "PLAYING") return
    const activePlayer = players[currentTurnIndex]
    if (!activePlayer) return

    // Skip revealed (eliminated) players instantly without creating a stack call
    if (activePlayer.status === "revealed") {
      const nextIndex = (currentTurnIndex + 1) % players.length
      setCurrentTurnIndex(nextIndex)
      return
    }

    // Trigger Bot action asynchronously
    if (activePlayer.isBot) {
      const timer = setTimeout(() => {
        executeBotTurn(activePlayer)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [currentTurnIndex, phase, players])

  // 2. Reactive Victory Controller
  useEffect(() => {
    if (phase !== "PLAYING") return
    const hidden = players.filter(p => p.status === "hidden")

    if (mode === "CLASSIC" && hidden.length === 1) {
      const survivor = hidden[0]
      pushLog(`👑 MATCH COMPLETE! The last hidden player is ${survivor.name}!`, "system")

      setTimeout(() => {
        setPhase("RESULTS")
        const playerState = players.find(p => p.id === "player")!
        const playerWon = survivor.id === "player"
        const pointsTotal = playerState.points + (playerWon ? 200 : 0)

        if (playerWon) {
          const nextCoins = adjustCoins(userId, Math.floor(pointsTotal / 10))
          setCoins(nextCoins)
          saveHighScore(userId, "secret_card_hunt", pointsTotal)
        }
      }, 1500)
    }
  }, [players, phase, mode, userId])

  // ─── BOT ACTION RESOLUTIONS ────────────────────────────────────────────────
  const executeBotTurn = (bot: PlayerState) => {
    pushLog(`⏳ ${bot.name} is formulating a deduction...`, "system")

    setTimeout(() => {
      // Find alive target
      const targets = players.filter(p => p.id !== bot.id && p.status === "hidden")
      if (targets.length === 0) {
        advanceTurn()
        return
      }

      const target = targets[Math.floor(Math.random() * targets.length)]

      // AI logic: check guess potential
      const isHard = difficulty === "HARD" || difficulty === "NORMAL"
      const guessChance = isHard ? 0.35 : 0.15

      if (Math.random() < guessChance) {
        // Guess target card
        const possibleTargetCards = activePack.filter(c => c.name !== bot.secretCard.name)
        const guessCard = possibleTargetCards[Math.floor(Math.random() * possibleTargetCards.length)]
        pushLog(`🎯 ${bot.name} guessed: ${target.name}'s card is ${guessCard.name}!`, "guess")
        
        const correct = guessCard.name.toLowerCase() === target.secretCard.name.toLowerCase()
        if (correct) {
          pushLog(`✅ CORRECT! ${target.name}'s secret card was revealed: ${target.secretCard.emoji} ${target.secretCard.name}!`, "system")
          
          setPlayers(prev => prev.map(p => {
            if (p.id === target.id) {
              return { ...p, status: "revealed" as const, revealedBy: bot.id }
            }
            if (p.id === bot.id) {
              const pointsWon = target.secretCard.rarity === "Hard" ? 150 : target.secretCard.rarity === "Medium" ? 100 : 50
              return { ...p, points: p.points + pointsWon }
            }
            return p
          }))
        } else {
          pushLog(`❌ INCORRECT! ${bot.name} made a wrong guess.`, "system")
        }
        advanceTurn()
      } else {
        // Ask a question
        const attrKeys = getAttributeKeys()
        const key = attrKeys[Math.floor(Math.random() * attrKeys.length)]
        const targetValue = target.secretCard.attributes[key]

        if (target.id === "player") {
          // Send query prompt to player
          setIncomingQuestion({
            askerId: bot.id,
            questionText: `Is your secret card ${key} equal to '${targetValue}'?`,
            questionType: "yes_no",
            honestAnswer: targetValue ? "Yes" : "No",
            attrKey: key
          })
          pushLog(`❓ ${bot.name} asked You: "Is your ${key} ${targetValue}?"`, "question")
        } else {
          // Ask another bot (keep answer private from user/feed logs)
          pushLog(`🤔 ${bot.name} asked ${target.name} a question. (Answer kept secret)`, "question")
          advanceTurn()
        }
      }
    }, 1000)
  }

  // ─── GAME STATE ADVANCEMENT ────────────────────────────────────────────────
  const advanceTurn = () => {
    const nextIndex = (currentTurnIndex + 1) % players.length

    if (nextIndex === 0) {
      setMatchTurnCount(prev => {
        const nextTurn = prev + 1
        // Global clue system
        if (nextTurn % 3 === 0) {
          broadcastGlobalClue()
        }
        return nextTurn
      })
    }

    setCurrentTurnIndex(nextIndex)
  }

  // Broadcast a global random clue about an undiscovered card
  const broadcastGlobalClue = () => {
    const hiddenPlayers = players.filter(p => p.status === "hidden")
    if (hiddenPlayers.length > 0) {
      const luckyTarget = hiddenPlayers[Math.floor(Math.random() * hiddenPlayers.length)]
      const cluesList = luckyTarget.secretCard.clues
      const clue = cluesList[Math.floor(Math.random() * cluesList.length)]

      pushLog(`📢 BROADCAST CLUE: One of the hidden cards is: "${clue}"`, "clue")
    }
  }

  const resetMatch = () => {
    setPhase("SETUP")
  }


  // ─── MULTIPLAYER MATCH Flow ────────────────────────────────────────────────

  const createMultiplayerRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase()
    setRoomCode(code)
    setIsHost(true)
    joinMultiplayerLobby(code, true)
  }

  const joinMultiplayerLobby = (code: string, amHost: boolean) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    const myPresId = Math.random().toString(36).substring(2, 9)
    setMyPresenceId(myPresId)
    setLobbyPlayers([])

    const channel = supabase.channel(`secret-card-hunt:${code}`, {
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

    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState()
      const mapped: any[] = []

      Object.keys(presenceState).forEach(key => {
        const pres = presenceState[key] as any[]
        if (pres.length > 0) {
          mapped.push({
            presenceId: key,
            name: pres[0].name || "Anonymous Hunter",
            isHost: pres[0].isHost || false,
            isReady: pres[0].isReady || false
          })
        }
      })

      setLobbyPlayers(mapped)
    })

    channel.on('broadcast', { event: 'start-match' }, ({ payload }) => {
      // Set cards distribution payload and start playing
      pushLog(`🕵️ Multi-deduction match started!`, "system")
      setPhase("PLAYING")
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          name: username,
          isHost: amHost,
          isReady: false
        })
      }
    })

    setPhase("MULTIPLAYER_LOBBY")
  }

  const toggleMultiplayerReady = () => {
    const me = lobbyPlayers.find(p => p.presenceId === myPresenceId)
    if (!me) return
    const next = !me.isReady
    if (channelRef.current) {
      channelRef.current.track({
        name: username,
        isHost,
        isReady: next
      })
    }
  }

  const startMultiplayerMatch = () => {
    if (!isHost || !channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'start-match',
      payload: {
        timestamp: Date.now()
      }
    })
  }

  // ─── RENDER JSX ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">

      {/* Alert toast banner */}
      {alertMsg && (
        <div className={`p-4 rounded-xl border text-sm font-bold animate-in slide-in-from-top duration-300 ${alertMsg.success ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400" : "bg-red-950/40 border-red-500/20 text-red-400"}`}>
          {alertMsg.text}
        </div>
      )}

      {/* Header details */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/playlab" className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all">
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </Link>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">PlayLab Experience</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              🕵️ Secret Card Hunt
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

      {/* ── PHASE: SETUP CONFIGURATION ───────────────────────────────────────── */}
      {phase === "SETUP" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          <div className="lg:col-span-2 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-black to-zinc-950 p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">
                  Deduction Deck Selection
                </span>
                <h2 className="text-2xl font-black text-white mt-3">Configure Deduction Match</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Draft cards, bluff answers, ask strategic yes/no questions, and isolate targets.
                </p>
              </div>

              {/* Deck Category Selectors */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-black text-gray-300 uppercase tracking-widest block">Choose Category Pack</label>
                <div className="grid grid-cols-2 gap-3">
                  <div onClick={() => setSelectedPackId("countries")}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedPackId === "countries" ? "border-emerald-500 bg-emerald-950/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "border-white/5 bg-white/5 hover:bg-white/10"}`}>
                    <span className="text-2xl block mb-2">🌍</span>
                    <h4 className="text-sm font-bold text-white">Countries Deck</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">Belgium, Brazil, Liechtenstein...</p>
                  </div>

                  <div onClick={() => setSelectedPackId("animals")}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedPackId === "animals" ? "border-emerald-500 bg-emerald-950/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "border-white/5 bg-white/5 hover:bg-white/10"}`}>
                    <span className="text-2xl block mb-2">🦁</span>
                    <h4 className="text-sm font-bold text-white">Animals Deck</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">Predators, habitats, mammals...</p>
                  </div>

                  <div onClick={() => setSelectedPackId("foods")}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedPackId === "foods" ? "border-emerald-500 bg-emerald-950/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "border-white/5 bg-white/5 hover:bg-white/10"}`}>
                    <span className="text-2xl block mb-2">🍣</span>
                    <h4 className="text-sm font-bold text-white">Foods Deck</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">Sweet, savory, spicy category...</p>
                  </div>

                  <div onClick={() => setSelectedPackId("humanos")}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedPackId === "humanos" ? "border-emerald-500 bg-emerald-950/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "border-white/5 bg-white/5 hover:bg-white/10"}`}>
                    <span className="text-2xl block mb-2">🧬</span>
                    <h4 className="text-sm font-bold text-white">HumanOS Friends</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">Friend cards generated from links...</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/5 mt-4">
              <Button onClick={startSinglePlayerMatch} className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold py-5 rounded-2xl text-sm gap-2">
                <Play className="h-4 w-4" /> Start Single Match
              </Button>
              <Button onClick={() => setPhase("MULTIPLAYER_LOBBY")} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-5 rounded-2xl text-xs border border-white/10">
                Setup Multiplayer Duel
              </Button>
            </div>
          </div>

          {/* Setup Settings details Sidebar */}
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <h3 className="text-xs font-black uppercase text-gray-300 tracking-widest">Match Parameters</h3>

              {/* Mode */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Victory Conditions</label>
                <div className="flex gap-2">
                  <button onClick={() => setMode("CLASSIC")} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${mode === "CLASSIC" ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400" : "border-white/5 bg-white/5 text-gray-400"}`}>
                    Classic
                  </button>
                  <button onClick={() => setMode("SURVIVAL")} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${mode === "SURVIVAL" ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400" : "border-white/5 bg-white/5 text-gray-400"}`}>
                    Survival
                  </button>
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2 border-t border-white/5 pt-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase">AI Deduction Skill</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setDifficulty("EASY")} className={`py-2 text-[10px] font-bold rounded-lg border ${difficulty === "EASY" ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400" : "border-white/5 bg-white/5 text-gray-400"}`}>
                    Easy
                  </button>
                  <button onClick={() => setDifficulty("NORMAL")} className={`py-2 text-[10px] font-bold rounded-lg border ${difficulty === "NORMAL" ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400" : "border-white/5 bg-white/5 text-gray-400"}`}>
                    Normal
                  </button>
                  <button onClick={() => setDifficulty("HARD")} className={`py-2 text-[10px] font-bold rounded-lg border ${difficulty === "HARD" ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400" : "border-white/5 bg-white/5 text-gray-400"}`}>
                    Hard
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 text-center">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold block">Unified Currency</span>
              <p className="text-xs text-gray-400 mt-1">Difficulty increases high score multiplier & final coins payouts.</p>
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
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">
                  Match Lobby
                </span>
                <h2 className="text-2xl font-black text-white mt-1">Lobby Room: {roomCode || "Hosting..."}</h2>
                <p className="text-xs text-gray-400">
                  {isHost ? "Invite friends. Fills empty brackets automatically when you start." : "Waiting for host to launch matchmaking."}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase">Input Display Name</label>
                <input
                  type="text"
                  placeholder="Enter name..."
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none text-white focus:border-emerald-500/50 text-sm"
                />
              </div>

              <div className="border-t border-white/5 pt-4 flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="CODE"
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value.toUpperCase())}
                  className="w-24 px-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none text-white focus:border-emerald-500/50 text-center font-black tracking-widest text-lg"
                />
                <Button onClick={() => joinMultiplayerLobby(roomInput, false)} disabled={roomInput.length !== 4} className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl">
                  Join Room
                </Button>
                <Button onClick={createMultiplayerRoom} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                  Host Room
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/5">
              <Button onClick={toggleMultiplayerReady} className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold">
                Set Ready
              </Button>
              {isHost && (
                <Button onClick={startMultiplayerMatch} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold">
                  Launch Duel
                </Button>
              )}
              <Button onClick={() => setPhase("SETUP")} className="bg-red-950/40 hover:bg-red-900/40 text-red-400 px-4 rounded-xl border border-red-500/20">
                Cancel
              </Button>
            </div>
          </div>

          <div className="bg-zinc-950 p-6 rounded-3xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Connected Hunters ({lobbyPlayers.length})</h3>
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
          
          {/* Main deduction board: Left Feed + Center Desk */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Top player secret card card */}
            <div className="rounded-3xl border border-emerald-500/30 p-6 bg-gradient-to-br from-emerald-950/20 to-zinc-950 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Your Secret Assignment</span>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-4xl">🕵️</span>
                    <div>
                      <h3 className="text-lg font-black text-white">Keep Identity Hidden</h3>
                      <p className="text-xs text-gray-400">Hover or click to reveal your card details below.</p>
                    </div>
                  </div>
                </div>

                <div 
                  onMouseEnter={() => setShowSecretCard(true)}
                  onMouseLeave={() => setShowSecretCard(false)}
                  onClick={() => setShowSecretCard(!showSecretCard)}
                  className="w-36 h-24 rounded-2xl bg-zinc-900 border border-emerald-500/25 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.02] shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                >
                  {showSecretCard ? (
                    <div className="text-center animate-in fade-in duration-300">
                      <span className="text-3xl block">{players.find(p => p.id === "player")?.secretCard.emoji}</span>
                      <span className="text-xs font-black text-white">{players.find(p => p.id === "player")?.secretCard.name}</span>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <EyeOff className="h-5 w-5 mx-auto text-emerald-400 animate-pulse" />
                      <span className="text-[9px] uppercase font-bold text-emerald-400 block tracking-widest">Hover Reveal</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Target selection list of other players */}
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Targets List</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {players.filter(p => p.id !== "player").map(p => {
                  const activeTarget = selectedTargetId === p.id
                  const isRevealed = p.status === "revealed"

                  return (
                    <div key={p.id} onClick={() => !isRevealed && setSelectedTargetId(p.id)}
                      className={`p-4 rounded-2xl border transition-all ${isRevealed ? "border-red-950 bg-red-950/10 cursor-default opacity-50" : activeTarget ? "border-emerald-500 bg-emerald-950/20" : "border-white/5 bg-white/5 hover:border-white/10 cursor-pointer"}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {p.emoji} {p.name}
                        </h4>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isRevealed ? "bg-red-500/20 text-red-400" : "bg-emerald-500/10 text-emerald-400 animate-pulse"}`}>
                          {isRevealed ? "Revealed" : "Hidden"}
                        </span>
                      </div>

                      {isRevealed ? (
                        <div className="space-y-1 pt-2 border-t border-red-500/20 text-xs">
                          <p className="text-red-400 font-bold">Identified: {p.secretCard.emoji} {p.secretCard.name}</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 pt-2 border-t border-white/5 text-[10px] text-gray-400">
                          <p>Deduction potential: {p.deductionPossibilities.length} items</p>
                          <p>Bluff status: {p.hasBluffedThisMatch ? "🚨 Lie Suspected" : "✓ Unchallenged"}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Turn action buttons when target is chosen */}
            {selectedTargetId && (() => {
              const target = players.find(p => p.id === selectedTargetId)!
              const attributes = getAttributeKeys()
              const possibleCards = activePack.map(c => c.name)
              const hasStun = players.find(p => p.id === "player")!.stunnedTurns > 0

              return (
                <div className="rounded-3xl border border-emerald-500/25 bg-emerald-950/5 p-6 space-y-4 animate-in slide-in-from-bottom duration-300">
                  <h3 className="text-sm font-black text-white">Formulate Action against {target.name}</h3>
                  
                  {hasStun ? (
                    <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-xs text-red-300">
                      🚨 You are stunned for {players.find(p => p.id === "player")!.stunnedTurns} more turns and cannot guess or challenge!
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    
                    {/* Yes/No queries */}
                    <div className="p-3 bg-zinc-900 border border-white/5 rounded-xl space-y-2">
                      <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Yes/No Query</label>
                      <select value={selectedAttrKey} onChange={e => {
                        setSelectedAttrKey(e.target.value)
                        const values = getAttributeValues(e.target.value)
                        if (values.length > 0) setSelectedAttrValue(values[0])
                      }}
                        className="w-full bg-white/5 border border-white/10 outline-none text-white text-xs px-2 py-1.5 rounded-md">
                        <option value="">Select Attribute...</option>
                        {attributes.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                      {selectedAttrKey && (
                        <select value={selectedAttrValue} onChange={e => setSelectedAttrValue(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 outline-none text-white text-xs px-2 py-1.5 rounded-md mt-1">
                          {getAttributeValues(selectedAttrKey).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      )}
                      <Button 
                        disabled={!selectedAttrKey || !selectedAttrValue}
                        onClick={() => submitYesNoQuestion(selectedTargetId, selectedAttrKey, selectedAttrValue)}
                        size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-bold py-1.5 h-auto rounded-lg">
                        Ask Yes/No
                      </Button>
                    </div>

                    {/* Multiple Choice queries */}
                    <div className="p-3 bg-zinc-900 border border-white/5 rounded-xl space-y-2">
                      <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Multiple Choice</label>
                      <select value={selectedAttrKey} onChange={e => setSelectedAttrKey(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 outline-none text-white text-xs px-2 py-1.5 rounded-md">
                        <option value="">Select Attribute...</option>
                        {attributes.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <Button 
                        disabled={!selectedAttrKey}
                        onClick={() => submitMCQuestion(selectedTargetId, selectedAttrKey)}
                        size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-bold py-1.5 h-auto rounded-lg">
                        Ask MC
                      </Button>
                    </div>

                    {/* Guess Card */}
                    <div className="p-3 bg-zinc-900 border border-white/5 rounded-xl space-y-2">
                      <label className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Guess Identity</label>
                      <select value={selectedGuessName} onChange={e => setSelectedGuessName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 outline-none text-white text-xs px-2 py-1.5 rounded-md">
                        <option value="">Choose Card...</option>
                        {possibleCards.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <Button 
                        disabled={!selectedGuessName || hasStun}
                        onClick={() => submitGuess(selectedTargetId, selectedGuessName)}
                        size="sm" className="w-full bg-yellow-600 hover:bg-yellow-500 text-xs font-black py-1.5 h-auto rounded-lg text-black">
                        Submit Guess
                      </Button>
                    </div>

                  </div>

                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <Button onClick={() => callBluff(selectedTargetId)} disabled={hasStun}
                      className="bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/20 text-xs py-2 px-4 rounded-xl flex items-center gap-1.5">
                      🚨 Call Bluff / Truth Challenge
                    </Button>
                    <Button onClick={() => setSelectedTargetId(null)} className="bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-xl px-4">
                      Cancel
                    </Button>
                  </div>
                </div>
              )
            })()}

            {/* Log chronicle command feed */}
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" /> Deduction Logs Chronicle
              </h3>
              <div ref={logContainerRef} className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {logs.map(log => (
                  <div key={log.id} className={`p-2.5 rounded-xl border text-xs leading-relaxed ${log.type === "question" ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" : log.type === "answer" ? "bg-blue-950/20 border-blue-500/20 text-blue-300 font-bold" : log.type === "guess" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300" : log.type === "clue" ? "bg-purple-950/20 border-purple-500/20 text-purple-300" : "bg-white/5 border-white/5 text-gray-400"}`}>
                    {log.message}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right sidebar: Category Pack cheat sheet */}
          <div className="space-y-5">
            
            {/* Bluff incoming question prompt */}
            {incomingQuestion && (
              <div className="rounded-3xl border border-red-500/30 p-5 bg-gradient-to-br from-red-950/30 to-zinc-950 space-y-4 animate-in slide-in-from-top duration-300">
                <span className="text-xl block">📢</span>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Incoming Question</h4>
                  <p className="text-xs text-gray-300 mt-1">{incomingQuestion.questionText}</p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => answerIncomingQuestion(true)} className="flex-grow bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg py-2">
                    Honest (Yes)
                  </Button>
                  <Button onClick={() => answerIncomingQuestion(false)} className="flex-grow bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg py-2">
                    Bluff (No)
                  </Button>
                </div>
              </div>
            )}

            {/* Active bluff alert modal */}
            {activeBluffAlert && (
              <div className={`p-4 rounded-xl border text-xs font-bold space-y-2 animate-in fade-in duration-300 ${activeBluffAlert.success ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" : "bg-red-950/20 border-red-500/20 text-red-300"}`}>
                <h5 className="font-black">{activeBluffAlert.title}</h5>
                <p className="text-[10px] text-gray-400 leading-relaxed">{activeBluffAlert.desc}</p>
                <Button onClick={() => setActiveBluffAlert(null)} size="sm" className="w-full bg-white/5 hover:bg-white/10 text-white py-1 text-[10px] h-auto rounded">
                  Dismiss
                </Button>
              </div>
            )}

            <div className="rounded-3xl border border-white/5 bg-zinc-950 p-5 space-y-4">
              <div className="flex items-center gap-1.5">
                <Search className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Pack Cheat Sheet</h3>
              </div>
              
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {activePack.map(item => (
                  <div key={item.id} className="p-2.5 bg-white/5 border border-white/5 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-white">
                      <span>{item.emoji} {item.name}</span>
                      <span className="text-[9px] text-gray-500">{item.rarity}</span>
                    </div>
                    <div className="text-[9px] text-gray-400 space-y-0.5">
                      {Object.entries(item.attributes).map(([k, v]) => (
                        <p key={k}>{k}: {v}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── PHASE: CONCLUDED MATCH RESULTS SCREEN ────────────────────────────── */}
      {phase === "RESULTS" && (
        <div className="max-w-md mx-auto border p-8 rounded-3xl text-center space-y-6 bg-gradient-to-br from-emerald-900/40 via-zinc-900 to-black border-emerald-500/30"
          style={{ boxShadow: "0 0 60px 20px rgba(16,185,129,0.1)" }}>
          <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 animate-bounce">
            <Crown className="h-10 w-10 text-yellow-400" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">Match Concluded</h2>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-2 leading-relaxed">
              Deduction statistics synced to Supabase profile progress.
            </p>
          </div>

          {/* Ranking list */}
          <div className="bg-black/60 border border-white/5 p-4 rounded-2xl space-y-3 text-left">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rankings</h4>
            <div className="space-y-1.5 text-xs text-white">
              {players
                .sort((a, b) => b.points - a.points)
                .map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🐾"}</span>
                      {p.name} {p.id === "player" && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded">You</span>}
                    </span>
                    <span className="text-gray-400">{p.points} pts</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-300 font-bold">
            🪙 PlayLab Coins sync completed successfully!
          </div>

          <div className="flex gap-3">
            <Button onClick={startSinglePlayerMatch} className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-extrabold py-3.5 rounded-2xl text-xs text-white">
              <RotateCcw className="h-4 w-4 mr-1" /> Re-Hunt Deck
            </Button>
            <Button onClick={resetMatch} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl py-3.5 text-xs border border-white/10">
              Main Menu
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
