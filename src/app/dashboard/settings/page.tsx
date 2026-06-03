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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        setAvatarUrl(session.user.user_metadata?.avatar_url || null)
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
              
              <label className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
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
          <h2 className="text-xl font-semibold mb-4">Account Details</h2>
          <div className="space-y-4">
            <div className="space-y-2">
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
