"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, Brain, Heart, Shield, X, ChevronLeft, ChevronRight,
  Users, BarChart2, Calendar, MessageCircle, Star, Zap, Plus, Gamepad2
} from "lucide-react"

// ------- Demo Slides -------
const DEMO_SLIDES = [
  {
    id: 1,
    title: "Your People Network",
    subtitle: "Everyone who matters, all in one place",
    color: "from-primary/20 to-blue-500/10",
    accent: "text-primary",
    accentBorder: "border-primary/30",
    icon: Users,
    content: (
      <div className="space-y-3">
        {[
          { name: "Kwame Asante", role: "Best Friend", strength: 92, trust: 88, avatar: "K", color: "bg-primary/20 text-primary" },
          { name: "Sarah Mitchell", role: "Colleague", strength: 75, trust: 81, avatar: "S", color: "bg-blue-500/20 text-blue-400" },
          { name: "Jordan Rivers", role: "Mentor", strength: 60, trust: 95, avatar: "J", color: "bg-emerald-500/20 text-emerald-400" },
          { name: "Amara Osei", role: "Family", strength: 88, trust: 97, avatar: "A", color: "bg-rose-500/20 text-rose-400" },
        ].map((p) => (
          <div key={p.name} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors group">
            <div className={`h-9 w-9 rounded-full ${p.color} flex items-center justify-center font-bold text-sm shrink-0`}>{p.avatar}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white">{p.name}</p>
              <p className="text-xs text-gray-500">{p.role}</p>
            </div>
            <div className="text-right hidden sm:block">
              <div className="flex gap-2 text-xs">
                <span className="text-primary">💪 {p.strength}</span>
                <span className="text-emerald-400">🤝 {p.trust}</span>
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 bg-white/3 rounded-xl p-3 border border-dashed border-white/10 text-gray-500 text-sm cursor-pointer hover:border-primary/30 hover:text-primary transition-colors">
          <Plus className="h-4 w-4" /> Add a new connection…
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Relationship Health",
    subtitle: "Track strength & trust with visual scores",
    color: "from-rose-500/20 to-orange-500/10",
    accent: "text-rose-400",
    accentBorder: "border-rose-500/30",
    icon: Heart,
    content: (
      <div className="space-y-5 py-2">
        {[
          { label: "Relationship Strength", value: 88, color: "bg-rose-500", text: "text-rose-400" },
          { label: "Trust Score", value: 95, color: "bg-emerald-500", text: "text-emerald-400" },
          { label: "Interaction Frequency", value: 72, color: "bg-blue-500", text: "text-blue-400" },
          { label: "Sentiment Health", value: 80, color: "bg-yellow-500", text: "text-yellow-400" },
        ].map((bar) => (
          <div key={bar.label}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-400">{bar.label}</span>
              <span className={`font-bold ${bar.text}`}>{bar.value}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
              <motion.div
                className={`${bar.color} h-full rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${bar.value}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              />
            </div>
          </div>
        ))}
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <Star className="h-3.5 w-3.5 shrink-0" /> Strong relationship! You last connected 3 days ago.
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Interaction Timeline",
    subtitle: "A living memory of every conversation",
    color: "from-blue-500/20 to-purple-500/10",
    accent: "text-blue-400",
    accentBorder: "border-blue-500/30",
    icon: MessageCircle,
    content: (
      <div className="space-y-4">
        {[
          { type: "meet", sentiment: "positive", note: "Had coffee at Osu. Talked about their new startup idea. Super energised!", date: "2 days ago", emoji: "☕", border: "border-l-emerald-500" },
          { type: "call", sentiment: "neutral", note: "Quick check-in call. Discussed the project timeline and next steps.", date: "1 week ago", emoji: "📞", border: "border-l-blue-500" },
          { type: "text", sentiment: "positive", note: "Sent them the article on AI they were looking for. They loved it!", date: "2 weeks ago", emoji: "💬", border: "border-l-primary" },
          { type: "gift", sentiment: "positive", note: "Sent birthday gift 🎂 — they were genuinely surprised and happy.", date: "3 weeks ago", emoji: "🎁", border: "border-l-rose-500" },
        ].map((item) => (
          <div key={item.note} className={`bg-white/5 rounded-xl p-3 border border-white/5 border-l-2 ${item.border}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{item.emoji}</span>
              <span className="capitalize text-xs font-semibold text-white">{item.type}</span>
              <span className="text-xs text-gray-500 ml-auto">{item.date}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{item.note}</p>
          </div>
        ))}
      </div>
    )
  },
  {
    id: 4,
    title: "AI Magic Generator",
    subtitle: "AI-crafted gifts, messages & poems",
    color: "from-purple-500/20 to-pink-500/10",
    accent: "text-purple-400",
    accentBorder: "border-purple-500/30",
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {["Gift", "Message", "Poem", "Website"].map((t) => (
            <div key={t} className={`p-2 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${t === "Message" ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-black/40 border-white/5 text-gray-400 hover:border-white/10"}`}>{t}</div>
          ))}
        </div>
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
            <span className="text-sm font-semibold text-purple-300">AI Generated Message</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed italic">
            "Hey Kwame! I was just thinking about our conversation last week about your startup — I came across this article on founder psychology and immediately thought of you. Hope you're crushing it! Let's grab coffee again soon, my treat ☕"
          </p>
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-gray-500">Tailored from 12 interaction memories</span>
            <div className="ml-auto flex gap-1">
              <button className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30 hover:bg-purple-500/30 transition-colors">Copy</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-300">
          <Zap className="h-3.5 w-3.5 shrink-0" /> Birthday in 3 days! AI has prepared special suggestions.
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Analytics & Insights",
    subtitle: "Understand your relationship patterns",
    color: "from-emerald-500/20 to-teal-500/10",
    accent: "text-emerald-400",
    accentBorder: "border-emerald-500/30",
    icon: BarChart2,
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "People", value: "24", icon: "👥", color: "text-primary" },
            { label: "Interactions", value: "128", icon: "💬", color: "text-blue-400" },
            { label: "Avg. Trust", value: "82%", icon: "🤝", color: "text-emerald-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
              <div className="text-xl mb-1">{stat.icon}</div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-semibold">Most Active Relationships</p>
          {["Kwame Asante", "Amara Osei", "Sarah Mitchell"].map((name, i) => (
            <div key={name} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-4">{i + 1}</span>
              <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-primary to-blue-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${85 - i * 15}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                />
              </div>
              <span className="text-xs text-gray-400 w-20 truncate">{name}</span>
            </div>
          ))}
        </div>
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex gap-2 items-start">
          <Brain className="h-3.5 w-3.5 shrink-0 mt-0.5" /> You haven't connected with Jordan Rivers in 3 weeks. Time to reach out!
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: "Smart Reminders",
    subtitle: "Never forget an important moment again",
    color: "from-yellow-500/20 to-orange-500/10",
    accent: "text-yellow-400",
    accentBorder: "border-yellow-500/30",
    icon: Calendar,
    content: (
      <div className="space-y-3">
        {[
          { title: "Call Kwame", desc: "Monthly check-in", date: "Today at 5:00 PM", emoji: "📞", urgent: true },
          { title: "Amara's Birthday 🎂", desc: "Send birthday wishes", date: "In 3 days", emoji: "🎉", urgent: true },
          { title: "Coffee with Sarah", desc: "Project debrief", date: "Next Monday", emoji: "☕", urgent: false },
          { title: "Follow up with Jordan", desc: "About career advice", date: "Next week", emoji: "💼", urgent: false },
        ].map((r) => (
          <div key={r.title} className={`flex items-center gap-3 bg-white/5 rounded-xl p-3 border ${r.urgent ? "border-yellow-500/30 bg-yellow-500/5" : "border-white/5"}`}>
            <span className="text-base">{r.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{r.title}</p>
              <p className="text-xs text-gray-500">{r.desc}</p>
            </div>
            <span className={`text-xs shrink-0 ${r.urgent ? "text-yellow-400 font-medium" : "text-gray-500"}`}>{r.date}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    id: 7,
    title: "PlayLab 🎮",
    subtitle: "Play relationship-powered mini-games with friends",
    color: "from-pink-500/20 to-indigo-500/10",
    accent: "text-pink-400",
    accentBorder: "border-pink-500/30",
    icon: Gamepad2,
    content: (
      <div className="space-y-4">
        <p className="text-xs text-gray-400 leading-relaxed">
          PlayLab turns your HumanOS network into a playground. Compete with friends, earn coins, and level up your vocabulary, memory, and strategy skills — all powered by your real connections.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Chaos Alphabet", desc: "Race to name things A–Z", emoji: "🔤", color: "border-primary/30 bg-primary/5", badge: "Multiplayer" },
            { name: "Word Chemy", desc: "Craft words from letter potions", emoji: "⚗️", color: "border-emerald-500/30 bg-emerald-500/5", badge: "Solo" },
            { name: "Memory Hunter", desc: "Find hidden pairs under pressure", emoji: "🧠", color: "border-blue-500/30 bg-blue-500/5", badge: "Multiplayer" },
            { name: "Secret Card Hunt", desc: "Outsmart opponents card by card", emoji: "🃏", color: "border-yellow-500/30 bg-yellow-500/5", badge: "Solo" },
            { name: "Creature Forge", desc: "Build mythical creatures from elements", emoji: "🐉", color: "border-rose-500/30 bg-rose-500/5", badge: "Solo" },
            { name: "Country War", desc: "Geographic trivia battle royale", emoji: "🌍", color: "border-teal-500/30 bg-teal-500/5", badge: "Multiplayer" },
          ].map((game) => (
            <div key={game.name} className={`rounded-xl p-3 border ${game.color} flex flex-col gap-1`}>
              <div className="flex items-center justify-between">
                <span className="text-lg">{game.emoji}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400 font-medium">{game.badge}</span>
              </div>
              <p className="text-xs font-semibold text-white mt-1">{game.name}</p>
              <p className="text-[11px] text-gray-500 leading-snug">{game.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-xs text-pink-300">
          <Gamepad2 className="h-3.5 w-3.5 shrink-0" /> Invite friends via their HumanOS handle and play live!
        </div>
      </div>
    )
  },
]

// ------- Demo Modal -------
function DemoModal({ onClose }: { onClose: () => void }) {
  const [slide, setSlide] = useState(0)
  const current = DEMO_SLIDES[slide]
  const Icon = current.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Top Gradient strip */}
        <div className={`h-1 w-full bg-gradient-to-r ${current.color.replace('/20', '').replace('/10', '')} opacity-70`} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${current.color} flex items-center justify-center border ${current.accentBorder}`}>
              <Icon className={`h-5 w-5 ${current.accent}`} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">{current.title}</h2>
              <p className="text-xs text-gray-400">{current.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Slide Indicator */}
        <div className="flex items-center gap-1.5 px-6 py-2">
          {DEMO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? `w-6 bg-primary` : "w-1.5 bg-white/20 hover:bg-white/40"}`}
            />
          ))}
          <span className="ml-auto text-xs text-gray-500">{slide + 1} / {DEMO_SLIDES.length}</span>
        </div>

        {/* Slide Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {current.content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Nav */}
        <div className="flex items-center justify-between p-4 border-t border-white/5 bg-black/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSlide(s => Math.max(0, s - 1))}
            disabled={slide === 0}
            className="gap-1 text-gray-400 hover:text-white disabled:opacity-20"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          {slide < DEMO_SLIDES.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setSlide(s => s + 1)}
              className="gap-1 bg-primary hover:bg-primary/80"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Link href="/login">
              <Button size="sm" className="gap-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500">
                Get Started <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ------- Landing Page -------
export default function Home() {
  const [showDemo, setShowDemo] = useState(false)

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
          <Button
            variant="glass"
            size="lg"
            className="h-12 px-8 text-lg rounded-full border-white/10 hover:bg-white/10"
            onClick={() => setShowDemo(true)}
          >
            View Demo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Memory &gt; Messaging</h3>
            <p className="text-gray-400 text-sm">The system remembers context, hobbies, and emotional history so you don&apos;t have to.</p>
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
            <h3 className="text-lg font-semibold mb-2">Private &amp; Secure</h3>
            <p className="text-gray-400 text-sm">No passive tracking. No scraping. Your data belongs entirely to you.</p>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-bold text-lg tracking-tight text-white">HumanOS</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                A living memory system for your most meaningful relationships. Private by design. Intelligent by nature.
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs text-primary font-medium">Phase 1 MVP — Now Live</span>
              </div>
            </div>

            {/* Product */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-300 tracking-wider uppercase">Product</p>
              <ul className="space-y-2.5">
                {[
                  { label: "Get Started", href: "/login" },
                  { label: "View Demo", href: "#", onClick: true },
                  { label: "PlayLab Games", href: "/dashboard/playlab" },
                  { label: "Network Graph", href: "/dashboard/network" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal & Help */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-300 tracking-wider uppercase">Legal & Help</p>
              <ul className="space-y-2.5">
                {[
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "FAQ", href: "/faq" },
                  { label: "Contact Support", href: "mailto:support@humanos.app" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} HumanOS. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
              <Link href="/faq" className="hover:text-gray-400 transition-colors">FAQ</Link>
              <a href="mailto:support@humanos.app" className="hover:text-gray-400 transition-colors">support@humanos.app</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
