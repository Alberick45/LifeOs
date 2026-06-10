"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, User, Heart, ShieldAlert, Loader2, Archive, ArchiveRestore, Globe, Smartphone, X, Check, Trash2, ArrowRight } from "lucide-react"
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
  status?: string | null
  phone?: string | null
  email?: string | null
}

const parseRelationshipFromName = (name: string): string => {
  const lower = name.toLowerCase();
  
  const familyKeywords = [
    "aunt", "auntie", "uncle", "brother", "sister", "cousin", 
    "mom", "dad", "mother", "father", "son", "daughter",
    "grandma", "grandpa", "grandmother", "grandfather", "nephew", "niece"
  ];
  if (familyKeywords.some(kw => lower.includes(kw))) {
    return "Family";
  }
  
  const closeFriendKeywords = ["close friend", "best friend", "bff"];
  if (closeFriendKeywords.some(kw => lower.includes(kw))) {
    return "Close Friend";
  }
  
  const classmateKeywords = ["classmate", "school", "college", "uni", "university", "peer", "study", "student"];
  if (classmateKeywords.some(kw => lower.includes(kw))) {
    return "Classmate";
  }
  
  const friendKeywords = ["friend", "buddy", "pal"];
  if (friendKeywords.some(kw => lower.includes(kw))) {
    return "Friend";
  }
  
  return "Imported";
};

