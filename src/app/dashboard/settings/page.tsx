"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { User, Loader2, Upload, Camera } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  // Profile State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [fullName, setFullName] = useState("")
  const [birthday, setBirthday] = useState("")
  const [interests, setInterests] = useState("")
  const [apiKey, setApiKey] = useState("")
  
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        setAvatarUrl(session.user.user_metadata?.avatar_url || null)
        setFullName(session.user.user_metadata?.full_name || "")
        setBirthday(session.user.user_metadata?.birthday || "")
        setInterests(session.user.user_metadata?.interests || "")
        setApiKey(session.user.user_metadata?.gemini_api_key || "")
      } else {
        router.push("/login")
      }
      setLoading(false)
    }
    fetchUser()
  }, [router])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return
    const file = e.target.files[0]
    setUploadingImage(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
      
      setAvatarUrl(data.publicUrl)
      
      // Instantly save it to user metadata
      await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl }
      })
      
    } catch (error: any) {
      console.error(error)
      alert("Failed to upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          birthday: birthday,
          interests: interests,
          gemini_api_key: apiKey
        }
      })
      if (error) throw error
      alert("Profile updated successfully!")
    } catch (error: any) {
      console.error(error)
      alert("Failed to save profile.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <User className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Profile Picture</h2>
          <div className="flex items-center gap-6">
            <div className="relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-white/10" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-blue-500 border-2 border-white/10 flex items-center justify-center shadow-lg">
                  <User className="h-10 w-10 text-white/50" />
                </div>
              )}
              
              <label className={`absolute inset-0 bg-black/50 backdrop-blur-sm rounded-full flex flex-col items-center justify-center cursor-pointer transition-opacity ${uploadingImage ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {uploadingImage ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <>
                    <Camera className="h-6 w-6 text-white mb-1" />
                    <span className="text-[10px] text-white font-medium">Change</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-gray-300 font-medium">Upload a custom avatar</p>
              <p className="text-xs text-gray-500">Recommended size: 256x256px</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Account Details</h2>
            <Button onClick={handleSaveProfile} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Profile
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="What should I call you?"
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Birthday</label>
              <input 
                type="date" 
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
          
          <div className="mt-6 space-y-2">
            <label className="text-sm text-gray-400">My Interests & Hobbies</label>
            <textarea 
              value={interests}
              onChange={e => setInterests(e.target.value)}
              placeholder="e.g. Loves reading sci-fi, obsessed with coffee, trying to learn guitar..."
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white min-h-[100px] focus:outline-none focus:border-primary/50 transition-colors"
            />
            <p className="text-xs text-gray-500">The AI will use this to generate personalized gifts and surprises for you on your birthday!</p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
            <h3 className="text-lg font-medium text-white">System Settings</h3>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Custom Gemini API Key</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors font-mono"
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className={`h-2 w-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <p className="text-xs text-gray-500">
                  {apiKey 
                    ? "You are currently using your own custom API Key." 
                    : "You are currently using the default system API Key."}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">Bring your own Google Gemini API key to bypass system rate limits and errors.</p>
            </div>
            
            <div className="space-y-2 mt-6">
              <label className="text-sm text-gray-400">Email Address</label>
              <input 
                type="text" 
                value={user?.email || ""}
                disabled
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">Your email is managed by your authentication provider.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
