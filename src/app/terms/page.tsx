import Link from "next/link"
import { Sparkles, ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Terms of Service | HumanOS",
  description: "The terms and conditions governing your use of HumanOS.",
}

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            By creating an account or using HumanOS, you agree to the following terms. Please read them carefully.
          </p>
        </div>

        <div className="space-y-10 text-sm text-gray-400 leading-relaxed">
          {[
            {
              title: "1. Acceptance of Terms",
              body: `By accessing or using HumanOS ("the Service"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not use the Service. These terms apply to all users, including those who register for an account.`
            },
            {
              title: "2. Eligibility",
              body: `You must be at least 13 years of age to use HumanOS. By using the Service, you represent that you meet this requirement. If you are using HumanOS on behalf of an organisation, you represent that you have the authority to bind that organisation to these terms.`
            },
            {
              title: "3. Account Responsibilities",
              body: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us immediately at support@humanos.app if you suspect any unauthorised use of your account. We cannot be held liable for any loss or damage arising from your failure to protect your login credentials.`
            },
            {
              title: "4. Acceptable Use",
              body: `You agree to use HumanOS only for lawful, personal purposes. You must not: (a) use the Service to harass, stalk, or harm others; (b) attempt to reverse-engineer or exploit the platform; (c) input false, fraudulent, or defamatory information; (d) attempt to access other users' private data; or (e) use automated bots or scripts to access the Service.`
            },
            {
              title: "5. Your Content",
              body: `All relationship data, notes, and interaction records you enter into HumanOS remain your property. By using the Service, you grant HumanOS a limited licence to store and process this content solely to provide the Service to you. We do not claim ownership of your data and will not use it for any purpose other than operating the platform for your benefit.`
            },
            {
              title: "6. AI Features",
              body: `The AI Magic features require you to provide your own Google Gemini API key. Use of these features is subject to Google's own Terms of Service and usage policies. HumanOS does not guarantee the accuracy, appropriateness, or completeness of any AI-generated output and is not liable for any decisions made based on AI-generated suggestions.`
            },
            {
              title: "7. PlayLab Games",
              body: `PlayLab games are provided for entertainment purposes within the HumanOS ecosystem. In-game coins and rewards are virtual and have no real-world monetary value. We reserve the right to modify, suspend, or remove any game at any time without notice.`
            },
            {
              title: "8. Service Availability",
              body: `We strive to maintain high availability but do not guarantee that the Service will be available at all times without interruption. We may perform maintenance, updates, or changes that temporarily affect access. We are not liable for any loss or inconvenience caused by downtime.`
            },
            {
              title: "9. Termination",
              body: `You may delete your account at any time from the Settings page. We reserve the right to suspend or terminate your account if we determine, in our sole discretion, that you have violated these Terms. Upon termination, your right to use the Service ends immediately, and your data will be deleted in accordance with our Privacy Policy.`
            },
            {
              title: "10. Limitation of Liability",
              body: `HumanOS is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of, or inability to use, the Service. Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim (which for free-tier users is zero).`
            },
            {
              title: "11. Changes to These Terms",
              body: `We may update these Terms of Service from time to time. When we do, we will revise the date at the top of this page and notify you via email or in-app notification. Continued use of the Service after changes take effect constitutes your acceptance of the new terms.`
            },
            {
              title: "12. Contact",
              body: `If you have any questions about these Terms, please contact us at legal@humanos.app.`
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
