import { createClient } from "@/lib/supabase/server";
import ExploreClient from "./ExploreClient";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("places")
    .select(`
      id,
      slug,
      title,
      description,
      location_name,
      address,
      postcode,
      tags,
      images,
      opening_hours,
      metadata,
      groups(name, is_local_partner)
    `)
    .eq("is_active", true)
    .limit(300);

  return <ExploreClient places={data ?? []} />;
}