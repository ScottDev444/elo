import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const { data: page } = await supabase
    .from("groups")
    .select("name, slug")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-3xl font-black tracking-tight">Account</h1>

      <div className="mt-6 space-y-4">
        <div className="rounded-3xl bg-neutral-50 p-5">
          <p className="text-xs font-semibold uppercase text-neutral-400">
            Username
          </p>
          <p className="mt-1 font-semibold">@{profile?.username || "User"}</p>
        </div>

        <div className="rounded-3xl bg-neutral-50 p-5">
          <p className="text-xs font-semibold uppercase text-neutral-400">
            Email
          </p>
          <p className="mt-1 font-semibold">{user.email}</p>
        </div>

        {page ? (
          <>
            <Link href={`/${page.slug}`} className="block rounded-3xl bg-black p-5 font-semibold text-white">
              My Page
            </Link>

            <Link href="/partner" className="block rounded-3xl bg-emerald-500 p-5 font-semibold text-white">
              Become a Local Partner 💚
            </Link>
          </>
        ) : (
          <Link href="/create-page" className="block rounded-3xl bg-emerald-500 p-5 font-semibold text-white">
            Create Page
          </Link>
        )}

        <Link href="mailto:eastlothian.online@outlook.com" className="block rounded-3xl bg-neutral-100 p-5 font-semibold">
          Contact Us
        </Link>
      </div>
    </main>
  );
}