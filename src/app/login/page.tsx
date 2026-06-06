"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mail, Lock, ArrowLeft, ArrowRight, Eye, EyeOff, AlertCircle,
  Sparkles, Check, Shield, Brain, Heart
} from "lucide-react"

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────
const AVATARS = ["K", "A", "S", "J", "M", "O", "R", "E", "L", "T"]
const EMOJI_PARTICLES = ["❤️", "😊", "🤝", "💬", "⭐", "✨"]
const NODE_COUNT = 22
const CONNECT_DIST = 170

// ────────────────────────────────────────────────────────────────────────────
// Network Canvas Background
// ────────────────────────────────────────────────────────────────────────────
interface NetNode {
  x: number; y: number; vx: number; vy: number
  r: number; opacity: number; avatar: string; pulse: number
}

function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<NetNode[]>([])
  const animRef = useRef<number>(0)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    nodesRef.current = Array.from({ length: NODE_COUNT }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 5 + 8,
      opacity: Math.random() * 0.4 + 0.15,
      avatar: AVATARS[i % AVATARS.length],
      pulse: Math.random() * Math.PI * 2,
    }))

    const draw = () => {
      frameRef.current++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const nodes = nodesRef.current
      const t = frameRef.current * 0.012

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < -60) n.x = canvas.width + 60
        if (n.x > canvas.width + 60) n.x = -60
        if (n.y < -60) n.y = canvas.height + 60
        if (n.y > canvas.height + 60) n.y = -60
        n.pulse += 0.02
      })

      // Lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECT_DIST) {
            const baseAlpha = (1 - dist / CONNECT_DIST) * 0.25
            const pulse = Math.sin(t + nodes[i].pulse) * 0.08
            ctx.beginPath()
            const grad = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y)
            grad.addColorStop(0, `rgba(139,92,246,${baseAlpha + pulse})`)
            grad.addColorStop(0.5, `rgba(99,102,241,${(baseAlpha + pulse) * 1.4})`)
            grad.addColorStop(1, `rgba(139,92,246,${baseAlpha + pulse})`)
            ctx.strokeStyle = grad
            ctx.lineWidth = 1
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Nodes
      nodes.forEach(n => {
        const breathe = 1 + Math.sin(n.pulse) * 0.15
        const r = n.r * breathe

        // Outer glow
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.5)
        glow.addColorStop(0, `rgba(139,92,246,${n.opacity * 0.25})`)
        glow.addColorStop(1, "rgba(0,0,0,0)")
        ctx.beginPath()
        ctx.fillStyle = glow
        ctx.arc(n.x, n.y, r * 3.5, 0, Math.PI * 2)
        ctx.fill()

        // Circle
        const fill = ctx.createRadialGradient(n.x - r * 0.3, n.y - r * 0.3, 0, n.x, n.y, r)
        fill.addColorStop(0, `rgba(160,120,255,${n.opacity * 0.9})`)
        fill.addColorStop(1, `rgba(100,60,200,${n.opacity * 0.6})`)
        ctx.beginPath()
        ctx.fillStyle = fill
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fill()

        // Letter
        ctx.fillStyle = `rgba(255,255,255,${n.opacity * 1.2})`
        ctx.font = `bold ${r * 0.9}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(n.avatar, n.x, n.y)
      })

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animRef.current) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.55 }} />
}

// ────────────────────────────────────────────────────────────────────────────
// Ambient Emoji Particles
// ────────────────────────────────────────────────────────────────────────────
function AmbientParticle({ emoji, delay, left }: { emoji: string; delay: number; left: number }) {
  return (
    <motion.div
      className="fixed text-sm pointer-events-none select-none z-0"
      style={{ left: `${left}%`, bottom: "-5%" }}
      animate={{ y: [0, -900], opacity: [0, 0.35, 0.35, 0] }}
      transition={{ duration: 14 + Math.random() * 8, delay, repeat: Infinity, ease: "linear" }}
    >
      {emoji}
    </motion.div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Connection Ring (logo hover)
// ────────────────────────────────────────────────────────────────────────────
function ConnectionRing({ id }: { id: number }) {
  return (
    <motion.div
      className="absolute rounded-full border border-primary/60 pointer-events-none"
      style={{ width: 56, height: 56, top: "50%", left: "50%", x: "-50%", y: "-50%" }}
      initial={{ scale: 1, opacity: 0.8 }}
      animate={{ scale: 3.5, opacity: 0 }}
      transition={{ duration: 1.4, ease: "easeOut" }}
    />
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Side Hologram Panels
// ────────────────────────────────────────────────────────────────────────────
const MOODS = [{ emoji: "😊", label: "Feeling Great" }, { emoji: "😌", label: "At Peace" }, { emoji: "🔥", label: "Energised" }, { emoji: "😄", label: "Happy" }]

function MoodPanel() {
  const [idx, setIdx] = useState(0)
  useEffect(() => { const t = setInterval(() => setIdx(i => (i + 1) % MOODS.length), 4000); return () => clearInterval(t) }, [])
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.5, duration: 0.7, ease: "easeOut" }}
      className="hidden lg:flex flex-col items-center gap-3 p-5 rounded-2xl border border-purple-500/20 w-44 shrink-0"
      style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", boxShadow: "0 0 40px rgba(139,92,246,0.12)" }}
    >
      <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Mood Check</p>
      <motion.div key={idx} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl">
        {MOODS[idx].emoji}
      </motion.div>
      <motion.p key={`l${idx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-gray-300 font-medium">
        {MOODS[idx].label}
      </motion.p>
      <p className="text-[10px] text-gray-500">How are you feeling?</p>
      <div className="w-full h-px bg-white/10" />
      <div className="flex items-end gap-0.5 h-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div key={i} className="w-1 bg-purple-400/60 rounded-sm"
            animate={{ height: ["3px", `${Math.random() * 14 + 4}px`, "3px"] }}
            transition={{ duration: 1.4, delay: i * 0.08, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
      <p className="text-[9px] text-gray-600">Today, {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
    </motion.div>
  )
}

function ConnectionPanel() {
  const [strength, setStrength] = useState(85)
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    const t = setInterval(() => {
      setStrength(s => Math.min(100, Math.max(65, s + Math.floor(Math.random() * 7) - 3)))
      setPulse(true)
      setTimeout(() => setPulse(false), 400)
    }, 2500)
    return () => clearInterval(t)
  }, [])
  const col = strength > 80 ? "#10b981" : strength > 65 ? "#f59e0b" : "#ef4444"
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.7, duration: 0.7, ease: "easeOut" }}
      className="hidden lg:flex flex-col items-center gap-3 p-5 rounded-2xl border border-emerald-500/20 w-44 shrink-0"
      style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", boxShadow: "0 0 40px rgba(16,185,129,0.1)" }}
    >
      <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Connection</p>
      <motion.div animate={{ scale: pulse ? 1.25 : 1 }} transition={{ duration: 0.3 }} className="text-4xl"
        style={{ filter: `drop-shadow(0 0 14px ${col})` }}>
        ❤️
      </motion.div>
      <div className="text-center">
        <motion.p key={strength} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
          className="text-2xl font-extrabold" style={{ color: col }}>{strength}%</motion.p>
        <p className="text-[10px] text-gray-400">{strength > 80 ? "Strong" : "Growing"}</p>
      </div>
      <div className="w-full h-px bg-white/10" />
      <div className="flex items-end gap-0.5 h-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div key={i} className="w-1 rounded-sm"
            style={{ backgroundColor: `${col}88` }}
            animate={{ height: ["3px", `${Math.random() * 14 + 4}px`, "3px"] }}
            transition={{ duration: 1.6, delay: i * 0.1, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
      <p className="text-[9px] text-gray-600">Live sync active</p>
    </motion.div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Login Success Transition
// ────────────────────────────────────────────────────────────────────────────
function SuccessTransition() {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "rgba(0,0,0,0.96)" }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2
          const len = 250 + (i % 3) * 80
          return (
            <motion.line key={i}
              x1="50%" y1="50%"
              x2={`calc(50% + ${Math.cos(angle) * len}px)`}
              y2={`calc(50% + ${Math.sin(angle) * len}px)`}
              stroke="rgba(139,92,246,0.7)" strokeWidth="1.5"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: [0, 1, 0.6, 0], pathLength: 1 }}
              transition={{ duration: 1.6, delay: 0.2 + i * 0.04, ease: "easeOut" }}
            />
          )
        })}
        {/* Dots at line ends */}
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2
          const len = 250 + (i % 3) * 80
          const cx = 50 + (Math.cos(angle) * len / window.innerWidth * 100)
          const cy = 50 + (Math.sin(angle) * len / window.innerHeight * 100)
          return (
            <motion.circle key={`d${i}`} cx={`${cx}%`} cy={`${cy}%`} r="4"
              fill="rgba(139,92,246,0.9)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 0.8, delay: 0.8 + i * 0.04 }}
            />
          )
        })}
      </svg>

      <div className="relative flex items-center justify-center">
        {[1, 2, 3, 4].map(i => (
          <motion.div key={i}
            className="absolute rounded-full border border-primary/50"
            initial={{ width: 48, height: 48, scale: 1, opacity: 0.8 }}
            animate={{ scale: 7 * i, opacity: 0 }}
            transition={{ duration: 1.8, delay: i * 0.18, ease: "easeOut" }}
          />
        ))}
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -30 }}
          animate={{ scale: [0, 1.3, 1], opacity: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: "backOut" }}
          className="h-16 w-16 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 0 50px rgba(124,58,237,0.9)" }}
        >
          <Sparkles className="h-8 w-8 text-white" />
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-10 text-white font-semibold text-lg tracking-widest"
      >
        Entering your network...
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="mt-2 text-gray-400 text-sm"
      >
        Building connections
      </motion.p>
    </motion.div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main Login Page
