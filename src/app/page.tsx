import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, Brain, Heart, Shield } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-bold text-xl tracking-tight">HumanOS</span>
        </div>
        <Link href="/login">
          <Button variant="glass" size="sm">Sign In</Button>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-20 pb-32">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Phase 1 MVP Now Live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent mb-6">
          The Living Memory System for Human Relationships
        </h1>
        
        <p className="text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
          Not a CRM. Not a contact book. HumanOS remembers what you forget, helping you maintain meaningful relationships with subtle intelligence.
        </p>
        
        <div className="flex gap-4 mb-24">
          <Link href="/login">
            <Button size="lg" className="h-12 px-8 text-lg rounded-full">
              Get Started
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="glass" size="lg" className="h-12 px-8 text-lg rounded-full border-white/10">
              View Demo
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Memory &gt; Messaging</h3>
            <p className="text-gray-400 text-sm">The system remembers context, hobbies, and emotional history so you don't have to.</p>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
              <Heart className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Context &gt; Contacts</h3>
            <p className="text-gray-400 text-sm">People are evolving profiles connected in a social graph, not just rows in a database.</p>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Private & Secure</h3>
            <p className="text-gray-400 text-sm">No passive tracking. No scraping. Your data belongs entirely to you.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
