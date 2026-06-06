"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Sparkles, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

const FAQS = [
  {
    q: "What is HumanOS?",
    a: "HumanOS is a personal relationship intelligence platform that helps you maintain meaningful connections. It's not a CRM or a contact book — it's a living memory system that remembers context, emotional history, and key moments about the people who matter most to you.",
  },
  {
    q: "Is HumanOS free to use?",
    a: "Yes! HumanOS is free during our Phase 1 MVP launch. We plan to introduce optional premium features in the future, but the core experience will always be accessible.",
  },
  {
    q: "How is my data stored?",
    a: "Your data is stored securely using Supabase (a Postgres-backed cloud platform). All connections are encrypted in transit and at rest. You own your data — we do not sell or share it with third parties.",
  },
  {
    q: "Can I use HumanOS offline?",
    a: "HumanOS is a web-based platform and requires an internet connection to sync data. However, we cache your network locally so recent data is viewable even with intermittent connectivity.",
  },
  {
    q: "What are the PlayLab games?",
    a: "PlayLab is a collection of fun mini-games built into HumanOS: Chaos Alphabet, Word Chemy, Memory Hunter, Secret Card Hunt, Creature Forge, and Country War. You can play solo or invite friends from your network for live multiplayer sessions.",
  },
  {
    q: "How does the AI Magic feature work?",
    a: "AI Magic uses your interaction history, relationship notes, and upcoming events (like birthdays) to generate personalised messages, gift ideas, poems, and even a mini website for people in your network. You need a Gemini API key in your settings to use this feature.",
  },
  {
    q: "Can multiple people use the same account?",
    a: "No — each HumanOS account is personal and private. Your relationship data is visible only to you. You can, however, link your account to a friend's to see mutual connections on your network graph.",
  },
  {
    q: "How do I delete my account?",
    a: "You can request account deletion from your Settings page. All your data including people, interactions, and reminders will be permanently removed within 30 days.",
  },
  {
    q: "Is my relationship data visible to others?",
    a: "No. Your notes, interaction logs, trust scores, and backpack items are completely private and visible only to you. No other user can see your personal relationship data.",
  },
  {
    q: "Which devices does HumanOS support?",
    a: "HumanOS is a Progressive Web App (PWA) that works on any modern browser — desktop, tablet, or mobile. On Android Chrome and iOS Safari, you can install it directly to your home screen for an app-like experience.",
  },
]

function FAQItem({ faq, index }: { faq: typeof FAQS[0]; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-white/10 rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-white text-sm pr-4">{faq.q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4"
        >
          {faq.a}
        </motion.div>
      )}
    </motion.div>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-bold text-xl tracking-tight">HumanOS</span>
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
            Help Center
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-400 text-lg">
            Everything you need to know about HumanOS.
          </p>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <FAQItem key={i} faq={faq} index={i} />
          ))}
        </div>

        <div className="mt-14 text-center p-8 glass-panel rounded-2xl border border-white/10">
          <p className="text-gray-400 text-sm mb-4">Still have questions?</p>
          <a
            href="mailto:support@humanos.app"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full text-sm font-medium transition-colors"
          >
            Contact Support
          </a>
        </div>
      </main>
    </div>
  )
}
