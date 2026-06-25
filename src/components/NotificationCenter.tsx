"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, X, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

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
  const hasCheckedReminders = useRef(false)
  const router = useRouter()

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

  const runLocalRemindersCheck = async (userId: string) => {
    console.log("[NotificationCenter] Starting local reminders check for user:", userId);
    try {
      // 1. Fetch people with birthdays
      const { data: people, error: peopleErr } = await supabase
        .from('people')
        .select('*')
        .eq('user_id', userId)
        .is('is_archived', false)
        .not('birthday', 'is', null);

      if (peopleErr) {
        console.error("[NotificationCenter] Error fetching people:", peopleErr);
      }
      console.log("[NotificationCenter] Found people with birthdays count:", people?.length, people);

      const today = new Date();
      const localTodayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      console.log("[NotificationCenter] Local today midnight is:", localTodayMidnight.toString());
      const notificationsToInsert: any[] = [];

      // 2. Evaluate Birthdays
      for (const person of people || []) {
        if (!person.birthday) continue;
        
        // Parse date safely ignoring timezones
        const dateParts = person.birthday.split('-');
        if (dateParts.length !== 3) {
          console.warn("[NotificationCenter] Invalid birthday date format for", person.name, person.birthday);
          continue;
        }
        const bdayMonth = parseInt(dateParts[1], 10) - 1;
        const bdayDay = parseInt(dateParts[2], 10);

        const localNextBday = new Date(today.getFullYear(), bdayMonth, bdayDay);
        if (localNextBday < localTodayMidnight) {
          localNextBday.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = localNextBday.getTime() - localTodayMidnight.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        console.log(`[NotificationCenter] Evaluating ${person.name}'s birthday (${person.birthday}). Next: ${localNextBday.toString()}. Diff: ${diffDays} days`);

        let alertMessage = null;
        let alertTitle = "Upcoming Birthday";

        if (diffDays === 7) {
          alertMessage = `${person.name}'s birthday is in exactly 7 days. Time to plan a gift!`;
        } else if (diffDays === 3) {
          alertMessage = `${person.name}'s birthday is in 3 days. Get ready!`;
        } else if (diffDays === 1) {
          alertMessage = `Tomorrow is ${person.name}'s birthday!`;
        } else if (diffDays === 0) {
          alertTitle = "Happy Birthday!";
          alertMessage = `Today is ${person.name}'s birthday. Send them a message!`;
        }

        if (alertMessage) {
          console.log(`[NotificationCenter] Birthday alert triggered for ${person.name}:`, alertTitle, alertMessage);
          notificationsToInsert.push({
            user_id: userId,
            title: alertTitle,
            message: alertMessage,
          });
        }
      }

      // 3. Fetch pending custom reminders
      const { data: customReminders, error: customErr } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('is_completed', false);

      if (customErr) {
        console.error("[NotificationCenter] Error fetching custom reminders:", customErr);
      }
      console.log("[NotificationCenter] Found custom reminders count:", customReminders?.length, customReminders);

      for (const reminder of customReminders || []) {
        if (!reminder.scheduled_for) continue;

        const scheduledParts = reminder.scheduled_for.split('-');
        if (scheduledParts.length !== 3) continue;
        const schedYear = parseInt(scheduledParts[0], 10);
        const schedMonth = parseInt(scheduledParts[1], 10) - 1;
        const schedDay = parseInt(scheduledParts[2], 10);

        const localScheduledDate = new Date(schedYear, schedMonth, schedDay);
        
        const diffTime = localScheduledDate.getTime() - localTodayMidnight.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        console.log(`[NotificationCenter] Evaluating custom reminder "${reminder.title}" (${reminder.scheduled_for}). Diff: ${diffDays} days`);

        let alertMessage = null;
        let alertTitle = "Upcoming Reminder";

        if (diffDays === 7) {
          alertMessage = `You have a reminder in exactly 7 days: ${reminder.title}`;
        } else if (diffDays === 3) {
          alertMessage = `You have a reminder in 3 days: ${reminder.title}`;
        } else if (diffDays === 1) {
          alertMessage = `Reminder tomorrow: ${reminder.title}`;
        } else if (diffDays === 0) {
          alertTitle = "Reminder Due Today!";
          alertMessage = reminder.title;
        }

        if (alertMessage) {
          console.log(`[NotificationCenter] Custom reminder alert triggered:`, alertTitle, alertMessage);
          notificationsToInsert.push({
            user_id: userId,
            title: alertTitle,
            message: alertMessage,
          });
        }
      }

      // 4. Fetch interactions to check decay
      const { data: activePeople, error: activeErr } = await supabase
        .from('people')
        .select('id, name, relationship_type, created_at')
        .eq('user_id', userId)
        .is('is_archived', false)
        .is('status', null);

      if (activeErr) {
        console.error("[NotificationCenter] Error fetching active people:", activeErr);
      }
      console.log("[NotificationCenter] Found active people count for decay check:", activePeople?.length);

      if (activePeople && activePeople.length > 0) {
        const { data: lastInteractions } = await supabase
          .from('interactions')
          .select('person_id, interaction_date')
          .eq('user_id', userId)
          .order('interaction_date', { ascending: false });

        const lastIntMap = new Map<string, Date>();
        if (lastInteractions) {
          lastInteractions.forEach(i => {
            if (i.person_id && i.interaction_date && !lastIntMap.has(i.person_id)) {
              const pParts = i.interaction_date.split('-');
              if (pParts.length === 3) {
                lastIntMap.set(i.person_id, new Date(parseInt(pParts[0], 10), parseInt(pParts[1], 10) - 1, parseInt(pParts[2], 10)));
              }
            }
          });
        }

        for (const person of activePeople) {
          let lastDate = lastIntMap.get(person.id);
          if (!lastDate) {
            if (person.created_at) {
              const cParts = person.created_at.split('T')[0].split('-');
              lastDate = new Date(parseInt(cParts[0], 10), parseInt(cParts[1], 10) - 1, parseInt(cParts[2], 10));
            } else {
              lastDate = localTodayMidnight;
            }
          }

          const diffTime = localTodayMidnight.getTime() - lastDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          let decayThreshold = 14;
          const lowerRel = (person.relationship_type || '').toLowerCase();
          const familyKeywords = ["family", "mom", "mum", "mummy", "mama", "mother", "father", "dad", "daddy", "brother", "sister", "sibling", "parent"];
          
          if (familyKeywords.some(kw => lowerRel.includes(kw))) {
            decayThreshold = 3;
          } else if (lowerRel.includes("close friend") || lowerRel.includes("best friend") || lowerRel === "bff") {
            decayThreshold = 7;
          } else if (lowerRel.includes("classmate") || lowerRel.includes("school")) {
            decayThreshold = 30;
          }

          if (diffDays >= decayThreshold) {
            console.log(`[NotificationCenter] Decay triggered for ${person.name} (${person.relationship_type}). Last: ${lastDate.toLocaleDateString()}. Diff: ${diffDays} days (Threshold: ${decayThreshold})`);
            notificationsToInsert.push({
              user_id: userId,
              title: "Stay Connected 🌟",
              message: `It's been ${diffDays} days since you last logged an interaction with ${person.name} (${person.relationship_type || 'Connection'}). Reach out to keep the relationship strong!`,
              isDecay: true,
              personName: person.name
            });
          }
        }
      }

      console.log("[NotificationCenter] Raw list of alerts prepared:", notificationsToInsert);

      // 5. Filter out duplicates
      if (notificationsToInsert.length > 0) {
        // Fetch notifications created in the last 24 hours
        const startOfTodayISO = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const { data: existingNotifs, error: existingErr } = await supabase
          .from('notifications')
          .select('title, message')
          .eq('user_id', userId)
          .gt('created_at', startOfTodayISO);

        if (existingErr) {
          console.error("[NotificationCenter] Error fetching existing notifications in last 24h:", existingErr);
        }
        console.log("[NotificationCenter] Existing notifications (last 24h):", existingNotifs);

        const existingSet = new Set(
          (existingNotifs || []).map(n => `${n.title}::${n.message}`)
        );

        const finalInserts: any[] = [];

        for (const notif of notificationsToInsert) {
          const key = `${notif.title}::${notif.message}`;
          
          if (notif.isDecay) {
            // Check if stay connected reminder was sent for this contact in last 7 days
            const { data: recentDecayNotifs, error: decayErr } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', userId)
              .ilike('message', `%${notif.personName}%`)
              .ilike('title', '%Stay Connected%')
              .gt('created_at', new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
              .limit(1);

            if (decayErr) {
              console.error("[NotificationCenter] Error checking recent decay:", decayErr);
            }

            const hasRecentDecay = recentDecayNotifs && recentDecayNotifs.length > 0;

            if (!hasRecentDecay && !existingSet.has(key)) {
              finalInserts.push({
                user_id: userId,
                title: notif.title,
                message: notif.message
              });
            } else {
              console.log(`[NotificationCenter] Skipping decay alert for ${notif.personName} (recent alert or duplicate exists)`);
            }
          } else {
            if (!existingSet.has(key)) {
              finalInserts.push({
                user_id: userId,
                title: notif.title,
                message: notif.message
              });
            } else {
              console.log(`[NotificationCenter] Skipping birthday/custom alert (already created today):`, key);
            }
          }
        }

        console.log("[NotificationCenter] Final notifications inserting:", finalInserts);

        if (finalInserts.length > 0) {
          const { error: insertError } = await supabase
            .from('notifications')
            .insert(finalInserts);
          if (insertError) {
            console.error("[NotificationCenter] Failed to insert local notifications:", insertError);
          } else {
            console.log("[NotificationCenter] Successfully inserted local notifications!");
            // Re-fetch notifications after insertion
            const { data, error } = await supabase
              .from('notifications')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(20);
            if (!error && data) {
              setNotifications(data);
              setUnreadCount(data.filter(n => !n.read).length);
            }
          }
        }
      } else {
        console.log("[NotificationCenter] No notifications met trigger thresholds.");
      }
    } catch (err) {
      console.error("[NotificationCenter] Local reminders check error:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      // Run reminders evaluation check only once per mount
      if (!hasCheckedReminders.current) {
        hasCheckedReminders.current = true;
        await runLocalRemindersCheck(user.id);
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        throw error;
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read).length || 0)
    } catch (e: any) {
      console.error("Failed to fetch notifications:", e.message || e)
    }
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

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .in('read', [false])
    } catch (e) {
      console.error(e)
    }
  }

  const handleNotificationClick = async (notif: Notification) => {
    try {
      // 1. Mark as read first
      await markAsRead(notif.id);

      // 2. Extract name from notification message
      let nameToFind = "";
      const msg = notif.message;

      if (notif.title.includes("Birthday")) {
        // Today is Gennia's birthday.
        const todayMatch = msg.match(/Today is (.+?)'s birthday/);
        const tomorrowMatch = msg.match(/Tomorrow is (.+?)'s birthday/);
        const generalMatch = msg.match(/(.+?)'s birthday is in/);

        if (todayMatch) nameToFind = todayMatch[1];
        else if (tomorrowMatch) nameToFind = tomorrowMatch[1];
        else if (generalMatch) nameToFind = generalMatch[1];
      } else if (notif.title.includes("Stay Connected")) {
        // It's been 19 days since you last logged an interaction with Chris (Friend)
        const decayMatch = msg.match(/interaction with (.+?) \(/);
        if (decayMatch) nameToFind = decayMatch[1];
      }

      // If we extracted a name, query the database to find the person's ID
      if (nameToFind) {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const cleanName = nameToFind.trim();
        const { data: person } = await supabase
          .from('people')
          .select('id')
          .eq('name', cleanName)
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        if (person) {
          // Close the drawer and navigate
          setIsOpen(false);
          router.push(`/dashboard/person/${person.id}`);
          return;
        }
      }
    } catch (err) {
      console.error("Error handling notification click:", err);
    }
  };

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

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="portal-root">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-white/10 shadow-2xl z-[101] flex flex-col"
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
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 rounded-xl border cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all ${notification.read ? 'bg-white/5 border-transparent' : 'glass-panel border-primary/30'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`font-medium ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
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
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
