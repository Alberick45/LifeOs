import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

webpush.setVapidDetails(
  'mailto:hello@humanos.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  try {
    const { title, body, url, user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ success: false, error: 'user_id is required' }, { status: 400 });
    }
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Get the user's subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: "No subscriptions found." });
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: '/icon.png'
    });

    const sendPromises = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };
      
      return webpush.sendNotification(pushSubscription, payload).catch((error) => {
        console.error('Error sending push to endpoint:', sub.endpoint, error);
        // If the subscription is no longer valid (410 Gone), remove it from our DB
        if (error.statusCode === 410) {
          return supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      });
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, count: subscriptions.length });
  } catch (error: any) {
    console.error('Error in send push API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
