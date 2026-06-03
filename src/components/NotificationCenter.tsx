"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, X, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export type Notification = {
  id: string
  title: string
  message: string
  read: boolean
  created_at: string
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()

    // Optional: Set up real-time listener for new notifications
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error("Error fetching notifications:", error)
      return
    }

    setNotifications(data || [])
    setUnreadCount(data?.filter(n => !n.read).length || 0)
  }

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return

    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .in('read', [false])
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      >
        <Bell className="h-5 w-5 text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-primary text-[10px] font-bold flex items-center justify-center rounded-full transform translate-x-1/4 -translate-y-1/4">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-white/10 shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Notifications</h2>
                  <p className="text-sm text-gray-400">Your latest relationship updates</p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                      Mark all read
                    </Button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-white/10">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Bell className="h-12 w-12 mb-4 opacity-20" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <motion.div 
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl border ${notification.read ? 'bg-white/5 border-transparent' : 'glass-panel border-primary/30'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-medium ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <button 
                            onClick={() => markAsRead(notification.id)}
                            className="text-primary hover:text-white transition-colors"
                            title="Mark as read"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <p className={`text-sm ${notification.read ? 'text-gray-500' : 'text-gray-300'}`}>
                        {notification.message}
                      </p>
                      <span className="text-[10px] text-gray-600 mt-3 block uppercase tracking-wider">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
