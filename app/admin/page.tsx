import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/");

  async function updateStatus(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const id = String(formData.get("id"));
    const status = String(formData.get("status"));

    const { error } = await supabase
      .from("groups")
      .update({ status })
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/admin");
  }

  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  const { data: pendingPages } = await supabase
    .from("groups")
    .select("id, name, slug, page_type, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <section className="mx-auto max-w-5xl">
        <h1 className="text-5xl font-black tracking-tight text-black">Admin</h1>

        <div className="mt-8 rounded-3xl bg-emerald-50 p-6">
          <p className="text-sm font-bold text-emerald-700">Total users</p>
          <p className="mt-2 text-4xl font-black text-black">{totalUsers ?? 0}</p>
        </div>

        <h2 className="mt-10 text-3xl font-black text-black">Pending pages</h2>

        <div className="mt-5 space-y-4">
          {pendingPages?.length ? (
            pendingPages.map((page) => (
              <div key={page.id} className="rounded-3xl border border-neutral-200 p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-black">{page.name}</h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {page.page_type} · /{page.slug}
                    </p>

                    <Link
                      href={`/${page.slug}`}
                      className="mt-3 inline-block text-sm font-bold text-emerald-700 underline"
                    >
                      View page
                    </Link>
                  </div>

                  <div className="flex gap-3">
                    <form action={updateStatus}>
                      <input type="hidden" name="id" value={page.id} />
                      <input type="hidden" name="status" value="draft" />
                      <button className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-3 font-bold text-black">
                        <RotateCcw size={16} />
                        Send to draft
                      </button>
                    </form>

                    <form action={updateStatus}>
                      <input type="hidden" name="id" value={page.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 font-bold text-white">
                        <CheckCircle2 size={16} />
                        Approve
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-neutral-200 p-6 text-neutral-600">
              No pending pages.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}