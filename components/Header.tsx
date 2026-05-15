"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserPage = {
  name: string;
  slug: string;
};

export default function Header() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [userPage, setUserPage] = useState<UserPage | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSignedIn(false);
      setUsername("");
      setUserPage(null);
      setIsAdmin(false);
      return;
    }

    setSignedIn(true);

    const { data: profile } = await supabase
      .from("users")
      .select("username, role")
      .eq("id", user.id)
      .maybeSingle();

    setUsername(profile?.username || user.email?.split("@")[0] || "");
    setIsAdmin(profile?.role === "admin");

    const { data: page } = await supabase
      .from("groups")
      .select("name, slug")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setUserPage(page || null);
  }

  useEffect(() => {
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function toggleMenu() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      await loadUser();
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSignedIn(false);
    setUsername("");
    setUserPage(null);
    setIsAdmin(false);
    setOpen(false);
    window.location.href = "/";
  }

  function closeMenu() {
    setOpen(false);
  }

  const links = [
    { label: "Home", href: "/" },
    { label: "What's On", href: "/calendar" },
    { label: "My Calendar", href: "/my-calendar" },
    {
      label: "Email Us",
      href: "mailto:eastlothian.online@outlook.com",
    },
    {
      label: "Support Us",
      href: "https://ko-fi.com/eastlothianonline",
    },
    { label: "Account", href: "/account" },
  ];

  return (
    <>
      <header className="flex items-center justify-between bg-white px-6 py-5">
        <Link href="/" className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="Logo"
            width={56}
            height={56}
            className="rounded-2xl"
            priority
          />

          <div>
            <p className="text-sm text-neutral-500">East Lothian Online</p>
            <h1 className="text-lg font-semibold text-black">
              The Summer of ’26 🍦
            </h1>
          </div>
        </Link>

        <button
          onClick={toggleMenu}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 transition hover:bg-neutral-200"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {open && (
        <div className="border-b border-neutral-100 bg-white px-6 pb-6">
          <nav className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  link.href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                className="rounded-2xl px-4 py-3 text-sm font-medium text-black hover:bg-neutral-100"
              >
                {link.label}
              </Link>
            ))}

            {signedIn && (
              <Link
                href={userPage ? `/${userPage.slug}` : "/create-page"}
                onClick={closeMenu}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-black hover:bg-neutral-100"
              >
                {userPage ? "My Page" : "Create Page"}
              </Link>
            )}

            {signedIn && userPage && (
              <Link
                href="/partner"
                onClick={closeMenu}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Become a Local Partner 💚
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                onClick={closeMenu}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-black hover:bg-neutral-100"
              >
                Admin
              </Link>
            )}
          </nav>

          <div className="mt-5 border-t border-neutral-100 pt-5">
            {signedIn ? (
              <>
                <p className="px-4 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                  Signed in as
                </p>

                <p className="px-4 text-sm font-semibold text-black">
                  @{username}
                </p>

                <button
                  onClick={handleSignOut}
                  className="mt-3 w-full rounded-2xl bg-neutral-100 px-4 py-3 text-left text-sm font-semibold text-black hover:bg-neutral-200"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                onClick={closeMenu}
                className="block rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}