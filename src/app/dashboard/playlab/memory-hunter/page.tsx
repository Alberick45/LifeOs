"use client"

import { useState, useEffect, useRef } from "react"
import { Timer, Trophy, Play, ArrowLeft, RefreshCw, Sparkles, AlertTriangle, User, Bot, Zap, Star, ShieldAlert, Brain, Check, HelpCircle, Eye, ShoppingBag, Lock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { readCoins, adjustCoins, onCoinsChange, loadProgress, saveProgress, saveHighScore } from "@/lib/playlab-coins"

type GameState = "MENU" | "GRID_PLAY" | "QUIZ_PLAY" | "SCORE_REPORT"
type Difficulty = "Beginner" | "Normal" | "Expert"

interface QuizQuestion {
  question: string
  options: string[]
  answer: string
  category: string
}

interface VirtualPerson {
  name: string
  relationship_type: string
  birthday_month: string
  hobby: string
  fav_food: string
  pronoun: string
}

// Fallback virtual cohort if user's private people list is empty
const VIRTUAL_COHORT: VirtualPerson[] = [
  { name: "Mum (Elizabeth)", relationship_type: "family", birthday_month: "May", hobby: "Gardening", fav_food: "Apple Pie", pronoun: "She/Her" },
  { name: "Sarah", relationship_type: "friend", birthday_month: "October", hobby: "Photography", fav_food: "Sushi", pronoun: "She/Her" },
  { name: "Jack", relationship_type: "partner", birthday_month: "December", hobby: "Hiking", fav_food: "Tacos", pronoun: "He/Him" },
  { name: "David", relationship_type: "family", birthday_month: "April", hobby: "Gaming", fav_food: "Pizza", pronoun: "He/Him" },
  { name: "Alex", relationship_type: "colleague", birthday_month: "August", hobby: "Chess", fav_food: "Ramen", pronoun: "They/Them" }
]

export default function MemoryHunterPage() {
  const [gameState, setGameState] = useState<GameState>("MENU")
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [coins, setCoins] = useState(0)
  const [alertMsg, setAlertMsg] = useState<{ text: string; success: boolean } | null>(null)
  const alertTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Real database people
  const [people, setPeople] = useState<any[]>([])

  // --- Cognitive Grid State ---
  const [gridDifficulty, setGridDifficulty] = useState<Difficulty>("Normal")
  const [gridSize, setGridSize] = useState(3) // 3x3 (9 tiles), 4x4 (16 tiles), 5x5 (25 tiles)
  const [sequence, setSequence] = useState<number[]>([])
  const [playerSequence, setPlayerSequence] = useState<number[]>([])
  const [sequencePlaying, setSequencePlaying] = useState(false)
  const [activeTile, setActiveTile] = useState<number | null>(null)
  const [gridStreak, setGridStreak] = useState(0)
  const [gridHighScore, setGridHighScore] = useState(0)
  const [lives, setLives] = useState(3)

  // --- Connection Quiz State ---
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [quizSubmittedAnswers, setQuizSubmittedAnswers] = useState<string[]>([])
  const [quizPenalty, setQuizPenalty] = useState(0)
  const [reportFeedback, setReportFeedback] = useState("")
  const [knowledgeLevel, setKnowledgeLevel] = useState("")

  const triggerAlert = (text: string, success: boolean = true) => {
    setAlertMsg({ text, success })
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current)
    alertTimerRef.current = setTimeout(() => setAlertMsg(null), 3000)
  }

  const awardCoins = (amount: number) => {
    const next = adjustCoins(userId, amount)
    setCoins(next)
    triggerAlert(`Earned +${amount} PlayLab Coins!`, true)
  }

  // Initial Auth & Coins setup
  useEffect(() => {
    let resolvedUserId: string | null = null
    let unsubCoins: (() => void) | null = null

    const initSession = async () => {
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
      setGridHighScore(progress.high_scores?.memory_hunter ?? 0)

      // Query local database for people profiles
      try {
        const { data: peopleData } = await supabase
          .from("people")
          .select("*")
          .eq("is_archived", false)
        
        if (peopleData && peopleData.length > 0) {
          setPeople(peopleData)
        } else {
          setPeople([])
        }
      } catch (err) {
        console.error("Error loading people profiles:", err)
      }

      // Subscribe to coin updates dynamically
      unsubCoins = onCoinsChange(resolvedUserId, (newBal) => setCoins(newBal))
    }
    initSession()

    return () => {
      if (unsubCoins) unsubCoins()
    }
  }, [])

  // Adapt grid size based on difficulty
  useEffect(() => {
    if (gridDifficulty === "Beginner") setGridSize(3)
    else if (gridDifficulty === "Normal") setGridSize(4)
    else if (gridDifficulty === "Expert") setGridSize(5)
  }, [gridDifficulty])

  // --- Grid Game Logic ---
  const startGridGame = () => {
    setGridStreak(0)
    setLives(3)
    setPlayerSequence([])
    generateNextRoundSequence(1, true)
  }

  const generateNextRoundSequence = (roundNumber: number, resetStreak: boolean = false) => {
    const nextSeq: number[] = []
    const totalTiles = gridSize * gridSize
    
    // Pattern length starts at 3, increments with rounds
    const patternLength = 2 + roundNumber
    for (let i = 0; i < patternLength; i++) {
      nextSeq.push(Math.floor(Math.random() * totalTiles))
    }
    setSequence(nextSeq)
    setPlayerSequence([])
    playSequence(nextSeq)
    if (resetStreak) {
      setGridStreak(0)
      setLives(3)
    }
  }

  const playSequence = async (seq: number[]) => {
    setSequencePlaying(true)
    setActiveTile(null)
    
    // Playback speed scales with difficulty
    const speed = gridDifficulty === "Beginner" ? 800 : gridDifficulty === "Normal" ? 500 : 350

    for (let i = 0; i < seq.length; i++) {
      await new Promise(resolve => setTimeout(resolve, speed / 2))
      setActiveTile(seq[i])
      await new Promise(resolve => setTimeout(resolve, speed))
      setActiveTile(null)
    }
    setSequencePlaying(false)
  }

  const handleTileClick = (idx: number) => {
    if (sequencePlaying || gameState !== "GRID_PLAY") return

    const nextPlayerSeq = [...playerSequence, idx]
    setPlayerSequence(nextPlayerSeq)

    // Check click validity against target index
    const targetIdx = sequence[nextPlayerSeq.length - 1]
    if (idx !== targetIdx) {
      // Failure / Mistake
      setLives(prevLives => {
        const nextLives = prevLives - 1
        if (nextLives <= 0) {
          triggerAlert("Out of lives! Game Over.", false)
          // Update high scores
          if (gridStreak > gridHighScore) {
            setGridHighScore(gridStreak)
            saveHighScore(userId, "memory_hunter", gridStreak)
            triggerAlert(`New High Score: ${gridStreak} rounds!`, true)
          }

          // Payout coins
          const coinsReward = Math.max(0, gridStreak * 5)
          if (coinsReward > 0) {
            setTimeout(() => awardCoins(coinsReward), 500)
          }
          setGameState("MENU")
          return 0
        }

        triggerAlert(`Wrong tile! Lost 1 life (${nextLives} remaining)`, false)
        // Reset player sequence for current round
        setPlayerSequence([])
        // Replay pattern sequence so player can try again
        setTimeout(() => playSequence(sequence), 1000)
        return nextLives
      })
      return
    }

    // Sequence completed successfully
    if (nextPlayerSeq.length === sequence.length) {
      setGridStreak(prev => prev + 1)
      triggerAlert("Perfect match! Sequence expanding...", true)
      setTimeout(() => {
        generateNextRoundSequence(gridStreak + 2, false)
      }, 1000)
    }
  }

  // --- Connection Quiz Generator ---
  const generateQuiz = () => {
    const questions: QuizQuestion[] = []
    const cohort = people.length >= 3 ? people : VIRTUAL_COHORT

    // Shuffle cohort to select random members
    const shuffledCohort = [...cohort].sort(() => Math.random() - 0.5)

    // 1. Question about relationship type
    if (shuffledCohort[0]) {
      const subject = shuffledCohort[0]
      const answer = subject.relationship_type || "friend"
      const choices = Array.from(new Set([answer, "family", "friend", "partner", "colleague"])).slice(0, 4)
      questions.push({
        question: `What is the relationship type set for "${subject.name}"?`,
        options: choices.sort(() => Math.random() - 0.5),
        answer: answer,
        category: "relationship_type"
      })
    }

    // 2. Question about birthday month
    if (shuffledCohort[1]) {
      const subject = shuffledCohort[1]
      let answer = ""
      
      // Get month name from birthday (SQL timestamp / DATE or fallback virtual string)
      if (subject.birthday) {
        const d = new Date(subject.birthday)
        if (!isNaN(d.getTime())) {
          answer = d.toLocaleString('default', { month: 'long' })
        }
      } else if (subject.birthday_month) {
        answer = subject.birthday_month
      }

      if (answer) {
        const choices = Array.from(new Set([answer, "January", "April", "June", "August", "October", "December"])).slice(0, 4)
        questions.push({
          question: `In which month is "${subject.name}"'s birthday celebration?`,
          options: choices.sort(() => Math.random() - 0.5),
          answer: answer,
          category: "birthday"
        })
      }
    }

    // 3. Question about pronouns
    if (shuffledCohort[2]) {
      const subject = shuffledCohort[2]
      const answer = subject.pronouns || subject.pronoun || "Rather not say"
      const choices = Array.from(new Set([answer, "He/Him", "She/Her", "They/Them", "Rather not say"])).slice(0, 4)
      questions.push({
        question: `Which pronouns are configured on "${subject.name}"'s identity card?`,
        options: choices.sort(() => Math.random() - 0.5),
        answer: answer,
        category: "pronouns"
      })
    }

    // 4. Question about hobbies / attributes
    const hobbyPerson = shuffledCohort.find(p => p.hobby || (p.notes && p.notes.length > 5))
    if (hobbyPerson) {
      const answer = hobbyPerson.hobby || "Gaming"
      const choices = Array.from(new Set([answer, "Photography", "Hiking", "Gardening", "Chess", "Cooking"])).slice(0, 4)
      questions.push({
        question: `According to preferences, which hobby is associated with "${hobbyPerson.name}"?`,
        options: choices.sort(() => Math.random() - 0.5),
        answer: answer,
        category: "interests"
      })
    }

    // 5. Question about email/phone domains
    if (shuffledCohort[3]) {
      const subject = shuffledCohort[3]
      const email = subject.email || ""
      const isVirtual = !subject.email
      const answer = isVirtual ? (subject.fav_food || "Pizza") : email.split("@")[1] || "gmail.com"
      
      questions.push({
        question: isVirtual 
          ? `What is "${subject.name}"'s favorite dish/cuisine?`
          : `What is the email domain configured for "${subject.name}"?`,
        options: isVirtual 
          ? ["Sushi", "Pizza", "Tacos", "Ramen", "Apple Pie"].sort(() => Math.random() - 0.5)
          : [answer, "gmail.com", "outlook.com", "yahoo.com"].sort(() => Math.random() - 0.5),
        answer: answer,
        category: "preferences"
      })
    }

    setQuizQuestions(questions)
    setCurrentQuestionIdx(0)
    setQuizScore(0)
    setQuizSubmittedAnswers([])
    setQuizPenalty(0)
    setGameState("QUIZ_PLAY")
  }

  const handleSelectQuizAnswer = (option: string) => {
    const nextAnswers = [...quizSubmittedAnswers, option]
    setQuizSubmittedAnswers(nextAnswers)

    const isCorrect = option === quizQuestions[currentQuestionIdx].answer
    if (isCorrect) {
      setQuizScore(prev => prev + 1)
      triggerAlert("Correct!", true)
    } else {
      setQuizPenalty(prev => prev + 15) // Apply -15 points penalty to final score percentage
      triggerAlert(`Incorrect! Truth is: ${quizQuestions[currentQuestionIdx].answer} (Penalty: -15 Score Points)`, false)
    }

    if (currentQuestionIdx + 1 < quizQuestions.length) {
      setCurrentQuestionIdx(prev => prev + 1)
    } else {
      // End of quiz, analyze and transition
      finishQuiz(nextAnswers, quizPenalty + (isCorrect ? 0 : 15))
    }
  }

  const finishQuiz = (allAnswers: string[], finalPenalty: number) => {
    // Calculate final score details
    let correct = 0
    quizQuestions.forEach((q, idx) => {
      if (allAnswers[idx] === q.answer) correct++
    })

    const finalRatio = correct / quizQuestions.length
    const knowledgePercent = Math.max(0, Math.round(finalRatio * 100) - finalPenalty)
    
    // Determine level badge
    let badge = "Stranger"
    if (knowledgePercent > 85) badge = "Deep Connection"
    else if (knowledgePercent > 60) badge = "Close Connection"
    else if (knowledgePercent > 40) badge = "Familiar"
    else if (knowledgePercent > 20) badge = "Acquainted"
    setKnowledgeLevel(badge)

    // Generate custom report feedback
    let report = ""
    if (knowledgePercent >= 80) {
      report = `Superb job! You show an outstanding awareness of your connection profiles. You scored ${knowledgePercent}% (taking into account incorrect penalties). You remember milestones, preferences, and details clearly. Keep active and stay connected!`
    } else if (knowledgePercent >= 50) {
      report = `Decent knowledge! You scored ${knowledgePercent}% (taking into account incorrect penalties). You got some categories correct, but showed blind spots in birthdays or personal details. Consider reviewing your timeline notifications to reinforce details.`
    } else {
      report = `Distant Connection. Your profile answers mismatched frequently, resulting in a score of ${knowledgePercent}%. Take some time to write communication notes or catch up with friends to update your database profiles.`
    }
    setReportFeedback(report)

    // Payout rewards
    const coinPayout = Math.max(10, correct * 10)
    awardCoins(coinPayout)

    setGameState("SCORE_REPORT")
  }

  return (
    <div className="max-w-4xl mx-auto min-h-[calc(100vh-120px)] flex flex-col space-y-6">
      
      {/* Dynamic Alerts */}
      {alertMsg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
          alertMsg.success ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {alertMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        {gameState === "MENU" ? (
          <Link href="/dashboard/playlab" className="text-gray-400 hover:text-white flex items-center transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to PlayLab
          </Link>
        ) : (
          <button 
            onClick={() => setGameState("MENU")} 
            className="text-gray-400 hover:text-white flex items-center transition-colors bg-transparent border-none cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Return to Menu
          </button>
        )}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-xs font-bold text-yellow-400">
            <Zap className="h-3.5 w-3.5 fill-current text-yellow-400" /> {coins} Coins
          </div>
          <div className="font-mono text-purple-400 font-bold tracking-widest uppercase text-xs flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" />
            Memory Hunter
          </div>
        </div>
      </div>

      {/* Content wrapper */}
      <div className="flex-1 flex flex-col items-center justify-center">

        {/* 1. MAIN MENU */}
        {gameState === "MENU" && (
          <div className="w-full max-w-3xl space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs uppercase tracking-widest font-black rounded-full">
                Cognitive & Relationship Labs
              </span>
              <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 via-indigo-500 to-pink-500 bg-clip-text text-transparent drop-shadow-sm">
                Memory Hunter
              </h1>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Train your pattern retention skills or decode connections based on your private HumanOS social database.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {/* Left panel: Core modes */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Cognitive pattern grid game card */}
                <button
                  onClick={() => {
                    setGameState("GRID_PLAY")
                    startGridGame()
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 p-6 text-left transition-all hover:scale-[1.02] hover:border-purple-500/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Brain className="h-8 w-8 text-purple-400 group-hover:animate-bounce" />
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        Solo Cognitive
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">▶ Grid Memory Arena</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Test your spatial memory recall. Repeat expanding grid pattern sequences and secure high streaks.
                    </p>
                  </div>
                  <div className="mt-4 text-[10px] text-zinc-500 font-bold uppercase flex justify-between">
                    <span>HighScore: {gridHighScore} rounds</span>
                    <span>Grid size: Up to 5x5</span>
                  </div>
                </button>

                {/* Relationship Quiz game card */}
                <button
                  onClick={generateQuiz}
                  className="group relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-purple-500/5 p-6 text-left transition-all hover:scale-[1.02] hover:border-pink-500/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Trophy className="h-8 w-8 text-pink-400 group-hover:animate-pulse" />
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-pink-500/20 text-pink-300">
                        Deduction Quiz
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">▶ Connection Quiz</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      How well do you know your contacts? Dynamic quizzes generated from hobbies, birthdays, and relationships.
                    </p>
                  </div>
                  <div className="mt-4 text-[10px] text-zinc-500 font-bold uppercase">
                    <span>Uses: {people.length > 0 ? `${people.length} Local Profiles` : "Fictional Cohort"}</span>
                  </div>
                </button>
              </div>

              {/* Right sidebar column: Secondary stacked options */}
              <div className="flex flex-col gap-3 justify-between">
                {/* Rewards / Quests */}
                <div className="w-full p-4 bg-white/5 border border-white/5 rounded-xl space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Quest Rewards</h4>
                      <p className="text-[10px] text-gray-400">Earn coins by completing rounds</p>
                    </div>
                  </div>
                </div>

                {/* Memory Stats panel */}
                <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-1.5 shrink-0">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Hunter statistics
                    </h4>
                  </div>
                  <div className="space-y-2 text-[11px] flex-1 flex flex-col justify-center">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-400">Highest Grid Streak</span>
                      <span className="font-bold text-purple-400">{gridHighScore} Rounds</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-400">Total Coins Balance</span>
                      <span className="font-bold text-yellow-400">{coins} Coins</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className="font-bold text-green-400">Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. GRID MEMORY GAME SCREEN */}
        {gameState === "GRID_PLAY" && (
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-white/5 space-y-6 animate-in fade-in duration-300 flex flex-col items-center">
            
            <div className="text-center w-full">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 tracking-wider">
                Arena Match ({gridDifficulty})
              </span>

              {/* Lives Counter Row */}
              <div className="flex justify-center gap-1.5 mt-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} className={`text-lg transition-all ${i < lives ? 'text-red-500 animate-pulse' : 'text-zinc-700'}`}>
                    ❤️
                  </span>
                ))}
              </div>

              <h2 className="text-2xl font-black text-white mt-1.5">Streak: {gridStreak} Rounds</h2>
              <p className="text-xs text-gray-400 mt-1">
                {sequencePlaying ? "Watch the sequence closely..." : "Repeat the highlighted pattern!"}
              </p>
            </div>

            {/* Difficulty Controls */}
            <div className="flex gap-2 p-1 bg-black/40 border border-white/5 rounded-xl text-xs w-full justify-around">
              {(["Beginner", "Normal", "Expert"] as Difficulty[]).map(diff => (
                <button
                  key={diff}
                  disabled={sequencePlaying}
                  onClick={() => setGridDifficulty(diff)}
                  className={`flex-1 py-1.5 rounded-lg text-center font-semibold transition-all ${
                    gridDifficulty === diff ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                  } disabled:opacity-40`}
                >
                  {diff}
                </button>
              ))}
            </div>

            {/* Grid Box */}
            <div 
              className="grid gap-2 bg-black/30 p-4 rounded-2xl border border-white/5 w-full aspect-square"
              style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
                const isActive = activeTile === idx
                return (
                  <button
                    key={idx}
                    disabled={sequencePlaying}
                    onClick={() => handleTileClick(idx)}
                    className={`rounded-xl border transition-all duration-150 ${
                      isActive 
                        ? 'bg-purple-500 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.8)] scale-95' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10 active:bg-purple-950/40'
                    } disabled:cursor-not-allowed`}
                    style={{ aspectRatio: "1/1" }}
                  />
                )
              })}
            </div>

            <Button
              onClick={startGridGame}
              disabled={sequencePlaying}
              className="w-full bg-purple-600 hover:bg-purple-500 font-bold py-5 rounded-xl shadow-lg transition-transform hover:scale-[1.01]"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Reset & Play
            </Button>
          </div>
        )}

        {/* 3. CONNECTION QUIZ SCREEN */}
        {gameState === "QUIZ_PLAY" && quizQuestions[currentQuestionIdx] && (
          <div className="w-full max-w-lg glass-panel p-8 rounded-3xl border border-white/5 space-y-6 animate-in fade-in duration-300">
            
            {/* Progress stats */}
            <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-widest">
              <span>Question {currentQuestionIdx + 1} of {quizQuestions.length}</span>
              <span className="text-pink-400">Score: {quizScore} / {quizQuestions.length}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="bg-pink-500 h-full transition-all duration-300"
                style={{ width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%` }}
              ></div>
            </div>

            {/* Question Text */}
            <div className="p-5 bg-pink-500/5 border border-pink-500/10 rounded-2xl text-center">
              <HelpCircle className="h-8 w-8 text-pink-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold leading-relaxed text-white">
                {quizQuestions[currentQuestionIdx].question}
              </h3>
            </div>

            {/* Options list */}
            <div className="grid grid-cols-1 gap-3">
              {quizQuestions[currentQuestionIdx].options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectQuizAnswer(option)}
                  className="p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-pink-500/30 text-left font-bold text-sm transition-all duration-200 hover:scale-[1.01]"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. SCORECARD AND RELATIONSHIP REPORT */}
        {gameState === "SCORE_REPORT" && (
          <div className="w-full max-w-xl glass-panel p-8 rounded-3xl border border-white/5 space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            
            <div className="text-center space-y-2">
              <Trophy className="h-12 w-12 text-yellow-500 mx-auto drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]" />
              <h2 className="text-3xl font-black text-white">Quiz Scorecard</h2>
              <p className="text-xs text-gray-400">Analysis finalized. Payout successfully disbursed.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
              <div className="bg-black/30 p-4 rounded-2xl border border-white/5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Knowledge Badge</span>
                <span className="text-md font-black text-pink-400 uppercase tracking-wide">{knowledgeLevel}</span>
              </div>
              <div className="bg-black/30 p-4 rounded-2xl border border-white/5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Correct Answers</span>
                <span className="text-2xl font-black text-white">{quizScore} / {quizQuestions.length}</span>
              </div>
            </div>

            {/* AI Relationship Recommendations Report */}
            <div className="p-5 bg-purple-500/5 border border-purple-500/10 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                <Brain className="h-4 w-4" /> Actionable Relationship Report
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                {reportFeedback}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
              <Button
                onClick={() => setGameState("MENU")}
                variant="outline"
                className="flex-1 border-white/10 hover:bg-white/5 text-white font-bold py-4 rounded-xl"
              >
                Back to PlayLab Menu
              </Button>
              <Button
                onClick={generateQuiz}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-md hover:scale-[1.01] transition-transform"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Play Again
              </Button>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
