"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Heart, ShieldAlert, Users, Activity } from "lucide-react"
import { motion } from "framer-motion"
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend
} from 'recharts'

type Person = {
  id: string
  relationship_type: string
  strength_score: number
  trust_score: number
}

type Interaction = {
  id: string
  interaction_date: string
  type: string
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState<Person[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError) throw authError;
      if (!session?.user) return

      const [peopleRes, interactionsRes] = await Promise.all([
        supabase.from('people').select('id, relationship_type, strength_score, trust_score').eq('user_id', session.user.id).eq('is_archived', false),
        supabase.from('interactions').select('id, interaction_date, type').eq('user_id', session.user.id)
      ])

      if (peopleRes.data) setPeople(peopleRes.data)
      if (interactionsRes.data) setInteractions(interactionsRes.data)
      
    } catch (error: any) {
      console.error("Error fetching analytics data", error)
      alert("Failed to load analytics: " + (error.message || "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  // Derived Data for Charts
  const avgStrength = people.length > 0 ? Math.round(people.reduce((sum, p) => sum + p.strength_score, 0) / people.length) : 0;
  const avgTrust = people.length > 0 ? Math.round(people.reduce((sum, p) => sum + p.trust_score, 0) / people.length) : 0;

  // 1. Relationship Distribution
  const typeCount = people.reduce((acc, curr) => {
    const t = curr.relationship_type || "Other";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.keys(typeCount).map(k => ({ name: k, value: typeCount[k] }));

  // 2. Average Health by Type
  const healthByType = Object.keys(typeCount).map(type => {
    const matches = people.filter(p => (p.relationship_type || "Other") === type);
    return {
      name: type,
      Strength: Math.round(matches.reduce((s, p) => s + p.strength_score, 0) / matches.length),
      Trust: Math.round(matches.reduce((s, p) => s + p.trust_score, 0) / matches.length),
    }
  });

  // 3. Interactions over time (Last 6 months)
  const last6MonthsData = () => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleString('default', { month: 'short' });
      
      const count = interactions.filter(int => {
        if (!int.interaction_date) return false;
        const intD = new Date(int.interaction_date);
        return intD.getMonth() === d.getMonth() && intD.getFullYear() === d.getFullYear();
      }).length;
      
      data.push({ name: monthStr, interactions: count });
    }
    return data;
  }
  const areaData = last6MonthsData();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" />
          Network Analytics
        </h1>
        <p className="text-gray-400 mt-1">Visualize the health and distribution of your relationships.</p>
      </div>

      {/* The Pulse */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-panel border-white/10 bg-gradient-to-br from-white/5 to-transparent shadow-[0_4px_30px_rgba(139,92,246,0.1)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><Users className="h-6 w-6" /></div>
                <div>
                  <p className="text-sm text-gray-400 font-medium">Total Connections</p>
                  <h3 className="text-3xl font-bold">{people.length}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-panel border-white/10 bg-gradient-to-br from-white/5 to-transparent shadow-[0_4px_30px_rgba(244,63,94,0.1)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400"><Heart className="h-6 w-6" /></div>
                <div>
                  <p className="text-sm text-gray-400 font-medium">Avg Strength</p>
                  <h3 className="text-3xl font-bold">{avgStrength}<span className="text-sm text-gray-500 ml-1">/ 100</span></h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-panel border-white/10 bg-gradient-to-br from-white/5 to-transparent shadow-[0_4px_30px_rgba(16,185,129,0.1)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400"><ShieldAlert className="h-6 w-6" /></div>
                <div>
                  <p className="text-sm text-gray-400 font-medium">Avg Trust</p>
                  <h3 className="text-3xl font-bold">{avgTrust}<span className="text-sm text-gray-500 ml-1">/ 100</span></h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="h-full">
          <Card className="glass-panel border-white/10 h-full flex flex-col hover:border-white/20 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">Network Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Interaction Area Chart */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="h-full">
          <Card className="glass-panel border-white/10 h-full flex flex-col hover:border-white/20 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">Recent Interactions</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="colorInt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="interactions" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorInt)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Health Bar Chart */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="lg:col-span-2">
          <Card className="glass-panel border-white/10 hover:border-white/20 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">Average Health by Relationship Type</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              {healthByType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={healthByType} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar name="Strength Score" dataKey="Strength" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar name="Trust Score" dataKey="Trust" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                 <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
