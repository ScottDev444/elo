import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OwnerPageEditor from "@/components/OwnerPageEditor";

export default async function EditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!group) return notFound();

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("group_id", group.id)
    .order("created_at", { ascending: false });

  return <OwnerPageEditor initialGroup={group} initialPosts={posts || []} />;
}