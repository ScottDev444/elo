import SiteHeader from "@/components/SiteHeader";
import HomeHero from "@/components/HomeHero";
import Post from "@/components/Post";
import AlertStrip from "@/components/AlertStrip";
import HomePosts from "@/components/HomePosts";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-emerald-700">
      <SiteHeader />
      <HomeHero />
      <AlertStrip />
      <HomePosts />
      <Footer />
    </main>
  );
}