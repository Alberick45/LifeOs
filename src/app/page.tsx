"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import {
  Sparkles, Brain, Heart, Shield, X, ChevronLeft, ChevronRight,
  Users, BarChart2, Calendar, MessageCircle, Star, Zap, Plus, Gamepad2,
  ArrowRight, Network
} from "lucide-react"

// ────────────────────────────────────────────────────────────────────────────
// Floating particle nodes canvas
// ────────────────────────────────────────────────────────────────────────────
interface FNode { x: number; y: number; vx: number; vy: number; r: number; pulse: number; label: string }
const LABELS = ["K","A","S","J","M","O","R","E","L","T","B","D","P","N"]

function BackgroundCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  const nodes = useRef<FNode[]>([])
  const raf = useRef(0)
  const frame = useRef(0)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext("2d")!
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener("resize", resize)

    nodes.current = Array.from({ length: 26 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 5 + 7,
      pulse: Math.random() * Math.PI * 2,
      label: LABELS[i % LABELS.length],
    }))

    const draw = () => {
      frame.current++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const ns = nodes.current

      ns.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.018
        if (n.x < -50) n.x = canvas.width + 50
        if (n.x > canvas.width + 50) n.x = -50
        if (n.y < -50) n.y = canvas.height + 50
        if (n.y > canvas.height + 50) n.y = -50
      })

      // Lines
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[i].x - ns[j].x, dy = ns[i].y - ns[j].y
          const d = Math.sqrt(dx*dx + dy*dy)
          if (d < 200) {
            const a = (1 - d / 200) * 0.18 * (0.6 + Math.sin(ns[i].pulse) * 0.4)
            ctx.beginPath()
            ctx.strokeStyle = `rgba(139,92,246,${a})`
            ctx.lineWidth = 1
            ctx.moveTo(ns[i].x, ns[i].y)
            ctx.lineTo(ns[j].x, ns[j].y)
            ctx.stroke()
          }
        }
      }

      // Nodes
      ns.forEach(n => {
        const b = 1 + Math.sin(n.pulse) * 0.12
        const r = n.r * b
        const a = 0.12 + Math.sin(n.pulse + 1) * 0.04

        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4)
        g.addColorStop(0, `rgba(139,92,246,${a})`)
        g.addColorStop(1, "transparent")
        ctx.beginPath(); ctx.fillStyle = g; ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2); ctx.fill()

        const f = ctx.createRadialGradient(n.x - r*.3, n.y - r*.3, 0, n.x, n.y, r)
        f.addColorStop(0, `rgba(180,140,255,${a*4})`)
        f.addColorStop(1, `rgba(100,60,200,${a*3})`)
        ctx.beginPath(); ctx.fillStyle = f; ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill()

        ctx.fillStyle = `rgba(255,255,255,${a*4.5})`
        ctx.font = `bold ${r*.85}px sans-serif`
        ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText(n.label, n.x, n.y)
      })

      raf.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf.current) }
  }, [])

  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.5 }} />
}

