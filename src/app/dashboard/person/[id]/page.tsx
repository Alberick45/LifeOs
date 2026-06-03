"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, MessageCircle, Heart, ShieldAlert, Phone, Coffee, Gift, MessageSquare, Edit, X } from "lucide-react"
import Link from "next/link"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"

type Person = {
  id: string
  name: string
  relationship_type: string
  birthday: string | null
  strength_score: number
  trust_score: number
  photo: string | null
}

type Interaction = {
  id: string
  type: string
  notes: string
  sentiment: string
  interaction_date: string
}

const TYPE_ICONS: Record<string, any> = {
  call: Phone,
  meet: Coffee,
  gift: Gift,
  text: MessageSquare,
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "text-emerald-400 bg-emerald-400/10",
  neutral: "text-blue-400 bg-blue-400/10",
  negative: "text-rose-400 bg-rose-400/10",
}

export default function PersonProfilePage() {
  const params = useParams()
  const router = useRouter()
  const personId = params.id as string

  const [person, setPerson] = useState<Person | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [isLogging, setIsLogging] = useState(false)
  const [type, setType] = useState('meet')
  const [notes, setNotes] = useState('')
  // Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<{name: string, relationship_type: string, birthday: string, photo: string}>({
    name: '', relationship_type: '', birthday: '', photo: ''
  })
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    fetchData()
  }, [personId])

  const fetchData = async () => {
    try {
      // Fetch Person
      const { data: pData, error: pError } = await supabase
        .from('people')
        .select('*')
        .eq('id', personId)
        .single()
      
      if (pError) throw pError
      setPerson(pData)
      setEditData({
        name: pData.name || '',
        relationship_type: pData.relationship_type || '',
        birthday: pData.birthday || '',
        photo: pData.photo || ''
      })

      // Fetch Interactions
      const { data: iData, error: iError } = await supabase
        .from('interactions')
        .select('*')
        .eq('person_id', personId)
        .order('interaction_date', { ascending: false })

      if (iError) throw iError
      setInteractions(iData || [])

    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const logInteraction = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLogging(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Insert Interaction
      const newInteraction = {
        user_id: user.id,
        person_id: personId,
        type,
        notes,
        sentiment,
        interaction_date: new Date().toISOString()
      }

      const { data: inserted, error: iError } = await supabase
        .from('interactions')
        .insert([newInteraction])
        .select()
        .single()

      if (iError) throw iError

      // 2. Adjust scores (+5 for positive, -2 for negative, etc)
      let strengthBump = 0
      let trustBump = 0

      if (sentiment === 'positive') {
        strengthBump = 5
        trustBump = 2
      } else if (sentiment === 'negative') {
        strengthBump = -2
        trustBump = -5
      } else {
        strengthBump = 1
      }

      if (person) {
        const newStrength = Math.min(100, Math.max(0, person.strength_score + strengthBump))
        const newTrust = Math.min(100, Math.max(0, person.trust_score + trustBump))

        const { error: pError } = await supabase
          .from('people')
          .update({ strength_score: newStrength, trust_score: newTrust })
          .eq('id', personId)

        if (!pError) {
          setPerson({ ...person, strength_score: newStrength, trust_score: newTrust })
        }
      }

      setInteractions([inserted, ...interactions])
      setNotes('')
    } catch (error) {
      console.error("Error logging interaction:", error)
    } finally {
      setIsLogging(false)
    }
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEdit(true)
    try {
      const { error } = await supabase
        .from('people')
        .update({
          name: editData.name,
          relationship_type: editData.relationship_type,
          birthday: editData.birthday || null,
          photo: editData.photo || null
        })
        .eq('id', personId)

      if (error) throw error
      
      setPerson(prev => prev ? { ...prev, ...editData } : null)
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving person:", error)
      alert("Failed to save changes.")
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading) return <div className="animate-pulse h-64 glass-panel rounded-xl" />
  if (!person) return <div>Person not found.</div>

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/10 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {person.photo ? (
              <img src={person.photo} alt={person.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">{person.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{person.name}</h1>
              <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Edit Profile">
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-400 capitalize">{person.relationship_type || "Connection"}</span>
              {person.birthday && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-sm text-gray-400">Birthday: {new Date(person.birthday).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Stats & Logging */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Heart className="h-4 w-4 text-rose-400" /> Relationship Health</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Strength</span>
                  <span className="font-medium text-rose-400">{person.strength_score}/100</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div className="bg-rose-500 h-2 rounded-full transition-all duration-500" style={{ width: `${person.strength_score}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Trust</span>
                  <span className="font-medium text-emerald-400">{person.trust_score}/100</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${person.trust_score}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Log Interaction</h3>
            <form onSubmit={logInteraction} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {['meet', 'call', 'text', 'gift'].map((t) => {
                  const Icon = TYPE_ICONS[t] || MessageCircle
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm capitalize transition-colors ${type === t ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                      <Icon className="h-4 w-4" /> {t}
                    </button>
                  )
                })}
              </div>
              
              <div className="flex gap-2">
                {['positive', 'neutral', 'negative'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSentiment(s)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium capitalize border transition-colors ${sentiment === s ? SENTIMENT_COLORS[s] + ' border-transparent' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <textarea 
                placeholder="What happened? (e.g. Had coffee, talked about their new job...)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm min-h-[100px] text-white focus:outline-none focus:border-primary/50 transition-colors"
              />

              <Button type="submit" disabled={isLogging} className="w-full">
                {isLogging ? "Saving..." : "Save Memory"}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-xl min-h-[500px]">
            <h3 className="font-semibold mb-6 text-xl">Interaction Timeline</h3>
            
            {interactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <MessageCircle className="h-12 w-12 mb-4 opacity-20" />
                <p>No interactions logged yet.</p>
                <p className="text-sm mt-1">Log your first memory on the left!</p>
              </div>
            ) : (
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                {interactions.map((interaction, idx) => {
                  const Icon = TYPE_ICONS[interaction.type] || MessageCircle
                  const colorClass = SENTIMENT_COLORS[interaction.sentiment] || "text-gray-400 bg-white/10"
                  
                  return (
                    <div key={interaction.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-black bg-zinc-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl glass-panel border border-white/5 group-hover:border-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold capitalize text-white">{interaction.type}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(interaction.interaction_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{interaction.notes}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Edit Modal using Portal */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isEditing && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditing(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-md bg-zinc-950 border border-white/10 shadow-2xl rounded-2xl flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Edit Profile</h2>
                  <button onClick={() => setIsEditing(false)} className="p-2 rounded-full hover:bg-white/10">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={saveEdit} className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Name</label>
                    <input 
                      type="text" 
                      value={editData.name}
                      onChange={e => setEditData({...editData, name: e.target.value})}
                      required
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Relationship Type</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Friend, Coworker, Brother"
                      value={editData.relationship_type}
                      onChange={e => setEditData({...editData, relationship_type: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Birthday</label>
                    <input 
                      type="date" 
                      value={editData.birthday}
                      onChange={e => setEditData({...editData, birthday: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Photo URL</label>
                    <input 
                      type="url" 
                      placeholder="https://..."
                      value={editData.photo}
                      onChange={e => setEditData({...editData, photo: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingEdit} className="flex-1">
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
