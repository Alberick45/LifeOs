"use client"

import { useState, useEffect, useRef } from "react"
import { Sparkles, Timer, Trophy, ArrowLeft, RefreshCw, Flame, Droplets, Mountain, Wind, Database, Users, Plus, LogIn, Crown, LogOut, BookOpen, Layers, Check, Copy, Send, Trash2, Zap, ShieldAlert, ShoppingBag } from "lucide-react"
import { readCoins, adjustCoins, onCoinsChange, loadProgress, saveProgress } from "@/lib/playlab-coins"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

type GameState = "MENU" | "SOLO_PLAY" | "LORE_BOOK" | "QUESTS" | "MARKETPLACE" | "MULTIPLAYER_SETUP" | "MULTIPLAYER_LOBBY" | "PLAYING_COOP" | "PLAYING_RACE" | "RESULTS"
type ElementTier = "Base" | "Natural" | "Technical" | "Social"

interface ElementItem {
  id: string
  name: string
  emoji: string
  description: string
  tier: ElementTier
  color: string // Tailwind style classes for border/glow
  pack: "core" | "scifi" | "fantasy" | "relationships"
}

// Database of elements
const ELEMENTS: Record<string, ElementItem> = {
  // Base Elements
  fire: { id: "fire", name: "Fire", emoji: "🔥", description: "Hot, destructive, and bright.", tier: "Base", color: "border-orange-500/50 shadow-orange-500/20 text-orange-400 bg-orange-950/20", pack: "core" },
  water: { id: "water", name: "Water", emoji: "💧", description: "Fluid, life-giving, and cool.", tier: "Base", color: "border-cyan-500/50 shadow-cyan-500/20 text-cyan-400 bg-cyan-950/20", pack: "core" },
  earth: { id: "earth", name: "Earth", emoji: "🌍", description: "Solid, stable, and fertile.", tier: "Base", color: "border-emerald-500/50 shadow-emerald-500/20 text-emerald-400 bg-emerald-950/20", pack: "core" },
  air: { id: "air", name: "Air", emoji: "💨", description: "Invisible, light, and always in motion.", tier: "Base", color: "border-sky-500/50 shadow-sky-500/20 text-sky-400 bg-sky-950/20", pack: "core" },

  // Natural Elements
  steam: { id: "steam", name: "Steam", emoji: "💨", description: "Hot water vapor from boiling heat.", tier: "Natural", color: "border-slate-400/50 shadow-slate-400/20 text-slate-300 bg-slate-900/20", pack: "core" },
  lava: { id: "lava", name: "Lava", emoji: "🌋", description: "Molten rock flowing straight from Earth's mantle.", tier: "Natural", color: "border-red-600/50 shadow-red-600/20 text-red-500 bg-red-950/20", pack: "core" },
  mud: { id: "mud", name: "Mud", emoji: "💩", description: "A squishy mixture of wet earth.", tier: "Natural", color: "border-amber-700/50 shadow-amber-700/20 text-amber-600 bg-amber-950/20", pack: "core" },
  energy: { id: "energy", name: "Energy", emoji: "⚡", description: "The spark of motion, power, and change.", tier: "Natural", color: "border-yellow-400/50 shadow-yellow-400/20 text-yellow-400 bg-yellow-950/20", pack: "core" },
  rain: { id: "rain", name: "Rain", emoji: "🌧️", description: "Water droplets falling from condensed skies.", tier: "Natural", color: "border-blue-400/50 shadow-blue-400/20 text-blue-400 bg-blue-950/20", pack: "core" },
  dust: { id: "dust", name: "Dust", emoji: "🌫️", description: "Fine particles carried away by currents.", tier: "Natural", color: "border-zinc-500/50 shadow-zinc-500/20 text-zinc-400 bg-zinc-900/20", pack: "core" },
  pressure: { id: "pressure", name: "Pressure", emoji: "💥", description: "Crushing physical force from extreme weight.", tier: "Natural", color: "border-purple-500/50 shadow-purple-500/20 text-purple-400 bg-purple-950/20", pack: "core" },
  sea: { id: "sea", name: "Sea", emoji: "🌊", description: "A vast expanse of salty water.", tier: "Natural", color: "border-teal-500/50 shadow-teal-500/20 text-teal-400 bg-teal-950/20", pack: "core" },
  heat: { id: "heat", name: "Heat", emoji: "🥵", description: "High thermal energy and warm atmospheres.", tier: "Natural", color: "border-orange-600/50 shadow-orange-600/20 text-orange-500 bg-orange-950/20", pack: "core" },
  sky: { id: "sky", name: "Sky", emoji: "🌌", description: "The endless expanse above our heads.", tier: "Natural", color: "border-indigo-400/50 shadow-indigo-400/20 text-indigo-400 bg-indigo-950/20", pack: "core" },
  obsidian: { id: "obsidian", name: "Obsidian", emoji: "💎", description: "Volcanic glass formed by cooling lava.", tier: "Natural", color: "border-violet-800/50 shadow-violet-800/20 text-violet-500 bg-violet-950/20", pack: "core" },
  plant: { id: "plant", name: "Plant", emoji: "🌱", description: "A green living organism photosynthesizing.", tier: "Natural", color: "border-green-400/50 shadow-green-400/20 text-green-400 bg-green-950/20", pack: "core" },
  swamp: { id: "swamp", name: "Swamp", emoji: "🐊", description: "A wet, muddy place overrun by vegetation.", tier: "Natural", color: "border-emerald-700/50 shadow-emerald-700/20 text-emerald-600 bg-emerald-950/20", pack: "core" },
  life: { id: "life", name: "Life", emoji: "🧬", description: "The mysterious force that grows and replicates.", tier: "Natural", color: "border-rose-400/50 shadow-rose-400/20 text-rose-400 bg-rose-950/20", pack: "core" },
  clay: { id: "clay", name: "Clay", emoji: "🧱", description: "Sculptable natural earth compound.", tier: "Natural", color: "border-orange-700/50 shadow-orange-700/20 text-orange-600 bg-orange-950/20", pack: "core" },
  bacteria: { id: "bacteria", name: "Bacteria", emoji: "🦠", description: "Microscopic single-celled life forms.", tier: "Natural", color: "border-lime-500/50 shadow-lime-500/20 text-lime-400 bg-lime-950/20", pack: "core" },
  coal: { id: "coal", name: "Coal", emoji: "🪵", description: "Carbon-rich fuel formed from prehistoric plants.", tier: "Natural", color: "border-zinc-700/50 shadow-zinc-700/20 text-zinc-500 bg-zinc-950/20", pack: "core" },
  diamond: { id: "diamond", name: "Diamond", emoji: "💎", description: "Carbon atoms arranged in a super-strong lattice.", tier: "Natural", color: "border-cyan-300/50 shadow-cyan-300/20 text-cyan-300 bg-cyan-950/20", pack: "core" },
  animal: { id: "animal", name: "Animal", emoji: "🐾", description: "Multicellular creatures roaming the earth.", tier: "Natural", color: "border-amber-500/50 shadow-amber-500/20 text-amber-500 bg-amber-950/20", pack: "core" },
  tree: { id: "tree", name: "Tree", emoji: "🌳", description: "A giant woody perennial plant.", tier: "Natural", color: "border-green-600/50 shadow-green-600/20 text-green-500 bg-green-950/20", pack: "core" },
  rainbow: { id: "rainbow", name: "Rainbow", emoji: "🌈", description: "An arch of colors caused by rain dispersion.", tier: "Natural", color: "border-pink-500/50 shadow-pink-500/20 text-pink-400 bg-pink-950/20", pack: "core" },
  stone: { id: "stone", name: "Stone", emoji: "🪨", description: "Solid, dense rock debris.", tier: "Natural", color: "border-slate-500/50 shadow-slate-500/20 text-slate-400 bg-slate-900/20", pack: "core" },
  sand: { id: "sand", name: "Sand", emoji: "⏳", description: "Granular material formed by stone erosion.", tier: "Natural", color: "border-yellow-600/50 shadow-yellow-600/20 text-yellow-500 bg-yellow-950/20", pack: "core" },
  moon: { id: "moon", name: "Moon", emoji: "🌕", description: "Earth's natural astronomical satellite.", tier: "Natural", color: "border-yellow-200/50 shadow-yellow-200/20 text-yellow-200 bg-yellow-950/10", pack: "core" },

  // Technical Elements
  engine: { id: "engine", name: "Engine", emoji: "⚙️", description: "A machine that converts steam power into motion.", tier: "Technical", color: "border-blue-600/50 shadow-blue-600/20 text-blue-500 bg-blue-950/20", pack: "core" },
  electricity: { id: "electricity", name: "Electricity", emoji: "⚡", description: "Power generated by flows of charge.", tier: "Technical", color: "border-yellow-300/50 shadow-yellow-300/20 text-yellow-300 bg-yellow-950/20", pack: "core" },
  microchip: { id: "microchip", name: "Microchip", emoji: "🎛️", description: "A tiny slice of silicon controlling logic.", tier: "Technical", color: "border-cyan-400/50 shadow-cyan-400/20 text-cyan-400 bg-cyan-950/20", pack: "core" },
  tool: { id: "tool", name: "Tool", emoji: "🛠️", description: "An instrument utilized to shape materials.", tier: "Technical", color: "border-stone-400/50 shadow-stone-400/20 text-stone-300 bg-stone-900/20", pack: "core" },
  computer: { id: "computer", name: "Computer", emoji: "💻", description: "A silicon logic box executing recipes.", tier: "Technical", color: "border-teal-400/50 shadow-teal-400/20 text-teal-400 bg-teal-950/20", pack: "core" },
  machine: { id: "machine", name: "Machine", emoji: "🚜", description: "Mechanical devices amplifying force.", tier: "Technical", color: "border-violet-600/50 shadow-violet-600/20 text-violet-400 bg-violet-950/20", pack: "core" },
  robot: { id: "robot", name: "Robot", emoji: "🤖", description: "A machine guided by silicon instructions.", tier: "Technical", color: "border-indigo-500/50 shadow-indigo-500/20 text-indigo-400 bg-indigo-950/20", pack: "core" },
  spaceexplorer: { id: "spaceexplorer", name: "Space Explorer", emoji: "🚀", description: "Vessel venturing into the final frontier.", tier: "Technical", color: "border-purple-400/50 shadow-purple-400/20 text-purple-300 bg-purple-950/20", pack: "core" },
  engineer: { id: "engineer", name: "Engineer", emoji: "👷", description: "A designer of engines and systems.", tier: "Technical", color: "border-yellow-600/50 shadow-yellow-600/20 text-yellow-500 bg-yellow-950/20", pack: "core" },

  // Social / Concepts Elements
  human: { id: "human", name: "Human", emoji: "👤", description: "A complex social creature of mud and life.", tier: "Social", color: "border-orange-300/50 shadow-orange-300/20 text-orange-300 bg-orange-950/20", pack: "core" },
  love: { id: "love", name: "Love", emoji: "❤️", description: "The profound emotional bond of humanity.", tier: "Social", color: "border-red-400/50 shadow-red-400/20 text-red-400 bg-red-950/20", pack: "core" },
  family: { id: "family", name: "Family", emoji: "👨‍👩‍👧‍👦", description: "A supportive group of connected humans.", tier: "Social", color: "border-emerald-400/50 shadow-emerald-400/20 text-emerald-400 bg-emerald-950/20", pack: "core" },
  friendship: { id: "friendship", name: "Friendship", emoji: "🤝", description: "A voluntary bond of trust and connection.", tier: "Social", color: "border-teal-300/50 shadow-teal-300/20 text-teal-300 bg-teal-950/20", pack: "core" },
  community: { id: "community", name: "Community", emoji: "🏘️", description: "A larger system of overlapping friends and family.", tier: "Social", color: "border-green-300/50 shadow-green-300/20 text-green-300 bg-green-950/20", pack: "core" },
  passion: { id: "passion", name: "Passion", emoji: "🔥", description: "Love combined with fiery drive.", tier: "Social", color: "border-red-500/50 shadow-red-500/20 text-red-400 bg-red-950/20", pack: "core" },
  cooking: { id: "cooking", name: "Cooking", emoji: "🍳", description: "Preparing nourishing meals using heat.", tier: "Social", color: "border-yellow-500/50 shadow-yellow-500/20 text-yellow-400 bg-yellow-950/20", pack: "core" },
  soup: { id: "soup", name: "Soup", emoji: "🍲", description: "A hot, liquid food infusion.", tier: "Social", color: "border-amber-600/50 shadow-amber-600/20 text-amber-500 bg-amber-950/20", pack: "core" },
  pet: { id: "pet", name: "Pet", emoji: "🐱", description: "A domesticated companion animal.", tier: "Social", color: "border-orange-400/50 shadow-orange-400/20 text-orange-400 bg-orange-950/20", pack: "core" },
  bird: { id: "bird", name: "Bird", emoji: "🐦", description: "A winged creature taking to the sky.", tier: "Social", color: "border-sky-400/50 shadow-sky-400/20 text-sky-400 bg-sky-950/20", pack: "core" },
  dragon: { id: "dragon", name: "Dragon", emoji: "🐉", description: "A mythical fire-breathing animal.", tier: "Social", color: "border-red-700/50 shadow-red-700/20 text-red-600 bg-red-950/20", pack: "core" },
  charcoal: { id: "charcoal", name: "Charcoal", emoji: "🪵", description: "Burned carbonized remnants of wood.", tier: "Social", color: "border-zinc-800/50 shadow-zinc-800/20 text-zinc-500 bg-zinc-950/20", pack: "core" },
  tea: { id: "tea", name: "Tea", emoji: "🍵", description: "Steeped leaf infusion bringing tranquility.", tier: "Social", color: "border-green-500/50 shadow-green-500/20 text-green-400 bg-green-950/20", pack: "core" },
  gunpowder: { id: "gunpowder", name: "Gunpowder", emoji: "💣", description: "Explosive dust compound.", tier: "Social", color: "border-slate-700/50 shadow-slate-700/20 text-slate-500 bg-slate-900/20", pack: "core" },
  paper: { id: "paper", name: "Paper", emoji: "📄", description: "Thin sheets derived from organic wood fibers.", tier: "Social", color: "border-gray-300/50 shadow-gray-300/20 text-gray-300 bg-gray-900/20", pack: "core" },
  brick: { id: "brick", name: "Brick", emoji: "🧱", description: "Fired clay blocks for building.", tier: "Social", color: "border-red-800/50 shadow-red-800/20 text-red-700 bg-red-950/20", pack: "core" },
  wall: { id: "wall", name: "Wall", emoji: "🧱", description: "A solid partition blocking movement.", tier: "Social", color: "border-zinc-600/50 shadow-zinc-600/20 text-zinc-400 bg-zinc-950/20", pack: "core" },
  house: { id: "house", name: "House", emoji: "🏠", description: "A building constructed of brick walls.", tier: "Social", color: "border-amber-500/50 shadow-amber-500/20 text-amber-400 bg-amber-950/20", pack: "core" },
  city: { id: "city", name: "City", emoji: "🏙️", description: "A massive cluster of human houses.", tier: "Social", color: "border-purple-600/50 shadow-purple-600/20 text-purple-400 bg-purple-950/20", pack: "core" },
  internet: { id: "internet", name: "Internet", emoji: "🌐", description: "The global web of computers connecting humans.", tier: "Social", color: "border-indigo-400/50 shadow-indigo-400/20 text-indigo-400 bg-indigo-950/20", pack: "core" },
  socialnetwork: { id: "socialnetwork", name: "Social Network", emoji: "👥", description: "Virtual communities built on internet links.", tier: "Social", color: "border-pink-400/50 shadow-pink-400/20 text-pink-400 bg-pink-950/20", pack: "core" },
  smartcity: { id: "smartcity", name: "Smart City", emoji: "🌆", description: "A city completely connected by internet grids.", tier: "Social", color: "border-cyan-300/50 shadow-cyan-300/20 text-cyan-300 bg-cyan-950/20", pack: "core" },
  horse: { id: "horse", name: "Horse", emoji: "🐎", description: "A majestic companion animal.", tier: "Social", color: "border-amber-800/50 shadow-amber-800/20 text-amber-700 bg-amber-950/20", pack: "core" },
  infernostallion: { id: "infernostallion", name: "Inferno Stallion", emoji: "🦄", description: "A fire stallion of legends.", tier: "Social", color: "border-orange-500/70 shadow-orange-500/40 text-orange-400 bg-orange-950/25 animate-pulse", pack: "core" },
  aicompanion: { id: "aicompanion", name: "AI Companion", emoji: "🤖❤️", description: "A digital companion designed with intelligence and care.", tier: "Social", color: "border-rose-500/70 shadow-rose-500/40 text-rose-400 bg-rose-950/25 animate-pulse", pack: "core" },

  // Sci-Fi Expansion Elements
  alien: { id: "alien", name: "Alien", emoji: "👽", description: "An extraterrestrial living being.", tier: "Natural", color: "border-lime-400/60 shadow-lime-400/20 text-lime-400 bg-lime-950/30", pack: "scifi" },
  ufo: { id: "ufo", name: "UFO", emoji: "🛸", description: "An unidentified flying mechanical object.", tier: "Technical", color: "border-purple-400/60 shadow-purple-400/20 text-purple-400 bg-purple-950/30", pack: "scifi" },
  starship: { id: "starship", name: "Starship", emoji: "🚀", description: "A machine designed for interstellar space travel.", tier: "Technical", color: "border-sky-300/60 shadow-sky-300/20 text-sky-300 bg-sky-950/30", pack: "scifi" },
  laser: { id: "laser", name: "Laser", emoji: "🔫", description: "A highly concentrated beam of pure thermal energy.", tier: "Technical", color: "border-red-500/60 shadow-red-500/20 text-red-500 bg-red-950/30", pack: "scifi" },
  blackhole: { id: "blackhole", name: "Black Hole", emoji: "🕳️", description: "An intense region of space under extreme pressure.", tier: "Natural", color: "border-violet-700/60 shadow-violet-700/20 text-violet-400 bg-violet-950/30", pack: "scifi" },
  timemachine: { id: "timemachine", name: "Time Machine", emoji: "⏳🤖", description: "A theoretical device violating normal time flow rules.", tier: "Technical", color: "border-indigo-400/60 shadow-indigo-400/20 text-indigo-400 bg-indigo-950/30", pack: "scifi" },

  // Fantasy Expansion Elements
  magic: { id: "magic", name: "Magic", emoji: "✨", description: "The mystical force of the unknown.", tier: "Natural", color: "border-pink-400/60 shadow-pink-400/20 text-pink-400 bg-pink-950/30", pack: "fantasy" },
  wizard: { id: "wizard", name: "Wizard", emoji: "🧙", description: "A human master of arcane spells and elements.", tier: "Social", color: "border-purple-500/60 shadow-purple-500/20 text-purple-400 bg-purple-950/30", pack: "fantasy" },
  spell: { id: "spell", name: "Spell", emoji: "📜", description: "A recipe of magic scripted onto paper.", tier: "Social", color: "border-cyan-400/60 shadow-cyan-400/20 text-cyan-400 bg-cyan-950/30", pack: "fantasy" },
  elixir: { id: "elixir", name: "Elixir", emoji: "🧪", description: "A liquid potion carrying magic properties.", tier: "Natural", color: "border-teal-400/60 shadow-teal-400/20 text-teal-400 bg-teal-950/30", pack: "fantasy" },
  phoenix: { id: "phoenix", name: "Phoenix", emoji: "🐦🔥", description: "A magical bird returning from ashes via fire.", tier: "Natural", color: "border-orange-500/60 shadow-orange-500/20 text-orange-400 bg-orange-950/30", pack: "fantasy" },
  castle: { id: "castle", name: "Castle", emoji: "🏰", description: "A secure stone fortress built for royalty.", tier: "Social", color: "border-amber-600/60 shadow-amber-600/20 text-amber-500 bg-amber-950/30", pack: "fantasy" },

  // Relationship Expansion Elements
  marriage: { id: "marriage", name: "Marriage", emoji: "💍", description: "A formalized covenant between loving humans.", tier: "Social", color: "border-yellow-400/60 shadow-yellow-400/20 text-yellow-400 bg-yellow-950/30", pack: "relationships" },
  datingapp: { id: "datingapp", name: "Dating App", emoji: "📱", description: "A digital social network looking for love match algorithms.", tier: "Social", color: "border-rose-400/60 shadow-rose-400/20 text-rose-400 bg-rose-950/30", pack: "relationships" },
  trust: { id: "trust", name: "Trust", emoji: "🤝❤️", description: "The core foundation of friendship and family.", tier: "Social", color: "border-emerald-400/60 shadow-emerald-400/20 text-emerald-400 bg-emerald-950/30", pack: "relationships" },
  anniversary: { id: "anniversary", name: "Anniversary", emoji: "📅", description: "Annual celebration marking relationship milestones.", tier: "Social", color: "border-cyan-300/60 shadow-cyan-300/20 text-cyan-300 bg-cyan-950/30", pack: "relationships" },
  conflict: { id: "conflict", name: "Conflict", emoji: "⚡💔", description: "Clashing elements ending in arguments.", tier: "Social", color: "border-red-600/60 shadow-red-600/20 text-red-500 bg-red-950/30", pack: "relationships" },
  heartbreak: { id: "heartbreak", name: "Heartbreak", emoji: "💔", description: "The painful emotional reaction from conflict.", tier: "Social", color: "border-zinc-500/60 shadow-zinc-500/20 text-zinc-400 bg-zinc-950/30", pack: "relationships" }
}

