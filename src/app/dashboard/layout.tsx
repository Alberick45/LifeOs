"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { NotificationCenter } from "@/components/NotificationCenter"
import { PushNotificationManager } from "@/components/PushNotificationManager"
import { Sparkles, Users, Calendar, Settings, LogOut, Search, Share2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
      } else {
        setLoading(false)
      }
    }
    
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          router.push("/login")
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
          <Link href="/dashboard/reminders" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <Calendar className="h-4 w-4" />
            Reminders
          </Link>
        </nav>

        <div className="p-4 border-t border-white/5">
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
              placeholder="Search people..." 
              className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-gray-500"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-blue-500"></div>
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
