"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Trash2, Edit2, ShieldAlert, Sparkles, AlertTriangle, Plus, Database, Cpu, HelpCircle, Check, Loader2, Save } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

type TabType = "FLAGGED" | "ADD" | "AI_GEN" | "STATS"

interface WordItem {
  id: string
  game_id: string
  word: string
  category: string
  hint: string | null
  difficulty: string | null
  flagged_count: number
  flagged_reason: string[]
  status: string
  created_at: string
}

export default function PlayLabDeveloperPage() {
  const [activeTab, setActiveTab] = useState<TabType>("FLAGGED")
  const [flaggedWords, setFlaggedWords] = useState<WordItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [alertMsg, setAlertMsg] = useState<{ text: string; success: boolean } | null>(null)

  // Manual Add Form State
  const [manualGameId, setManualGameId] = useState("reverse_hangman")
  const [manualWord, setManualWord] = useState("")
  const [manualCategory, setManualCategory] = useState("")
  const [manualHint, setManualHint] = useState("")
  const [manualDifficulty, setManualDifficulty] = useState("Normal")

  // AI Gen Form State
  const [aiGameId, setAiGameId] = useState("reverse_hangman")
  const [aiCategory, setAiCategory] = useState("")
  const [aiDifficulty, setAiDifficulty] = useState("Normal")
  const [aiCount, setAiCount] = useState(10)
  const [aiResults, setAiResults] = useState<Partial<WordItem>[]>([])
  const [aiFallback, setAiFallback] = useState(false)

  // Stats
  const [totalWords, setTotalWords] = useState(0)
  const [totalFlagged, setTotalFlagged] = useState(0)

  // Inline Editing State
  const [editingWord, setEditingWord] = useState<WordItem | null>(null)

  const triggerAlert = (text: string, success = true) => {
    setAlertMsg({ text, success })
    setTimeout(() => setAlertMsg(null), 3000)
  }

  // Load stats and flagged words
  const loadStatsAndFlagged = async () => {
    setLoading(true)
    try {
      // 1. Fetch total counts from Supabase
      const { data: dbData, error: dbError } = await supabase
        .from("playlab_words")
        .select("*")
      
      if (dbError) {
        // Use localStorage fallback if table doesn't exist
        const local = localStorage.getItem("local_playlab_words")
        const parsed: WordItem[] = local ? JSON.parse(local) : []
        setTotalWords(parsed.length)
        const flagged = parsed.filter(w => w.flagged_count > 0)
        setTotalFlagged(flagged.length)
        setFlaggedWords(flagged.sort((a, b) => b.flagged_count - a.flagged_count))
      } else {
        const words: WordItem[] = dbData || []
        setTotalWords(words.length)
        const flagged = words.filter(w => w.flagged_count > 0)
        setTotalFlagged(flagged.length)
        setFlaggedWords(flagged.sort((a, b) => b.flagged_count - a.flagged_count))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatsAndFlagged()
  }, [])

  // Action: Clear Flags / Approve
  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("playlab_words")
        .update({ flagged_count: 0, flagged_reason: [], status: "approved" })
        .eq("id", id)

      if (error) {
        // Fallback to local storage
        const local = localStorage.getItem("local_playlab_words")
        if (local) {
          const parsed: WordItem[] = JSON.parse(local)
          const updated = parsed.map(w => w.id === id ? { ...w, flagged_count: 0, flagged_reason: [], status: "approved" } : w)
          localStorage.setItem("local_playlab_words", JSON.stringify(updated))
        }
      }
      triggerAlert("Clue cleared and approved successfully!")
      loadStatsAndFlagged()
    } catch (err) {
      triggerAlert("Failed to approve clue.", false)
    }
  }

  // Action: Delete Word
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("playlab_words")
        .delete()
        .eq("id", id)

      if (error) {
        // Fallback to local storage
        const local = localStorage.getItem("local_playlab_words")
        if (local) {
          const parsed: WordItem[] = JSON.parse(local)
          const updated = parsed.filter(w => w.id !== id)
          localStorage.setItem("local_playlab_words", JSON.stringify(updated))
        }
      }
      triggerAlert("Clue deleted successfully!")
      loadStatsAndFlagged()
    } catch (err) {
      triggerAlert("Failed to delete clue.", false)
    }
  }

  // Action: Save Edited Clue
  const handleSaveEdit = async () => {
    if (!editingWord) return
    try {
      const { error } = await supabase
        .from("playlab_words")
        .update({
          word: editingWord.word.toUpperCase().replace(/[^A-Z]/g, ""),
          category: editingWord.category,
          hint: editingWord.hint,
          difficulty: editingWord.difficulty,
          flagged_count: 0,
          flagged_reason: [],
          status: "approved"
        })
        .eq("id", editingWord.id)

      if (error) {
        // Fallback to local storage
        const local = localStorage.getItem("local_playlab_words")
        if (local) {
          const parsed: WordItem[] = JSON.parse(local)
          const updated = parsed.map(w => w.id === editingWord.id ? {
            ...w,
            word: editingWord.word.toUpperCase().replace(/[^A-Z]/g, ""),
            category: editingWord.category,
            hint: editingWord.hint,
            difficulty: editingWord.difficulty,
            flagged_count: 0,
            flagged_reason: [],
            status: "approved"
          } : w)
          localStorage.setItem("local_playlab_words", JSON.stringify(updated))
        }
      }
      setEditingWord(null)
      triggerAlert("Clue edited and approved successfully!")
      loadStatsAndFlagged()
    } catch (err) {
      triggerAlert("Failed to save edits.", false)
    }
  }

  // Action: Submit manual word
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualWord.trim() || !manualCategory.trim()) {
      triggerAlert("Please enter word and category", false)
      return
    }
    setSubmitting(true)
    const newWord = {
      game_id: manualGameId,
      word: manualWord.trim().toUpperCase().replace(/[^A-Z]/g, ""),
      category: manualCategory.trim(),
      hint: manualGameId === "reverse_hangman" ? manualHint.trim() : "",
      difficulty: manualGameId === "reverse_hangman" ? manualDifficulty : null,
      flagged_count: 0,
      flagged_reason: [],
      status: "approved"
    }

    try {
      const { error } = await supabase
        .from("playlab_words")
        .insert([newWord])

      if (error) {
        // Fallback local storage
        const local = localStorage.getItem("local_playlab_words")
        const parsed: WordItem[] = local ? JSON.parse(local) : []
        const created: WordItem = {
          id: Math.random().toString(36).substring(2, 9),
          ...newWord,
          created_at: new Date().toISOString()
        }
        localStorage.setItem("local_playlab_words", JSON.stringify([...parsed, created]))
      }
      setManualWord("")
      setManualCategory("")
      setManualHint("")
      triggerAlert("Word added to catalog successfully!")
      loadStatsAndFlagged()
    } catch (err) {
      triggerAlert("Error saving word.", false)
    } finally {
      setSubmitting(false)
    }
  }

  // Action: Generate via Gemini API
  const handleGenerateAI = async () => {
    setSubmitting(true)
    setAiResults([])
    try {
      const res = await fetch("/api/playlab/generate-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: aiGameId,
          category: aiCategory || undefined,
          difficulty: aiDifficulty,
          count: aiCount
        })
      })

      if (!res.ok) throw new Error("API failed")
      const data = await res.json()
      if (data.success && data.words) {
        setAiResults(data.words)
        setAiFallback(data.fallback || false)
        if (data.fallback) {
          triggerAlert("Generated using local fallback library (API offline/no-key).", true)
        } else {
          triggerAlert("Successfully generated words using Gemini 2.5 AI!")
        }
      } else {
        throw new Error(data.error || "Generation error")
      }
    } catch (err: any) {
      triggerAlert(err.message || "Failed to call Gemini API.", false)
    } finally {
      setSubmitting(false)
    }
  }

  // Action: Save AI suggestions to DB
  const handleSaveAISuggestions = async () => {
    if (aiResults.length === 0) return
    setSubmitting(true)
    let savedCount = 0
    try {
      for (const item of aiResults) {
        const toSave = {
          game_id: aiGameId,
          word: String(item.word).toUpperCase().replace(/[^A-Z]/g, ""),
          category: item.category || "General",
          hint: item.hint || "",
          difficulty: aiGameId === "reverse_hangman" ? (item.difficulty || "Normal") : null,
          flagged_count: 0,
          flagged_reason: [],
          status: "approved"
        }

        const { error } = await supabase
          .from("playlab_words")
          .insert([toSave])

        if (error) {
          // Fallback to local storage
          const local = localStorage.getItem("local_playlab_words")
          const parsed: WordItem[] = local ? JSON.parse(local) : []
          const created: WordItem = {
            id: Math.random().toString(36).substring(2, 9),
            ...toSave,
            created_at: new Date().toISOString()
          }
          localStorage.setItem("local_playlab_words", JSON.stringify([...parsed, created]))
        }
        savedCount++
      }
      triggerAlert(`Successfully added ${savedCount} words to the catalog!`)
      setAiResults([])
      loadStatsAndFlagged()
    } catch (err) {
      triggerAlert("Error saving AI words.", false)
    } finally {
      setSubmitting(false)
    }
  }

  // Seed default database words
  const handleSeedDefaults = async () => {
    setSubmitting(true)
    const defaults = [
      // Beginner
      { game_id: "reverse_hangman", word: "REACT", category: "Technology", hint: "A popular front-end UI framework.", difficulty: "Beginner" },
      { game_id: "reverse_hangman", word: "APPLE", category: "Food", hint: "A red or green crunchy fruit.", difficulty: "Beginner" },
      { game_id: "reverse_hangman", word: "COFFEE", category: "Drink", hint: "Morning energy beverage.", difficulty: "Beginner" },
      { game_id: "reverse_hangman", word: "GUITAR", category: "Music", hint: "Six-string acoustic instrument.", difficulty: "Beginner" },
      { game_id: "reverse_hangman", word: "DOCTOR", category: "Profession", hint: "Treats patients and writes prescriptions.", difficulty: "Beginner" },
      // Normal
      { game_id: "reverse_hangman", word: "DATABASE", category: "Technology", hint: "Stores structures of relationship tables.", difficulty: "Normal" },
      { game_id: "reverse_hangman", word: "VOLCANO", category: "Nature", hint: "Erupts with magma and volcanic ash.", difficulty: "Normal" },
      { game_id: "reverse_hangman", word: "ASTRONAUT", category: "Science", hint: "Travels beyond Earth's atmosphere.", difficulty: "Normal" },
      { game_id: "reverse_hangman", word: "SUBMARINE", category: "Vehicle", hint: "Operates deep under the ocean surface.", difficulty: "Normal" },
      // Expert
      { game_id: "reverse_hangman", word: "ALGORITHM", category: "Mathematics", hint: "Set of rules to solve code problems.", difficulty: "Expert" },
      { game_id: "reverse_hangman", word: "VAPORIZATION", category: "Science", hint: "Phase transition from liquid to gas.", difficulty: "Expert" },
      { game_id: "reverse_hangman", word: "DECOMPRESSION", category: "Physics", hint: "Reduction in ambient pressure on container.", difficulty: "Expert" },
      { game_id: "reverse_hangman", word: "PHOTOSYNTHESIS", category: "Biology", hint: "How green plants make food from sunlight.", difficulty: "Expert" }
    ]

    try {
      let seeded = 0
      for (const item of defaults) {
        const row = { ...item, flagged_count: 0, flagged_reason: [], status: "approved" }
        const { error } = await supabase.from("playlab_words").insert([row])
        if (error) {
          const local = localStorage.getItem("local_playlab_words")
          const parsed = local ? JSON.parse(local) : []
          if (!parsed.some((w: any) => w.word === row.word)) {
            parsed.push({ id: Math.random().toString(36).substring(2, 9), ...row, created_at: new Date().toISOString() })
            localStorage.setItem("local_playlab_words", JSON.stringify(parsed))
          }
        }
        seeded++
      }
      triggerAlert(`Seeded ${seeded} default words successfully!`)
      loadStatsAndFlagged()
    } catch (err) {
      triggerAlert("Error seeding.", false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Alert Banner */}
      {alertMsg && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${alertMsg.success ? "bg-green-500/10 border-green-500 text-green-400" : "bg-red-500/10 border-red-500 text-red-400"}`}>
          <Check className="h-4 w-4 shrink-0" />
          <span className="text-xs font-bold">{alertMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/playlab" className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all">
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </Link>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-primary">PlayLab Suite</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Developer & Catalog Dashboard <span className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono">ADMIN</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-white/5 gap-2 overflow-x-auto pb-px scrollbar-none">
        {(["FLAGGED", "ADD", "AI_GEN", "STATS"] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setEditingWord(null); }}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 select-none
              ${activeTab === tab
                ? "border-primary text-white bg-white/[0.02]"
                : "border-transparent text-gray-400 hover:text-white hover:bg-white/[0.01]"
              }`}
          >
            {tab === "FLAGGED" && `Flagged Clues (${flaggedWords.length})`}
            {tab === "ADD" && "Submit Word Manually"}
            {tab === "AI_GEN" && "🤖 Gemini AI Word Generator"}
            {tab === "STATS" && "Database Statistics"}
          </button>
        ))}
      </div>

      {/* Contents */}
      
      {/* ── FLAGGED CLUES TAB ─────────────────────────────────────────────────── */}
      {activeTab === "FLAGGED" && (
        <div className="space-y-4">
          <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-yellow-400">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="text-base font-bold">Reported & Flagged Clues</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              When a player flags a clue in-game (due to typos, bad hints, or mismatched categories), it shows up here. Review them to edit and approve, or delete them entirely.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500 gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-xs font-bold">Loading flagged clues catalog...</span>
            </div>
          ) : flaggedWords.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center space-y-3">
              <Check className="h-8 w-8 text-green-400 mx-auto" />
              <h4 className="text-sm font-bold">All Clues Clean!</h4>
              <p className="text-xs text-gray-400">No flags reported by users. The word catalog is in perfect health.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flaggedWords.map(word => {
                const isEditing = editingWord?.id === word.id
                return (
                  <div key={word.id} className="glass-panel p-5 rounded-2xl border border-red-500/10 bg-gradient-to-r from-red-950/5 via-black to-zinc-950/20 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    
                    {/* Display info / edit fields */}
                    <div className="flex-1 space-y-3 min-w-0 w-full">
                      {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Word</label>
                            <input
                              type="text"
                              value={editingWord.word}
                              onChange={e => setEditingWord({ ...editingWord, word: e.target.value })}
                              className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
                            <input
                              type="text"
                              value={editingWord.category}
                              onChange={e => setEditingWord({ ...editingWord, category: e.target.value })}
                              className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          {word.game_id === "reverse_hangman" && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Difficulty</label>
                              <select
                                value={editingWord.difficulty || "Normal"}
                                onChange={e => setEditingWord({ ...editingWord, difficulty: e.target.value })}
                                className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                              >
                                <option value="Beginner">Beginner</option>
                                <option value="Normal">Normal</option>
                                <option value="Expert">Expert</option>
                              </select>
                            </div>
                          )}
                          <div className="sm:col-span-3 space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Hint / Clue</label>
                            <input
                              type="text"
                              value={editingWord.hint || ""}
                              onChange={e => setEditingWord({ ...editingWord, hint: e.target.value })}
                              className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black tracking-wider text-white">{word.word}</span>
                            <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-gray-400 text-[9px] uppercase font-bold rounded">
                              {word.game_id.replace("_", " ")}
                            </span>
                            <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[9px] uppercase font-bold rounded">
                              Category: {word.category}
                            </span>
                            {word.difficulty && (
                              <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase font-bold rounded">
                                {word.difficulty}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black rounded-full animate-pulse">
                              🚩 {word.flagged_count} Flags
                            </span>
                          </div>
                          {word.hint && (
                            <p className="text-xs text-gray-300 font-semibold bg-black/30 p-2.5 rounded-xl border border-white/5">
                              <span className="text-[9px] text-gray-500 block uppercase font-bold mb-0.5">Reported Clue:</span>
                              {word.hint}
                            </p>
                          )}
                          {word.flagged_reason.length > 0 && (
                            <div className="text-[10px] text-gray-400 italic">
                              <span className="font-bold text-red-400/80">Reasons:</span> {word.flagged_reason.join(" • ")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action controls */}
                    <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 border-white/5 pt-2.5 md:pt-0">
                      {isEditing ? (
                        <>
                          <Button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs h-9 gap-1 rounded-xl">
                            <Save className="h-3.5 w-3.5" /> Save & Approve
                          </Button>
                          <Button onClick={() => setEditingWord(null)} variant="ghost" className="text-gray-400 hover:text-white border border-white/10 text-xs h-9 rounded-xl">
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => handleApprove(word.id)} className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-bold text-xs h-9 gap-1 rounded-xl">
                            <Check className="h-3.5 w-3.5" /> Clear Flags (Approve)
                          </Button>
                          <Button onClick={() => setEditingWord(word)} variant="outline" className="border-white/10 hover:bg-white/5 text-gray-300 font-bold text-xs h-9 gap-1 rounded-xl">
                            <Edit2 className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button onClick={() => handleDelete(word.id)} variant="outline" className="border-red-500/20 hover:bg-red-500/10 text-red-400 font-bold text-xs h-9 gap-1 rounded-xl">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </>
                      )}
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SUBMIT MANUAL WORD TAB ────────────────────────────────────────────── */}
      {activeTab === "ADD" && (
        <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6">
          <div className="space-y-1.5 border-b border-white/5 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <Plus className="h-5 w-5 text-primary" /> Add Word to catalog
            </h3>
            <p className="text-xs text-gray-400">Submit new custom words and hints. They will be immediately available in the active word pool.</p>
          </div>

          <form onSubmit={handleAddManual} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Game Selection</label>
                <select
                  value={manualGameId}
                  onChange={e => setManualGameId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary"
                >
                  <option value="reverse_hangman">Reverse Hangman</option>
                  <option value="chaos_alphabet">Chaos Alphabet</option>
                </select>
              </div>

              {manualGameId === "reverse_hangman" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Difficulty</label>
                  <select
                    value={manualDifficulty}
                    onChange={e => setManualDifficulty(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary"
                  >
                    <option value="Beginner">Beginner (Simple words)</option>
                    <option value="Normal">Normal (Standard)</option>
                    <option value="Expert">Expert (Complex/Long)</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5 opacity-40">
                  <label className="text-xs font-bold text-gray-400 uppercase">Difficulty</label>
                  <select disabled className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5">
                    <option>Not applicable</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Word (Alphabet only)</label>
                <input
                  type="text"
                  placeholder="e.g. DATABASE"
                  value={manualWord}
                  onChange={e => setManualWord(e.target.value.replace(/[^A-Za-z]/g, ""))}
                  className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                <input
                  type="text"
                  placeholder={manualGameId === "chaos_alphabet" ? "e.g. country, animal, food..." : "e.g. Science, Politics"}
                  value={manualCategory}
                  onChange={e => setManualCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {manualGameId === "reverse_hangman" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Hint / Clue</label>
                <input
                  type="text"
                  placeholder="Provide a clear, engaging hint for this word..."
                  value={manualHint}
                  onChange={e => setManualHint(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary"
                />
              </div>
            )}

            <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/95 text-white font-extrabold px-6 py-4 h-auto rounded-xl">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Save Word
            </Button>
          </form>
        </div>
      )}

      {/* ── AI WORD GENERATOR TAB ─────────────────────────────────────────────── */}
      {activeTab === "AI_GEN" && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-base font-bold">Secure Gemini AI Words Batch Builder</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Auto-generate lists of high-quality words, categories, and matching clues using **Gemini 2.5 Flash** (via server-side secure API). Preview suggestions, modify items, and batch-save them to the live catalog in one click.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Select Game</label>
                <select
                  value={aiGameId}
                  onChange={e => setAiGameId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-xl px-2.5 py-2"
                >
                  <option value="reverse_hangman">Reverse Hangman</option>
                  <option value="chaos_alphabet">Chaos Alphabet</option>
                </select>
              </div>

              {aiGameId === "reverse_hangman" ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Difficulty</label>
                  <select
                    value={aiDifficulty}
                    onChange={e => setAiDifficulty(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-xl px-2.5 py-2"
                  >
                    <option value="Beginner">Beginner (Short words)</option>
                    <option value="Normal">Normal (Medium words)</option>
                    <option value="Expert">Expert (Long/Rare words)</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5 opacity-40">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Difficulty</label>
                  <select disabled className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-xl px-2.5 py-2">
                    <option>Not applicable</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Category filter (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Science, Food, planet"
                  value={aiCategory}
                  onChange={e => setAiCategory(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Batch Count</label>
                <select
                  value={aiCount}
                  onChange={e => setAiCount(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-xl px-2.5 py-2"
                >
                  <option value="5">5 Words</option>
                  <option value="10">10 Words</option>
                  <option value="15">15 Words</option>
                  <option value="20">20 Words</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={handleGenerateAI} disabled={submitting} className="bg-purple-600 hover:bg-purple-500 text-white font-black px-6 py-4 h-auto rounded-xl gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 fill-current animate-pulse" /> Generate suggestions
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Generated Previews */}
          {aiResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-2xl">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    Suggested Batch ({aiResults.length} words generated)
                  </h4>
                  <p className="text-[10px] text-gray-400">Review generated values below before committing them to the live catalog.</p>
                </div>
                <Button onClick={handleSaveAISuggestions} disabled={submitting} className="bg-green-600 hover:bg-green-500 text-white font-extrabold px-5 py-3.5 h-auto text-xs rounded-xl gap-1.5">
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Approve & Save All
                </Button>
              </div>

              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {aiResults.map((item, idx) => (
                  <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-xl text-xs space-y-2">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white text-sm tracking-widest">{item.word}</span>
                        <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] uppercase font-bold rounded">
                          {item.category}
                        </span>
                        {item.difficulty && (
                          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase font-bold rounded">
                            {item.difficulty}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setAiResults(prev => prev.filter((_, i) => i !== idx))}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                    {item.hint && (
                      <p className="text-gray-300 italic bg-black/20 p-2.5 rounded-lg border border-white/5 font-medium">
                        {item.hint}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DATABASE STATISTICS TAB ───────────────────────────────────────────── */}
      {activeTab === "STATS" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Database className="h-5 w-5" />
              <h3 className="text-base font-bold">Catalog Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Total Words in DB</span>
                <span className="font-bold text-white text-sm">{totalWords}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Flagged Clues Pending</span>
                <span className="font-bold text-red-400 text-sm">{totalFlagged}</span>
              </div>
              <div className="h-px bg-white/5 my-2" />
              <p className="text-[10px] text-gray-500 leading-relaxed leading-relaxed">
                If the database is clean or hasn&apos;t been configured yet, you can seed standard default clues into the system to guarantee a smooth start.
              </p>
              <Button onClick={handleSeedDefaults} disabled={submitting} variant="outline" className="w-full border-white/10 hover:bg-white/5 text-gray-300 font-bold text-xs h-10 rounded-xl">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Database className="h-3.5 w-3.5 mr-1" />} Seed Default Clues
              </Button>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 text-purple-400">
              <Cpu className="h-5 w-5" />
              <h3 className="text-base font-bold">Self-Healing Sync Mode</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              PlayLab word engine operates on a hybrid architecture. It fetches approved community words from the shared database. If a database connection error occurs or the `playlab_words` table is not set up on your Supabase dashboard yet, it dynamically uses `localStorage` to save, flag, and retrieve customized words without interrupting the game.
            </p>
            <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl flex items-start gap-2.5">
              <HelpCircle className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">How to connect to everyone?</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Run the SQL migration script located at the bottom of the `supabase/schema.sql` file in your Supabase SQL Editor. Once the table `playlab_words` is active on Supabase, the catalog becomes shared and synchronized for all online players!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