function DashboardContent() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const searchParams = useSearchParams()
  const q = searchParams.get('q')

  // Review Queue States
  const [reviewQueue, setReviewQueue] = useState<Person[]>([])
  const [currentReviewIndex, setCurrentReviewIndex] = useState<number>(0)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [reviewEditData, setReviewEditData] = useState({ name: '', relationship_type: '' })
  const [reviewPhones, setReviewPhones] = useState<any[]>([])

  const fetchReviewPhones = async (personId: string) => {
    try {
      const { data, error } = await supabase
        .from('person_phones')
        .select('*')
        .eq('person_id', personId)
      if (error) throw error
      setReviewPhones(data || [])
    } catch (e) {
      console.error("Error fetching review phones:", e)
    }
  }

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
        const parsedRel = parseRelationshipFromName(displayName);

        return {
          user_id: user.id,
          name: displayName,
          relationship_type: parsedRel,
          strength_score: 0,
          trust_score: 0,
          phone: phone,
          email: email,
          is_archived: false,
          status: 'pending_verification'
        };
      });

      const { data: insertedPeople, error } = await supabase
        .from('people')
        .insert(peopleInserts)
        .select('id, name');

      if (error) throw error;

      // Now insert all phone lines into person_phones
      if (insertedPeople && insertedPeople.length > 0) {
        const phoneInserts: any[] = [];
        insertedPeople.forEach((person: any, index: number) => {
          const originalContact = selectedContacts[index];
          if (originalContact && originalContact.tel && originalContact.tel.length > 0) {
            originalContact.tel.forEach((t: string, telIndex: number) => {
              phoneInserts.push({
                person_id: person.id,
                phone: t,
                label: telIndex === 0 ? 'Primary' : 'Secondary'
              });
            });
          }
        });

        if (phoneInserts.length > 0) {
          const { error: phoneErr } = await supabase
            .from('person_phones')
            .insert(phoneInserts);
          if (phoneErr) console.error("Error inserting phones:", phoneErr);
        }
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("lifeos_people_cache");
      }

      alert(`🎉 Successfully imported ${selectedContacts.length} contact(s) into your network pending verification!`);

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
          parsed.sort((a: any, b: any) => {
            const scoreA = (a.strength_score || 0) + (a.trust_score || 0);
            const scoreB = (b.strength_score || 0) + (b.trust_score || 0);
            return scoreB - scoreA;
          });
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

      // Sort by combined trust and strength score descending
      freshPeople.sort((a, b) => {
        const scoreA = (a.strength_score || 0) + (a.trust_score || 0);
        const scoreB = (b.strength_score || 0) + (b.trust_score || 0);
        return scoreB - scoreA;
      });

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

  const handleVerifyConfirm = async (personId: string) => {
    try {
      const { error } = await supabase
        .from('people')
        .update({
          name: reviewEditData.name,
          relationship_type: reviewEditData.relationship_type,
          status: null
        })
        .eq('id', personId)

      if (error) throw error

      if (typeof window !== "undefined") {
        localStorage.removeItem("lifeos_people_cache")
      }
      await fetchPeople()

      // Advance queue
      if (currentReviewIndex < reviewQueue.length - 1) {
        const nextIndex = currentReviewIndex + 1
        setCurrentReviewIndex(nextIndex)
        const nextPerson = reviewQueue[nextIndex]
        setReviewEditData({ name: nextPerson.name, relationship_type: nextPerson.relationship_type })
        fetchReviewPhones(nextPerson.id)
      } else {
        setIsReviewOpen(false)
      }
    } catch (e) {
      console.error("Error verifying contact:", e)
      alert("Failed to verify contact.")
    }
  }

  const handleVerifyReject = async (personId: string) => {
    try {
      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', personId)

      if (error) throw error

      if (typeof window !== "undefined") {
        localStorage.removeItem("lifeos_people_cache")
      }
      await fetchPeople()

      // Advance queue
      if (currentReviewIndex < reviewQueue.length - 1) {
        const nextIndex = currentReviewIndex + 1
        setCurrentReviewIndex(nextIndex)
        const nextPerson = reviewQueue[nextIndex]
        setReviewEditData({ name: nextPerson.name, relationship_type: nextPerson.relationship_type })
        fetchReviewPhones(nextPerson.id)
      } else {
        setIsReviewOpen(false)
      }
    } catch (e) {
      console.error("Error rejecting contact:", e)
      alert("Failed to reject contact.")
    }
  }

  const pendingVerificationPeople = people.filter(p => p.status === 'pending_verification')

  const filteredPeople = people.filter(p => {
    if (p.status === 'pending_verification') return false
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

      {pendingVerificationPeople.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-6 rounded-2xl bg-gradient-to-r from-purple-950/50 via-zinc-900/60 to-purple-900/40 border border-purple-500/25 backdrop-blur-xl shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
              <Smartphone className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Import Approval Queue</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                You have <span className="font-bold text-purple-400">{pendingVerificationPeople.length}</span> new contacts imported. Review and verify their relationships.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => {
              setReviewQueue(pendingVerificationPeople);
              setCurrentReviewIndex(0);
              setIsReviewOpen(true);
              const p = pendingVerificationPeople[0];
              setReviewEditData({ name: p.name, relationship_type: p.relationship_type });
              fetchReviewPhones(p.id);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-full shadow-[0_0_15px_rgba(139,92,246,0.4)] px-6 shrink-0 w-full sm:w-auto"
          >
            Review Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      )}

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

      {/* Review Queue Modal */}
      {isReviewOpen && reviewQueue.length > 0 && reviewQueue[currentReviewIndex] && (() => {
        const currentPerson = reviewQueue[currentReviewIndex];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg overflow-hidden glass-panel border border-white/10 rounded-2xl shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Verify Import <span className="text-sm px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                      {currentReviewIndex + 1} of {reviewQueue.length}
                    </span>
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Review contact information before adding to graph.</p>
                </div>
                <button 
                  onClick={() => setIsReviewOpen(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6 flex-1 max-h-[60vh] overflow-y-auto">
                {/* Name field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Display Name</label>
                  <input
                    type="text"
                    value={reviewEditData.name}
                    onChange={(e) => setReviewEditData({ ...reviewEditData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
                  />
                </div>

                {/* Relationship Type */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Relationship Type</label>
                  <select
                    value={["Family", "Friend", "Classmate"].includes(reviewEditData.relationship_type) ? reviewEditData.relationship_type : "Custom"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Custom") {
                        setReviewEditData({ ...reviewEditData, relationship_type: "Colleague" });
                      } else {
                        setReviewEditData({ ...reviewEditData, relationship_type: val });
                      }
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors [&>option]:bg-zinc-950"
                  >
                    <option value="Family">Family (Immediate & Extended)</option>
                    <option value="Friend">Friend</option>
                    <option value="Classmate">Classmate</option>
                    <option value="Custom">Custom Naming...</option>
                  </select>

                  {!["Family", "Friend", "Classmate"].includes(reviewEditData.relationship_type) && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2"
                    >
                      <input
                        type="text"
                        placeholder="Enter custom relationship name (e.g. Mentor, Colleague)"
                        value={reviewEditData.relationship_type}
                        onChange={(e) => setReviewEditData({ ...reviewEditData, relationship_type: e.target.value })}
                        className="w-full px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Phone lines (Multi-number display) */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Associated Phone Numbers</label>
                  {reviewPhones.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No phone lines found for this contact.</p>
                  ) : (
                    <div className="space-y-2">
                      {reviewPhones.map((phone, pIdx) => (
                        <div key={phone.id || pIdx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-xs font-medium text-gray-300 capitalize">{phone.label || 'Phone'}</span>
                          <span className="text-sm font-mono text-gray-400">{phone.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Email (If present) */}
                {currentPerson.email && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-sm text-gray-300">
                      {currentPerson.email}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-white/10 bg-white/5 flex gap-3">
                <Button
                  onClick={() => handleVerifyReject(currentPerson.id)}
                  variant="outline"
                  className="flex-1 border-rose-500/25 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 rounded-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Reject Contact
                </Button>
                <Button
                  onClick={() => handleVerifyConfirm(currentPerson.id)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                >
                  <Check className="mr-2 h-4 w-4" /> Verify & Save
                </Button>
              </div>
            </motion.div>
          </div>
        );
      })()}
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
