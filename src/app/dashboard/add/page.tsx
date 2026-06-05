"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AddPersonPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    relationship_type: "",
    pronouns: "Rather not say",
    birthday: "",
    strength_score: 50,
    trust_score: 50,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase.from('people').insert([
        {
          user_id: user.id,
          name: formData.name,
          relationship_type: formData.relationship_type,
          pronouns: formData.pronouns,
          birthday: formData.birthday || null,
          strength_score: formData.strength_score,
          trust_score: formData.trust_score,
        }
      ])

      if (error) throw error
      if (typeof window !== "undefined") {
        localStorage.removeItem("lifeos_people_cache")
      }
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      console.error("Error adding person:", error)
      alert("Failed to add person. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Network
      </Link>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-2xl">Add New Connection</CardTitle>
            <CardDescription>Add someone to your HumanOS network to start tracking your relationship.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Full Name</label>
                  <Input 
                    required 
                    placeholder="E.g., Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Relationship Type</label>
                    <Input 
                      placeholder="Family, Friend, Colleague..."
                      value={formData.relationship_type}
                      onChange={(e) => setFormData({...formData, relationship_type: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Pronouns</label>
                    <select 
                      value={formData.pronouns}
                      onChange={(e) => setFormData({...formData, pronouns: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50 [&>option]:bg-zinc-900"
                    >
                      <option value="He/Him">He/Him</option>
                      <option value="She/Her">She/Her</option>
                      <option value="Rather not say">Rather not say</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-gray-300">Birthday</label>
                    <Input 
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="space-y-2">
                    <label className="flex justify-between text-sm font-medium text-gray-300">
                      <span>Relationship Strength</span>
                      <span className="text-primary">{formData.strength_score}%</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      className="w-full accent-primary"
                      value={formData.strength_score}
                      onChange={(e) => setFormData({...formData, strength_score: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex justify-between text-sm font-medium text-gray-300">
                      <span>Trust Score</span>
                      <span className="text-emerald-400">{formData.trust_score}%</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      className="w-full accent-emerald-500"
                      value={formData.trust_score}
                      onChange={(e) => setFormData({...formData, trust_score: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <Link href="/dashboard">
                  <Button type="button" variant="ghost">Cancel</Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add Connection"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
