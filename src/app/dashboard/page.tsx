"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, User, Heart, ShieldAlert, Loader2, Archive, ArchiveRestore, Globe, Smartphone } from "lucide-react"
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
  linked_user_id?: string | null
  handle?: string | null
}

function DashboardContent() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const searchParams = useSearchParams()
  const q = searchParams.get('q')

  const handleImportContacts = async () => {
    const contactsApi = typeof navigator !== "undefined" && (navigator as any).contacts;
    if (!contactsApi) {
      alert("📱 Native contact selection is only supported on mobile devices (Chrome/Edge on Android, Safari on iOS).\n\nIf you are on a computer, try opening this page on your phone's browser to import your contacts in one tap!");
      return;
    }

    try {
      // Prompt user to select contacts natively
      const props = ['name', 'tel', 'email'];
      const options = { multiple: true };
      
      const selectedContacts = await contactsApi.select(props, options);
      if (!selectedContacts || selectedContacts.length === 0) {
        return;
      }

      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Build database rows for selected contacts
      const peopleInserts = selectedContacts.map((c: any) => {
        const displayName = c.name?.[0] || c.tel?.[0] || "Imported Connection";
        const phone = c.tel?.[0] || null;
        const email = c.email?.[0] || null;

        return {
          user_id: user.id,
          name: displayName,
          relationship_type: "Imported",
          strength_score: 50,
          trust_score: 50,
          phone: phone,
          email: email,
          is_archived: false
        };
      });

      const { error } = await supabase
        .from('people')
        .insert(peopleInserts);

      if (error) throw error;

      if (typeof window !== "undefined") {
        localStorage.removeItem("lifeos_people_cache");
      }
      
      alert(`🎉 Successfully imported ${selectedContacts.length} contact(s) into your network!`);
      
      await fetchPeople();
    } catch (err) {
      console.error("Failed to import contacts:", err);
      alert("Failed to import contacts. Please ensure you have granted access permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load from cache first for instant rendering
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("lifeos_people_cache")
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          setPeople(parsed)
          setLoading(false)
        } catch (e) {
          console.error("Failed to parse cached people:", e)
        }
      }
    }
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
      let freshPeople = data || []

      // Load verified profiles map for handles
      const linkedUserIds = freshPeople.map(p => p.linked_user_id).filter(Boolean)
      const profileMap = new Map()
      if (linkedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, handle')
          .in('id', linkedUserIds)
        if (profiles) {
          profiles.forEach(pr => profileMap.set(pr.id, pr.handle))
        }
      }

      // Self-healing check: ensure all verified links have a corresponding person record
      const { data: verified } = await supabase
        .from('verified_links')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

      if (verified && verified.length > 0) {
        const linkedUserIdsInPeople = new Set(
          freshPeople
            .map(p => p.linked_user_id)
            .filter(Boolean)
        )

        const missingUserIds = verified
          .map(v => (v.user_a === user.id ? v.user_b : v.user_a))
          .filter(id => !linkedUserIdsInPeople.has(id))

        if (missingUserIds.length > 0) {
          // Fetch profiles for the missing users
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, handle, avatar_url')
            .in('id', missingUserIds)

          if (profiles && profiles.length > 0) {
            profiles.forEach(pr => profileMap.set(pr.id, pr.handle))

            const newPeopleInserts = profiles.map(profile => ({
              user_id: user.id,
              name: profile.handle ? `@${profile.handle}` : 'New Connection',
              photo: profile.avatar_url || null,
              linked_user_id: profile.id,
              relationship_type: 'Friend'
            }))

            const { data: insertedPeople } = await supabase
              .from('people')
              .insert(newPeopleInserts)
              .select()

            if (insertedPeople && insertedPeople.length > 0) {
              freshPeople = [...insertedPeople, ...freshPeople]
            }
          }
        }
      }

      // Map handles to final state
      freshPeople = freshPeople.map(p => ({
        ...p,
        handle: p.linked_user_id ? profileMap.get(p.linked_user_id) || null : null
      }))

      setPeople(freshPeople)
      if (typeof window !== "undefined") {
        localStorage.setItem("lifeos_people_cache", JSON.stringify(freshPeople))
      }
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
    
    const updated = people.map(p => p.id === personId ? { ...p, is_archived: newState } : p)
    setPeople(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem("lifeos_people_cache", JSON.stringify(updated))
    }
    
    try {
      await supabase
        .from('people')
        .update({ is_archived: newState })
        .eq('id', personId)
    } catch (err) {
      console.error("Failed to toggle archive state", err)
      // revert on failure
      const reverted = people.map(p => p.id === personId ? { ...p, is_archived: currentState } : p)
      setPeople(reverted)
      if (typeof window !== "undefined") {
        localStorage.setItem("lifeos_people_cache", JSON.stringify(reverted))
      }
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
        <div className="flex gap-2 flex-wrap justify-end">
          <Button 
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            className={`rounded-full ${showArchived ? "bg-red-500 hover:bg-red-600 text-white" : "border-white/10 text-gray-400 hover:text-white"}`}
          >
            <Archive className="mr-2 h-4 w-4" /> {showArchived ? "Viewing Archived" : "View Archived"}
          </Button>
          <Button 
            variant="outline"
            onClick={handleImportContacts}
            disabled={loading}
            className="rounded-full border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
          >
            <Smartphone className="mr-2 h-4 w-4 text-purple-400" /> Import Contacts
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
                <Card className={`hover:bg-white/5 transition-colors cursor-pointer group h-full ${person.linked_user_id ? 'border-purple-500/20 bg-purple-950/5 hover:bg-purple-950/10 shadow-[0_0_15px_rgba(168,85,247,0.05)]' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 border border-white/10 flex items-center justify-center overflow-hidden">
                          {person.photo ? (
                            <img src={person.photo} alt={person.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-lg font-bold text-primary">{person.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-1.5 flex-wrap">
                            {person.name}
                            {person.linked_user_id && person.handle && (
                              <span className="text-xs text-purple-400 font-normal">
                                (@{person.handle})
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 capitalize">
                              {person.relationship_type || "Connection"}
                            </span>
                            {person.linked_user_id && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5 font-semibold">
                                <Globe className="h-2.5 w-2.5 text-purple-400" /> Linked
                              </span>
                            )}
                          </div>
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
