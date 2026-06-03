"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { NotificationCenter } from "@/components/NotificationCenter"
import { PushNotificationManager } from "@/components/PushNotificationManager"
import { Sparkles, Users, Calendar, Settings, LogOut, Search, Share2, BarChart2, Globe, Gamepad2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
      } else {
        setAvatarUrl(session.user.user_metadata?.avatar_url || null)
        setLoading(false)
      }
    }
    
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          router.push("/login")
        } else {
          setAvatarUrl(session.user.user_metadata?.avatar_url || null)
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    if (val.trim()) {
      router.push(`/dashboard?q=${encodeURIComponent(val)}`)
    } else {
      router.push(`/dashboard`)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Sparkles className="h-8 w-8 animate-pulse text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 glass-panel hidden md:flex flex-col">
        <div className="p-6 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl tracking-tight">HumanOS</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <Users className="h-4 w-4" />
            People
          </Link>
          <Link href="/dashboard/network" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <Share2 className="h-4 w-4" />
            Graph
          </Link>
          <Link href="/dashboard/analytics" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <BarChart2 className="h-4 w-4" />
            Analytics
          </Link>
          <Link href="/dashboard/reminders" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <Calendar className="h-4 w-4" />
            Reminders
          </Link>
          <Link href="/dashboard/connect" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <Globe className="h-4 w-4" />
            Connect
          </Link>
          <Link href="/dashboard/playlab" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-primary/80 hover:text-primary hover:bg-primary/10 transition-colors mt-4 font-medium">
            <Gamepad2 className="h-4 w-4" />
            PlayLab
          </Link>
        </nav>

        <div className="p-4 border-t border-white/5 space-y-1">
          <Link href="/dashboard/settings" className="flex items-center w-full px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
          <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 glass-panel z-10 sticky top-0">
          <div className="flex items-center bg-white/5 rounded-full px-3 py-1.5 w-64 border border-white/10 focus-within:border-primary/50 transition-colors">
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search people..." 
              className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-gray-500"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <Link href="/dashboard/settings" className="block transition-transform hover:scale-105">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-8 w-8 rounded-full object-cover border border-white/10" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-blue-500 border border-white/10 flex items-center justify-center text-xs font-bold text-white shadow-lg"></div>
              )}
            </Link>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-6 relative">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
      <PushNotificationManager />
    </div>
  )
}
