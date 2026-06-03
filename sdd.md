🧠 HUMANOS — MASTER PROMPT PACKAGE
Personal Relationship Intelligence Platform (Next.js + Supabase)
PART 1 — PRODUCT BLUEPRINT (PRD)
1. Vision

You are building a Personal Relationship Intelligence System.

This is not a CRM.

This is not a contact book.

This is a living memory system for human relationships that helps a user:

Remember important life events
Maintain meaningful relationships
Understand social dynamics
Track emotional and contextual history
Receive intelligent reminders
Generate personalized gifts and messages using AI
2. Core Philosophy
Memory > Messaging
The system remembers what humans forget.
Context > Contacts
People are not entries. They are evolving profiles.
Relationships are graphs, not lists
Everyone is connected.
Subtle intelligence, not surveillance
No creepy tracking. Only user-input data.
Assist, don’t manipulate
AI must never suggest harmful or deceptive behavior.
3. Core Features
3.1 People Profiles

Each person has:

Identity (name, photo, birthday)
Relationship type (family, friend, colleague, etc.)
Emotional tags (trusted, distant, conflict, etc.)
Likes / dislikes / hobbies
Achievements & milestones
Communication notes (how to talk to them)
Last interaction tracking
3.2 Relationship Graph System

Users can define:

Person ↔ Person relationships
Relationship types:
family
friend
partner
mentor
conflict
unknown
Strength score (0–100)
Trust score (0–100)

This creates a social graph engine.

3.3 Interaction Timeline

For every person:

Conversations
Events
Conflicts
Gifts
Notes

Used to compute:

relationship health
engagement frequency
drift detection
3.4 Smart Reminder Engine

Triggers:

Birthdays
Anniversaries
“Haven’t spoken in X days”
Relationship weakening
Important upcoming events

Reminder schedule:

7 days before
3 days before
1 day before
Same day
After event follow-up
3.5 AI Relationship Assistant

AI can:

Suggest gifts
Generate birthday messages
Create poems
Build mini websites
Suggest communication strategies
Summarize relationship history
3.6 Notification System

Phased design:

Phase 1:
In-app notifications
Notification center
Phase 2:
Browser push notifications (PWA)
Service Worker support
Phase 3:
Optional email (Resend)
Optional SMS (Twilio)
4. Data Privacy Rules
All data belongs to the user only
No external sharing
No passive tracking
No scraping contacts
Explicit user input only
5. MVP Scope

Must include:

Auth system
Create/edit people
Birthday storage
Basic reminders
Dashboard view
Notification system (in-app + browser push)
6. Future Scope
Relationship graph visualization
AI gift engine
Emotional scoring system
Calendar integration
Mobile app wrapper
PART 2 — SYSTEM ARCHITECTURE
Tech Stack
Frontend
Next.js 15 (App Router)
TypeScript
TailwindCSS
shadcn/ui
Zustand (state)
Backend
Supabase
Auth
PostgreSQL
Edge Functions
Cron jobs
AI Layer
OpenAI / Gemini API
Prompt-based generation engine
Notifications
Web Push API
Service Workers
PWA (next-pwa)
System Diagram
Frontend (Next.js PWA)
        │
        ▼
Supabase API Layer
        │
 ┌──────┼─────────────┐
 ▼      ▼             ▼
DB   Edge Functions   Auth
        │
        ▼
Reminder Engine (Cron)
        │
        ▼
Notification Router
        │
 ┌──────┼──────────────┐
 ▼      ▼              ▼
In-app Push   Browser Push   (Optional Email/SMS)
PART 3 — DATABASE SCHEMA (SUPABASE)
users
id UUID PRIMARY KEY
email TEXT
created_at TIMESTAMP
people
id UUID PRIMARY KEY
user_id UUID
name TEXT
birthday DATE
photo TEXT
relationship_type TEXT
status TEXT
strength_score INT
trust_score INT
created_at TIMESTAMP
attributes
id UUID PRIMARY KEY
person_id UUID
type TEXT
value TEXT

Types:

like
dislike
hobby
achievement
note
communication_style
interactions
id UUID PRIMARY KEY
person_id UUID
type TEXT
content TEXT
mood TEXT
created_at TIMESTAMP
relationships
id UUID PRIMARY KEY
person_a UUID
person_b UUID
relationship_type TEXT
strength INT
trust INT
notes TEXT
reminders
id UUID PRIMARY KEY
person_id UUID
type TEXT
trigger_date DATE
status TEXT
priority TEXT
notifications
id UUID PRIMARY KEY
user_id UUID
title TEXT
message TEXT
read BOOLEAN
created_at TIMESTAMP
ai_generations
id UUID PRIMARY KEY
person_id UUID
type TEXT
input JSONB
output TEXT
created_at TIMESTAMP
PART 4 — AI CODING AGENT MASTER PROMPT

