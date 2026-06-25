# HumanOS — Future Roadmap & Improvements

This document lists architectural, feature, and storage improvements scheduled for subsequent development phases of the HumanOS platform.

---

## 1. Storage & Caching: Transitioning to IndexedDB

While the current `localStorage` cache is highly effective for text data models (under 5MB), future expansion demands a more robust offline-first strategy:

### 1.1. The Limitation of LocalStorage
- **5MB Capacity Cap**: Modern browsers hard-limit localStorage to 5MB, which will fill up if users attach multiple interaction notes, custom avatars, or file logs.
- **Synchronous Execution**: LocalStorage blocks the main browser UI thread during read/write operations, which can degrade animation performance (like D3 canvas sweeps) as connection counts grow.

### 1.2. Proposed IndexedDB Strategy
We recommend replacing localStorage checks with **IndexedDB** using **localForage** or the raw `idb` wrapper.
- **Asynchronous Storage**: Operations will run asynchronously on a background thread.
- **Virtually Unlimited Quota**: Allows caching of high-resolution images, voice notes, and contact attachment files offline.
- **Structured Database Indexes**: Enables searching, querying, and filtering cached contacts offline without loading the entire network dataset into memory.

---

## 2. Calendar & Notification Channels

Integrating user schedules and communication platforms will improve the utility of reminders:

### 2.1. Calendar Sync Integration
- **Google Calendar API**: Connect user accounts to automatically sync upcoming birthdays and custom contact reminders as calendar events.
- **iCal Subscription Feed**: Expose a secure, read-only `.ics` URL for each user handle. This allows users to subscribe to their HumanOS reminder feeds directly inside Outlook, Apple Calendar, or Google Calendar without giving calendar write permissions.

### 2.2. SMS & Email Reminder Channels
Expand the notification center using external SMS and Email integrations:
- **Resend Email Integration**: Deliver weekly relationship digests summarizing upcoming birthdays, conflict resolutions, and decay warnings.
- **Twilio SMS Alerts**: Send brief, automated SMS alerts on the morning of a family member's birthday (e.g., "Today is Aunt Jane's birthday. Here's a message suggestion: ...").

---

## 3. Advanced AI & Relationship Features

Leverage the Gemini API to offer deeper relationship assistance:

### 3.1. Interactive AI Assistant Tab
- Add a conversational tab where the AI relationship coach helps plan events, drafts messages, suggests conflict resolution strategies, or summarizes relationship history based on notes in the timeline.

### 3.2. Automated Communication Log Parsing
- Allow users to upload or paste chat logs (WhatsApp, email threads, SMS records).
- The AI will automatically parse names, dates, emotional sentiment, and summary notes to create timeline interaction events automatically, reducing manual input.

### 3.3. Gift Planning and Tracking
- Build a dedicated registry where users list likes/dislikes, sizes, gift history, and budget thresholds.
- The system will cross-reference contact tags against local e-commerce listings to suggest highly specific gifts 7 days before an anniversary.

---

## 4. Mobile Wrappers & PWAs

Provide a native mobile application experience:
- Package the Next.js app inside a mobile wrapper using **Capacitor** or **Cordova** to gain native access to background sync services, offline SQLite storage, and OS-level push notifications.
- Complete PWA updates by packaging a native service worker (`sw.js`) that caches static chunks and layouts, allowing the app to load fully offline when there is no internet connection.
