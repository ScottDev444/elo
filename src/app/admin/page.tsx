"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  LayoutPanelTop,
  ListChecks,
  LockKeyhole,
  LoaderCircle,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";

import Header from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import Posts from "@/admincomponents/posts";
import Pages from "@/admincomponents/pages";
import Features from "@/admincomponents/features";
import Users from "@/admincomponents/users";
import Actions from "@/admincomponents/actions";
import { createClient } from "@/lib/supabase/client";

type AdminSection =
  | "posts"
  | "pages"
  | "features"
  | "users"
  | "actions";

type AccessState = "checking" | "allowed" | "denied";

export default function AdminPage() {
  const [section, setSection] = useState<AdminSection>("posts");
  const [access, setAccess] = useState<AccessState>("checking");

  useEffect(() => {
    async function checkAccess() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setAccess("denied");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError || profile?.role !== "admin") {
          setAccess("denied");
          return;
        }

        setAccess("allowed");
      } catch (error) {
        console.error("Failed to verify admin access:", error);
        setAccess("denied");
      }
    }

    void checkAccess();
  }, []);

  return (
    <>
      <Header />

      {access === "checking" ? (
        <main className="grid min-h-[70vh] place-items-center bg-slate-50 px-4">
          <div className="flex items-center gap-3 text-sm font-black text-slate-500">
            <LoaderCircle className="h-6 w-6 animate-spin" />
            Checking administrator access
          </div>
        </main>
      ) : null}

      {access === "denied" ? (
        <main className="grid min-h-[70vh] place-items-center bg-slate-50 px-4 py-16">
          <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm sm:px-12">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-emerald-100 text-emerald-700">
              <LockKeyhole className="h-12 w-12" />
            </div>

            <h1 className="mt-8 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Admin access required
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600">
              You must be signed in with an administrator account to access this page.
            </p>

            <p className="mx-auto mt-3 max-w-xl font-bold leading-7 text-emerald-700">
              Contact the developer if you are an admin and are having trouble accessing the panel.
            </p>
          </section>
        </main>
      ) : null}

      {access === "allowed" ? (
        <main className="min-h-screen bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                  East Lothian Online
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-emerald-700">
                  Admin Panel
                </h1>
              </div>

              <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-1">
                <TabButton
                  active={section === "actions"}
                  onClick={() => setSection("actions")}
                  icon={<ListChecks className="h-4 w-4" />}
                  label="Actions"
                />

                <TabButton
                  active={section === "posts"}
                  onClick={() => setSection("posts")}
                  icon={<FileText className="h-4 w-4" />}
                  label="Posts"
                />

                <TabButton
                  active={section === "pages"}
                  onClick={() => setSection("pages")}
                  icon={<LayoutPanelTop className="h-4 w-4" />}
                  label="Pages"
                />

                <TabButton
                  active={section === "features"}
                  onClick={() => setSection("features")}
                  icon={<SlidersHorizontal className="h-4 w-4" />}
                  label="Features"
                />

                <TabButton
                  active={section === "users"}
                  onClick={() => setSection("users")}
                  icon={<UsersRound className="h-4 w-4" />}
                  label="Users"
                />
              </div>
            </div>
          </div>

          {section === "actions" ? <Actions /> : null}
          {section === "posts" ? <Posts /> : null}
          {section === "pages" ? <Pages /> : null}
          {section === "features" ? <Features /> : null}
          {section === "users" ? <Users /> : null}
        </main>
      ) : null}

      <Footer />
    </>
  );
}

type TabButtonProps = {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
};

function TabButton({
  active,
  onClick,
  icon,
  label,
}: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-500 hover:text-slate-950"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}