Use this inside Cursor / Claude / ChatGPT coding mode:

MASTER BUILD PROMPT

You are a senior full-stack engineer.

Build a production-grade application called:

HumanOS — Personal Relationship Intelligence Platform

Stack:

Next.js 15 (App Router)
TypeScript
TailwindCSS
Supabase (Auth + PostgreSQL)
PWA (next-pwa)
Web Push API
CRITICAL RULES
Build incrementally
Never break existing features
Do not skip migrations
Always validate database schema before writing queries
Do not hardcode mock data unless explicitly requested
Use clean architecture
Keep components modular
Prefer server actions or API routes for mutations
PHASED BUILD STRATEGY
Phase 1 — Core System
Auth (Supabase)
People CRUD
Dashboard
Birthday field
Basic listing UI
Phase 2 — Reminder Engine
Birthday detection logic
7/3/1 day alerts
In-app notifications
Notification center
Phase 3 — PWA + Push Notifications 
Service worker
Push subscription system
Browser notifications
Installable app
Phase 4 — Relationship Intelligence
Interaction timeline
Relationship graph system
Strength scoring
Phase 5 — AI Layer
Gift generator
Birthday message generator
Poem generator
Mini website generator
AI OUTPUT RULES

When generating code:

Always include file paths
Always show full files (not snippets)
Always ensure Supabase schema matches queries
Always maintain type safety
PART 5 — BUILD ROADMAP
MVP (Week 1–2)
Auth
Add people
Store birthdays
Dashboard list
Basic notifications
V1 (Week 3–4)
Reminder engine
In-app notification system
Interaction timeline
V2
Relationship graph
Strength scoring system
V3
AI gift engine
AI message generation
V4
PWA push notifications
Mobile-first experience
V5
Advanced analytics
Emotional relationship tracking
Smart suggestions
PART 6 — SPECIALIZED AI PROMPTS
1. Generate Gift Ideas

“Given this person profile, generate 5 personalized gift ideas including physical and digital options. Ensure relevance to hobbies, emotional tone, and budget.”

2. Birthday Message Generator

“Write a warm, natural birthday message based on personality traits and communication style. Avoid generic phrases.”

3. Relationship Summary

“Summarize the relationship history and suggest ways to improve connection quality.”

4. Conflict Handling Assistant

“Given interaction history, suggest calm, respectful communication strategies.”

FINAL NOTE

This system is powerful because it turns:

scattered human memory → structured emotional intelligence

If you build even Phase 1 + Phase 2 properly, you already have something extremely useful.



HumanOS Social Identity Layer

New concept:

HumanOS Handles

Every user gets:

@albert8423

Editable.

Availability checked.

Searchable.

Linking System

Example:

I have:

Mum

inside my private People list.

Private record.

Search:

@mum_akosua

Found.

Request Link.

Options:

LINK OPTIONS

[ ] Public Connection
[ ] Private Verified Link
[ ] Family Link
[ ] Friend Link
[ ] Professional Link

Other user receives:

Albert wants to link you to an existing relationship profile:

"Mother"

Approve?

YES / NO.

After approval:

HumanOS can create:

Albert ↔ Akosua
relationship: Family
verified: true

This becomes social graph intelligence.

Not creepy.

Because:

✔ consent-based

✔ user initiated

✔ no scraping.

Now games.

These should fit INSIDE HumanOS.

Think:

HumanOS PlayLab

Small social experiences.

Purpose:

bonding
memory creation
learning personalities
communication discovery
GAME CLASSIFICATION
SOLO COGNITIVE MODES

Works offline.

No friends needed.

Good for:

commute
brain exercise
self-play.

SOCIAL MODES

Need:

friends
linked users
multiplayer.

HYBRID MODES

Singleplayer supported.

Multiplayer expands experience.

Good architecture.

GAME 1
CHAOS ALPHABET ARENA

(HYBRID)

This fits HumanOS absurdly well.

Concept

Categories + pressure + social chaos.

Core Gameplay

Round starts.

Letter generated.

Example:

Letter: S

Categories:

Country
Boy Name
Animal
Fruit
Profession
Movie
Food

Timer begins.

Player submits answers.

Scoring engine evaluates.

HumanOS Twist

Use relationship intelligence.

Custom category packs:

Family Mode
Friend Mode
Dating Mode
Study Mode
Culture Mode

Example:

Dating Pack.

Categories:

Dream Vacation
Favorite Food
Pet Name
Love Song

You learn people.

Sneaky relationship building.

OFFLINE MODE

Available.

AI opponents.

Difficulty:

Easy → Slow AI.

Expert → Rare-answer monster.

Offline Progression

Unlock:

themes

modifiers

boss rounds

