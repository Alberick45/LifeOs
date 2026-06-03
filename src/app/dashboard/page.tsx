"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, User, Heart, ShieldAlert, Loader2, Archive, ArchiveRestore } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

type Person = {
  id: string
  name: string
  relationship_type: string
  strength_score: number
  trust_score: number
  photo: string | null
  is_archived: boolean
}

function DashboardContent() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const searchParams = useSearchParams()
  const q = searchParams.get('q')

  useEffect(() => {
    fetchPeople()
  }, [])

  const fetchPeople = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setPeople(data || [])
    } catch (error) {
      console.error("Error fetching people:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleArchive = async (e: React.MouseEvent, personId: string, currentState: boolean, personName: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const actionStr = currentState ? "unarchive" : "archive"
    if (!window.confirm(`Are you sure you want to ${actionStr} ${personName}?`)) {
      return
    }

    const newState = !currentState
    
    setPeople(people.map(p => p.id === personId ? { ...p, is_archived: newState } : p))
    
    try {
      await supabase
        .from('people')
        .update({ is_archived: newState })
        .eq('id', personId)
    } catch (err) {
      console.error("Failed to toggle archive state", err)
      // revert on failure
      setPeople(people.map(p => p.id === personId ? { ...p, is_archived: currentState } : p))
    }
  }

  const filteredPeople = people.filter(p => {
    if (showArchived ? !p.is_archived : p.is_archived) return false
    
    if (!q) return true
    const s = q.toLowerCase()
    return (p.name?.toLowerCase() || "").includes(s) || (p.relationship_type?.toLowerCase() || "").includes(s)
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Network</h1>
          <p className="text-gray-400 mt-1">Manage and nurture your relationships.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            className={`rounded-full ${showArchived ? "bg-red-500 hover:bg-red-600 text-white" : "border-white/10 text-gray-400 hover:text-white"}`}
          >
            <Archive className="mr-2 h-4 w-4" /> {showArchived ? "Viewing Archived" : "View Archived"}
          </Button>
          <Link href="/dashboard/add">
            <Button className="rounded-full shadow-[0_0_15px_rgba(139,92,246,0.5)]">
              <Plus className="mr-2 h-4 w-4" /> Add Person
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl glass-panel animate-pulse bg-white/5" />
          ))}
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center glass-panel rounded-xl border-dashed border-2 border-white/10">
          <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-gray-400">
            <User className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-medium mb-2">No people found</h3>
          <p className="text-gray-400 mb-6 max-w-sm">
            {q ? `No one matched your search for "${q}".` : "Start building your relationship intelligence network by adding your first connection."}
          </p>
          {!q && (
            <Link href="/dashboard/add">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Your First Connection
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPeople.map((person, i) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={`/dashboard/person/${person.id}`} className="block h-full">
                <Card className="hover:bg-white/5 transition-colors cursor-pointer group h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 border border-white/10 flex items-center justify-center overflow-hidden">
                          {person.photo ? (
                            <img src={person.photo} alt={person.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-lg font-bold text-primary">{person.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{person.name}</h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300 capitalize">
                            {person.relationship_type || "Connection"}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => toggleArchive(e, person.id, person.is_archived, person.name)}
                        className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${person.is_archived ? 'text-red-400 hover:text-red-300' : 'text-gray-500 hover:text-white'}`}
                        title={person.is_archived ? "Unarchive" : "Archive"}
                      >
                        {person.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-6 border-t border-white/10 pt-4">
                      <div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                          <Heart className="h-3 w-3 text-rose-400" /> Strength
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                          <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${person.strength_score}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                          <ShieldAlert className="h-3 w-3 text-emerald-400" /> Trust
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${person.trust_score}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  )
}
