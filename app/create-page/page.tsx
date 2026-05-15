import { redirect } from "next/navigation";
import { Building2, HandHeart, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const pageTypes = [
  {
    type: "business",
    title: "Business",
    text: "For cafés, shops, salons, pubs, venues and local makers.",
    icon: Store,
  },
  {
    type: "service",
    title: "Service",
    text: "For trades, freelancers, classes, repairs and professional services.",
    icon: Building2,
  },
  {
    type: "organisation",
    title: "Organisation",
    text: "For charities, churches, clubs, groups and community projects.",
    icon: HandHeart,
  },
];

export default async function CreatePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  async function createPage(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth");

    const pageType = String(formData.get("page_type") || "business");

    const { data: page, error } = await supabase
      .from("groups")
      .insert({
        user_id: user.id,
        name: "Untitled page",
        slug: `page-${crypto.randomUUID().slice(0, 8)}`,
        page_type: pageType,
        status: "draft",
      })
      .select("slug")
      .single();

    if (error || !page) {
      throw new Error(error?.message || "Could not create page");
    }

    redirect(`/${page.slug}/edit`);
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <section className="mx-auto max-w-5xl">
        <h1 className="text-5xl font-black tracking-tight text-black md:text-6xl">
          What kind of page are you creating?
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">
          Choose the page type that best fits you. You’ll edit the details next,
          then submit it for approval when you’re ready.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {pageTypes.map((item) => {
            const Icon = item.icon;

            return (
              <form key={item.type} action={createPage}>
                <input type="hidden" name="page_type" value={item.type} />

                <button
                  type="submit"
                  className="h-full w-full rounded-[2rem] border border-neutral-200 bg-white p-6 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <Icon className="text-emerald-700" size={34} />

                  <h2 className="mt-6 text-2xl font-black text-black">
                    {item.title}
                  </h2>

                  <p className="mt-3 leading-7 text-neutral-600">
                    {item.text}
                  </p>
                </button>
              </form>
            );
          })}
        </div>
      </section>
    </main>
  );
}