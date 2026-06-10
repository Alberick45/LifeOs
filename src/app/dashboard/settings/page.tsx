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
  const [testingPush, setTestingPush] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  
  // Profile State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [fullName, setFullName] = useState("")
  const [handle, setHandle] = useState("")
  const [birthday, setBirthday] = useState("")
  const [interests, setInterests] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [phone, setPhone] = useState("")
  
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
        setPhone(session.user.user_metadata?.phone || "")

        // Fetch Handle
        const { data: profile } = await supabase.from('profiles').select('handle').eq('id', session.user.id).single()
        if (profile) setHandle(profile.handle || "")
      } else {
        router.push("/login")
      }
      setLoading(false)
    }
    fetchUser()
    
    // Check if browser is already subscribed
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setIsSubscribed(true)
        })
      })
    }
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

      // Also upsert to profiles table
      await supabase.from('profiles').upsert({
        id: user.id,
        avatar_url: data.publicUrl
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
          gemini_api_key: apiKey,
          phone: phone
        }
      })
      if (error) throw error

      // Upsert Handle
      if (handle) {
        // Basic validation: alphanumeric + underscores
        const sanitizedHandle = handle.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: user.id,
          handle: sanitizedHandle,
          avatar_url: avatarUrl
        })
        if (profileError) throw profileError
        setHandle(sanitizedHandle) // Update UI with sanitized handle
      }

      alert("Profile updated successfully!")
    } catch (error: any) {
      console.error(error)
      alert("Failed to save profile.")
    } finally {
      setSaving(false)
    }
  }

  const handleTestPush = async () => {
    if (!user) return;
    setTestingPush(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          title: 'Hello from HumanOS!',
          body: 'This is a test native push notification to ensure everything is working correctly.',
          url: '/dashboard'
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.message === "No subscriptions found.") {
           alert("You haven't enabled push notifications yet! Check the bottom right corner.");
        } else {
           alert(`Push notification sent successfully to ${data.count} devices!`);
        }
      } else {
        alert('Failed to send push notification: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while sending the push notification.');
    } finally {
      setTestingPush(false);
    }
  }

  const handleSyncPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert("Push notifications are not supported by your browser.");
      return;
    }
    
    setTestingPush(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      }
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(sub),
      });
      
      if (res.ok) {
         setIsSubscribed(true);
         alert("Successfully enabled and synced with database! You can now test it.");
      } else {
         alert("Failed to sync subscription with database.");
      }
    } catch (error: any) {
      console.error(error);
      alert("Error subscribing: " + error.message);
    } finally {
      setTestingPush(false);
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
              <label className="text-sm text-gray-400">@handle (Unique ID)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">@</span>
                <input 
                  type="text" 
                  value={handle}
                  onChange={e => setHandle(e.target.value)}
                  placeholder="your_handle"
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 pl-8 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
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
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Phone Number</label>
              <input 
                type="tel" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="E.g., +233 24 000 0000"
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

            <div className="space-y-2 mt-6">
              <label className="text-sm text-gray-400">Push Notifications</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Button 
                  onClick={handleTestPush} 
                  disabled={testingPush}
                  variant="outline"
                  className="bg-black/50 border border-white/10 text-white hover:bg-white/5"
                >
                  {testingPush ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Test Push Notification
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                {isSubscribed 
                  ? 'Your device is successfully registered for native push notifications! Click "Test Push Notification" to verify.' 
                  : 'Use the floating setup prompt at the bottom of the dashboard to enable native push notifications, then test here.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
