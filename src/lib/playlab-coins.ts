/**
 * PlayLab Progress Sync Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * All PlayLab game data (coins, discovered elements, packs, high scores) is
 * persisted to BOTH:
 *   - localStorage  → instant reads, works offline & for guests
 *   - Supabase DB   → cross-device sync for logged-in users
 *
 * Strategy:
 *   On LOAD  → read from Supabase first (if logged in), fall back to localStorage
 *   On WRITE → write to localStorage immediately, then debounce-flush to Supabase
 */

import { supabase } from "@/lib/supabase/client"

// ─── Local Storage Keys ────────────────────────────────────────────────────────
export function coinKey(userId: string | null | undefined) {
  return userId && userId !== "local" ? `playlab_coins_${userId}` : "playlab_coins_local"
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PlaylabProgress {
  coins: number
  wordchemy_discovered: string[]
  wordchemy_unlocked_packs: string[]
  high_scores: Record<string, number>
  rh_unlocked_envs: string[]
}

const DEFAULTS: PlaylabProgress = {
  coins: 100,
  wordchemy_discovered: ["fire", "water", "earth", "air"],
  wordchemy_unlocked_packs: ["core"],
  high_scores: {},
  rh_unlocked_envs: ["volcano", "submarine"],
}

// ─── Debounce flush state ─────────────────────────────────────────────────────
let _flushTimer: ReturnType<typeof setTimeout> | null = null
let _pendingFlush: Partial<PlaylabProgress> | null = null

// ─── Local reads / writes ─────────────────────────────────────────────────────

function lsGet(userId: string | null | undefined): Partial<PlaylabProgress> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(`playlab_progress_${userId ?? "local"}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function lsSet(userId: string | null | undefined, patch: Partial<PlaylabProgress>) {
  if (typeof window === "undefined") return
  const current = lsGet(userId)
  const merged = { ...current, ...patch }
  localStorage.setItem(`playlab_progress_${userId ?? "local"}`, JSON.stringify(merged))

  // Also keep the old individual coins key for backward-compat with existing code
  if (patch.coins !== undefined) {
    localStorage.setItem(coinKey(userId), patch.coins.toString())
    // Notify same-tab listeners (other games open in same browser session)
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: coinKey(userId),
        newValue: patch.coins.toString(),
        storageArea: localStorage,
      })
    )
  }
}

// ─── Supabase reads / writes ──────────────────────────────────────────────────

async function dbGet(userId: string): Promise<Partial<PlaylabProgress> | null> {
  const { data, error } = await supabase
    .from("playlab_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.error("Supabase playlab_progress select error:", error)
    return null
  }
  if (!data) return null
  return {
    coins: data.coins ?? DEFAULTS.coins,
    wordchemy_discovered: data.wordchemy_discovered ?? DEFAULTS.wordchemy_discovered,
    wordchemy_unlocked_packs: data.wordchemy_unlocked_packs ?? DEFAULTS.wordchemy_unlocked_packs,
    high_scores: data.high_scores ?? DEFAULTS.high_scores,
    rh_unlocked_envs: data.rh_unlocked_envs ?? DEFAULTS.rh_unlocked_envs,
  }
}

async function dbUpsert(userId: string, patch: Partial<PlaylabProgress>) {
  const { error } = await supabase.from("playlab_progress").upsert(
    {
      user_id: userId,
      ...patch,
    },
    { onConflict: "user_id" }
  )
  if (error) {
    console.error("Supabase playlab_progress upsert error:", error)
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Load progress. Returns merged Supabase + localStorage data.
 * Always writes to localStorage so the page loads instantly on next visit.
 */
export async function loadProgress(
  userId: string | null | undefined
): Promise<PlaylabProgress> {
  const local = lsGet(userId)
  let merged: PlaylabProgress = { ...DEFAULTS, ...local }

  if (userId && userId !== "local") {
    const remote = await dbGet(userId)
    if (remote) {
      // Remote wins: always take the higher coin value to prevent loss
      merged = {
        coins: Math.max(merged.coins, remote.coins ?? 0),
        wordchemy_discovered: Array.from(
          new Set([...(merged.wordchemy_discovered ?? []), ...(remote.wordchemy_discovered ?? [])])
        ),
        wordchemy_unlocked_packs: Array.from(
          new Set([...(merged.wordchemy_unlocked_packs ?? []), ...(remote.wordchemy_unlocked_packs ?? [])])
        ),
        high_scores: { ...merged.high_scores, ...remote.high_scores },
        rh_unlocked_envs: Array.from(
          new Set([...(merged.rh_unlocked_envs ?? []), ...(remote.rh_unlocked_envs ?? [])])
        ),
      }
      // Sync back merged to localStorage
      lsSet(userId, merged)
    }
  }

  return merged
}

/**
 * Save a partial progress update.
 * Writes to localStorage immediately; debounces Supabase flush by 1.5s unless immediate=true.
 */
export function saveProgress(
  userId: string | null | undefined,
  patch: Partial<PlaylabProgress>,
  immediate = false
) {
  // Immediate local write
  lsSet(userId, patch)

  // Skip DB write for guests
  if (!userId || userId === "local") return

  // Accumulate patches
  _pendingFlush = { ...(_pendingFlush ?? {}), ...patch }

  if (immediate) {
    if (_flushTimer) clearTimeout(_flushTimer)
    const toFlush = _pendingFlush
    _pendingFlush = null
    dbUpsert(userId, toFlush).catch(err => console.error("Immediate upsert error:", err))
    return
  }

  // Debounce: flush after 1.5s of inactivity
  if (_flushTimer) clearTimeout(_flushTimer)
  _flushTimer = setTimeout(async () => {
    if (_pendingFlush && userId) {
      const toFlush = _pendingFlush
      _pendingFlush = null
      await dbUpsert(userId, toFlush)
    }
  }, 1500)
}

/**
 * Exposes direct saving of high scores to unified JSONB column
 */
export function saveHighScore(
  userId: string | null | undefined,
  gameId: string,
  score: number
) {
  if (typeof window === "undefined") return
  const current = lsGet(userId)
  const highScores = { ...(current.high_scores ?? {}), [gameId]: score }
  saveProgress(userId, { high_scores: highScores }, true)
}

// ─── Coin-specific helpers (convenience wrappers) ────────────────────────────

export function readCoins(userId: string | null | undefined): number {
  if (typeof window === "undefined") return DEFAULTS.coins
  const raw = localStorage.getItem(coinKey(userId))
  if (raw !== null) return parseInt(raw) || 0
  // Not yet initialized — write default
  const progress = lsGet(userId)
  const coins = progress.coins ?? DEFAULTS.coins
  localStorage.setItem(coinKey(userId), coins.toString())
  return coins
}

export function writeCoins(userId: string | null | undefined, amount: number): number {
  const next = Math.max(0, amount)
  saveProgress(userId, { coins: next }, true)
  return next
}

export function adjustCoins(userId: string | null | undefined, delta: number): number {
  return writeCoins(userId, readCoins(userId) + delta)
}

/**
 * Subscribe to coin changes for cross-tab sync.
 * Returns an unsubscribe function.
 */
export function onCoinsChange(
  userId: string | null | undefined,
  callback: (newBalance: number) => void
): () => void {
  const key = coinKey(userId)
  const handler = (e: StorageEvent) => {
    if (e.key === key && e.newValue !== null) {
      callback(parseInt(e.newValue) || 0)
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handler)
  }
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handler)
    }
  }
}