// Combination Registry (A + B = C)
const RECIPES: Record<string, string> = {
  "fire+water": "steam",
  "earth+fire": "lava",
  "earth+water": "mud",
  "air+fire": "energy",
  "air+water": "rain",
  "air+earth": "dust",
  "earth+earth": "pressure",
  "water+water": "sea",
  "fire+fire": "heat",
  "air+air": "sky",
  "lava+water": "obsidian",
  "earth+rain": "plant",
  "mud+plant": "swamp",
  "energy+sea": "life",
  "earth+life": "clay",
  "clay+life": "human",
  "life+swamp": "bacteria",
  "heat+plant": "coal",
  "coal+pressure": "diamond",
  "energy+steam": "engine",
  "engine+human": "engineer",
  "human+human": "love",
  "human+love": "family",
  "fire+human": "cooking",
  "cooking+water": "soup",
  "animal+human": "pet",
  "life+wind": "bird",
  "air+life": "bird",
  "animal+fire": "dragon",
  "earth+plant": "tree",
  "fire+tree": "charcoal",
  "air+rain": "rainbow",
  "energy+water": "electricity",
  "earth+pressure": "stone",
  "air+stone": "sand",
  "electricity+sand": "microchip",
  "human+stone": "tool",
  "microchip+tool": "computer",
  "computer+human": "internet",
  "human+internet": "socialnetwork",
  "love+socialnetwork": "friendship",
  "family+friendship": "community",
  "fire+love": "passion",
  "plant+water": "tea",
  "dust+fire": "gunpowder",
  "plant+tool": "paper",
  "earth+tool": "brick",
  "brick+brick": "wall",
  "wall+wall": "house",
  "house+house": "city",
  "city+internet": "smartcity",
  "animal+plant": "horse",
  "fire+horse": "infernostallion",
  "computer+engine": "machine",
  "life+machine": "robot",
  "sky+stone": "moon",
  "moon+robot": "spaceexplorer",
  "love+robot": "aicompanion",
  "life+plant": "animal",

  // Sci-Fi combinations
  "life+sky": "alien",
  "machine+sky": "ufo",
  "engine+ufo": "starship",
  "energy+obsidian": "laser",
  "blackhole+pressure": "obsidian",
  "pressure+sky": "blackhole",
  "computer+spaceexplorer": "timemachine",

  // Fantasy combinations
  "energy+life": "magic",
  "human+magic": "wizard",
  "magic+paper": "spell",
  "elixir+magic": "wizard",
  "magic+tea": "elixir",
  "bird+fire": "phoenix",
  "house+stone": "castle",

  // Relationships combinations
  "family+love": "marriage",
  "computer+love": "datingapp",
  "friendship+love": "trust",
  "love+moon": "anniversary",
  "fire+friendship": "conflict",
  "conflict+love": "heartbreak"
}

