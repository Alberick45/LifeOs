import Link from "next/link"
import { Sparkles, ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Privacy Policy | HumanOS",
  description: "How HumanOS collects, uses, and protects your personal information.",
}

export default function PrivacyPage() {
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

      <main className="max-w-3xl mx-auto px-6 py-20">
        <div className="mb-12">
          <p className="text-primary text-sm font-medium mb-3">Last updated: June 2025</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            At HumanOS, your privacy is not an afterthought — it is the foundation. This policy explains what data we collect, why we collect it, and how we protect it.
          </p>
        </div>

        <div className="space-y-10 text-sm text-gray-400 leading-relaxed prose-custom">
          {[
            {
              title: "1. What We Collect",
              body: `When you create a HumanOS account, we collect your email address and a hashed password for authentication. Within the app, any data you enter — including names, contact details, interaction notes, trust scores, and reminders — is stored in your personal, private database partition. We do not collect data passively; everything stored is something you explicitly entered.`
            },
            {
              title: "2. How We Use Your Data",
              body: `Your data is used solely to power the HumanOS application for you. We use it to display your network, generate AI insights (with your explicit request), send reminder notifications, and sync across your devices. We do not use your data for advertising, profiling, or third-party analytics.`
            },
            {
              title: "3. Data Storage & Security",
              body: `HumanOS uses Supabase, a secure cloud database platform built on PostgreSQL, to store your data. All data is encrypted in transit using TLS and at rest using AES-256 encryption. Row-level security policies ensure that each user can only access their own data. No other user, administrator, or third party can read your personal relationship records.`
            },
            {
              title: "4. AI Features",
              body: `If you use the AI Magic feature, your person's profile and interaction history are sent to the Google Gemini API using your personal API key, stored in your account settings. We do not log, retain, or train on the content of these requests. You are in full control of when AI is invoked.`
            },
            {
              title: "5. Third-Party Services",
              body: `HumanOS integrates with: Supabase (database & auth), Google Gemini (AI features, optional), and Vercel (hosting). Each of these services has its own privacy policy. We have selected partners that uphold strong data protection standards. We do not sell or share your data with any third party for marketing purposes.`
            },
            {
              title: "6. Cookies & Local Storage",
              body: `HumanOS uses browser localStorage to cache your people network for faster load times and offline access. No cross-site tracking cookies are used. Authentication sessions are managed via secure HTTP-only cookies provided by Supabase Auth.`
            },
            {
              title: "7. Data Retention & Deletion",
              body: `Your data remains in our system for as long as your account is active. You may request deletion of your account and all associated data at any time from the Settings page. Upon deletion, all records are removed within 30 days, with the exception of anonymised aggregate metrics that cannot be tied back to you.`
            },
            {
              title: "8. Children's Privacy",
              body: `HumanOS is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately.`
            },
            {
              title: "9. Changes to This Policy",
              body: `We may update this Privacy Policy as our platform evolves. When we make significant changes, we will notify you via email or an in-app banner. Continued use of HumanOS after such changes constitutes acceptance of the updated policy.`
            },
            {
              title: "10. Contact Us",
              body: `If you have any questions, concerns, or requests regarding your privacy, please contact us at alberick2020@outlook.com. We aim to respond to all privacy enquiries within 5 business days.`
            },
          ].map((section) => (
            <section key={section.title} className="pb-8 border-b border-white/5 last:border-0">
              <h2 className="text-lg font-semibold text-white mb-3">{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
