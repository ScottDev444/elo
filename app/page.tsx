import Link from "next/link";
import { AlertTriangle, CalendarDays, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/PostCard";
import HomeHero from "@/components/HomeHero";

export const dynamic = "force-dynamic";

function getPageName(post: any) {
  return post.groups?.name ?? "East Lothian";
}

function isLocalPartner(post: any) {
  return post.groups?.is_local_partner === true;
}

function normaliseDate(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function getSelectedDates(post: any) {
  const metadataDates = post.metadata?.active_dates ?? [];
  if (metadataDates.length > 0) return metadataDates;
  if (post.event_start) return [post.event_start];
  return [];
}

function selectedDateKey(value: any) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value?.date) return String(value.date).slice(0, 10);
  if (value?.start) return String(value.start).slice(0, 10);
  return "";
}

function hasSelectedDate(post: any, target: Date) {
  const targetKey = dateKey(target);

  return getSelectedDates(post).some((date: any) => {
    return selectedDateKey(date) === targetKey;
  });
}

function hasSelectedDateBetween(post: any, start: Date, end: Date) {
  return getSelectedDates(post).some((date: any) => {
    const key = selectedDateKey(date);
    if (!key) return false;

    const selected = normaliseDate(new Date(key));
    return selected >= start && selected <= end;
  });
}

function hasFutureDate(post: any, today: Date) {
  return getSelectedDates(post).some((date: any) => {
    const key = selectedDateKey(date);
    if (!key) return false;

    return normaliseDate(new Date(key)) >= today;
  });
}

function isExpired(post: any, today: Date) {
  if (!post.expires_at) return false;
  return normaliseDate(new Date(post.expires_at)) < today;
}

function getNextDateKey(post: any, today: Date) {
  return (
    getSelectedDates(post)
      .map((date: any) => selectedDateKey(date))
      .filter(Boolean)
      .filter((key: string) => normaliseDate(new Date(key)) >= today)
      .sort()[0] ?? ""
  );
}

function sortByNextSelectedDate(posts: any[], today: Date) {
  return [...posts].sort((a, b) => {
    return getNextDateKey(a, today).localeCompare(getNextDateKey(b, today));
  });
}

