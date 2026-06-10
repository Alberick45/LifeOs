"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, MessageCircle, Heart, ShieldAlert, Phone, Coffee, Gift, MessageSquare, Edit, X, Calendar, Sparkles, Loader2, Copy, Tag, Mail, MapPin, Network, Globe } from "lucide-react"
import Link from "next/link"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"

type Person = {
  id: string
  name: string
  relationship_type: string
  birthday: string | null
  phone: string | null
  email: string | null
  address: string | null
  strength_score: number
  trust_score: number
  photo: string | null
  pronouns: string | null
  is_archived: boolean
  linked_user_id?: string | null
  handle?: string | null
}

type Interaction = {
  id: string
  type: string
  notes: string
  sentiment: string
  interaction_date: string
}

type TagData = {
  id: string
  name: string
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
  const [tags, setTags] = useState<TagData[]>([])
  const [loading, setLoading] = useState(true)
  const [phones, setPhones] = useState<{ id?: string, phone: string, label: string }[]>([])

  // Form State
  const [isLogging, setIsLogging] = useState(false)
  const [type, setType] = useState('meet')
  const [notes, setNotes] = useState('')
  const [sentiment, setSentiment] = useState('positive')

  // Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<{ name: string, relationship_type: string, birthday: string, photo: string, phone: string, email: string, address: string, strength_score: number, trust_score: number, is_archived: boolean, pronouns: string }>({
    name: '', relationship_type: '', birthday: '', photo: '', phone: '', email: '', address: '', strength_score: 50, trust_score: 50, is_archived: false, pronouns: 'Rather not say'
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Reminder State
  const [isCreatingReminder, setIsCreatingReminder] = useState(false)
  const [reminderTitle, setReminderTitle] = useState("")
  const [reminderDate, setReminderDate] = useState("")
  const [savingReminder, setSavingReminder] = useState(false)

  // AI Magic State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiType, setAiType] = useState<'gift' | 'message' | 'summary' | 'conflict' | 'poem' | 'website'>('gift')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)

  // Tag State
  const [newTag, setNewTag] = useState("")
  const [addingTag, setAddingTag] = useState(false)

  // Connections State
  const [allPeople, setAllPeople] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [newConnectionId, setNewConnectionId] = useState("")
  const [newConnectionType, setNewConnectionType] = useState("")
  const [isLinking, setIsLinking] = useState(false)

  useEffect(() => {
    fetchData()
  }, [personId])

  const fetchData = async () => {
    // Load from cache first for instant loading
    if (typeof window !== "undefined") {
      const cachedPerson = localStorage.getItem(`lifeos_person_${personId}_cache`)
      const cachedPhones = localStorage.getItem(`lifeos_person_${personId}_phones_cache`)
      const cachedInteractions = localStorage.getItem(`lifeos_person_${personId}_interactions_cache`)
      const cachedTags = localStorage.getItem(`lifeos_person_${personId}_tags_cache`)
      
      if (cachedPerson) {
        try {
          const parsedPerson = JSON.parse(cachedPerson)
          setPerson(parsedPerson)
          setEditData({
            name: parsedPerson.name || '',
            relationship_type: parsedPerson.relationship_type || '',
            birthday: parsedPerson.birthday || '',
            photo: parsedPerson.photo || '',
            phone: parsedPerson.phone || '',
            email: parsedPerson.email || '',
            address: parsedPerson.address || '',
            strength_score: parsedPerson.strength_score || 0,
            trust_score: parsedPerson.trust_score || 0,
            is_archived: parsedPerson.is_archived || false,
            pronouns: parsedPerson.pronouns || 'Rather not say'
          })
          
          if (cachedPhones) setPhones(JSON.parse(cachedPhones))
          if (cachedInteractions) setInteractions(JSON.parse(cachedInteractions))
          if (cachedTags) setTags(JSON.parse(cachedTags))
          
          setLoading(false)
        } catch (e) {
          console.error("Failed to parse cached details:", e)
        }
      }
    }

    try {
      // Fetch Person
      const { data: pData, error: pError } = await supabase
        .from('people')
        .select('*')
        .eq('id', personId)
        .single()

      if (pError) throw pError

      let resolvedPerson = pData
      if (pData.linked_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('handle')
          .eq('id', pData.linked_user_id)
          .maybeSingle()
        if (profile) {
          resolvedPerson = { ...pData, handle: profile.handle }
        }
      }
      setPerson(resolvedPerson)
      setEditData({
        name: pData.name || '',
        relationship_type: pData.relationship_type || '',
        birthday: pData.birthday || '',
        photo: pData.photo || '',
        phone: pData.phone || '',
        email: pData.email || '',
        address: pData.address || '',
        strength_score: pData.strength_score || 0,
        trust_score: pData.trust_score || 0,
        is_archived: pData.is_archived || false,
        pronouns: pData.pronouns || 'Rather not say'
      })

      // Fetch Phone Lines
      const { data: phoneData, error: phoneErr } = await supabase
        .from('person_phones')
        .select('*')
        .eq('person_id', personId)
      if (phoneErr) console.error("Error fetching phone numbers:", phoneErr)
      
      if (phoneData && phoneData.length > 0) {
        setPhones(phoneData)
      } else if (pData.phone) {
        setPhones([{ phone: pData.phone, label: 'Primary' }])
      } else {
        setPhones([])
      }

      // Fetch Interactions
      const { data: iData, error: iError } = await supabase
        .from('interactions')
        .select('*')
        .eq('person_id', personId)
        .order('interaction_date', { ascending: false })

      if (iError) throw iError
      setInteractions(iData || [])

      // Fetch Tags
      const { data: tData, error: tError } = await supabase
        .from('person_tags')
        .select('tags(id, name)')
        .eq('person_id', personId)

      if (tError) throw tError

      const mappedTags = (tData || []).map((t: any) => t.tags).filter(Boolean) as TagData[]
      setTags(mappedTags)

      // Fetch All People (for linking)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: allPeopleData, error: peopleFetchErr } = await supabase
          .from('people')
          .select('*')
          .eq('user_id', user.id)

        console.log("DEBUG: allPeopleData", allPeopleData, "error:", peopleFetchErr)

        // Filter out archived people explicitly in JS to handle NULL safely
        const activePeople = (allPeopleData || []).filter(p => p.is_archived !== true)
        console.log("DEBUG: activePeople", activePeople)
        setAllPeople(activePeople)

        // Fetch Connections
        const { data: connectionsData } = await supabase.from('connections').select('*').or(`person_a_id.eq.${personId},person_b_id.eq.${personId}`)
        setConnections(connectionsData || [])
      }

      // Save all resolved details to cache for offline-first support
      if (typeof window !== "undefined") {
        localStorage.setItem(`lifeos_person_${personId}_cache`, JSON.stringify(resolvedPerson))
        localStorage.setItem(`lifeos_person_${personId}_phones_cache`, JSON.stringify(phoneData && phoneData.length > 0 ? phoneData : (resolvedPerson.phone ? [{ phone: resolvedPerson.phone, label: 'Primary' }] : [])))
        localStorage.setItem(`lifeos_person_${personId}_interactions_cache`, JSON.stringify(iData || []))
        localStorage.setItem(`lifeos_person_${personId}_tags_cache`, JSON.stringify(mappedTags))
      }

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
          if (typeof window !== "undefined") {
            localStorage.removeItem("lifeos_people_cache")
          }
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
      const primaryPhone = phones[0]?.phone || null;

      const { error } = await supabase
        .from('people')
        .update({
          name: editData.name,
          relationship_type: editData.relationship_type,
          birthday: editData.birthday || null,
          photo: editData.photo || null,
          phone: primaryPhone,
          email: editData.email || null,
          address: editData.address || null,
          strength_score: editData.strength_score,
          trust_score: editData.trust_score,
          is_archived: editData.is_archived,
          pronouns: editData.pronouns
        })
        .eq('id', personId)

      if (error) throw error

      // Update person_phones: clear existing, insert updated lines
      const { error: delErr } = await supabase
        .from('person_phones')
        .delete()
        .eq('person_id', personId)
      if (delErr) throw delErr

      if (phones.length > 0) {
        const phoneInserts = phones.filter(p => p.phone.trim() !== "").map(p => ({
          person_id: personId,
          phone: p.phone,
          label: p.label || 'Mobile'
        }))

        if (phoneInserts.length > 0) {
          const { error: insErr } = await supabase
            .from('person_phones')
            .insert(phoneInserts)
          if (insErr) throw insErr
        }
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("lifeos_people_cache")
      }
      setPerson(prev => prev ? { ...prev, ...editData, phone: primaryPhone } : null)
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving person:", error)
      alert("Failed to save changes.")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingImage(true)
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${Math.random()}.${fileExt}`

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setEditData({ ...editData, photo: publicUrl })
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error uploading image!')
    } finally {
      setUploadingImage(false)
    }
  }

  const saveReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingReminder(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newReminder = {
        user_id: user.id,
        person_id: personId,
        title: reminderTitle,
        description: `Follow up with ${person?.name}`,
        scheduled_for: new Date(reminderDate).toISOString(),
        is_completed: false
      }

      const { error } = await supabase.from('reminders').insert([newReminder])
      if (error) throw error

      setIsCreatingReminder(false)
      setReminderTitle("")
      setReminderDate("")
      alert("Reminder scheduled successfully!")
    } catch (error) {
      console.error("Error saving reminder:", error)
      alert("Failed to schedule reminder.")
    } finally {
      setSavingReminder(false)
    }
  }

  const generateMagic = async (type: string) => {
    setAiGenerating(true)
    setAiResult(null)
    setAiType(type as any)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userApiKey = session?.user?.user_metadata?.gemini_api_key

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, person, interactions, tags, userApiKey })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      setAiResult(data.result)
      setIsAiModalOpen(true)
    } catch (error: any) {
      console.error(error)
      alert(error.message)
    } finally {
      setAiGenerating(false)
    }
  }

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !newTag.trim() || addingTag) return

    setAddingTag(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tagName = newTag.trim().toLowerCase()

      // 1. Check if tag exists
      let { data: existingTag } = await supabase
        .from('tags')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('name', tagName)
        .single()

      let tagId = existingTag?.id

      // 2. Create if not exists
      if (!existingTag) {
        const { data: createdTag, error: createError } = await supabase
          .from('tags')
          .insert([{ user_id: user.id, name: tagName }])
          .select()
          .single()

        if (createError) throw createError
        tagId = createdTag.id
        existingTag = createdTag
      }

      // 3. Link to person
      const { error: linkError } = await supabase
        .from('person_tags')
        .insert([{ person_id: personId, tag_id: tagId }])

      // Ignore conflict errors if they already have this tag
      if (linkError && linkError.code !== '23505') throw linkError

      // Update state
      if (!tags.find(t => t.id === tagId)) {
        setTags([...tags, { id: tagId, name: tagName }])
      }
      setNewTag("")
    } catch (error) {
      console.error("Error adding tag:", error)
    } finally {
      setAddingTag(false)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('person_tags')
        .delete()
        .eq('person_id', personId)
        .eq('tag_id', tagId)

      if (error) throw error
      setTags(tags.filter(t => t.id !== tagId))
    } catch (error) {
      console.error("Error removing tag:", error)
    }
  }

  // Format phone for WhatsApp (wa.me requires country code, no +)
  const formatWhatsAppNumber = (phone: string) => {
    let cleaned = phone.replace(/[^0-9+]/g, '')
    // Default to +233 (Ghana) if it's a local 10-digit number starting with 0
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '233' + cleaned.substring(1)
    }
    // Remove the + for the URL
    return cleaned.replace('+', '')
  }

  if (loading) return <div className="animate-pulse h-64 glass-panel rounded-xl" />
  if (!person) return <div>Person not found.</div>

  // Check if birthday is coming up (within 14 days)
  let isBirthdaySoon = false
  if (person.birthday) {
    const today = new Date()
    const bday = new Date(person.birthday)
    bday.setFullYear(today.getFullYear()) // Set birthday to this year

    // If birthday already passed this year, look at next year
    if (bday < today) {
      bday.setFullYear(today.getFullYear() + 1)
    }

    const diffTime = Math.abs(bday.getTime() - today.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    isBirthdaySoon = diffDays <= 14
  }

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{person.name}</h1>
                {person.handle && (
                  <span className="text-sm px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-semibold">
                    <Globe className="h-3.5 w-3.5 text-purple-400" /> @{person.handle}
                  </span>
                )}
                <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Edit Profile">
                  <Edit className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setIsAiModalOpen(true)}
                  className={`gap-2 shrink-0 border-white/10 ${isBirthdaySoon ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-pulse' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                  variant={isBirthdaySoon ? "default" : "outline"}
                >
                  <Sparkles className="h-4 w-4" />
                  AI Magic
                </Button>
                <Button onClick={() => setIsCreatingReminder(true)} variant="outline" className="gap-2 shrink-0 border-white/10 hover:bg-white/5">
                  <Calendar className="h-4 w-4" />
                  Remind Me
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-sm text-gray-400 capitalize">{person.relationship_type || "Connection"}</span>
              {person.pronouns && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-sm text-gray-400">{person.pronouns}</span>
                </>
              )}
              {person.birthday && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-sm text-gray-400">Birthday: {new Date(person.birthday).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </>
              )}
              {phones.length > 0 && phones.map((p, idx) => (
                <div key={p.id || idx} className="flex items-center gap-1 group">
                  <span className="text-gray-600">•</span>
                  <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                    {p.phone} <span className="text-[9px] text-gray-500 font-semibold uppercase bg-white/5 border border-white/5 px-1 py-0.5 rounded ml-1">{p.label}</span>
                  </span>
                  <div className="hidden group-hover:flex items-center gap-1 ml-2">
                    <a href={`tel:${p.phone.replace(/[^0-9+]/g, '')}`} className="p-1 hover:bg-white/10 rounded-full transition-colors text-green-400" title={`Call ${p.label}`}>
                      <Phone className="h-3 w-3" />
                    </a>
                    <a href={`https://wa.me/${formatWhatsAppNumber(p.phone)}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white/10 rounded-full transition-colors text-green-400" title={`WhatsApp ${p.label}`}>
                      <MessageCircle className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
              {person.email && (
                <div className="flex items-center gap-1 group">
                  <span className="text-gray-600">•</span>
                  <a href={`mailto:${person.email}`} className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                    {person.email}
                    <Mail className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>
              )}
            </div>
            {person.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(person.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-400 transition-colors mt-2 group"
              >
                <MapPin className="h-3 w-3 text-blue-500" />
                {person.address}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-white/10 px-1.5 rounded">Map</span>
              </a>
            )}

            {/* Tagging System */}
            <div className="mt-4 flex items-center flex-wrap gap-2">
              {tags.map(tag => (
                <div key={tag.id} className="group flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300 transition-colors">
                  <span className="capitalize">{tag.name}</span>
                  <button onClick={() => handleRemoveTag(tag.id)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-gray-500 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="relative">
                <input
                  type="text"
                  placeholder={addingTag ? "Adding..." : "+ Add detail (Likes, Hobbies)"}
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  disabled={addingTag}
                  className="bg-transparent border border-white/10 border-dashed rounded-full px-3 py-1 text-xs text-gray-400 focus:text-white focus:outline-none focus:border-white/30 w-48 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Stats & Logging */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500" /> Relationship Health
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => generateMagic('summary')} className="border-white/10 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 h-8 text-xs px-2">
                  <Sparkles className="mr-1.5 h-3 w-3" /> Summary
                </Button>
                <Button variant="outline" size="sm" onClick={() => generateMagic('conflict')} className="border-white/10 text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 text-xs px-2">
                  <ShieldAlert className="mr-1.5 h-3 w-3" /> Conflict
                </Button>
              </div>
            </div>
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

          {/* Connections / Graph Links */}
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Network className="h-4 w-4 text-primary" /> Connected To</h3>

            <div className="space-y-3 mb-4">
              {connections.length === 0 && <p className="text-sm text-gray-400">No connections added yet.</p>}
              {connections.map(c => {
                const isPersonA = c.person_a_id === personId
                const otherPersonId = isPersonA ? c.person_b_id : c.person_a_id
                const otherPerson = allPeople.find(p => p.id === otherPersonId)
                if (!otherPerson) return null

                return (
                  <Link href={`/dashboard/person/${otherPerson.id}`} key={c.id} className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                        {otherPerson.photo ? <img src={otherPerson.photo} className="w-full h-full object-cover" /> : <span className="text-[10px] text-primary font-bold">{otherPerson.name.charAt(0)}</span>}
                      </div>
                      <span className="text-sm font-medium">{otherPerson.name}</span>
                    </div>
                    <span className="text-xs text-gray-400 capitalize">{c.connection_type || 'Connected'}</span>
                  </Link>
                )
              })}
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!newConnectionId) return
              setIsLinking(true)
              try {
                const { data: { user } } = await supabase.auth.getUser()
                const { data, error } = await supabase.from('connections').insert([{
                  user_id: user?.id,
                  person_a_id: personId,
                  person_b_id: newConnectionId,
                  connection_type: newConnectionType
                }]).select().single()

                if (error) {
                  alert("Connection might already exist!")
                } else {
                  setConnections([...connections, data])
                  setNewConnectionId("")
                  setNewConnectionType("")
                }
              } catch (e) {
                console.error(e)
              } finally {
                setIsLinking(false)
              }
            }} className="space-y-3 pt-4 border-t border-white/10">
              {allPeople.length <= 1 ? (
                <div className="text-sm text-gray-400 bg-white/5 p-3 rounded-lg border border-white/10 text-center">
                  Add more people to your network to create connections!
                </div>
              ) : (
                <>
                  <select
                    value={newConnectionId}
                    onChange={e => setNewConnectionId(e.target.value)}
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50 [&>option]:bg-zinc-900"
                  >
                    <option value="">Select a person...</option>
                    {allPeople.filter(p => p.id !== personId).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Relationship (e.g. Spouse, Friend)"
                    value={newConnectionType}
                    onChange={e => setNewConnectionType(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50"
                  />
                  <Button type="submit" disabled={isLinking || !newConnectionId} className="w-full h-8 text-xs">
                    {isLinking ? "Linking..." : "Add Link"}
                  </Button>
                </>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-xl min-h-[500px]">
            <h3 className="font-semibold mb-6 text-xl">Interaction Timeline</h3>

            {person.is_archived && (
              <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <ShieldAlert className="h-5 w-5" />
                <span className="text-sm font-medium">This relationship is archived.</span>
              </div>
            )}

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

                <form onSubmit={saveEdit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Name</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={e => setEditData({ ...editData, name: e.target.value })}
                      required
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Relationship Type</label>
                      <input
                        type="text"
                        placeholder="e.g. Friend"
                        value={editData.relationship_type}
                        onChange={e => setEditData({ ...editData, relationship_type: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Pronouns</label>
                      <select
                        value={editData.pronouns}
                        onChange={e => setEditData({ ...editData, pronouns: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors [&>option]:bg-zinc-900"
                      >
                        <option value="He/Him">He/Him</option>
                        <option value="She/Her">She/Her</option>
                        <option value="Rather not say">Rather not say</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Birthday</label>
                      <input
                        type="date"
                        value={editData.birthday}
                        onChange={e => setEditData({ ...editData, birthday: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2 border border-white/5 p-3 rounded-lg bg-black/20">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone Lines</label>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs text-purple-400 hover:text-purple-300"
                          onClick={() => setPhones([...phones, { phone: '', label: 'Mobile' }])}
                        >
                          + Add Line
                        </Button>
                      </div>
                      
                      {phones.map((p, idx) => (
                        <div key={idx} className="flex gap-2 items-center mt-2">
                          <select
                            value={p.label}
                            onChange={(e) => {
                              const newP = [...phones];
                              newP[idx].label = e.target.value;
                              setPhones(newP);
                            }}
                            className="bg-black border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none w-24 [&>option]:bg-zinc-950"
                          >
                            <option value="Mobile">Mobile</option>
                            <option value="Home">Home</option>
                            <option value="Work">Work</option>
                            <option value="Primary">Primary</option>
                            <option value="Secondary">Secondary</option>
                          </select>
                          <input
                            type="tel"
                            placeholder="Phone number"
                            value={p.phone}
                            onChange={(e) => {
                              const newP = [...phones];
                              newP[idx].phone = e.target.value;
                              setPhones(newP);
                            }}
                            className="flex-1 bg-black border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setPhones(phones.filter((_, i) => i !== idx))}
                            className="p-1 text-gray-500 hover:text-rose-400 hover:bg-white/5 rounded-full transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={e => setEditData({ ...editData, email: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Address</label>
                    <input
                      type="text"
                      value={editData.address}
                      onChange={e => setEditData({ ...editData, address: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex justify-between text-sm font-medium text-gray-300">
                        <span>Strength Score</span>
                        <span className="text-primary">{editData.strength_score}%</span>
                      </label>
                      <input
                        type="range"
                        min="0" max="100"
                        value={editData.strength_score}
                        onChange={e => setEditData({ ...editData, strength_score: parseInt(e.target.value) || 0 })}
                        className="w-full accent-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex justify-between text-sm font-medium text-gray-300">
                        <span>Trust Score</span>
                        <span className="text-emerald-400">{editData.trust_score}%</span>
                      </label>
                      <input
                        type="range"
                        min="0" max="100"
                        value={editData.trust_score}
                        onChange={e => setEditData({ ...editData, trust_score: parseInt(e.target.value) || 0 })}
                        className="w-full accent-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Photo</label>
                    <div className="flex items-center gap-3">
                      {editData.photo && <img src={editData.photo} className="h-10 w-10 rounded-full object-cover border border-white/10" />}
                      <div className="flex-1">
                        <label className="flex items-center justify-center w-full p-2 border border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors text-sm text-gray-300">
                          {uploadingImage ? "Uploading..." : "Upload Photo"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-3 sticky bottom-0 bg-zinc-950 pb-2">
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingEdit || uploadingImage} className="flex-1">
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {isCreatingReminder && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreatingReminder(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-md bg-zinc-950 border border-white/10 shadow-2xl rounded-2xl flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Set Reminder</h2>
                  <button onClick={() => setIsCreatingReminder(false)} className="p-2 rounded-full hover:bg-white/10">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={saveReminder} className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">What to do?</label>
                    <input
                      type="text"
                      value={reminderTitle}
                      onChange={e => setReminderTitle(e.target.value)}
                      placeholder={`e.g. Call ${person.name}`}
                      required
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">When?</label>
                    <input
                      type="datetime-local"
                      value={reminderDate}
                      onChange={e => setReminderDate(e.target.value)}
                      required
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <Button type="button" variant="ghost" onClick={() => setIsCreatingReminder(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingReminder} className="flex-1">
                      {savingReminder ? "Saving..." : "Schedule Reminder"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {isAiModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAiModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 shadow-2xl rounded-2xl flex flex-col overflow-hidden max-h-[85vh]"
              >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">AI Magic Generator</h2>
                  </div>
                  <button onClick={() => setIsAiModalOpen(false)} className="p-2 rounded-full hover:bg-white/10">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
                  {isBirthdaySoon && (
                    <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-sm">
                      ✨ <strong>Event approaching!</strong> {person.name}'s birthday is coming up. Let's generate something special!
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                    {(['gift', 'message', 'poem', 'website'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => { setAiType(type); setAiResult(null) }}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${aiType === type ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-black/50 border-white/5 hover:border-white/10 text-gray-400 hover:text-white'}`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>

                  <Button onClick={() => generateMagic(aiType)} disabled={aiGenerating} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold h-12">
                    {aiGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : `Generate ${aiType.charAt(0).toUpperCase() + aiType.slice(1)}`}
                  </Button>

                  {aiResult && (
                    <div className="mt-6 flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-200">Result</h3>
                        <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(aiResult)} className="h-8 gap-2 text-gray-400 hover:text-white">
                          <Copy className="h-4 w-4" /> Copy
                        </Button>
                      </div>
                      <div className="bg-black/50 border border-white/10 p-4 rounded-xl text-gray-300 whitespace-pre-wrap overflow-y-auto flex-1 font-mono text-sm leading-relaxed">
                        {aiType === 'website' ? (
                          <div dangerouslySetInnerHTML={{ __html: aiResult }} />
                        ) : (
                          aiResult
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