// ────────────────────────────────────────────────────────────────────────────
// Demo slides
// ────────────────────────────────────────────────────────────────────────────
const DEMO_SLIDES = [
  {
    id: 1, title: "Your People Network", subtitle: "Everyone who matters, all in one place",
    color: "from-primary/20 to-blue-500/10", accent: "text-primary", accentBorder: "border-primary/30", icon: Users,
    content: (
      <div className="space-y-3">
        {[
          { name: "Kwame Asante", role: "Best Friend", strength: 92, trust: 88, avatar: "K", color: "bg-primary/20 text-primary" },
          { name: "Sarah Mitchell", role: "Colleague", strength: 75, trust: 81, avatar: "S", color: "bg-blue-500/20 text-blue-400" },
          { name: "Jordan Rivers", role: "Mentor", strength: 60, trust: 95, avatar: "J", color: "bg-emerald-500/20 text-emerald-400" },
          { name: "Amara Osei", role: "Family", strength: 88, trust: 97, avatar: "A", color: "bg-rose-500/20 text-rose-400" },
        ].map(p => (
          <div key={p.name} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors">
            <div className={`h-9 w-9 rounded-full ${p.color} flex items-center justify-center font-bold text-sm shrink-0`}>{p.avatar}</div>
            <div className="flex-1"><p className="font-semibold text-sm text-white">{p.name}</p><p className="text-xs text-gray-500">{p.role}</p></div>
            <div className="flex gap-2 text-xs"><span className="text-primary">💪 {p.strength}</span><span className="text-emerald-400">🤝 {p.trust}</span></div>
          </div>
        ))}
        <div className="flex items-center gap-2 p-3 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm hover:border-primary/30 hover:text-primary transition-colors cursor-pointer">
          <Plus className="h-4 w-4" /> Add a new connection…
        </div>
      </div>
    )
  },
  {
    id: 2, title: "Relationship Health", subtitle: "Track strength & trust with visual scores",
    color: "from-rose-500/20 to-orange-500/10", accent: "text-rose-400", accentBorder: "border-rose-500/30", icon: Heart,
    content: (
      <div className="space-y-5 py-2">
        {[
          { label: "Relationship Strength", value: 88, color: "bg-rose-500", text: "text-rose-400" },
          { label: "Trust Score", value: 95, color: "bg-emerald-500", text: "text-emerald-400" },
          { label: "Interaction Frequency", value: 72, color: "bg-blue-500", text: "text-blue-400" },
          { label: "Sentiment Health", value: 80, color: "bg-yellow-500", text: "text-yellow-400" },
        ].map(bar => (
          <div key={bar.label}>
            <div className="flex justify-between text-sm mb-1.5"><span className="text-gray-400">{bar.label}</span><span className={`font-bold ${bar.text}`}>{bar.value}%</span></div>
            <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
              <motion.div className={`${bar.color} h-full rounded-full`} initial={{ width: 0 }} animate={{ width: `${bar.value}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.2 }} />
            </div>
          </div>
        ))}
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <Star className="h-3.5 w-3.5 shrink-0" /> Strong relationship! You last connected 3 days ago.
        </div>
      </div>
    )
  },
  {
    id: 3, title: "Interaction Timeline", subtitle: "A living memory of every conversation",
    color: "from-blue-500/20 to-purple-500/10", accent: "text-blue-400", accentBorder: "border-blue-500/30", icon: MessageCircle,
    content: (
      <div className="space-y-4">
        {[
          { type: "meet", note: "Had coffee at Osu. Talked about their new startup idea. Super energised!", date: "2 days ago", emoji: "☕", border: "border-l-emerald-500" },
          { type: "call", note: "Quick check-in call. Discussed the project timeline and next steps.", date: "1 week ago", emoji: "📞", border: "border-l-blue-500" },
          { type: "text", note: "Sent them the article on AI they were looking for. They loved it!", date: "2 weeks ago", emoji: "💬", border: "border-l-primary" },
          { type: "gift", note: "Sent birthday gift 🎂 — they were genuinely surprised and happy.", date: "3 weeks ago", emoji: "🎁", border: "border-l-rose-500" },
        ].map(item => (
          <div key={item.note} className={`bg-white/5 rounded-xl p-3 border border-white/5 border-l-2 ${item.border}`}>
            <div className="flex items-center gap-2 mb-1"><span className="text-base">{item.emoji}</span><span className="capitalize text-xs font-semibold text-white">{item.type}</span><span className="text-xs text-gray-500 ml-auto">{item.date}</span></div>
            <p className="text-xs text-gray-400 leading-relaxed">{item.note}</p>
          </div>
        ))}
      </div>
    )
  },
  {
    id: 4, title: "AI Magic Generator", subtitle: "AI-crafted gifts, messages & poems",
    color: "from-purple-500/20 to-pink-500/10", accent: "text-purple-400", accentBorder: "border-purple-500/30", icon: Sparkles,
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {["Gift","Message","Poem","Website"].map(t => (
            <div key={t} className={`p-2 rounded-xl border text-xs font-medium text-center cursor-pointer ${t==="Message"?"bg-purple-500/20 border-purple-500/50 text-purple-300":"bg-black/40 border-white/5 text-gray-400 hover:border-white/10"}`}>{t}</div>
          ))}
        </div>
        <div className="bg-black/40 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-purple-400 animate-pulse"/><span className="text-sm font-semibold text-purple-300">AI Generated Message</span></div>
          <p className="text-sm text-gray-300 leading-relaxed italic">"Hey Kwame! I was just thinking about our conversation about your startup — I came across this article on founder psychology and immediately thought of you. Let's grab coffee again soon, my treat ☕"</p>
          <div className="flex items-center pt-2"><span className="text-xs text-gray-500">Tailored from 12 interaction memories</span><button className="ml-auto px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30">Copy</button></div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-300"><Zap className="h-3.5 w-3.5 shrink-0"/>Birthday in 3 days! AI has prepared special suggestions.</div>
      </div>
    )
  },
  {
    id: 5, title: "Analytics & Insights", subtitle: "Understand your relationship patterns",
    color: "from-emerald-500/20 to-teal-500/10", accent: "text-emerald-400", accentBorder: "border-emerald-500/30", icon: BarChart2,
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[{label:"People",value:"24",icon:"👥",color:"text-primary"},{label:"Interactions",value:"128",icon:"💬",color:"text-blue-400"},{label:"Avg. Trust",value:"82%",icon:"🤝",color:"text-emerald-400"}].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-3 border border-white/5 text-center"><div className="text-xl mb-1">{s.icon}</div><div className={`text-xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-semibold">Most Active Relationships</p>
          {["Kwame Asante","Amara Osei","Sarah Mitchell"].map((name,i) => (
            <div key={name} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-4">{i+1}</span>
              <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                <motion.div className="bg-gradient-to-r from-primary to-blue-500 h-full rounded-full" initial={{width:0}} animate={{width:`${85-i*15}%`}} transition={{duration:0.8,delay:i*0.1}}/>
              </div>
              <span className="text-xs text-gray-400 w-20 truncate">{name}</span>
            </div>
          ))}
        </div>
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex gap-2 items-start"><Brain className="h-3.5 w-3.5 shrink-0 mt-0.5"/>You haven't connected with Jordan Rivers in 3 weeks. Time to reach out!</div>
      </div>
    )
  },
  {
    id: 6, title: "Smart Reminders", subtitle: "Never forget an important moment again",
    color: "from-yellow-500/20 to-orange-500/10", accent: "text-yellow-400", accentBorder: "border-yellow-500/30", icon: Calendar,
    content: (
      <div className="space-y-3">
        {[
          {title:"Call Kwame",desc:"Monthly check-in",date:"Today at 5:00 PM",emoji:"📞",urgent:true},
          {title:"Amara's Birthday 🎂",desc:"Send birthday wishes",date:"In 3 days",emoji:"🎉",urgent:true},
          {title:"Coffee with Sarah",desc:"Project debrief",date:"Next Monday",emoji:"☕",urgent:false},
          {title:"Follow up with Jordan",desc:"About career advice",date:"Next week",emoji:"💼",urgent:false},
        ].map(r => (
          <div key={r.title} className={`flex items-center gap-3 rounded-xl p-3 border ${r.urgent?"border-yellow-500/30 bg-yellow-500/5":"border-white/5 bg-white/5"}`}>
            <span className="text-base">{r.emoji}</span>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white">{r.title}</p><p className="text-xs text-gray-500">{r.desc}</p></div>
            <span className={`text-xs shrink-0 ${r.urgent?"text-yellow-400 font-medium":"text-gray-500"}`}>{r.date}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    id: 7, title: "PlayLab 🎮", subtitle: "Play relationship-powered mini-games with friends",
    color: "from-pink-500/20 to-indigo-500/10", accent: "text-pink-400", accentBorder: "border-pink-500/30", icon: Gamepad2,
    content: (
      <div className="space-y-4">
        <p className="text-xs text-gray-400 leading-relaxed">PlayLab turns your HumanOS network into a playground. Compete with friends, earn coins, and level up — all powered by your real connections.</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {name:"Chaos Alphabet",desc:"Race to name things A–Z",emoji:"🔤",color:"border-primary/30 bg-primary/5",badge:"Multiplayer"},
            {name:"Word Chemy",desc:"Craft words from letter potions",emoji:"⚗️",color:"border-emerald-500/30 bg-emerald-500/5",badge:"Solo"},
            {name:"Memory Hunter",desc:"Find hidden pairs under pressure",emoji:"🧠",color:"border-blue-500/30 bg-blue-500/5",badge:"Multiplayer"},
            {name:"Secret Card Hunt",desc:"Outsmart opponents card by card",emoji:"🃏",color:"border-yellow-500/30 bg-yellow-500/5",badge:"Solo"},
            {name:"Creature Forge",desc:"Build mythical creatures",emoji:"🐉",color:"border-rose-500/30 bg-rose-500/5",badge:"Solo"},
            {name:"Country War",desc:"Geographic trivia battle royale",emoji:"🌍",color:"border-teal-500/30 bg-teal-500/5",badge:"Multiplayer"},
          ].map(g => (
            <div key={g.name} className={`rounded-xl p-3 border ${g.color} flex flex-col gap-1`}>
              <div className="flex items-center justify-between"><span className="text-lg">{g.emoji}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400 font-medium">{g.badge}</span></div>
              <p className="text-xs font-semibold text-white mt-1">{g.name}</p>
              <p className="text-[11px] text-gray-500 leading-snug">{g.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-xs text-pink-300"><Gamepad2 className="h-3.5 w-3.5 shrink-0"/>Invite friends via their HumanOS handle and play live!</div>
      </div>
    )
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Demo Modal
// ────────────────────────────────────────────────────────────────────────────
function DemoModal({ onClose }: { onClose: () => void }) {
  const [slide, setSlide] = useState(0)
  const cur = DEMO_SLIDES[slide]
  const Icon = cur.icon
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md"/>
      <motion.div
        initial={{opacity:0,scale:0.95,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:16}}
        transition={{type:"spring",stiffness:300,damping:28}}
        className="relative w-full max-w-lg rounded-2xl border border-white/10 flex flex-col overflow-hidden"
        style={{background:"rgba(10,0,30,0.9)",backdropFilter:"blur(30px)",boxShadow:"0 30px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)",maxHeight:"90vh"}}
      >
        <div className={`h-0.5 w-full bg-gradient-to-r ${cur.color}`}/>
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${cur.color} flex items-center justify-center border ${cur.accentBorder}`}>
              <Icon className={`h-5 w-5 ${cur.accent}`}/>
            </div>
            <div><h2 className="font-bold text-white text-base">{cur.title}</h2><p className="text-xs text-gray-400">{cur.subtitle}</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><X className="h-4 w-4"/></button>
        </div>
        <div className="flex items-center gap-1.5 px-6 py-2">
          {DEMO_SLIDES.map((_,i) => (
            <button key={i} onClick={()=>setSlide(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i===slide?"w-6 bg-primary":"w-1.5 bg-white/20 hover:bg-white/40"}`}/>
          ))}
          <span className="ml-auto text-xs text-gray-500">{slide+1} / {DEMO_SLIDES.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-4 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div key={slide} initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.22}}>
              {cur.content}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-white/5">
          <button onClick={()=>setSlide(s=>Math.max(0,s-1))} disabled={slide===0} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-20">
            <ChevronLeft className="h-4 w-4"/> Previous
          </button>
          {slide < DEMO_SLIDES.length-1 ? (
            <button onClick={()=>setSlide(s=>s+1)} className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm text-white bg-primary hover:bg-primary/80 transition-colors">
              Next <ChevronRight className="h-4 w-4"/>
            </button>
          ) : (
            <Link href="/login"><button className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm text-white font-semibold transition-colors" style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)"}}>Get Started <Sparkles className="h-3.5 w-3.5"/></button></Link>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Feature cards data
// ────────────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Brain, color: "text-blue-400", bg: "bg-blue-500/10", glow: "rgba(59,130,246,0.15)", title: "Memory > Messaging", desc: "The system remembers context, hobbies, and emotional history so you don't have to." },
  { icon: Heart, color: "text-rose-400", bg: "bg-rose-500/10", glow: "rgba(239,68,68,0.15)", title: "Context > Contacts", desc: "People are evolving profiles connected in a social graph, not just rows in a database." },
  { icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10", glow: "rgba(16,185,129,0.15)", title: "Private & Secure", desc: "No passive tracking. No scraping. Your data belongs entirely to you." },
]

const STATS = [
  { value: "2.5K+", label: "Connections tracked" },
  { value: "128K+", label: "Memories logged" },
  { value: "99.9%", label: "Uptime guaranteed" },
]

// ────────────────────────────────────────────────────────────────────────────
// Main Home Page
// ────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [showDemo, setShowDemo] = useState(false)
  const [spotPos, setSpotPos] = useState({ x: 50, y: 50 })
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => setSpotPos({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 })
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col bg-black text-white overflow-x-hidden">

      {/* ── Aurora background ── */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: "linear-gradient(135deg,#04000f 0%,#0b0028 40%,#060018 70%,#030010 100%)",
        backgroundSize: "400% 400%",
        animation: "gradientShift 22s ease infinite",
      }}/>
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 70% 60% at 15% 25%, rgba(139,92,246,0.14) 0%,transparent 100%), radial-gradient(ellipse 50% 50% at 85% 75%, rgba(79,70,229,0.10) 0%,transparent 100%)",
        animation: "aurora 16s ease-in-out infinite alternate",
      }}/>

      {/* ── Network canvas ── */}
      <BackgroundCanvas />

      {/* ── Cursor spotlight ── */}
      <div className="fixed inset-0 pointer-events-none z-10 transition-all duration-100" style={{
        background: `radial-gradient(circle 300px at ${spotPos.x}% ${spotPos.y}%, rgba(139,92,246,0.07) 0%, transparent 70%)`,
      }}/>

      {/* ════════════════════════════════════════════════════════ HEADER ═══ */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-30 px-6 py-4 flex items-center justify-between sticky top-0"
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 4px 30px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.4),rgba(79,70,229,0.3))", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">HumanOS</span>
        </div>
        <Link href="/login">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-1.5 rounded-full text-sm font-semibold text-white border border-white/15 transition-all"
            style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" }}
          >
            Sign In
          </motion.button>
        </Link>
      </motion.header>

      {/* ════════════════════════════════════════════════════════ HERO ════ */}
      <main className="relative z-20 flex-1">
        <section ref={heroRef} className="flex flex-col items-center justify-center text-center px-4 pt-24 pb-32 min-h-[85vh]">

          {/* Live badge */}
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 mb-10"
            style={{ background: "rgba(139,92,246,0.08)", backdropFilter: "blur(10px)" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"/>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"/>
            </span>
            <span className="text-primary text-sm font-medium">Phase 1 MVP Now Live</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.7 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 leading-[1.05]"
            style={{ background: "linear-gradient(170deg, #ffffff 0%, #e0d7ff 40%, #a78bfa 70%, #7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            The Living Memory System for Human Relationships
          </motion.h1>

          {/* Subheadline */}
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed">
            Not a CRM. Not a contact book. HumanOS remembers what you forget, helping you maintain meaningful relationships with subtle intelligence.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
            className="flex flex-col sm:flex-row gap-4 mb-20">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 10px 50px rgba(124,58,237,0.5)" }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 h-13 px-8 py-3.5 text-base font-bold text-white rounded-full group"
                style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 4px 30px rgba(124,58,237,0.4)" }}
              >
                Get Started <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform"/>
              </motion.button>
            </Link>
            <motion.button
              onClick={() => setShowDemo(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 h-13 px-8 py-3.5 text-base font-semibold text-white rounded-full border border-white/15"
              style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}
            >
              <Network className="h-4 w-4 text-primary" /> View Demo
            </motion.button>
          </motion.div>

          {/* Social proof */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.95 }}
            className="flex flex-col items-center gap-3">
            <div className="flex -space-x-2">
              {["K","A","S","J","M"].map((l,i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-black flex items-center justify-center text-xs font-bold"
                  style={{ background: `hsl(${260 + i*25}, 70%, 45%)`, zIndex: 5-i }}>
                  {l}
                </div>
              ))}
              <div className="h-8 w-8 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold bg-white/10 text-gray-300" style={{ zIndex: 0 }}>+2.5K</div>
            </div>
            <p className="text-xs text-gray-500">Join thousands building deeper connections.</p>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════════════════ STATS ════ */}
        <section className="relative z-20 px-6 pb-20">
          <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4">
            {STATS.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-2xl border border-white/8"
                style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)" }}
              >
                <p className="text-3xl font-extrabold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent mb-1">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ FEATURE CARDS ═ */}
        <section className="relative z-20 px-6 pb-32">
          <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">Built different. For humans.</h2>
              <p className="text-gray-500 text-base max-w-xl mx-auto">Every feature is designed around how real relationships actually work.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <motion.div key={f.title}
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                  whileHover={{ y: -4, boxShadow: `0 20px 60px ${f.glow}` }}
                  className="group p-6 rounded-2xl border border-white/8 text-left cursor-default transition-all duration-300"
                  style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}
                >
                  <div className={`h-12 w-12 rounded-2xl ${f.bg} ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                    style={{ boxShadow: `0 0 20px ${f.glow}` }}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════ CTA BAND ═ */}
        <section className="relative z-20 px-6 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center p-12 rounded-3xl border border-white/10 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.1) 50%, rgba(0,0,0,0.2) 100%)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 0 80px rgba(124,58,237,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div style={{ background: "linear-gradient(110deg,transparent 30%,rgba(255,255,255,0.03) 50%,transparent 70%)", animation: "sweepMove 8s ease-in-out infinite" }} className="absolute inset-0"/>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
              Start remembering what matters.
            </h2>
            <p className="text-gray-400 mb-8 text-lg">Your most important relationships deserve more than a notes app.</p>
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 10px 50px rgba(124,58,237,0.6)" }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white text-lg"
                style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)", boxShadow: "0 4px 30px rgba(124,58,237,0.4)" }}
              >
                Create your free account <ArrowRight className="h-5 w-5" />
              </motion.button>
            </Link>
          </motion.div>
        </section>
      </main>

      {/* ════════════════════════════════════════════════════ FOOTER ════ */}
      <footer className="relative z-20 border-t border-white/6" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-bold text-lg tracking-tight text-white">HumanOS</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">A living memory system for your most meaningful relationships. Private by design. Intelligent by nature.</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"/>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"/>
                </span>
                <span className="text-xs text-primary font-medium">Phase 1 MVP — Now Live</span>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-300 tracking-wider uppercase">Product</p>
              <ul className="space-y-2.5">
                <li><Link href="/login" className="text-sm text-gray-500 hover:text-white transition-colors">Get Started</Link></li>
                <li><button onClick={() => setShowDemo(true)} className="text-sm text-gray-500 hover:text-white transition-colors">View Demo</button></li>
                <li><Link href="/dashboard/playlab" className="text-sm text-gray-500 hover:text-white transition-colors">PlayLab Games</Link></li>
                <li><Link href="/dashboard/network" className="text-sm text-gray-500 hover:text-white transition-colors">Network Graph</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-300 tracking-wider uppercase">Legal & Help</p>
              <ul className="space-y-2.5">
                <li><Link href="/privacy" className="text-sm text-gray-500 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-gray-500 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/faq" className="text-sm text-gray-500 hover:text-white transition-colors">FAQ</Link></li>
                <li><a href="mailto:alberick2020@outlook.com" className="text-sm text-gray-500 hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-600">© {new Date().getFullYear()} HumanOS. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
              <Link href="/faq" className="hover:text-gray-400 transition-colors">FAQ</Link>
              <a href="mailto:alberick2020@outlook.com" className="hover:text-gray-400 transition-colors">alberick2020@outlook.com</a>
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>{showDemo && <DemoModal onClose={() => setShowDemo(false)} />}</AnimatePresence>

      <style>{`
        @keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes aurora { 0%{opacity:.6;transform:scale(1)} 100%{opacity:1;transform:scale(1.06)} }
        @keyframes sweepMove { 0%,40%{transform:translateX(-120%)} 55%,100%{transform:translateX(220%)} }
      `}</style>
    </div>
  )
}
