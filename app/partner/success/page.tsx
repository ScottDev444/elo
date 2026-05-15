import Link from "next/link";
import { ArrowRight, CheckCircle2, Crown } from "lucide-react";

export default function PartnerSuccessPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16">
      <section className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="text-emerald-600" size={52} />
        </div>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
          <Crown size={16} />
          Local Partner Active
        </div>

        <h1 className="mt-6 text-5xl font-black tracking-tight text-black md:text-6xl">
          Welcome to Local Partnership 🤝
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-xl leading-9 text-neutral-700">
          Your support helps keep East Lothian Online local, independent and
          focused on the community — while unlocking Local Partner benefits for
          your page.
        </p>

        <div className="mt-10 rounded-[2rem] border border-neutral-200 bg-neutral-50 p-8 text-left">
          <h2 className="text-2xl font-black text-black">
            Your Local Partner benefits
          </h2>

          <div className="mt-6 space-y-4 text-lg text-neutral-700">
            <p>✔️ Higher visibility across search and discovery</p>
            <p>✔️ Featured placement opportunities</p>
            <p>✔️ Local insight and recommendation trends</p>
            <p>✔️ Local Partner badge across your posts and page</p>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-4 text-lg font-black text-white transition-opacity hover:opacity-90"
          >
            Back to ELO
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}