"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BellRing } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    setSubscription(sub);
  }

  async function subscribeToPush() {
    setIsSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      setSubscription(sub);

      // Get user session to pass token
      const { data: { session } } = await supabase.auth.getSession();
      
      // Send the subscription to our backend
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(sub),
      });
      
    } catch (error) {
      console.error('Error subscribing to push:', error);
      alert('Failed to subscribe to push notifications. Please ensure notifications are allowed in your browser settings.');
    } finally {
      setIsSubscribing(false);
    }
  }

  if (!isSupported) {
    return null; // Don't show if unsupported
  }

  if (subscription) {
    return null; // Don't show if already subscribed
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 glass-panel p-4 rounded-xl flex flex-col gap-3 sm:max-w-sm animate-in slide-in-from-bottom-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/20 rounded-full text-primary">
          <BellRing className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-medium text-sm">Enable Notifications</h4>
          <p className="text-xs text-gray-400 mt-1">Get native alerts for important birthdays and relationship events.</p>
        </div>
      </div>
      <Button 
        size="sm" 
        onClick={subscribeToPush}
        disabled={isSubscribing}
        className="w-full"
      >
        {isSubscribing ? "Enabling..." : "Enable Push Notifications"}
      </Button>
    </div>
  );
}