// ────────────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [emailValid, setEmailValid] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [rings, setRings] = useState<number[]>([])
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 })
  const [spotPos, setSpotPos] = useState({ x: 50, y: 50 })
  const ringCountRef = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const particles = Array.from({ length: 14 }, (_, i) => ({
    emoji: EMOJI_PARTICLES[i % EMOJI_PARTICLES.length],
    delay: i * 2.2,
    left: (i * 7.3) % 95,
  }))

  // Mouse → spotlight + card tilt
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setSpotPos({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 })
      if (cardRef.current) {
        const r = cardRef.current.getBoundingClientRect()
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
        if (Math.abs(dx) < 2.5 && Math.abs(dy) < 2.5) {
          setCardTilt({ x: dy * 5, y: -dx * 5 })
        } else {
          setCardTilt({ x: 0, y: 0 })
        }
      }
    }
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [])

  useEffect(() => { setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) }, [email])

  const triggerRings = () => {
    [0, 1, 2].forEach(i => {
      setTimeout(() => {
        const id = ringCountRef.current++
        setRings(r => [...r, id])
        setTimeout(() => setRings(r => r.filter(x => x !== id)), 1500)
      }, i * 250)
    })
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match."); return
    }
    setLoading(true); setError(null)
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setLoginSuccess(true)
        setTimeout(() => { router.push("/dashboard"); router.refresh() }, 2200)
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard` },
        })
        if (error) throw error
        if (data.session) {
          setLoginSuccess(true)
          setTimeout(() => { router.push("/dashboard"); router.refresh() }, 2200)
        } else {
          setSignupSuccess(true)
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">

      {/* ── Aurora gradient ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(135deg,#06000f 0%,#0d0030 35%,#060020 65%,#04000d 100%)",
        backgroundSize: "400% 400%",
        animation: "gradientShift 20s ease infinite",
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(139,92,246,0.18) 0%,transparent 100%), radial-gradient(ellipse 50% 50% at 80% 75%, rgba(79,70,229,0.12) 0%,transparent 100%)",
        animation: "aurora 18s ease-in-out infinite alternate",
      }} />

      {/* ── Network ── */}
      <NetworkCanvas />

      {/* ── Spotlight ── */}
      <div className="absolute inset-0 pointer-events-none z-10 transition-all duration-75" style={{
        background: `radial-gradient(circle 240px at ${spotPos.x}% ${spotPos.y}%, rgba(139,92,246,0.07) 0%, transparent 70%)`,
      }} />

      {/* ── Particles ── */}
      {particles.map((p, i) => <AmbientParticle key={i} {...p} />)}

      {/* ── Back link ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="absolute top-5 left-5 z-30">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>
      </motion.div>

      {/* ── Main layout ── */}
      <div className="relative z-20 flex items-center justify-center gap-8 w-full max-w-5xl px-4 py-12">

        <MoodPanel />

        {/* ── Glass Card ── */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          className="w-full max-w-md flex-shrink-0 relative"
          style={{
            transform: `perspective(1200px) rotateX(${cardTilt.x}deg) rotateY(${cardTilt.y}deg)`,
            transition: "transform 0.12s ease-out",
          }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/10 p-7"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(32px)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 80px rgba(139,92,246,0.07)",
            }}
          >
            {/* Light sweep */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              <div className="absolute inset-0" style={{
                background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)",
                animation: "sweepMove 9s ease-in-out infinite",
              }} />
            </div>

            <AnimatePresence mode="wait">
              {!signupSuccess ? (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                  {/* Logo */}
                  <div className="text-center mb-6">
                    <motion.div
                      className="relative mx-auto w-fit mb-4 cursor-pointer"
                      onHoverStart={triggerRings}
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 1.0, type: "spring", stiffness: 260 }}
                        className="h-14 w-14 rounded-full flex items-center justify-center mx-auto"
                        style={{
                          background: "linear-gradient(135deg,rgba(139,92,246,0.35),rgba(79,70,229,0.2))",
                          boxShadow: "0 0 35px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
                        }}
                      >
                        <Sparkles className="h-7 w-7 text-primary" />
                      </motion.div>
                      {rings.map(id => <ConnectionRing key={id} id={id} />)}
                    </motion.div>

                    <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }}
                      className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                      HumanOS
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.15 }}
                      className="text-sm text-gray-400 mt-1">
                      Your personal relationship intelligence platform.
                    </motion.p>
                  </div>

                  {/* Tabs */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25 }}
                    className="relative flex p-1 bg-black/55 border border-white/10 rounded-xl mb-5">
                    {(["login", "signup"] as const).map(m => (
                      <button key={m} type="button"
                        onClick={() => { setMode(m); setError(null) }}
                        className={`relative flex-1 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${mode === m ? "text-white" : "text-gray-400 hover:text-white"}`}
                      >
                        {mode === m && (
                          <motion.div layoutId="tab-indicator"
                            className="absolute inset-0 bg-white/10 rounded-lg border border-white/15"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                        )}
                        <span className="relative z-10">{m === "login" ? "Sign In" : "Create Account"}</span>
                      </button>
                    ))}
                  </motion.div>

                  {/* Form */}
                  <form onSubmit={handleAuth} className="space-y-4">
                    {/* Email */}
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.35 }}
                      className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 tracking-widest">EMAIL ADDRESS</label>
                      <div className="relative">
                        <div className="absolute inset-0 rounded-xl pointer-events-none transition-all duration-300" style={{
                          boxShadow: emailFocused ? "0 0 0 1.5px rgba(139,92,246,0.7), 0 0 24px rgba(139,92,246,0.18)" : "none",
                        }} />
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-300"
                          style={{ color: emailFocused ? "#a78bfa" : "#6b7280" }} />
                        <Input type="email" placeholder="you@example.com" value={email} required
                          onChange={e => setEmail(e.target.value)}
                          onFocus={() => setEmailFocused(true)}
                          onBlur={() => setEmailFocused(false)}
                          className="pl-10 pr-10 bg-black/55 border-white/10 focus:border-primary/50 text-white h-11 rounded-xl"
                        />
                        <AnimatePresence>
                          {emailValid && (
                            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/20">
                              <Check className="h-3 w-3 text-emerald-400" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>

                    {/* Password */}
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.45 }}
                      className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 tracking-widest">PASSWORD</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} required
                          onChange={e => setPassword(e.target.value)}
                          className="pl-10 pr-10 bg-black/55 border-white/10 focus:border-primary/50 text-white h-11 rounded-xl"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </motion.div>

                    {/* Confirm password */}
                    <AnimatePresence initial={false}>
                      {mode === "signup" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-400 tracking-widest">CONFIRM PASSWORD</label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword}
                              required={mode === "signup"} onChange={e => setConfirmPassword(e.target.value)}
                              className="pl-10 bg-black/55 border-white/10 focus:border-primary/50 text-white h-11 rounded-xl"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <motion.button
                      type="submit" disabled={loading}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.55 }}
                      whileHover={{ scale: 1.02, boxShadow: "0 8px 40px rgba(124,58,237,0.6)" }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 group relative overflow-hidden mt-1"
                      style={{
                        background: "linear-gradient(135deg,#7c3aed 0%,#6d28d9 50%,#5b21b6 100%)",
                        boxShadow: "0 4px 30px rgba(124,58,237,0.4)",
                      }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{ background: "linear-gradient(110deg,transparent 20%,rgba(255,255,255,0.18) 50%,transparent 80%)" }} />
                      {loading
                        ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        : <><span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                      }
                    </motion.button>
                  </form>

                  {/* Feature badges */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}
                    className="mt-5 grid grid-cols-3 gap-2">
                    {[
                      { icon: <Brain className="h-3.5 w-3.5" />, label: "Smart Insights", sub: "AI-powered" },
                      { icon: <Shield className="h-3.5 w-3.5" />, label: "Private & Secure", sub: "End-to-end" },
                      { icon: <Heart className="h-3.5 w-3.5" />, label: "Human First", sub: "Built for real" },
                    ].map(f => (
                      <div key={f.label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/3 border border-white/5 text-center">
                        <div className="text-primary">{f.icon}</div>
                        <p className="text-[10px] font-semibold text-white">{f.label}</p>
                        <p className="text-[9px] text-gray-500">{f.sub}</p>
                      </div>
                    ))}
                  </motion.div>
                </motion.div>

              ) : (
                /* Signup success */
                <motion.div key="verify" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center space-y-5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20"
                    style={{ boxShadow: "0 0 30px rgba(16,185,129,0.25)" }}>
                    <Mail className="h-8 w-8 text-emerald-400 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Check your email</h3>
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                      Confirmation link sent to <span className="text-emerald-400 font-semibold">{email}</span>
                    </p>
                  </div>
                  <button onClick={() => { setSignupSuccess(false); setMode("login"); setPassword(""); setConfirmPassword(""); setError(null) }}
                    className="text-xs text-gray-500 hover:text-white transition-colors">
                    ← Back to Sign In
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <ConnectionPanel />
      </div>

      {/* ── Success Transition ── */}
      <AnimatePresence>{loginSuccess && <SuccessTransition />}</AnimatePresence>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes gradientShift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes aurora {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes sweepMove {
          0%,40% { transform: translateX(-120%); }
          55%,100% { transform: translateX(220%); }
        }
      `}</style>
    </div>
  )
}
