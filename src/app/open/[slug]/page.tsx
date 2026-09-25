import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import PageViewClient, { type PageData, type Post, type Place, type Batch } from "./PageViewClient";

const PAGE_SELECT = "id,name,slug,description,logo_url,brand_color,website,layout,showcase_images,is_local_partner,status,is_public";
const POST_SELECT = "id,group_id,title,content,image_url,created_at,type,expires_at,event_start,event_end,deal_price,metadata";
const PLACE_SELECT = "id,page_id,title,description,location_name,address,postcode,slug,images,is_active,opening_hours,is_24_7,metadata";

// Each request uses the existing server client and its normal Supabase RLS policies.
async function readBatch(groupId: string, postOffset: number, placeOffset: number, morePosts: boolean, morePlaces: boolean): Promise<Batch> {
  const db = await createClient();
  const [posts, places] = await Promise.all([
    morePosts ? db.from("posts").select(POST_SELECT).eq("group_id", groupId).order("created_at", { ascending: false }).order("id", { ascending: false }).range(postOffset, postOffset + 19) : Promise.resolve({ data: [], error: null }),
    morePlaces ? db.from("places").select(PLACE_SELECT).eq("page_id", groupId).eq("is_active", true).order("title", { ascending: true }).order("id", { ascending: true }).range(placeOffset, placeOffset + 11) : Promise.resolve({ data: [], error: null }),
  ]);
  if (posts.error || places.error) {
    console.error("Page content failed:", posts.error || places.error);
    return { posts: [], places: [], postOffset, placeOffset, morePosts, morePlaces, error: "Unable to load content. Please try again." };
  }
  const rawPosts = (posts.data ?? []) as Post[];
  const rawPlaces = (places.data ?? []) as Place[];
  return { posts: rawPosts, places: rawPlaces, postOffset: postOffset + rawPosts.length, placeOffset: placeOffset + rawPlaces.length, morePosts: morePosts && rawPosts.length === 20, morePlaces: morePlaces && rawPlaces.length === 12 };
}

export default async function PublicBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await createClient();
  // Escape LIKE wildcards so underscores/percent signs cannot match another page.
  const literal = (text: string) => text.replace(/[\\%_]/g, "\\$&");
  const first = await db.from("groups").select(PAGE_SELECT).ilike("slug", literal(slug.trim())).limit(1);
  if (first.error) console.error("Page lookup failed:", first.error);
  let page = (first.data?.[0] ?? null) as PageData | null;
  if (!page && !first.error) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
      const byId = await db.from("groups").select(PAGE_SELECT).eq("id", slug).maybeSingle();
      page = byId.data as PageData | null;
    }
    if (!page) {
      const byName = await db.from("groups").select(PAGE_SELECT).ilike("name", literal(slug.replace(/-/g, " ").replace(/\s+/g, " ").trim())).limit(1);
      page = (byName.data?.[0] ?? null) as PageData | null;
    }
  }
  if (!page || page.status?.trim().toLowerCase() !== "approved" || page.is_public === false) {
    return <><SiteHeader/><main className="flex min-h-[70vh] items-center justify-center bg-[#F4F5F4] px-6"><div className="text-center"><h1 className="text-xl font-black text-[#14221E]">Page unavailable</h1><p className="mt-2 text-sm text-[#78827E]">This ELO Page isn&apos;t available right now.</p><Link className="mt-6 inline-block font-bold text-[#005744]" href="/">Back home</Link></div></main><Footer/></>;
  }
  const groupId = page.id;
  const initial = await readBatch(groupId, 0, 0, true, true);
  async function loadMore(postOffset: number, placeOffset: number, morePosts: boolean, morePlaces: boolean): Promise<Batch> {
    "use server";
    if (![postOffset, placeOffset].every(n => Number.isSafeInteger(n) && n >= 0) || typeof morePosts !== "boolean" || typeof morePlaces !== "boolean") throw new Error("Invalid pagination request.");
    const client = await createClient();
    const { data, error } = await client.from("groups").select("status,is_public").eq("id", groupId).maybeSingle();
    if (error || !data || data.status?.trim().toLowerCase() !== "approved" || data.is_public === false) throw new Error("Page unavailable.");
    return readBatch(groupId, postOffset, placeOffset, morePosts, morePlaces);
  }
  return <><SiteHeader/><PageViewClient key={groupId} page={page} initial={initial} loadMore={loadMore}/><Footer/></>;
}