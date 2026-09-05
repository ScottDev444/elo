import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function OpenPage({ params }: Props) {
  const { slug } = await params;

  redirect(`/pages/${slug}`);
}