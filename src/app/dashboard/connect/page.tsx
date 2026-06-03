"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Globe, Search, UserPlus, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ConnectPage() {
  const [sessionUser, setSessionUser] = useState<any>(null)
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  
  // Link Modal State
  const [selectedProfile, setSelectedProfile] = useState<any>(null)
  const [myPeople, setMyPeople] = useState<any[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState<string>("NEW")
  const [sendingLink, setSendingLink] = useState(false)

  // Requests State
  const [incomingRequests, setIncomingRequests] = useState<any[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessionUser(session.user)
        fetchRequests(session.user.id)
        
        // Fetch private people who don't have a linked account yet
        const { data: people } = await supabase
          .from('people')
          .select('id, name')
          .eq('user_id', session.user.id)
          .is('linked_user_id', null)
        
        if (people) setMyPeople(people)
      }
    }
    init()
  }, [])

  const fetchRequests = async (userId: string) => {
    // Fetch incoming
    const { data: incoming } = await supabase
      .from('link_requests')
      .select('*, profiles!link_requests_sender_id_fkey(handle, avatar_url)')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
    
    if (incoming) setIncomingRequests(incoming)

    // Fetch outgoing
    const { data: outgoing } = await supabase
      .from('link_requests')
      .select('*, profiles!link_requests_receiver_id_fkey(handle, avatar_url)')
      .eq('sender_id', userId)
      .eq('status', 'pending')
    
    if (outgoing) setOutgoingRequests(outgoing)
  }

  const handleSearch = async () => {
    if (!query.trim() || !sessionUser) return
    setSearching(true)
    try {
      // Find profiles where handle matches (case insensitive), exclude self
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('handle', `%${query}%`)
        .neq('id', sessionUser.id)
        .limit(10)

      if (error) throw error
      setResults(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setSearching(false)
    }
  }

  const handleSendRequest = async () => {
    if (!selectedProfile || !sessionUser) return
    setSendingLink(true)
    try {
      let finalPersonId = selectedPersonId;

      // 1. Handle local people record logic
      if (selectedPersonId === "NEW") {
        // Create new person locally
        const { data: newPerson, error: insertError } = await supabase
          .from('people')
          .insert({
            user_id: sessionUser.id,
            name: selectedProfile.handle,
            photo: selectedProfile.avatar_url,
            linked_user_id: selectedProfile.id
          })
          .select()
          .single()
        
        if (insertError) throw insertError
        finalPersonId = newPerson.id
      } else {
        // Update existing person to link to this global account
        const { error: updateError } = await supabase
          .from('people')
          .update({ linked_user_id: selectedProfile.id })
          .eq('id', selectedPersonId)
        
        if (updateError) throw updateError
      }

      // 2. Send the actual global Link Request to the user
      const { error: requestError } = await supabase
        .from('link_requests')
        .insert({
          sender_id: sessionUser.id,
          receiver_id: selectedProfile.id,
          relationship_type: 'Unknown',
          status: 'pending'
        })
      
      if (requestError) throw requestError

      alert("Link request sent!")
      setSelectedProfile(null)
      fetchRequests(sessionUser.id)
    } catch (e: any) {
      console.error(e)
      alert("Failed to send request. You may have already sent one!")
    } finally {
      setSendingLink(false)
    }
  }

  const handleRespondRequest = async (requestId: string, senderId: string, status: 'accepted' | 'rejected') => {
    try {
      // Update the request status
      await supabase
        .from('link_requests')
        .update({ status })
        .eq('id', requestId)

      if (status === 'accepted') {
        // Create the Verified Link (bidirectional graph edge)
        await supabase
          .from('verified_links')
          .insert({
            user_a: sessionUser.id,
            user_b: senderId,
            relationship_type: 'Unknown'
          })
      }

      fetchRequests(sessionUser.id)
    } catch (e) {
      console.error(e)
      alert("Failed to respond to request.")
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Globe className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Global Network</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Search Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Find Humans</h2>
            <p className="text-sm text-gray-400">Search by unique @handle</p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="search_handles..."
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pl-10 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching} className="bg-primary hover:bg-primary/90">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          <div className="space-y-3">
            {results.map(profile => (
              <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xs">@</div>
                  )}
                  <div>
                    <p className="font-medium">@{profile.handle}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" onClick={() => setSelectedProfile(profile)}>
                  <UserPlus className="h-4 w-4 mr-1" /> Connect
                </Button>
              </div>
            ))}
            {results.length === 0 && query && !searching && (
              <p className="text-sm text-gray-500 text-center py-4">No humans found.</p>
            )}
          </div>
        </div>

        {/* Requests Panel */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-xl font-semibold">Incoming Requests</h2>
            {incomingRequests.length === 0 ? (
              <p className="text-sm text-gray-500">No pending requests.</p>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                       {req.profiles?.avatar_url ? (
                          <img src={req.profiles.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs">@</div>
                        )}
                      <p className="font-medium text-sm">@{req.profiles?.handle}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRespondRequest(req.id, req.sender_id, 'accepted')} className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30">
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleRespondRequest(req.id, req.sender_id, 'rejected')} className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-xl font-semibold">Pending Outgoing</h2>
            {outgoingRequests.length === 0 ? (
              <p className="text-sm text-gray-500">No outgoing requests.</p>
            ) : (
              <div className="space-y-3">
                {outgoingRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                       {req.profiles?.avatar_url ? (
                          <img src={req.profiles.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs">@</div>
                        )}
                      <p className="font-medium text-sm">@{req.profiles?.handle}</p>
                    </div>
                    <span className="text-xs text-gray-500 px-2 py-1 bg-black/50 rounded">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Link Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-bold">Link Human</h3>
              <p className="text-sm text-gray-400 mt-1">
                You are sending a connection request to <b>@{selectedProfile.handle}</b>.
              </p>
            </div>

            <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
              <label className="text-sm font-medium">Does this account belong to someone already in your private network?</label>
              <select 
                value={selectedPersonId}
                onChange={e => setSelectedPersonId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary/50"
              >
                <option value="NEW">Create as new person</option>
                {myPeople.map(p => (
                  <option key={p.id} value={p.id}>Link to existing: {p.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                If you choose an existing person, their private profile will be secretly attached to this global account. 
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setSelectedProfile(null)}>Cancel</Button>
              <Button onClick={handleSendRequest} disabled={sendingLink} className="bg-primary hover:bg-primary/90">
                {sendingLink ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