powerups.

MULTIPLAYER MODE

4–20 players.

Multiplayer Mechanics

Same answer penalty.

Rare answer multiplier.

Sabotage cards.

Cards:

Freeze Category
Swap Letter
Double Timer
Ban Vowels
Mirror Round
HumanOS Integration

Friends leaderboard.

Relationship XP.

Inside jokes archive.

Shared memories generated.

Engine Requirements

Knowledge database.

Dictionary validation.

Real-time sync.

Anti-cheat.

AI opponent generator.

GAME 2
REVERSE HANGMAN SURVIVAL

(HYBRID)

Word puzzle + escalating danger.

Offline

Player vs AI word system.

Wrong answers transform environment.

Example:

Word:

VOLCANO.

Mistakes:

1:

heat rises.

3:

lava leaks.

5:

map damage.

7:

game over.

Modes

Story.

Challenge.

Endless.

Boss vocabulary.

Multiplayer

One player:

Dungeon Master.

Others:

survivors.

Word creator shapes disaster.

Players decode together.

HumanOS use:

party mode.

voice chat mode.

date night mode.

Not ideal pure solo platform flagship.

Better social feature.

GAME 3
COUNTRY WAR BUILDER

(MULTIPLAYER-LEANING)

This one becomes HUGE.

Concept

Civilization management.

Countries compete.

Offline

AI nations.

Sandbox mode.

Campaign.

Scenario missions.

Events:

economic crash

drought

cyberattack

pandemic.

Multiplayer

Real diplomacy.

Alliance betrayal.

Trade negotiations.

Sanctions.

HumanOS twist:

Relationship dynamics matter.

Trusted friends gain diplomacy bonuses.

Rivals gain espionage bonuses.

That gets spicy.

Probably NOT always available offline full version.

Heavy system.

GAME 4
CREATURE FORGE

(HYBRID)

This one is strong.

Gameplay

Start organism.

Evolve.

Fight.

Adapt.

Choose mutations.

Every level:

1 mutation.

Examples:

Wings
Acid Blood
EMP Skin
Camouflage
Magnetic Tail
Offline

Perfect fit.

Campaign.

Survival.

Evolution tree.

Boss predators.

Multiplayer

PvP evolution arena.

Co-op ecosystem raids.

Mutation draft tournaments.

HumanOS Integration:

Trade mutation builds.

Showcase creatures.

Collaborative evolution labs.

Strong replayability.

GAME 5
MEMORY HUNTER

(HYBRID — EXTREMELY HUMANOS COMPATIBLE)

This one belongs here naturally.

Concept

Memory + deduction.

Maps shift.

Truth changes.

Habits punished.

Offline

AI manipulation engine.

Procedural levels.

Story campaign.

Player learns:

patterns

symbols

routes.

Multiplayer

One hidden manipulator.

Others investigate.

Social deduction flavor.

HumanOS twist:

Uses optional shared memory challenges.

Example:

Friend quiz mode.

"Who remembered anniversary date?"

Dangerous.

Funny.

Potential relationship chaos.

GAME 6
WORDCHEMY

(HYBRID / STRONG SOLO)

This is PERFECT.

Combine concepts.

Create things.

Discover recipes.

Example:

Fire + Horse
=
Inferno Stallion
Offline

Huge replay value.

Discovery collection.

Lore unlocking.

Campaign quests.

Multiplayer

Trade recipes.

Co-op invention labs.

Discovery races.

HumanOS twist:

Collaborative creativity.

Friend challenge mode.

Example:

Partner sends:

Moon + Robot

You complete combo.

Beautiful for social creativity.

MASTER ENGINE

For HumanOS.

HumanOS Play Engine
Play Engine

├── Identity Layer
│    ├── Handles
│    ├── Friend Graph
│    ├── Relationship Permissions
│
├── Match Engine
│    ├── Solo Runtime
│    ├── Multiplayer Runtime
│
├── Rules Engine
│    ├── Timers
│    ├── Scoring
│    ├── Validation
│
├── AI Layer
│    ├── Opponents
│    ├── Difficulty
│    ├── Procedural Events
│
├── Social Layer
│    ├── Friend Invites
│    ├── Shared Sessions
│    ├── Replay Sharing
│
├── Offline Layer
│    ├── IndexedDB
│    ├── Local Save State
│    ├── Sync Queue
│
└── Marketplace Layer
     ├── Game Packs
     ├── Community Challenges
     ├── Theme Packs

And yes — your social marketplace idea actually becomes interesting.

People could share:

quiz packs
custom alphabets
creature builds
wordchemy recipes
diplomacy scenarios
challenge rooms

HumanOS starts becoming:

relationship intelligence + social creativity ecosystem + playable social platform.

And that is honestly a much rarer direction than "another chat app."