function getTimeLabel(post: any) {
  const today = normaliseDate(new Date());

  if (hasSelectedDate(post, today)) return "Today";

  const firstDateKey = getNextDateKey(post, today);
  if (!firstDateKey) return "";

  const firstDate = normaliseDate(new Date(firstDateKey));
  const diff = Math.round((firstDate.getTime() - today.getTime()) / 86400000);

  if (diff === 1) return "Tomorrow";
  if (diff > 1) return `In ${diff} days`;

  return "";
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function uniqueByTitle(posts: any[]) {
  const seen = new Set<string>();

  return posts.filter((post: any) => {
    const title = String(post.title ?? "").trim().toLowerCase();
    if (seen.has(title)) return false;

    seen.add(title);
    return true;
  });
}

function getThisWeekend(today: Date) {
  const day = today.getDay();

  const saturday = normaliseDate(new Date(today));
  saturday.setDate(today.getDate() + ((6 - day + 7) % 7));

  const sunday = normaliseDate(new Date(saturday));
  sunday.setDate(saturday.getDate() + 1);

  return { start: saturday, end: sunday };
}

function getNextWeek(today: Date) {
  const day = today.getDay();

  const monday = normaliseDate(new Date(today));
  monday.setDate(today.getDate() + ((1 - day + 7) % 7 || 7));

  const friday = normaliseDate(new Date(monday));
  friday.setDate(monday.getDate() + 4);

  return { start: monday, end: friday };
}

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: approvedPage } = user
    ? await supabase
        .from("groups")
        .select("slug")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle()
    : { data: null };

  const { data: posts } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      image_url,
      created_at,
      expires_at,
      event_start,
      event_end,
      metadata,
      type,
      deal_price,
      groups(name, is_local_partner)
    `)
    .order("created_at", { ascending: false })
    .limit(150);

  const allPosts = posts ?? [];
  const today = normaliseDate(new Date());
  const day = today.getDay();

  const activeDatedPosts = allPosts.filter(
    (p: any) =>
      getSelectedDates(p).length > 0 &&
      hasFutureDate(p, today) &&
      !isExpired(p, today)
  );

  const featuredPosts = uniqueByTitle(
    shuffle(activeDatedPosts.filter((post: any) => isLocalPartner(post)))
  ).slice(0, 3);

  const todayPosts = sortByNextSelectedDate(
    activeDatedPosts.filter((p: any) => hasSelectedDate(p, today)),
    today
  ).slice(0, 20);

  const showNextWeek = day === 0 || day === 6;
  const upcomingRange = showNextWeek ? getNextWeek(today) : getThisWeekend(today);

  const upcomingPosts = sortByNextSelectedDate(
    activeDatedPosts.filter((p: any) =>
      hasSelectedDateBetween(p, upcomingRange.start, upcomingRange.end)
    ),
    today
  ).slice(0, 20);

  const alertPosts = shuffle(
    allPosts.filter((p: any) => p.type === "update" && !isExpired(p, today))
  ).slice(0, 20);

  const upcomingTitle = showNextWeek
    ? "Next Week in East Lothian 📅"
    : "This Weekend in East Lothian 🍦";

  return (
    <main className="min-h-screen bg-white px-6 pb-6 pt-2 md:p-6">
      <div className="-mx-6 md:mx-0 [&>*]:rounded-none md:[&>*]:rounded-[2rem]">
        <HomeHero />
      </div>

      {approvedPage && (
        <section className="mt-6 hidden grid-cols-3 gap-3 md:grid">
          <Link
            href={`/${approvedPage.slug}`}
            className="rounded-2xl bg-black px-5 py-4 text-center text-sm font-black text-white"
          >
            My Page
          </Link>

          <Link
            href="/create-post"
            className="rounded-2xl bg-emerald-700 px-5 py-4 text-center text-sm font-black text-white"
          >
            Create Post
          </Link>

          <Link
            href="/partner"
            className="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-center text-sm font-black text-black"
          >
            Become Local Partner
          </Link>
        </section>
      )}

      {featuredPosts.length > 0 && (
        <>
          <h2 className="mb-4 mt-10 text-3xl font-black tracking-tight text-black">
            Local Partners 💚
          </h2>

          {featuredPosts.map((post: any) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              pageName={getPageName(post)}
              imageUrl={post.image_url}
              timeLabel={getTimeLabel(post)}
              type={post.type}
              deal_price={post.deal_price}
            />
          ))}
        </>
      )}

      <h2 className="mb-4 mt-12 text-3xl font-black tracking-tight text-black">
        Today in East Lothian 📍
      </h2>

      {todayPosts.map((post: any) => (
        <PostCard
          key={post.id}
          id={post.id}
          title={post.title}
          pageName={getPageName(post)}
          imageUrl={post.image_url}
          timeLabel={getTimeLabel(post)}
          type={post.type}
          deal_price={post.deal_price}
        />
      ))}

      <Link href="/calendar" className="block">
        <section className="mt-12 overflow-hidden rounded-[2rem] bg-emerald-800 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-100/70">
                East Lothian Calendar
              </p>

              <h2 className="text-3xl font-black leading-none">
                Plan your week.
              </h2>

              <p className="mt-3 max-w-sm text-sm text-white/80">
                Events, deals and local updates across East Lothian.
              </p>
            </div>

            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white text-emerald-800 shadow-lg">
              <CalendarDays size={30} />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-emerald-900/30 px-4 py-3">
            <span className="text-sm font-semibold">Open calendar</span>
            <ChevronRight size={20} />
          </div>
        </section>
      </Link>

      <h2 className="mb-4 mt-12 text-3xl font-black tracking-tight text-black">
        {upcomingTitle}
      </h2>

      {upcomingPosts.map((post: any) => (
        <PostCard
          key={post.id}
          id={post.id}
          title={post.title}
          pageName={getPageName(post)}
          imageUrl={post.image_url}
          timeLabel={getTimeLabel(post)}
          type={post.type}
          deal_price={post.deal_price}
        />
      ))}

      <h2 className="mb-4 mt-12 text-3xl font-black tracking-tight text-black">
        ⚠️ Local Alerts
      </h2>

      {alertPosts.map((post: any) => (
        <Link key={post.id} href={`/posts/${post.id}`}>
          <article className="flex items-center justify-between border-b border-neutral-100 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-yellow-100 p-3">
                <AlertTriangle size={22} className="text-yellow-700" />
              </div>

              <div>
                <p className="text-sm font-semibold text-black">{post.title}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {getPageName(post)}
                </p>
              </div>
            </div>

            <ChevronRight size={22} className="text-neutral-400" />
          </article>
        </Link>
      ))}
    </main>
  );
}