"use client"

import { useState, useEffect, useRef } from "react"
import { Timer, Trophy, Play, ArrowLeft, RefreshCw, Sparkles, AlertTriangle, User, Bot, Zap, Star, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

type GameState = "CONFIG" | "COUNTDOWN" | "PLAYING" | "RESULTS"
type Difficulty = "Beginner" | "Easy" | "Normal" | "Hard" | "Expert" | "Master"
type CategoryPack = "Basic" | "Culture" | "Science" | "Geography" | "Mixed"
type ChaosModifier = "None" | "Double Points" | "Ban Vowels" | "Time Rush" | "Sudden Death"

// Dynamic dictionaries of words for AI simulation and basic verification
const DICTIONARY: Record<string, Record<string, string[]>> = {
  "country": {
    "a": ["Argentina", "Australia", "Austria", "Algeria", "Angola", "Armenia"],
    "b": ["Brazil", "Belgium", "Bahamas", "Bulgaria", "Bolivia", "Bahrain"],
    "c": ["Canada", "China", "Colombia", "Croatia", "Cuba", "Cyprus"],
    "d": ["Denmark", "Dominica", "Djibouti"],
    "e": ["Egypt", "Ecuador", "Estonia", "Ethiopia", "Eritrea"],
    "f": ["France", "Finland", "Fiji"],
    "g": ["Germany", "Greece", "Georgia", "Ghana", "Guatemala"],
    "h": ["Hungary", "Honduras", "Haiti"],
    "i": ["India", "Italy", "Indonesia", "Iran", "Iraq", "Ireland", "Iceland"],
    "j": ["Japan", "Jordan", "Jamaica"],
    "k": ["Kenya", "Kazakhstan", "Kuwait"],
    "l": ["London", "Lebanon", "Libya", "Latvia", "Lithuania"],
    "m": ["Mexico", "Morocco", "Malaysia", "Madagascar", "Monaco", "Malta"],
    "n": ["Norway", "Nepal", "Nigeria", "Netherlands", "New Zealand"],
    "o": ["Oman"],
    "p": ["Peru", "Portugal", "Poland", "Pakistan", "Philippines", "Panama"],
    "r": ["Russia", "Romania", "Rwanda"],
    "s": ["Spain", "Sweden", "Switzerland", "Singapore", "Saudi Arabia", "Senegal"],
    "t": ["Thailand", "Turkey", "Tunisia", "Tanzania"],
    "u": ["Uganda", "Ukraine", "Uruguay", "United Kingdom", "United States"],
    "v": ["Vietnam", "Venezuela", "Vatican City"],
    "w": ["Wales"]
  },
  "animal": {
    "a": ["Alligator", "Antelope", "Aardvark", "Alpaca", "Anaconda"],
    "b": ["Bear", "Baboon", "Badger", "Bat", "Buffalo", "Beaver", "Butterfly"],
    "c": ["Cat", "Camel", "Cheetah", "Chimpanzee", "Cobra", "Crab", "Crocodile"],
    "d": ["Dog", "Deer", "Dolphin", "Donkey", "Duck", "Dragonfly"],
    "e": ["Elephant", "Eagle", "Eel", "Echidna", "Elk"],
    "f": ["Fox", "Falcon", "Ferret", "Flamingo", "Frog", "Fly"],
    "g": ["Giraffe", "Gorilla", "Goat", "Gecko", "Gazelle"],
    "h": ["Horse", "Hippopotamus", "Hyena", "Hawk", "Hamster"],
    "i": ["Iguana", "Impala", "Ibis"],
    "j": ["Jaguar", "Jackal", "Jellyfish"],
    "k": ["Koala", "Kangaroo", "Kingfisher"],
    "l": ["Lion", "Leopard", "Llama", "Lizard", "Lobster", "Lemur"],
    "m": ["Monkey", "Moose", "Meerkat", "Mouse", "Mongoose"],
    "n": ["Newt", "Nightingale", "Narwhal"],
    "o": ["Owl", "Ostrich", "Otter", "Octopus", "Orangutan"],
    "p": ["Panda", "Panther", "Penguin", "Pig", "Platypus", "Puma", "Pelican"],
    "r": ["Rabbit", "Rat", "Raven", "Reindeer", "Rhinoceros"],
    "s": ["Snake", "Shark", "Sheep", "Squirrel", "Swan", "Spider", "Seal"],
    "t": ["Tiger", "Turtle", "Toucan", "Tapir", "Tarantula"],
    "u": ["Urchin", "Urial"],
    "v": ["Vulture", "Viper", "Vervet"],
    "w": ["Wolf", "Walrus", "Wombat", "Weasel", "Wasp"]
  },
  "food": {
    "a": ["Apple", "Avocado", "Almond", "Apricot", "Asparagus"],
    "b": ["Banana", "Bread", "Butter", "Broccoli", "Beef", "Bacon", "Berry"],
    "c": ["Cheese", "Cake", "Carrot", "Chicken", "Chocolate", "Cherry", "Coconut"],
    "d": ["Donut", "Date", "Dill", "Duck"],
    "e": ["Egg", "Eggplant", "Elderberry"],
    "f": ["Fig", "Fish", "Flour", "Fries"],
    "g": ["Grape", "Garlic", "Ginger", "Grapefruit", "Guava"],
    "h": ["Honey", "Ham", "Hazelnut", "Hummus"],
    "i": ["Ice Cream", "Iceberg Lettuce"],
    "j": ["Jelly", "Jam", "Jalapeno"],
    "k": ["Kiwi", "Kale", "Ketchup"],
    "l": ["Lemon", "Lime", "Lettuce", "Lobster", "Lasagna"],
    "m": ["Mango", "Milk", "Mushroom", "Melon", "Mutton", "Mustard"],
    "n": ["Noodle", "Nut", "Nutmeg"],
    "o": ["Orange", "Oatmeal", "Olive", "Onion", "Oyster"],
    "p": ["Pear", "Peach", "Plum", "Potato", "Pizza", "Pasta", "Peanut", "Pancake"],
    "r": ["Rice", "Radish", "Raspberry", "Ramen"],
    "s": ["Strawberry", "Salad", "Soup", "Steak", "Sugar", "Salmon", "Sausage"],
    "t": ["Tomato", "Toast", "Tangerine", "Trout", "Tofu", "Taco"],
    "u": ["Udon"],
    "v": ["Vanilla", "Vinegar"],
    "w": ["Watermelon", "Walnut", "Wheat"]
  },
  "profession": {
    "a": ["Actor", "Architect", "Artist", "Accountant", "Astronaut"],
    "b": ["Baker", "Barber", "Biologist", "Builder", "Broker"],
    "c": ["Chef", "Carpenter", "Chemist", "Coach", "Consultant"],
    "d": ["Doctor", "Dentist", "Designer", "Driver", "Detective"],
    "e": ["Engineer", "Editor", "Electrician", "Economist"],
    "f": ["Farmer", "Firefighter", "Fisherman", "Florist"],
    "g": ["Guard", "Gardener", "Geologist", "Guide"],
    "h": ["Hunter", "Historian", "Host"],
    "i": ["Inventor", "Inspector", "Illustrator"],
    "j": ["Janitor", "Journalist", "Judge"],
    "k": ["Keeper", "Keyworker"],
    "l": ["Lawyer", "Librarian", "Lecturer"],
    "m": ["Mechanic", "Manager", "Musician", "Model", "Miner"],
    "n": ["Nurse", "Novelist", "Nutritionist"],
    "o": ["Officer", "Optician", "Operator"],
    "p": ["Pilot", "Plumber", "Police Officer", "Politician", "Painter"],
    "r": ["Reporter", "Researcher", "Receptionist"],
    "s": ["Scientist", "Singer", "Sailor", "Surgeon", "Soldier"],
    "t": ["Teacher", "Technician", "Therapist", "Tailor", "Translator"],
    "u": ["Umpire", "Urologist"],
    "v": ["Veterinarian", "Valet", "Vocalist"],
    "w": ["Writer", "Web Developer", "Welder"]
  },
  "sports": {
    "a": ["Archery", "Athletics", "Auto Racing"],
    "b": ["Baseball", "Basketball", "Badminton", "Boxing", "Bobsleigh"],
    "c": ["Cricket", "Cycling", "Canoeing", "Curling"],
    "d": ["Diving", "Darts", "Disc Golf"],
    "e": ["Equestrian"],
    "f": ["Football", "Fencing", "Fishing", "Frisbee"],
    "g": ["Golf", "Gymnastics"],
    "h": ["Handball", "Hockey", "High Jump"],
    "j": ["Judo", "Javelin", "Jogging"],
    "k": ["Karate", "Kayaking"],
    "l": ["Lacrosse", "Long Jump"],
    "m": ["Marathon", "Motorcycling"],
    "n": ["Netball"],
    "r": ["Rowing", "Rugby", "Running"],
    "s": ["Sailing", "Swimming", "Skiing", "Snowboarding", "Squash", "Surfing"],
    "t": ["Tennis", "Triathlon", "Taekwondo", "Table Tennis"],
    "v": ["Volleyball"],
    "w": ["Wrestling", "Weightlifting", "Water Polo"]
  }
}

export default function ChaosAlphabetPage() {
  const [gameState, setGameState] = useState<GameState>("CONFIG")
  const [countdown, setCountdown] = useState(3)
  const [timer, setTimer] = useState(60)

  // Configuration State
  const [selectedPack, setSelectedPack] = useState<CategoryPack>("Basic")
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("Normal")
  const [selectedModifier, setSelectedModifier] = useState<ChaosModifier>("None")

  // Match State
  const [letter, setLetter] = useState("A")
  const [categories, setCategories] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [aiAnswers, setAiAnswers] = useState<Record<string, string>>({})
  const [aiProgress, setAiProgress] = useState(0)
  const [submitTime, setSubmitTime] = useState<number | null>(null)
  
  // Results / Scores
  const [scoreDetail, setScoreDetail] = useState<{
    base: number
    speed: number
    rarity: number
    uniqueness: number
    perfect: number
    multiplier: number
    total: number
  }>({ base: 0, speed: 0, rarity: 0, uniqueness: 0, perfect: 0, multiplier: 1, total: 0 })

  const [aiScore, setAiScore] = useState(0)

  const activeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Category Packs Definitions
  const PACKS: Record<CategoryPack, string[]> = {
    Basic: ["Country", "Animal", "Food", "Profession", "Sports"],
    Culture: ["Movie / Show", "Book Title", "Music Genre", "Celebrity Name", "TV Series"],
    Science: ["Famous Scientist", "Planet / Star", "Coding Language", "Chemical / Element", "Scientific Invention"],
    Geography: ["Country", "Global City", "River / Lake", "Mountain Range", "World Landmark"],
    Mixed: ["Country", "Animal", "Food", "Famous Scientist", "Movie / Show"]
  }

  // Generates randomized letters (excluding Q, U, V, X, Y, Z for smoother gameplay lookup)
  const generateLetter = () => {
    const alphabet = "ABCDEFGHIJKLMNOPRSTW"
    return alphabet[Math.floor(Math.random() * alphabet.length)]
  }

  const startMatch = () => {
    const selectedLetter = generateLetter()
    setLetter(selectedLetter)
    setCategories(PACKS[selectedPack])
    setAnswers({})
    setAiAnswers({})
    setAiProgress(0)
    setSubmitTime(null)
    
    // Set match duration according to chaos modifiers
    const roundDuration = selectedModifier === "Time Rush" ? 30 : 60
    setTimer(roundDuration)
    setCountdown(3)
    setGameState("COUNTDOWN")
  }

  // Handle countdown before game starts
  useEffect(() => {
    if (gameState === "COUNTDOWN") {
      if (countdown > 0) {
        const timeout = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(timeout)
      } else {
        setGameState("PLAYING")
      }
    }
  }, [gameState, countdown])

  // Handle Game Timer & AI Competitor Sim
  useEffect(() => {
    if (gameState === "PLAYING") {
      // Game Timer decrementer
      const gameInterval = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            clearInterval(gameInterval)
            finishMatch()
            return 0
          }
          return t - 1
        })
      }, 1000)

      // AI Opponent simulation timer
      let aiIncrementSpeed = 2 // default Beginner
      if (selectedDifficulty === "Easy") aiIncrementSpeed = 3
      if (selectedDifficulty === "Normal") aiIncrementSpeed = 5
      if (selectedDifficulty === "Hard") aiIncrementSpeed = 8
      if (selectedDifficulty === "Expert") aiIncrementSpeed = 12
      if (selectedDifficulty === "Master") aiIncrementSpeed = 20

      const aiInterval = setInterval(() => {
        setAiProgress(p => {
          if (p >= 100) {
            clearInterval(aiInterval)
            return 100
          }
          return Math.min(100, p + aiIncrementSpeed)
        })
      }, 1000)

      activeIntervalRef.current = gameInterval

      return () => {
        clearInterval(gameInterval)
        clearInterval(aiInterval)
      }
    }
  }, [gameState])

  // Helper to generate simulated answers for the AI bot
  const generateAiAnswers = (currLetter: string, currCategories: string[]) => {
    const response: Record<string, string> = {}
    
    currCategories.forEach(cat => {
      // Find dictionary key mapping
      let dictKey = cat.toLowerCase()
      if (dictKey.includes("country")) dictKey = "country"
      if (dictKey.includes("animal")) dictKey = "animal"
      if (dictKey.includes("food")) dictKey = "food"
      if (dictKey.includes("profession")) dictKey = "profession"
      if (dictKey.includes("sports")) dictKey = "sports"

      const list = DICTIONARY[dictKey]?.[currLetter.toLowerCase()] || []
      
      // Determine bot response quality based on difficulty
      if (list.length > 0) {
        if (selectedDifficulty === "Beginner" && Math.random() < 0.3) {
          // Beginner might leave empty
          response[cat] = ""
        } else if (selectedDifficulty === "Easy" && Math.random() < 0.15) {
          response[cat] = ""
        } else {
          // Pick a random word from the dictionary for this letter
          const randomWord = list[Math.floor(Math.random() * list.length)]
          response[cat] = randomWord
        }
      } else {
        // Fallback simulated answers if key is not in static dictionary
        response[cat] = currLetter + "..."
      }
    })
    return response
  }

  // Calculate scores for user & AI
  const finishMatch = () => {
    if (activeIntervalRef.current) clearInterval(activeIntervalRef.current)

    const finalAiAnswers = generateAiAnswers(letter, categories)
    setAiAnswers(finalAiAnswers)

    const submissionDuration = selectedModifier === "Time Rush" ? 30 - timer : 60 - timer
    setSubmitTime(submissionDuration)

    // Calculate User Score
    let base = 0
    let rarity = 0
    let uniqueness = 0
    let correctCount = 0

    categories.forEach(cat => {
      const ans = (answers[cat] || "").trim()
      const aiAns = (finalAiAnswers[cat] || "").trim()

      if (ans.toLowerCase().startsWith(letter.toLowerCase())) {
        // Ban Vowels check
        if (selectedModifier === "Ban Vowels") {
          const content = ans.slice(1).toLowerCase() // Exclude start letter
          if (/[aeiou]/.test(content)) {
            // Invalid due to modifier rule
            return
          }
        }

        correctCount++
        base += 10

        // Calculate dynamic rarity based on length + rare letters
        let wordRarity = Math.min(20, Math.max(0, (ans.length - 4) * 3))
        if (/[zqxjkvw]/.test(ans.toLowerCase())) {
          wordRarity += 5 // Rare character bonus
        }
        rarity += wordRarity

        // Unique bonus (if answer doesn't match AI's answer)
        if (ans.toLowerCase() !== aiAns.toLowerCase()) {
          uniqueness += 10
        }
      }
    })

    // Speed bonus: up to 10 points depending on how much time was left
    const totalDuration = selectedModifier === "Time Rush" ? 30 : 60
    const speed = Math.round((timer / totalDuration) * 10)

    // Perfect round bonus: 25 points if all categories are correct
    const perfect = correctCount === categories.length ? 25 : 0

    // Multiply if Double Points modifier is active
    const multiplier = selectedModifier === "Double Points" ? 2 : 1

    const rawTotal = base + speed + rarity + uniqueness + perfect
    const total = rawTotal * multiplier

    setScoreDetail({
      base,
      speed,
      rarity,
      uniqueness,
      perfect,
      multiplier,
      total
    })

    // Calculate AI Bot Score
    let aiBase = 0
    categories.forEach(cat => {
      const aiAns = (finalAiAnswers[cat] || "").trim()
      if (aiAns.toLowerCase().startsWith(letter.toLowerCase())) {
        aiBase += 10
        if (selectedDifficulty === "Expert") aiBase += 5 // Bot bonus points for difficulty
        if (selectedDifficulty === "Master") aiBase += 10
      }
    })
    setAiScore(aiBase)
    setGameState("RESULTS")
  }

  const handleInputChange = (category: string, value: string) => {
    // If Sudden Death modifier is on, check if the typed key starts matching right letter
    if (selectedModifier === "Sudden Death" && value.length > 0) {
      if (!value.toLowerCase().startsWith(letter.toLowerCase())) {
        finishMatch() // Instant game over on invalid input
        return
      }
    }
    setAnswers(prev => ({ ...prev, [category]: value }))
  }

  return (
    <div className="max-w-4xl mx-auto min-h-[calc(100vh-120px)] flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/playlab" className="text-gray-400 hover:text-white flex items-center transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to PlayLab
        </Link>
        <div className="font-mono text-primary font-bold tracking-widest uppercase text-xs flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          Chaos Alphabet Arena
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col items-center justify-center">
        
        {/* CONFIG/SETUP SCREEN */}
        {gameState === "CONFIG" && (
          <div className="w-full max-w-2xl glass-panel p-8 rounded-3xl border border-white/5 space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs uppercase tracking-widest font-black rounded-full">
                Offline Arena
              </span>
              <h1 className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Arena Match Settings
              </h1>
              <p className="text-sm text-gray-400">Configure your parameters to compete against the AI bot.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Packs */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-300">Category Pack</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Basic", "Culture", "Science", "Geography", "Mixed"] as CategoryPack[]).map(pack => (
                    <button
                      key={pack}
                      onClick={() => setSelectedPack(pack)}
                      className={`p-3 text-xs rounded-xl border text-left transition-all ${selectedPack === pack ? 'border-primary bg-primary/10 text-white' : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                      {pack} Pack
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot Difficulty */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-300">Opponent Bot Difficulty</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Beginner", "Easy", "Normal", "Hard", "Expert", "Master"] as Difficulty[]).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`p-3 text-xs rounded-xl border text-left transition-all ${selectedDifficulty === diff ? 'border-yellow-500 bg-yellow-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chaos Modifiers */}
            <div className="space-y-3 border-t border-white/5 pt-6">
              <label className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-yellow-500" /> Chaos Modifier
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(["None", "Double Points", "Ban Vowels", "Time Rush", "Sudden Death"] as ChaosModifier[]).map(mod => (
                  <button
                    key={mod}
                    onClick={() => setSelectedModifier(mod)}
                    className={`p-3 text-xs rounded-xl border text-center transition-all ${selectedModifier === mod ? 'border-red-500 bg-red-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >
                    {mod}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {selectedModifier === "Double Points" && "All points earned in this round are multiplied by 2x."}
                {selectedModifier === "Ban Vowels" && "Answers must not contain any vowels (A, E, I, O, U) except the first letter."}
                {selectedModifier === "Time Rush" && "Round duration is cut to 30 seconds."}
                {selectedModifier === "Sudden Death" && "Making an invalid entry or typing a wrong letter ends the match immediately."}
                {selectedModifier === "None" && "Standard rules apply. Play at your own speed."}
              </p>
            </div>

            <Button 
              onClick={startMatch} 
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-6 text-lg font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform"
            >
              Start Game Arena
            </Button>
          </div>
        )}

        {/* COUNTDOWN SCREEN */}
        {gameState === "COUNTDOWN" && (
          <div className="text-center animate-in zoom-in duration-300 space-y-4">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Get Ready...</p>
            <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-orange-500 drop-shadow-[0_0_35px_rgba(234,179,8,0.4)]">
              {countdown}
            </div>
          </div>
        )}

        {/* PLAYING SCREEN */}
        {gameState === "PLAYING" && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* Input Grid */}
            <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
              <div className="flex items-center justify-between glass-panel p-6 rounded-2xl border border-white/5 shadow-xl">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Target Letter</p>
                  <div className="text-6xl font-black text-yellow-400 leading-none">
                    {letter}
                  </div>
                </div>
                
                {selectedModifier !== "None" && (
                  <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs font-bold text-red-400 flex items-center gap-1.5 animate-pulse">
                    <ShieldAlert className="h-4 w-4" /> {selectedModifier}
                  </div>
                )}

                <div className="text-center">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Time Remaining</p>
                  <div className={`text-4xl font-mono font-bold flex items-center ${timer <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    <Timer className="h-6 w-6 mr-2 opacity-50" />
                    {timer}s
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                {categories.map((cat, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-4 focus-within:border-yellow-500/50 transition-all flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                      {cat}
                    </label>
                    <input
                      type="text"
                      value={answers[cat] || ""}
                      onChange={e => handleInputChange(cat, e.target.value)}
                      placeholder={`Type answer starting with ${letter}...`}
                      className="bg-transparent border-none outline-none text-lg text-white placeholder:text-zinc-700"
                      autoFocus={idx === 0}
                    />
                  </div>
                ))}
              </div>

              <Button onClick={finishMatch} className="w-full bg-white/10 hover:bg-white/20 text-white py-5 text-sm font-bold mt-4">
                LOCK IN & SUBMIT
              </Button>
            </div>

            {/* Sidebar Bot Progress Tracker */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2">
                  Competitors
                </h3>
                
                {/* User Info */}
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="p-2 bg-primary/20 text-primary rounded-lg">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">You</p>
                    <p className="text-xs text-gray-400">
                      {Object.keys(answers).filter(k => answers[k]?.trim()).length} / {categories.length} answers filled
                    </p>
                  </div>
                </div>

                {/* AI Bot Info */}
                <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">Opponent Bot</p>
                      <p className="text-xs text-gray-500">Difficulty: {selectedDifficulty}</p>
                    </div>
                  </div>

                  {/* Bot progress percentage */}
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-xs font-mono text-gray-400">
                      <span>Status</span>
                      <span>{aiProgress}% Done</span>
                    </div>
                    <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-yellow-500 h-full transition-all duration-500" 
                        style={{ width: `${aiProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips & Modifier Rules */}
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-current" /> Scoring Rarity Tip
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Longer, complex words and those containing less common letters (Z, Q, X, J, K) yield much higher Rarity Bonuses!
                </p>
              </div>
            </div>

          </div>
        )}

        {/* RESULTS SCREEN */}
        {gameState === "RESULTS" && (
          <div className="w-full max-w-4xl space-y-8 animate-in slide-in-from-bottom-8 duration-500">
            {/* Verdict Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Point Breakdown card */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Trophy className="h-8 w-8 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]" />
                    <h2 className="text-2xl font-black">Scorecard</h2>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-sm font-medium">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-gray-500">Base Points</span>
                      <span>{scoreDetail.base}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-gray-500">Speed Bonus</span>
                      <span>+{scoreDetail.speed}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-gray-500">Rarity Bonus</span>
                      <span>+{scoreDetail.rarity}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-gray-500">Uniqueness</span>
                      <span>+{scoreDetail.uniqueness}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2 col-span-2">
                      <span className="text-gray-500">Perfect Round Bonus</span>
                      <span>+{scoreDetail.perfect}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 mt-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Multiplier</p>
                    <p className="text-sm font-semibold">{scoreDetail.multiplier}x {selectedModifier !== "None" && `(${selectedModifier})`}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Final Score</p>
                    <p className="text-4xl font-black text-yellow-400">{scoreDetail.total} pts</p>
                  </div>
                </div>
              </div>

              {/* Bot Comparison card */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Bot className="h-8 w-8" />
                    <h2 className="text-2xl font-black">AI Opponent</h2>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    The bot played at difficulty level <b>{selectedDifficulty}</b>, scoring <b>{aiScore}</b> base points.
                  </p>

                  <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="p-3 rounded-xl bg-yellow-500/20 text-yellow-400">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase">Time Submitted</p>
                      <p className="font-semibold text-sm">{submitTime} seconds</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-black/20 text-center">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Match Verdict</p>
                  {scoreDetail.total > aiScore ? (
                    <span className="text-green-400 font-black text-2xl tracking-wide">VICTORY</span>
                  ) : scoreDetail.total === aiScore ? (
                    <span className="text-yellow-400 font-black text-2xl tracking-wide">DRAW MATCH</span>
                  ) : (
                    <span className="text-red-400 font-black text-2xl tracking-wide">DEFEAT</span>
                  )}
                </div>
              </div>

            </div>

            {/* Answer comparisons list */}
            <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
              <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                <span>Answers Comparison (Letter: {letter})</span>
                <span>Pack: {selectedPack}</span>
              </div>
              
              <div className="divide-y divide-white/5">
                {categories.map((cat, idx) => {
                  const myAns = (answers[cat] || "").trim()
                  const botAns = (aiAnswers[cat] || "").trim()
                  const isMyAnsValid = myAns.toLowerCase().startsWith(letter.toLowerCase())
                  
                  return (
                    <div key={idx} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* My Answer */}
                      <div className="flex items-start justify-between bg-black/20 p-3 rounded-xl">
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                            {cat} (You)
                          </p>
                          <p className={`font-semibold text-sm ${!myAns ? 'text-gray-600 italic' : 'text-white'}`}>
                            {myAns || "No answer provided"}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isMyAnsValid ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {isMyAnsValid ? "VALID" : "INVALID"}
                        </span>
                      </div>

                      {/* Bot Answer */}
                      <div className="flex items-start justify-between bg-black/20 p-3 rounded-xl">
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                            {cat} (Bot)
                          </p>
                          <p className={`font-semibold text-sm ${!botAns ? 'text-gray-600 italic' : 'text-yellow-500'}`}>
                            {botAns || "No answer provided"}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${botAns.toLowerCase().startsWith(letter.toLowerCase()) ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {botAns.toLowerCase().startsWith(letter.toLowerCase()) ? "VALID" : "INVALID"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Play Again actions */}
            <div className="flex justify-center gap-4">
              <Button 
                onClick={() => setGameState("CONFIG")}
                variant="outline" 
                className="border-white/10 hover:bg-white/5 text-white font-bold px-8 py-5 rounded-xl transition-all"
              >
                Match Setup Settings
              </Button>
              <Button 
                onClick={startMatch} 
                className="bg-white hover:bg-zinc-200 text-black font-bold px-8 py-5 rounded-xl shadow-xl hover:scale-105 transition-all"
              >
                <RefreshCw className="h-5 w-5 mr-2" /> Play Again
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
