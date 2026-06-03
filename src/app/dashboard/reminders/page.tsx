"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Calendar, Trash2, Clock, CheckCircle2 } from "lucide-react"

type Reminder = {
  id: string
  title: string
  description: string
  scheduled_for: string
  is_completed: boolean
  person_id: string | null
  people?: {
    name: string
  } | null
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  // New Reminder State
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('reminders')
        .select('*, people(name)')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: true })

      if (error) throw error
      setReminders(data || [])
    } catch (error) {
      console.error("Error fetching reminders:", error)
    } finally {
      setLoading(false)
    }
  }

  const createReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newReminder = {
        user_id: user.id,
        title,
        description,
        scheduled_for: new Date(scheduledFor).toISOString(),
        is_completed: false
      }

      const { data, error } = await supabase
        .from('reminders')
        .insert([newReminder])
        .select('*, people(name)')
        .single()

      if (error) throw error
      
      setReminders([...reminders, data].sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()))
      setIsCreating(false)
      setTitle("")
      setDescription("")
      setScheduledFor("")
    } catch (error) {
      console.error("Error creating reminder:", error)
      alert("Failed to create reminder.")
    } finally {
      setSaving(false)
    }
  }

  const toggleComplete = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_completed: !currentStatus })
        .eq('id', id)

      if (error) throw error
      setReminders(reminders.map(r => r.id === id ? { ...r, is_completed: !currentStatus } : r))
    } catch (error) {
      console.error("Error toggling reminder:", error)
    }
  }

  const deleteReminder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reminder?")) return
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id)

      if (error) throw error
      setReminders(reminders.filter(r => r.id !== id))
    } catch (error) {
      console.error("Error deleting reminder:", error)
    }
  }

  const upcomingReminders = reminders.filter(r => !r.is_completed && new Date(r.scheduled_for) >= new Date())
  const overdueReminders = reminders.filter(r => !r.is_completed && new Date(r.scheduled_for) < new Date())
  const completedReminders = reminders.filter(r => r.is_completed)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
          <p className="text-gray-400 mt-1">Stay on top of your relationships and tasks.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="gap-2">
          <Calendar className="h-4 w-4" />
          {isCreating ? "Cancel" : "New Reminder"}
        </Button>
      </div>

      {isCreating && (
        <div className="glass-panel p-6 rounded-xl animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold mb-4">Create a Reminder</h3>
          <form onSubmit={createReminder} className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Title</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Call Mom"
                required
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Date & Time</label>
              <input 
                type="datetime-local" 
                value={scheduledFor}
                onChange={e => setScheduledFor(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Details (Optional)</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Any context?"
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors min-h-[80px]"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Schedule Reminder"}
            </Button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse h-64 glass-panel rounded-xl" />
      ) : (
        <div className="space-y-8">
          
          {/* Overdue */}
          {overdueReminders.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-rose-400 flex items-center gap-2">
                <Clock className="h-5 w-5" /> Overdue
              </h2>
              <div className="grid gap-4">
                {overdueReminders.map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} onToggle={toggleComplete} onDelete={deleteReminder} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Upcoming
            </h2>
            {upcomingReminders.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming reminders scheduled.</p>
            ) : (
              <div className="grid gap-4">
                {upcomingReminders.map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} onToggle={toggleComplete} onDelete={deleteReminder} />
                ))}
              </div>
            )}
          </div>

          {/* Completed */}
          {completedReminders.length > 0 && (
            <div className="space-y-4 opacity-50">
              <h2 className="text-xl font-semibold text-gray-400 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Completed
              </h2>
              <div className="grid gap-4">
                {completedReminders.map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} onToggle={toggleComplete} onDelete={deleteReminder} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

function ReminderCard({ reminder, onToggle, onDelete }: { reminder: Reminder, onToggle: (id: string, status: boolean) => void, onDelete: (id: string) => void }) {
  return (
    <div className={`glass-panel p-4 rounded-xl border flex items-start gap-4 transition-all ${reminder.is_completed ? 'border-white/5 bg-white/5' : 'border-white/10 hover:border-white/20'}`}>
      <button 
        onClick={() => onToggle(reminder.id, reminder.is_completed)}
        className={`mt-1 h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${reminder.is_completed ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-gray-500 hover:border-white'}`}
      >
        {reminder.is_completed && <CheckCircle2 className="h-3 w-3" />}
      </button>
      
      <div className="flex-1">
        <h4 className={`font-semibold ${reminder.is_completed ? 'line-through text-gray-500' : 'text-white'}`}>
          {reminder.title}
        </h4>
        {reminder.people?.name && (
          <p className="text-xs text-primary font-medium mt-1">For: {reminder.people.name}</p>
        )}
        {reminder.description && (
          <p className="text-sm text-gray-400 mt-2">{reminder.description}</p>
        )}
        <div className="text-xs text-gray-500 mt-3 flex items-center gap-2">
          <Clock className="h-3 w-3" />
          {new Date(reminder.scheduled_for).toLocaleString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
          })}
        </div>
      </div>

      <button onClick={() => onDelete(reminder.id)} className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
