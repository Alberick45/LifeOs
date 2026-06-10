import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Use the service role key to bypass RLS for background cron jobs
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    // Simple authentication for the cron job to prevent abuse
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. Fetch all people with a birthday
    const { data: people, error } = await supabase
      .from('people')
      .select('*')
      .not('birthday', 'is', null);

    if (error) throw error;

    const today = new Date();
    const notificationsToInsert = [];

    // 2. Evaluate birthdays day-by-day
    for (const person of people || []) {
      if (!person.birthday) continue;

      const bday = new Date(person.birthday);
      // Create a date for the birthday this year
      const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());

      // If the birthday has passed this year, look at next year
      if (nextBday < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        nextBday.setFullYear(today.getFullYear() + 1);
      }

      // Calculate diff in days (ignoring time)
      const diffTime = nextBday.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // 3. Generate alerts for 7, 3, and 1 days out, plus day-of
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
        notificationsToInsert.push({
          user_id: person.user_id,
          title: alertTitle,
          message: alertMessage,
        });
      }
    }

    // 4. Fetch pending custom reminders
    const { data: customReminders, error: remError } = await supabase
      .from('reminders')
      .select('*, people(name)')
      .eq('is_completed', false);

    if (remError) throw remError;

    // 5. Evaluate custom reminders day-by-day
    for (const reminder of customReminders || []) {
      if (!reminder.scheduled_for) continue;

      const scheduledDate = new Date(reminder.scheduled_for);
      
      // Calculate diff in days (ignoring time)
      const diffTime = scheduledDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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
        notificationsToInsert.push({
          user_id: reminder.user_id,
          title: alertTitle,
          message: alertMessage,
        });
      }
    }

    // 5.5. Evaluate Relationship Activity Decay
    const { data: allActivePeople, error: activeError } = await supabase
      .from('people')
      .select('id, name, relationship_type, user_id, created_at')
      .is('is_archived', false)
      .is('status', null);

    if (activeError) throw activeError;

    if (allActivePeople && allActivePeople.length > 0) {
      // Fetch latest interaction for each active person
      const { data: lastInteractions, error: lastIntError } = await supabase
        .from('interactions')
        .select('person_id, interaction_date')
        .order('interaction_date', { ascending: false });

      if (lastIntError) throw lastIntError;

      // Group latest interactions by person_id
      const lastIntMap = new Map<string, Date>();
      if (lastInteractions) {
        lastInteractions.forEach(i => {
          if (i.person_id && i.interaction_date && !lastIntMap.has(i.person_id)) {
            lastIntMap.set(i.person_id, new Date(i.interaction_date));
          }
        });
      }

      // Check decay threshold for each active person
      for (const person of allActivePeople) {
        const lastDate = lastIntMap.get(person.id) || new Date(person.created_at || today);
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let decayThreshold = 14; // default for Friends
        const lowerRel = (person.relationship_type || '').toLowerCase();
        
        // Family, Mum, Dad
        const familyKeywords = ["family", "mom", "mum", "mummy", "mama", "mother", "father", "dad", "daddy", "brother", "sister", "sibling", "parent"];
        if (familyKeywords.some(kw => lowerRel.includes(kw))) {
          decayThreshold = 3; // 3 days for family/mum/dad
        } else if (lowerRel.includes("close friend") || lowerRel.includes("best friend") || lowerRel === "bff") {
          decayThreshold = 7; // 7 days for close friends
        } else if (lowerRel.includes("classmate") || lowerRel.includes("school")) {
          decayThreshold = 30; // 30 days for classmates
        }

        if (diffDays >= decayThreshold) {
          // Check if we already sent a stay connected reminder for this person in the last 7 days to avoid spam
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', person.user_id)
            .ilike('message', `%${person.name}%`)
            .ilike('title', '%Stay Connected%')
            .gt('created_at', new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existingNotif) {
            notificationsToInsert.push({
              user_id: person.user_id,
              title: "Stay Connected 🌟",
              message: `It's been ${diffDays} days since you last logged an interaction with ${person.name} (${person.relationship_type || 'Connection'}). Reach out to keep the relationship strong!`,
            });
          }
        }
      }
    }

    // 6. Insert notifications into DB and trigger Web Push
    if (notificationsToInsert.length > 0) {
      const { data: insertedNotifs, error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert)
        .select();
      
      if (insertError) {
        console.error("Failed to insert notifications", insertError);
        throw insertError;
      }

      // Configure web-push
      if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          'mailto:support@humanos.app',
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );

        // Get all affected user_ids
        const userIds = [...new Set(notificationsToInsert.map(n => n.user_id))];

        // Fetch subscriptions for these users
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .in('user_id', userIds);

        if (subscriptions && subscriptions.length > 0) {
          for (const sub of subscriptions) {
            // Find the corresponding notification for this user
            const notif = notificationsToInsert.find(n => n.user_id === sub.user_id);
            if (!notif) continue;

            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            };

            const payload = JSON.stringify({
              title: notif.title,
              body: notif.message,
              icon: '/globe.svg'
            });

            try {
              await webpush.sendNotification(pushSubscription, payload);
            } catch (err) {
              console.error("Failed to send push notification to endpoint", sub.endpoint, err);
              // Optional: cleanup invalid subscriptions here
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      birthdaysProcessed: people?.length || 0,
      remindersProcessed: customReminders?.length || 0,
      notificationsCreated: notificationsToInsert.length 
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