// Campaign Quests
interface Quest {
  id: string
  title: string
  description: string
  targetElement: string
  rewardXP: number
}

const QUESTS_LIST: Quest[] = [
  { id: "quest_life", title: "Genesis Spark", description: "Discover the secret recipe for 'Life' (🧬)", targetElement: "life", rewardXP: 100 },
  { id: "quest_human", title: "Creation of Man", description: "Combine Life and Clay to form 'Human' (👤)", targetElement: "human", rewardXP: 150 },
  { id: "quest_companion", title: "Silicon Friendship", description: "Fuse Love and Robot to create 'AI Companion' (🤖❤️)", targetElement: "aicompanion", rewardXP: 300 },
  { id: "quest_stallion", title: "Lava Rider", description: "Combine Fire and Horse to unlock the mythical 'Inferno Stallion' (🦄)", targetElement: "infernostallion", rewardXP: 250 },
  { id: "quest_smart", title: "Modern Society", description: "Synthesize 'Smart City' using City and Internet grids (🌆)", targetElement: "smartcity", rewardXP: 200 }
]

export default function WordchemyPage() {
  const [gameState, setGameState] = useState<GameState>("MENU")
  const [discovered, setDiscovered] = useState<string[]>(["fire", "water", "earth", "air"])
  const [workspace, setWorkspace] = useState<string[]>([])

  // Coins & Expansion Unlocks State
  const [userId, setUserId] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)

  // Instability / Energy Limits
  const [energy, setEnergy] = useState(100)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)
  const [isStabilizing, setIsStabilizing] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [comboMultiplier, setComboMultiplier] = useState(1)

  // Unlocked expansion packs
  const [unlockedPacks, setUnlockedPacks] = useState<string[]>(["core"])

  // Custom display/alert state
  const [alertMsg, setAlertMsg] = useState<{ text: string; success: boolean } | null>(null)
  const [recentUnlock, setRecentUnlock] = useState<string | null>(null)

  // Multiplayer variables
  const [roomCode, setRoomCode] = useState("")
  const [roomInput, setRoomInput] = useState("")
  const [username, setUsername] = useState("")
  const [copied, setCopied] = useState(false)
  const [myPresenceId, setMyPresenceId] = useState("")
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState<{ presenceId: string; name: string; isHost: boolean; progress: number }[]>([])
  const [sharedDiscovered, setSharedDiscovered] = useState<string[]>(["fire", "water", "earth", "air"])
  const [targetElement, setTargetElement] = useState<string>("life")
  const [raceWinner, setRaceWinner] = useState<{ name: string; time: string } | null>(null)

  // Real-time log/feed
  const [feed, setFeed] = useState<string[]>([])

  const channelRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Load auth, sync progress from Supabase + localStorage, subscribe to cross-tab coin changes
  useEffect(() => {
    let resolvedUserId: string | null = null

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
      setDiscovered(progress.wordchemy_discovered)
      setUnlockedPacks(progress.wordchemy_unlocked_packs)
    }
    init()

    // Cross-tab coin sync
    const unsubCoins = onCoinsChange(resolvedUserId, (newBal) => setCoins(newBal))

    return () => {
      unsubCoins()
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [])

  // Cooldown countdown timer logic
  useEffect(() => {
    let clock: NodeJS.Timeout
    if (isStabilizing && cooldown > 0) {
      clock = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(clock)
            setIsStabilizing(false)
            setEnergy(50)
            triggerAlert("Alchemical core stabilized! Recharged to 50 Energy.", true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(clock)
  }, [isStabilizing, cooldown])

  const triggerAlert = (text: string, success: boolean = true) => {
    setAlertMsg({ text, success })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setAlertMsg(null), 3000)
  }

  // Save discovered array (localStorage + debounced Supabase)
  const saveOfflineDiscovered = (list: string[]) => {
    setDiscovered(list)
    saveProgress(userId, { wordchemy_discovered: list })
  }

  // Save unlocked packs (localStorage + debounced Supabase)
  const saveOfflinePacks = (list: string[]) => {
    setUnlockedPacks(list)
    saveProgress(userId, { wordchemy_unlocked_packs: list })
  }

  // Buy pack logic
  const buyPack = (packKey: string, costElements: number, costCoins: number, useCoins: boolean) => {
    if (unlockedPacks.includes(packKey)) {
      triggerAlert("Pack already unlocked!", false)
      return
    }

    if (useCoins) {
      if (coins < costCoins) {
        triggerAlert("Insufficient coins!", false)
        return
      }
      const next = adjustCoins(userId, -costCoins)
      setCoins(next)
    } else {
      if (discovered.length < costElements) {
        triggerAlert(`Need at least ${costElements} elements discovered!`, false)
        return
      }
    }

    const newList = [...unlockedPacks, packKey]
    saveOfflinePacks(newList)

    // Inject ALL elements from the purchased pack into discovered immediately
    const packElements = Object.values(ELEMENTS)
      .filter(el => el.pack === packKey)
      .map(el => el.id)
    
    const updatedDiscovered = [...discovered]
    for (const elId of packElements) {
      if (!updatedDiscovered.includes(elId)) {
        updatedDiscovered.push(elId)
      }
    }
    saveOfflineDiscovered(updatedDiscovered)

    triggerAlert(`🎉 Unlocked ${packElements.length} new elements from the ${packKey.toUpperCase()} pack!`, true)
  }

  // Element combination logic
  const handleAddToWorkspace = (elId: string) => {
    if (isStabilizing) {
      triggerAlert("Core stabilizing! Workspace locked.", false)
      return
    }
    if (workspace.length >= 2) {
      triggerAlert("Mixing board full. Remove elements or combine!", false)
      return
    }
    setWorkspace(prev => [...prev, elId])
  }

  const handleRemoveFromWorkspace = (index: number) => {
    setWorkspace(prev => prev.filter((_, i) => i !== index))
  }

  const handleClearWorkspace = () => {
    setWorkspace([])
  }

  const performCombination = () => {
    if (workspace.length !== 2) return

    const key = [...workspace].sort().join("+")
    const result = RECIPES[key]
    const matchedElementObj = result ? ELEMENTS[result] : null

    // Check if the output element pack is unlocked
    const isPackUnlocked = matchedElementObj ? unlockedPacks.includes(matchedElementObj.pack) : false

    if (result && matchedElementObj && isPackUnlocked) {
      // SUCCESSFUL COMBO
      setConsecutiveFailures(0)
      setComboMultiplier(prev => Math.min(5, prev + 1))
      setEnergy(prev => Math.min(100, prev + 15))

      if (gameState === "PLAYING_COOP") {
        // Co-op mode sync: Update locally first
        setSharedDiscovered(prev => {
          if (!prev.includes(result)) {
            return [...prev, result]
          }
          return prev
        })
        setFeed(prev => [
          `You fused ${ELEMENTS[workspace[0]].name} + ${ELEMENTS[workspace[1]].name} ➔ Unlocked ${matchedElementObj.name}!`,
          ...prev
        ])
        triggerAlert(`You unlocked ${matchedElementObj.name}!`, true)

        // Then broadcast
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'combine-success',
            payload: {
              elementId: result,
              creator: username || "Player",
              recipe: `${ELEMENTS[workspace[0]].name} + ${ELEMENTS[workspace[1]].name}`
            }
          })
        }
      } else if (gameState === "PLAYING_RACE") {
        // Private discovery in a race
        if (!discovered.includes(result)) {
          const newList = [...discovered, result]
          setDiscovered(newList)
        }

        // Check if target reached
        if (result === targetElement) {
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'race-complete',
              payload: {
                winnerName: username || "Competitor",
              }
            })
          }
        }
      } else {
        // Solo Play combination
        if (!discovered.includes(result)) {
          const newList = [...discovered, result]
          saveOfflineDiscovered(newList)
          setRecentUnlock(result)
          triggerAlert(`Discovered: ${matchedElementObj.name}! (+15 Energy, Combo ${comboMultiplier}x)`, true)
        } else {
          triggerAlert(`You already made ${matchedElementObj.name}! (+15 Energy)`, true)
        }
      }
    } else {
      // UNSUCCESSFUL COMBO: Apply penalty
      setComboMultiplier(1)
      const penaltyCost = 15 * (consecutiveFailures + 1)
      setConsecutiveFailures(prev => prev + 1)

      setEnergy(prev => {
        const nextVal = prev - penaltyCost
        if (nextVal <= 0) {
          setIsStabilizing(true)
          setCooldown(10)
          setWorkspace([])
          triggerAlert("Core Overheated! Board reset. Cooldown initiated.", false)
          return 0
        }
        triggerAlert(`No reaction occurs. Cost: -${penaltyCost} Energy.`, false)
        return nextVal
      })
    }

    setWorkspace([])
  }

  // Sync workspace and trigger auto combination if 2 elements added
  useEffect(() => {
    if (workspace.length === 2) {
      const timer = setTimeout(() => {
        performCombination()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [workspace])

  // Multiplayer Lobbies
  const joinLobby = (code: string, amHost: boolean) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    const myPresId = Math.random().toString(36).substring(2, 9)
    setMyPresenceId(myPresId)
    setPlayers([])
    setWorkspace([])
    setFeed([])
    setRaceWinner(null)
    setSharedDiscovered(["fire", "water", "earth", "air"])

    const channel = supabase.channel(`wordchemy:${code}`, {
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
      const mappedPlayers: any[] = []

      Object.keys(presenceState).forEach(key => {
        const presences = presenceState[key] as any[]
        if (presences.length > 0) {
          const pres = presences[0]
          mappedPlayers.push({
            presenceId: key,
            name: pres.name || "Anonymous",
            isHost: pres.isHost || false,
            progress: pres.progress || 4,
          })
        }
      })

      setPlayers(mappedPlayers)
    })

    // Listen for Host configurations & games
    channel.on('broadcast', { event: 'config-sync' }, ({ payload }) => {
      setTargetElement(payload.targetElement)
    })

    channel.on('broadcast', { event: 'start-coop' }, () => {
      setSharedDiscovered(["fire", "water", "earth", "air"])
      setFeed(["Alchemy board initialized with base elements."])
      setGameState("PLAYING_COOP")
    })

    channel.on('broadcast', { event: 'start-race' }, ({ payload }) => {
      setTargetElement(payload.targetElement)
      setDiscovered(["fire", "water", "earth", "air"])
      setWorkspace([])
      setRaceWinner(null)
      setGameState("PLAYING_RACE")
    })

    // Receive combination unlocks in Co-op mode
    channel.on('broadcast', { event: 'combine-success' }, ({ payload }) => {
      const elId = payload.elementId
      setSharedDiscovered(prev => {
        if (!prev.includes(elId)) {
          return [...prev, elId]
        }
        return prev
      })
      setFeed(prev => [
        `${payload.creator} fused ${payload.recipe} ➔ Unlocked ${ELEMENTS[elId]?.name || elId}!`,
        ...prev
      ])
      triggerAlert(`${payload.creator} unlocked ${ELEMENTS[elId]?.name}!`, true)
    })

    // Race complete
    channel.on('broadcast', { event: 'race-complete' }, ({ payload }) => {
      setRaceWinner({
        name: payload.winnerName,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      })
      setGameState("RESULTS")
    })

    channel.on('broadcast', { event: 'return-lobby' }, () => {
      setGameState("MULTIPLAYER_LOBBY")
      setWorkspace([])
      setRaceWinner(null)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          name: username || "Anonymous",
          isHost: amHost,
          progress: discovered.length
        })
        setGameState("MULTIPLAYER_LOBBY")
      }
    })
  }

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

  const handleTargetChange = (el: string) => {
    setTargetElement(el)
    if (isHost && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'config-sync',
        payload: { targetElement: el }
      })
    }
  }

  const startCoop = () => {
    if (!isHost || !channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'start-coop',
      payload: {}
    })
    setSharedDiscovered(["fire", "water", "earth", "air"])
    setFeed(["Alchemy board initialized with base elements."])
    setGameState("PLAYING_COOP")
  }

  const startRace = () => {
    if (!isHost || !channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'start-race',
      payload: { targetElement }
    })
    setDiscovered(["fire", "water", "earth", "air"])
    setWorkspace([])
    setRaceWinner(null)
    setGameState("PLAYING_RACE")
  }

  const returnToLobby = () => {
    if (!isHost || !channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'return-lobby',
      payload: {}
    })
    setGameState("MULTIPLAYER_LOBBY")
    setWorkspace([])
    setRaceWinner(null)
  }

  const leaveLobby = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }
    setGameState("MENU")
    setRoomCode("")
    setPlayers([])
  }

  // Update real-time progress for race/coop
  useEffect(() => {
    if (gameState === "PLAYING_RACE" && channelRef.current) {
      channelRef.current.track({
        name: username || "Anonymous",
        isHost: isHost,
        progress: discovered.length
      }).catch((err: any) => console.error(err))
    }
  }, [discovered, gameState])

  // Count active elements
  const totalAvailableElements = Object.keys(ELEMENTS).length
  const coreElementsDiscovered = discovered.filter(k => ELEMENTS[k]?.pack === "core").length

  return (
    <div className="max-w-5xl mx-auto min-h-[calc(100vh-120px)] flex flex-col space-y-6">

      {/* Alert Banner */}
      {alertMsg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${alertMsg.success ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
          {alertMsg.text}
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between">
        {gameState === "MENU" ? (
          <Link href="/dashboard/playlab" className="text-gray-400 hover:text-white flex items-center transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to PlayLab
          </Link>
        ) : (
          <button
            onClick={() => {
              if (gameState.startsWith("PLAYING") || gameState.includes("LOBBY")) {
                leaveLobby()
              } else {
                setGameState("MENU")
              }
            }}
            className="text-gray-400 hover:text-white flex items-center transition-colors bg-transparent border-none cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Menu
          </button>
        )}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-xs font-bold text-yellow-400">
            <Zap className="h-3.5 w-3.5 fill-current text-yellow-400" /> {coins} Coins
          </div>
          <div className="font-mono text-blue-400 font-bold tracking-widest uppercase text-xs flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            Wordchemy Lab
          </div>
        </div>
      </div>

      {/* MAIN SCREEN RENDER */}
      <div className="flex-1 flex flex-col items-center justify-center">

        {/* 1. MAIN MENU */}
        {gameState === "MENU" && (
          <div className="w-full max-w-3xl space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs uppercase tracking-widest font-black rounded-full">
                Creative Discovery
              </span>
              <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
                Wordchemy
              </h1>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Combine elemental concepts to unlock advanced creations, complete quests, and challenge friends in real time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Solo Discovery Card */}
              <button
                onClick={() => setGameState("SOLO_PLAY")}
                className="group relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 p-6 text-left transition-all hover:scale-[1.02] hover:border-blue-500/40"
              >
                <div className="flex items-center justify-between mb-4">
                  <Database className="h-8 w-8 text-blue-400 group-hover:animate-bounce" />
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                    Solo Quest
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Solo Discovery</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Start with base elements. Explore combinations to unlock all unique recipes in your offline library.
                </p>
              </button>

              {/* Real-time Multiplayer Card */}
              <button
                onClick={() => setGameState("MULTIPLAYER_SETUP")}
                className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/5 p-6 text-left transition-all hover:scale-[1.02] hover:border-purple-500/40"
              >
                <div className="flex items-center justify-between mb-4">
                  <Users className="h-8 w-8 text-purple-400 group-hover:animate-pulse" />
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    Multiplayer
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Real-time Labs</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Join a shared room. Work together in Co-op Labs or race against friends to synthesize elements first.
                </p>
              </button>

              {/* Quest & Lore Card */}
              <div className="flex flex-col gap-3 justify-between">
                <button
                  onClick={() => setGameState("MARKETPLACE")}
                  className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-purple-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Marketplace Shop</h4>
                      <p className="text-[10px] text-purple-300">Unlock expansion packs</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setGameState("QUESTS")}
                  className="w-full flex items-center justify-between p-3.5 bg-white/5 border border-white/5 hover:border-blue-500/30 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Campaign Quests</h4>
                      <p className="text-[10px] text-gray-400">Complete challenges & gain rewards</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setGameState("LORE_BOOK")}
                  className="w-full flex items-center justify-between p-3.5 bg-white/5 border border-white/5 hover:border-blue-500/30 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-cyan-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Alchemy Lorebook</h4>
                      <p className="text-[10px] text-gray-400">Discovered recipes index ({discovered.length} / {totalAvailableElements})</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. SOLO PLAY (WORKSPACE & LIBRARY) */}
        {gameState === "SOLO_PLAY" && (
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch animate-in fade-in duration-300">

            {/* Library sidebar */}
            <div className="md:col-span-1 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col space-y-4 max-h-[500px] overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Layers className="h-4 w-4 text-blue-400" /> Element Library ({discovered.length})
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1 custom-scrollbar">
                {discovered.map(elKey => {
                  const el = ELEMENTS[elKey]
                  if (!el) return null
                  return (
                    <button
                      key={el.id}
                      onClick={() => handleAddToWorkspace(el.id)}
                      className={`p-2.5 rounded-xl border text-xs text-left font-bold flex items-center gap-2 hover:scale-[1.03] transition-all duration-200 ${el.color}`}
                    >
                      <span>{el.emoji}</span>
                      <span className="truncate">{el.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Mixing Board Canvas */}
            <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between items-stretch min-h-[400px]">

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Mixing Workspace</h2>
                  <p className="text-xs text-gray-400">Click elements in the library to combine them on the board.</p>
                </div>
                <Button variant="ghost" onClick={handleClearWorkspace} className="text-xs hover:bg-white/5 text-gray-400">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
              </div>

              {/* Energy meter */}
              <div className="space-y-1.5 mt-4">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-yellow-400" /> Alchemical Energy
                  </span>
                  <span className={`${energy < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{energy} / 100</span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-300 ${energy < 30 ? 'bg-red-500' : energy < 60 ? 'bg-orange-500' : 'bg-yellow-500'
                      }`}
                    style={{ width: `${energy}%` }}
                  ></div>
                </div>
              </div>

              {/* Lockdown Timer Overheat indicator */}
              {isStabilizing ? (
                <div className="my-8 flex flex-col items-center justify-center p-6 bg-red-950/20 border border-red-500/20 rounded-2xl max-w-sm mx-auto space-y-2 animate-pulse">
                  <ShieldAlert className="h-8 w-8 text-red-500" />
                  <h4 className="font-bold text-red-400 text-sm">Alchemical Core Stabilization</h4>
                  <p className="text-xs text-gray-400">Workspace locked for stabilization...</p>
                  <span className="text-xl font-mono font-black text-red-500">{cooldown}s</span>
                </div>
              ) : (
                /* Canvas Center Slots */
                <div className="my-8 flex items-center justify-center gap-8">
                  <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center relative bg-black/10 group">
                    {workspace[0] ? (
                      <button
                        onClick={() => handleRemoveFromWorkspace(0)}
                        className={`absolute inset-0 rounded-2xl border flex flex-col items-center justify-center p-2 text-center transition-all ${ELEMENTS[workspace[0]]?.color}`}
                      >
                        <span className="text-3xl mb-1">{ELEMENTS[workspace[0]]?.emoji}</span>
                        <span className="text-xs font-black truncate max-w-full">{ELEMENTS[workspace[0]]?.name}</span>
                      </button>
                    ) : (
                      <span className="text-zinc-700 text-xs font-bold uppercase tracking-wider">Empty</span>
                    )}
                  </div>

                  <div className="text-2xl font-black text-zinc-600">+</div>

                  <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center relative bg-black/10 group">
                    {workspace[1] ? (
                      <button
                        onClick={() => handleRemoveFromWorkspace(1)}
                        className={`absolute inset-0 rounded-2xl border flex flex-col items-center justify-center p-2 text-center transition-all ${ELEMENTS[workspace[1]]?.color}`}
                      >
                        <span className="text-3xl mb-1">{ELEMENTS[workspace[1]]?.emoji}</span>
                        <span className="text-xs font-black truncate max-w-full">{ELEMENTS[workspace[1]]?.name}</span>
                      </button>
                    ) : (
                      <span className="text-zinc-700 text-xs font-bold uppercase tracking-wider">Empty</span>
                    )}
                  </div>
                </div>
              )}

              {/* Combo Multiplier logs */}
              {comboMultiplier > 1 && (
                <p className="text-center text-xs text-yellow-400 font-bold tracking-widest uppercase animate-pulse">
                  🔥 DISCOVERY COMBO: {comboMultiplier}X MULTIPLIER!
                </p>
              )}

              {/* Last unlocked info display */}
              {recentUnlock && ELEMENTS[recentUnlock] ? (
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl text-center space-y-1 max-w-md mx-auto">
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">LATEST DISCOVERY</p>
                  <h4 className="text-lg font-black text-white">{ELEMENTS[recentUnlock].emoji} {ELEMENTS[recentUnlock].name}</h4>
                  <p className="text-xs text-gray-400 italic">"{ELEMENTS[recentUnlock].description}"</p>
                </div>
              ) : (
                <div className="h-14"></div>
              )}

            </div>
          </div>
        )}

        {/* 3. QUESTS LIST */}
        {gameState === "QUESTS" && (
          <div className="w-full max-w-2xl glass-panel p-6 rounded-2xl border border-white/5 space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-black text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <Trophy className="h-6 w-6 text-yellow-500" /> Active Campaign Quests
            </h2>
            <div className="space-y-4">
              {QUESTS_LIST.map(quest => {
                const isCompleted = discovered.includes(quest.targetElement)
                return (
                  <div key={quest.id} className={`p-4 rounded-xl border flex items-center justify-between ${isCompleted ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/5'
                    }`}>
                    <div>
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        {quest.title} {isCompleted && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">COMPLETE</span>}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">{quest.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-blue-400">+{quest.rewardXP} XP</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Target: {ELEMENTS[quest.targetElement]?.name}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 4. LORE BOOK */}
        {gameState === "LORE_BOOK" && (
          <div className="w-full max-w-3xl glass-panel p-6 rounded-2xl border border-white/5 space-y-4 animate-in fade-in duration-300 max-h-[520px] flex flex-col">
            <h2 className="text-2xl font-black text-white flex items-center gap-2 border-b border-white/5 pb-3 shrink-0">
              <BookOpen className="h-6 w-6 text-cyan-400" /> Alchemy Lorebook
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {Object.keys(ELEMENTS).map(key => {
                const el = ELEMENTS[key]
                const isUnlocked = discovered.includes(key)
                return (
                  <div key={el.id} className={`p-4 rounded-xl border flex gap-4 items-start ${isUnlocked ? 'bg-white/5 border-white/5' : 'bg-black/40 border-white/5 opacity-50'
                    }`}>
                    <div className="text-3xl p-2 bg-black/40 border border-white/5 rounded-xl">
                      {isUnlocked ? el.emoji : "❓"}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-bold text-white">{isUnlocked ? el.name : "Unknown Element"}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed italic">
                        {isUnlocked ? `"${el.description}"` : "Discover combinations to unlock this recipe's mystery lore."}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${el.tier === "Base" ? 'bg-indigo-500/20 text-indigo-300' :
                            el.tier === "Natural" ? 'bg-emerald-500/20 text-emerald-300' :
                              el.tier === "Technical" ? 'bg-blue-500/20 text-blue-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                          {el.tier} Tier
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase font-black">Pack: {el.pack}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 5. MARKETPLACE SHOP */}
        {gameState === "MARKETPLACE" && (
          <div className="w-full max-w-3xl glass-panel p-6 rounded-2xl border border-white/5 space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-white/5 pb-3">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-purple-400" /> Marketplace Packs Shop
              </h2>
              <p className="text-xs text-gray-400">Expand your element library by unlocking theme packs with your discovery progress.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sci-Fi */}
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">🛸</span>
                    {unlockedPacks.includes("scifi") && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-400">Active</span>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-sm">Sci-Fi Expansion</h4>
                  <p className="text-xs text-gray-400">Adds 6 cosmic and high-tech elements including Alien, UFO, Starship, Laser, and Black Hole.</p>
                </div>
                <div className="space-y-2 border-t border-white/5 pt-3">
                  {unlockedPacks.includes("scifi") ? (
                    <Button disabled className="w-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs">
                      UNLOCKED
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => buyPack("scifi", 12, 300, false)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-xs font-bold py-2"
                      >
                        Unlock (12 Elements)
                      </Button>
                      <Button
                        onClick={() => buyPack("scifi", 12, 300, true)}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-xs font-bold py-2 flex items-center justify-center gap-1.5"
                      >
                        <Zap className="h-3 w-3 fill-current text-white" /> Bypass (300 Coins)
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Fantasy */}
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">🧙</span>
                    {unlockedPacks.includes("fantasy") && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-400">Active</span>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-sm">Fantasy Expansion</h4>
                  <p className="text-xs text-gray-400">Adds 6 arcane elements including Magic, Wizards, Spells, Elixirs, and Castles.</p>
                </div>
                <div className="space-y-2 border-t border-white/5 pt-3">
                  {unlockedPacks.includes("fantasy") ? (
                    <Button disabled className="w-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs">
                      UNLOCKED
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => buyPack("fantasy", 20, 500, false)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-xs font-bold py-2"
                      >
                        Unlock (20 Elements)
                      </Button>
                      <Button
                        onClick={() => buyPack("fantasy", 20, 500, true)}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-xs font-bold py-2 flex items-center justify-center gap-1.5"
                      >
                        <Zap className="h-3 w-3 fill-current text-white" /> Bypass (500 Coins)
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Relationships */}
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">💍</span>
                    {unlockedPacks.includes("relationships") && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-400">Active</span>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-sm">Relationships Pack</h4>
                  <p className="text-xs text-gray-400">Adds 6 relationship elements including Marriage, Trust, Dating App, and Conflict resolution.</p>
                </div>
                <div className="space-y-2 border-t border-white/5 pt-3">
                  {unlockedPacks.includes("relationships") ? (
                    <Button disabled className="w-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs">
                      UNLOCKED
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => buyPack("relationships", 30, 800, false)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-xs font-bold py-2"
                      >
                        Unlock (30 Elements)
                      </Button>
                      <Button
                        onClick={() => buyPack("relationships", 30, 800, true)}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-xs font-bold py-2 flex items-center justify-center gap-1.5"
                      >
                        <Zap className="h-3 w-3 fill-current text-white" /> Bypass (800 Coins)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. MULTIPLAYER SETUP SCREEN */}
        {gameState === "MULTIPLAYER_SETUP" && (
          <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/5 space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs uppercase tracking-widest font-black rounded-full">
                Real-Time Arena Setup
              </span>
              <h2 className="text-3xl font-black text-white font-sans">Multiplayer Rooms</h2>
              <p className="text-xs text-gray-400">Host shared canvas labs or join races with a room code.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Your Display Name</label>
                <input
                  type="text"
                  placeholder="Enter name..."
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none text-white focus:border-purple-500/50 text-sm font-sans"
                />
              </div>

              <div className="border-t border-white/5 pt-4 grid grid-cols-1 gap-3">
                <Button
                  onClick={createRoom}
                  disabled={!username.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Host New Lab Room
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
            </div>
          </div>
        )}

        {/* 7. MULTIPLAYER LOBBY SCREEN */}
        {gameState === "MULTIPLAYER_LOBBY" && (
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch animate-in fade-in duration-300">
            {/* Left panel: configurations */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div>
                  <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] uppercase tracking-widest font-black rounded-full">
                    Match Lobby
                  </span>
                  <h2 className="text-2xl font-black text-white mt-1">Room Settings</h2>
                  <p className="text-xs text-gray-400">
                    {isHost ? "You are the host. Choose mode and launch match." : "Waiting for the host to select mode and start match."}
                  </p>
                </div>

                {/* Target item selector (for Race mode) */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase">Discovery Race Target Element</label>
                  <select
                    disabled={!isHost}
                    value={targetElement}
                    onChange={e => handleTargetChange(e.target.value)}
                    className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none"
                  >
                    {Object.keys(ELEMENTS).filter(k => ELEMENTS[k].tier !== "Base").map(key => (
                      <option key={key} value={key}>
                        {ELEMENTS[key].emoji} {ELEMENTS[key].name} ({ELEMENTS[key].tier})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    Target element determines what players are racing to create in **Discovery Race** mode.
                  </p>
                </div>
              </div>

              {isHost ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                  <Button
                    onClick={startCoop}
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-4 font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform"
                  >
                    Start Co-op Alchemy Lab
                  </Button>
                  <Button
                    onClick={startRace}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-4 font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform"
                  >
                    Start Discovery Race
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 text-center text-xs font-semibold text-purple-400 animate-pulse mt-6">
                  Waiting for host to start matching...
                </div>
              )}
            </div>

            {/* Right panel: connected players & code */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-center p-4 bg-black/40 rounded-xl border border-white/5">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">ROOM CODE</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-black text-purple-400 tracking-wider font-mono">{roomCode}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(roomCode)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-white/5 pb-2">
                    Joined Alchemy team ({players.length})
                  </h3>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {players.map(p => (
                      <div key={p.presenceId} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 truncate">
                          {p.isHost ? <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" /> : <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                          <span className="text-xs font-bold truncate">{p.name} {p.presenceId === myPresenceId && "(You)"}</span>
                        </div>
                        <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-black uppercase">
                          Lobby
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={leaveLobby}
                variant="ghost"
                className="w-full text-xs font-semibold hover:bg-red-500/10 text-gray-500 hover:text-red-400 flex items-center justify-center gap-1.5 border border-white/5"
              >
                <LogOut className="h-3.5 w-3.5" /> Leave Lobby
              </Button>
            </div>
          </div>
        )}

        {/* 8. MULTIPLAYER CO-OP LAB */}
        {gameState === "PLAYING_COOP" && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch animate-in fade-in duration-300">
            {/* Library list panel */}
            <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col space-y-4 max-h-[500px] overflow-hidden">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 border-b border-white/5 pb-2">
                <Layers className="h-4 w-4 text-teal-400" /> Team Library ({sharedDiscovered.length})
              </h3>
              <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1 custom-scrollbar">
                {sharedDiscovered.map(elKey => {
                  const el = ELEMENTS[elKey]
                  if (!el) return null
                  return (
                    <button
                      key={el.id}
                      onClick={() => handleAddToWorkspace(el.id)}
                      className={`p-2.5 rounded-xl border text-xs text-left font-bold flex items-center gap-2 hover:scale-[1.03] transition-all duration-200 ${el.color}`}
                    >
                      <span>{el.emoji}</span>
                      <span className="truncate">{el.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Mixing Workspace Panel */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between items-stretch min-h-[440px]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Co-op Alchemy Lab</h2>
                  <p className="text-xs text-gray-400">Discoveries instantly sync to the lobby library feed!</p>
                </div>
                {isHost && (
                  <Button variant="outline" onClick={returnToLobby} className="border-white/10 hover:bg-white/5 text-xs text-white">
                    End Lab & Exit
                  </Button>
                )}
              </div>

              {/* Workspace inputs slots */}
              <div className="my-8 flex items-center justify-center gap-8">
                <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center relative bg-black/10">
                  {workspace[0] ? (
                    <button
                      onClick={() => handleRemoveFromWorkspace(0)}
                      className={`absolute inset-0 rounded-2xl border flex flex-col items-center justify-center p-2 text-center transition-all ${ELEMENTS[workspace[0]]?.color}`}
                    >
                      <span className="text-3xl mb-1">{ELEMENTS[workspace[0]]?.emoji}</span>
                      <span className="text-xs font-black truncate max-w-full">{ELEMENTS[workspace[0]]?.name}</span>
                    </button>
                  ) : (
                    <span className="text-zinc-700 text-xs font-bold uppercase tracking-wider">Empty</span>
                  )}
                </div>
                <div className="text-2xl font-black text-zinc-600">+</div>
                <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center relative bg-black/10">
                  {workspace[1] ? (
                    <button
                      onClick={() => handleRemoveFromWorkspace(1)}
                      className={`absolute inset-0 rounded-2xl border flex flex-col items-center justify-center p-2 text-center transition-all ${ELEMENTS[workspace[1]]?.color}`}
                    >
                      <span className="text-3xl mb-1">{ELEMENTS[workspace[1]]?.emoji}</span>
                      <span className="text-xs font-black truncate max-w-full">{ELEMENTS[workspace[1]]?.name}</span>
                    </button>
                  ) : (
                    <span className="text-zinc-700 text-xs font-bold uppercase tracking-wider">Empty</span>
                  )}
                </div>
              </div>

              {/* Feed logs activity */}
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-xs font-mono h-28 overflow-y-auto space-y-1.5 custom-scrollbar">
                {feed.length === 0 ? (
                  <p className="text-zinc-600 italic">No operations recorded yet.</p>
                ) : (
                  feed.map((log, idx) => (
                    <p key={idx} className="text-zinc-400">
                      <span className="text-teal-500 font-bold">➔</span> {log}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 9. MULTIPLAYER DISCOVERY RACE */}
        {gameState === "PLAYING_RACE" && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch animate-in fade-in duration-300">
            {/* Library sidebar */}
            <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col space-y-4 max-h-[500px] overflow-hidden">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 border-b border-white/5 pb-2">
                <Layers className="h-4 w-4 text-purple-400" /> Private Library ({discovered.length})
              </h3>
              <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1 custom-scrollbar">
                {discovered.map(elKey => {
                  const el = ELEMENTS[elKey]
                  if (!el) return null
                  return (
                    <button
                      key={el.id}
                      onClick={() => handleAddToWorkspace(el.id)}
                      className={`p-2.5 rounded-xl border text-xs text-left font-bold flex items-center gap-2 hover:scale-[1.03] transition-all duration-200 ${el.color}`}
                    >
                      <span>{el.emoji}</span>
                      <span className="truncate">{el.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Mixing workspace panel */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between items-stretch min-h-[440px]">

              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">RACE TARGET OBJECTIVE</p>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    {ELEMENTS[targetElement]?.emoji} Synthesize "{ELEMENTS[targetElement]?.name}"
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 font-bold uppercase">OPPONENTS</p>
                  <p className="text-xs font-semibold text-white">{players.length - 1} competitors</p>
                </div>
              </div>

              {/* Mixing slots */}
              <div className="my-8 flex items-center justify-center gap-8">
                <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center relative bg-black/10">
                  {workspace[0] ? (
                    <button
                      onClick={() => handleRemoveFromWorkspace(0)}
                      className={`absolute inset-0 rounded-2xl border flex flex-col items-center justify-center p-2 text-center transition-all ${ELEMENTS[workspace[0]]?.color}`}
                    >
                      <span className="text-3xl mb-1">{ELEMENTS[workspace[0]]?.emoji}</span>
                      <span className="text-xs font-black truncate max-w-full">{ELEMENTS[workspace[0]]?.name}</span>
                    </button>
                  ) : (
                    <span className="text-zinc-700 text-xs font-bold uppercase tracking-wider">Empty</span>
                  )}
                </div>
                <div className="text-2xl font-black text-zinc-600">+</div>
                <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center relative bg-black/10">
                  {workspace[1] ? (
                    <button
                      onClick={() => handleRemoveFromWorkspace(1)}
                      className={`absolute inset-0 rounded-2xl border flex flex-col items-center justify-center p-2 text-center transition-all ${ELEMENTS[workspace[1]]?.color}`}
                    >
                      <span className="text-3xl mb-1">{ELEMENTS[workspace[1]]?.emoji}</span>
                      <span className="text-xs font-black truncate max-w-full">{ELEMENTS[workspace[1]]?.name}</span>
                    </button>
                  ) : (
                    <span className="text-zinc-700 text-xs font-bold uppercase tracking-wider">Empty</span>
                  )}
                </div>
              </div>

              {/* Live race standings log list */}
              <div className="space-y-2 mt-4">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Lobby Race Progress</p>
                <div className="grid grid-cols-2 gap-2">
                  {players.map(p => (
                    <div key={p.presenceId} className="flex justify-between items-center text-xs p-2.5 bg-black/30 rounded-xl border border-white/5">
                      <span className="font-semibold truncate">{p.name}</span>
                      <span className="font-bold text-purple-400">{p.progress} unlocked</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 10. RACE RESULTS WINDOW */}
        {gameState === "RESULTS" && (
          <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/5 text-center space-y-6 animate-in zoom-in duration-300">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto drop-shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-bounce" />

            <div>
              <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs uppercase tracking-widest font-black rounded-full">
                Race Finished
              </span>
              <h2 className="text-3xl font-black text-white mt-3">Winner Proclaimed!</h2>
            </div>

            {raceWinner ? (
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl max-w-xs mx-auto">
                <p className="text-xs text-gray-400">First to synthesize "{ELEMENTS[targetElement]?.name}":</p>
                <p className="text-xl font-black text-yellow-400 mt-1">{raceWinner.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Completed at {raceWinner.time}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Match was aborted.</p>
            )}

            <div className="border-t border-white/5 pt-6 flex flex-col gap-2">
              {isHost ? (
                <Button
                  onClick={returnToLobby}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3.5 rounded-xl shadow-xl transition-all"
                >
                  Return to Lobby
                </Button>
              ) : (
                <p className="text-xs text-zinc-500 italic animate-pulse">Waiting for host to return to lobby...</p>
              )}
              <Button
                onClick={leaveLobby}
                variant="ghost"
                className="w-full text-xs font-semibold hover:bg-red-500/10 text-gray-400 hover:text-red-400 py-3 rounded-xl border border-white/5"
              >
                Exit Room
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
