"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    if (mode === 'signup' && password !== confirmPassword) {
      setError("Passwords do not match.")
      setLoading(false)
      return
    }

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push("/dashboard")
        router.refresh()
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        })
        if (error) throw error
        
        // Supabase returns a session if auto-confirm is enabled or if session is already active.
        if (data.session) {
          router.push("/dashboard")
          router.refresh()
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
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden bg-black">
      {/* Background Decorative Glowing Blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[6000ms]" />

      {/* Back to Home */}
      <Link
        href="/"
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors group z-20"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Back to Home</span>
      </Link>


      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <Card className="glass-panel border-white/10 shadow-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            {!signupSuccess ? (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader className="space-y-3 pb-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary shadow-lg shadow-primary/20">
                    <Sparkles className="h-6 w-6 animate-pulse" />
                  </div>
                  <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                    HumanOS
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-400">
                    Your personal relationship intelligence platform.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Mode Toggle Tabs */}
                  <div className="relative flex p-1 bg-black/60 border border-white/10 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login')
                        setError(null)
                      }}
                      className={`relative flex-1 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${
                        mode === 'login' ? 'text-white' : 'text-gray-400 hover:text-gray-250'
                      }`}
                    >
                      {mode === 'login' && (
                        <motion.div
                          layoutId="active-tab"
                          className="absolute inset-0 bg-white/10 rounded-lg border border-white/10 shadow-sm"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">Sign In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup')
                        setError(null)
                      }}
                      className={`relative flex-1 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${
                        mode === 'signup' ? 'text-white' : 'text-gray-400 hover:text-gray-250'
                      }`}
                    >
                      {mode === 'signup' && (
                        <motion.div
                          layoutId="active-tab"
                          className="absolute inset-0 bg-white/10 rounded-lg border border-white/10 shadow-sm"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">Create Account</span>
                    </button>
                  </div>

                  <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-4">
                      {/* Email Address */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 tracking-wide">EMAIL ADDRESS</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-10 bg-black/50 border-white/10 focus:border-primary/50 text-white h-11 rounded-xl placeholder:text-gray-650"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 tracking-wide">PASSWORD</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="pl-10 pr-10 bg-black/50 border-white/10 focus:border-primary/50 text-white h-11 rounded-xl placeholder:text-gray-650"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password (only on Signup) */}
                      <AnimatePresence initial={false}>
                        {mode === 'signup' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-gray-400 tracking-wide">CONFIRM PASSWORD</label>
                              <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  required={mode === 'signup'}
                                  className="pl-10 bg-black/50 border-white/10 focus:border-primary/50 text-white h-11 rounded-xl placeholder:text-gray-650"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs mt-2"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full text-sm font-semibold h-11 rounded-xl mt-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 text-white shadow-lg shadow-primary/15 transition-all flex items-center justify-center gap-2 group"
                    >
                      {loading ? (
                        <span>Processing...</span>
                      ) : (
                        <>
                          <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </motion.div>
            ) : (
              <motion.div
                key="signup-success"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="p-8 text-center space-y-6"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10 border border-emerald-500/20">
                  <Mail className="h-8 w-8 animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white tracking-tight">Check your email</h3>
                  <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
                    We've sent a secure confirmation link to <span className="text-emerald-400 font-semibold">{email}</span>. 
                    Please verify your email address to activate your account.
                  </p>
                </div>
                
                <div className="pt-4 border-t border-white/5">
                  <Button
                    variant="glass"
                    onClick={() => {
                      setSignupSuccess(false)
                      setMode('login')
                      setPassword("")
                      setConfirmPassword("")
                      setError(null)
                    }}
                    className="text-xs px-6 py-2 border-white/10 hover:bg-white/5 text-gray-300 hover:text-white rounded-xl"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  )
}
