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
