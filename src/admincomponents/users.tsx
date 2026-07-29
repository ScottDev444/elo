"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  Search,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type AdminUser = {
  id: string;
  username: string | null;
  role: string | null;
  pageCount: number;
  postCount: number;
};

const PAGE_SIZE = 20;

const USER_SELECT = `
  id,
  username,
  role
`;


export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rankedUsers, setRankedUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "most_posts">("newest");

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editedUsername, setEditedUsername] = useState("");
  const [editConfirmation, setEditConfirmation] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingUser, setDeletingUser] = useState(false);

  const [error, setError] = useState("");

  const verifyAdmin = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be signed in.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (profile?.role !== "admin") {
      throw new Error("Administrator access is required.");
    }

    return user.id;
  }, []);

  const loadUsers = useCallback(
    async (reset: boolean) => {
      reset ? setLoading(true) : setLoadingMore(true);
      setError("");

      try {
        await verifyAdmin();

        const supabase = createClient();
        const searchTerm = submittedSearch.trim().replace(/[%_,()]/g, " ");

        if (sortBy === "most_posts") {
          let allUsersQuery = supabase
            .from("users")
            .select(USER_SELECT, { count: "exact" });

          if (searchTerm) {
            allUsersQuery = allUsersQuery.or(
              `username.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%`,
            );
          }

          const { data, count, error: usersError } = await allUsersQuery;

          if (usersError) {
            throw usersError;
          }

          const allProfiles = (data ?? []) as Array<
            Omit<AdminUser, "pageCount" | "postCount">
          >;

          const userIds = allProfiles.map((user) => user.id);
          const pageCounts = new Map<string, number>();
          const postCounts = new Map<string, number>();

          if (userIds.length > 0) {
            const [pagesResponse, postsResponse] = await Promise.all([
              supabase
                .from("groups")
                .select("user_id")
                .in("user_id", userIds),

              supabase
                .from("posts")
                .select("user_id")
                .in("user_id", userIds),
            ]);

            if (pagesResponse.error) {
              throw pagesResponse.error;
            }

            if (postsResponse.error) {
              throw postsResponse.error;
            }

            for (const page of pagesResponse.data ?? []) {
              if (typeof page.user_id !== "string") continue;

              pageCounts.set(
                page.user_id,
                (pageCounts.get(page.user_id) ?? 0) + 1,
              );
            }

            for (const post of postsResponse.data ?? []) {
              if (typeof post.user_id !== "string") continue;

              postCounts.set(
                post.user_id,
                (postCounts.get(post.user_id) ?? 0) + 1,
              );
            }
          }

          const globallyRanked: AdminUser[] = allProfiles
            .map((user) => ({
              ...user,
              pageCount: pageCounts.get(user.id) ?? 0,
              postCount: postCounts.get(user.id) ?? 0,
            }))
            .sort((a, b) => {
              if (b.postCount !== a.postCount) {
                return b.postCount - a.postCount;
              }

              if (b.pageCount !== a.pageCount) {
                return b.pageCount - a.pageCount;
              }

              return (a.username ?? "").localeCompare(b.username ?? "");
            });

          const nextLength = reset
            ? PAGE_SIZE
            : Math.min(users.length + PAGE_SIZE, globallyRanked.length);

          setRankedUsers(globallyRanked);
          setUsers(globallyRanked.slice(0, nextLength));
          setTotalUsers(count ?? globallyRanked.length);
          setHasMore(nextLength < globallyRanked.length);
          return;
        }

        const start = reset ? 0 : users.length;
        const end = start + PAGE_SIZE - 1;

        let query = supabase
          .from("users")
          .select(USER_SELECT, { count: "exact" })
          .order("username", { ascending: true })
          .range(start, end);

        if (searchTerm) {
          query = query.or(
            `username.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%`,
          );
        }

        const { data, count, error: loadError } = await query;

        if (loadError) {
          throw loadError;
        }

        const loadedProfiles = (data ?? []) as Array<
          Omit<AdminUser, "pageCount" | "postCount">
        >;

        const userIds = loadedProfiles.map((user) => user.id);
        const pageCounts = new Map<string, number>();
        const postCounts = new Map<string, number>();

        if (userIds.length > 0) {
          const [pagesResponse, postsResponse] = await Promise.all([
            supabase
              .from("groups")
              .select("user_id")
              .in("user_id", userIds),

            supabase
              .from("posts")
              .select("user_id")
              .in("user_id", userIds),
          ]);

          if (pagesResponse.error) {
            throw pagesResponse.error;
          }

          if (postsResponse.error) {
            throw postsResponse.error;
          }

          for (const page of pagesResponse.data ?? []) {
            if (typeof page.user_id !== "string") continue;

            pageCounts.set(
              page.user_id,
              (pageCounts.get(page.user_id) ?? 0) + 1,
            );
          }

          for (const post of postsResponse.data ?? []) {
            if (typeof post.user_id !== "string") continue;

            postCounts.set(
              post.user_id,
              (postCounts.get(post.user_id) ?? 0) + 1,
            );
          }
        }

        const loaded: AdminUser[] = loadedProfiles.map((user) => ({
          ...user,
          pageCount: pageCounts.get(user.id) ?? 0,
          postCount: postCounts.get(user.id) ?? 0,
        }));

        setRankedUsers([]);
        setUsers((current) => (reset ? loaded : [...current, ...loaded]));
        setTotalUsers(count ?? 0);
        setHasMore(loaded.length === PAGE_SIZE);
      } catch (caughtError) {
        console.error("Failed to load users:", caughtError);

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Users could not be loaded.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sortBy, submittedSearch, users.length, verifyAdmin],
  );

  useEffect(() => {
    void loadUsers(true);
  }, [submittedSearch, sortBy]);

  async function toggleRole(user: AdminUser) {
    if (updatingId) {
      return;
    }

    setUpdatingId(user.id);
    setError("");

    try {
      const currentAdminId = await verifyAdmin();

      if (user.id === currentAdminId && user.role === "admin") {
        throw new Error("You cannot remove your own administrator access.");
      }

      const supabase = createClient();
      const nextRole = user.role === "admin" ? "user" : "admin";

      const { data, error: updateError } = await supabase
        .from("users")
        .update({ role: nextRole })
        .eq("id", user.id)
        .select(USER_SELECT)
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!data) {
        throw new Error(
          "The user was not updated. Check the users UPDATE policy for administrators.",
        );
      }

      const updatedProfile = data as Omit<
        AdminUser,
        "pageCount" | "postCount"
      >;

      setUsers((current) =>
        current.map((item) =>
          item.id === updatedProfile.id
            ? {
                ...item,
                ...updatedProfile,
              }
            : item,
        ),
      );
    } catch (caughtError) {
      console.error("Failed to update user role:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The user role could not be updated.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function openEditModal(user: AdminUser) {
    setEditTarget(user);
    setEditedUsername(user.username ?? "");
    setEditConfirmation("");
  }

  function closeEditModal() {
    if (savingUsername) return;

    setEditTarget(null);
    setEditedUsername("");
    setEditConfirmation("");
  }

  async function saveUsername() {
    if (
      !editTarget ||
      editConfirmation !== "CONFIRM" ||
      !editedUsername.trim() ||
      savingUsername
    ) {
      return;
    }

    setSavingUsername(true);
    setError("");

    try {
      await verifyAdmin();

      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from("users")
        .update({ username: editedUsername.trim() })
        .eq("id", editTarget.id)
        .select(USER_SELECT)
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!data) {
        throw new Error(
          "The username was not updated. Check the users UPDATE policy for administrators.",
        );
      }

      const updatedProfile = data as Omit<
        AdminUser,
        "pageCount" | "postCount"
      >;

      setUsers((current) =>
        current.map((item) =>
          item.id === updatedProfile.id
            ? {
                ...item,
                ...updatedProfile,
              }
            : item,
        ),
      );

      closeEditModal();
    } catch (caughtError) {
      console.error("Failed to update username:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The username could not be updated.",
      );
    } finally {
      setSavingUsername(false);
    }
  }

  function openDeleteModal(user: AdminUser) {
    setDeleteTarget(user);
    setDeleteConfirmation("");
  }

  function closeDeleteModal() {
    if (deletingUser) return;

    setDeleteTarget(null);
    setDeleteConfirmation("");
  }

  async function deleteUser() {
    if (
      !deleteTarget ||
      deleteConfirmation !== "DELETE" ||
      deletingUser
    ) {
      return;
    }

    setDeletingUser(true);
    setError("");

    try {
      const currentAdminId = await verifyAdmin();

      if (deleteTarget.id === currentAdminId) {
        throw new Error("You cannot delete your own administrator account.");
      }

      const supabase = createClient();

      const { data, error: deleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", deleteTarget.id)
        .select("id")
        .maybeSingle();

      if (deleteError) {
        throw deleteError;
      }

      if (!data) {
        throw new Error(
          "The user was not deleted. Check the users DELETE policy for administrators.",
        );
      }

      setUsers((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setTotalUsers((current) => Math.max(0, current - 1));

      closeDeleteModal();
    } catch (caughtError) {
      console.error("Failed to delete user:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The user could not be deleted.",
      );
    } finally {
      setDeletingUser(false);
    }
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsers([]);
    setHasMore(true);
    setSubmittedSearch(search);
  }

  function clearSearch() {
    setSearch("");
    setUsers([]);
    setHasMore(true);
    setSubmittedSearch("");
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Admin
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              Users
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Search accounts and control administrator access.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadUsers(true)}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <form
          onSubmit={submitSearch}
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row"
        >
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search username or role"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-semibold outline-none transition focus:border-emerald-600 focus:bg-white"
            />

            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-200"
                aria-label="Clear search field"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as "newest" | "most_posts")
            }
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black outline-none focus:border-emerald-600"
          >
            <option value="newest">Newest users</option>
            <option value="most_posts">Most posts</option>
          </select>

          <button
            type="submit"
            className="h-12 rounded-xl bg-emerald-700 px-6 text-sm font-black text-white transition hover:bg-emerald-800"
          >
            Search
          </button>

          {submittedSearch ? (
            <button
              type="button"
              onClick={clearSearch}
              className="h-12 rounded-xl border border-slate-300 px-5 text-sm font-black hover:bg-slate-50"
            >
              Show all
            </button>
          ) : null}
        </form>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <h2 className="text-xl font-black">
              {submittedSearch ? `Results for “${submittedSearch}”` : "All users"}
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {totalUsers} total · Loaded {users.length}
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading users
            </div>
          ) : users.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <UsersRound className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-4 font-black">No users found.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200">
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    updating={updatingId === user.id}
                    onToggleRole={toggleRole}
                    onEdit={openEditModal}
                    onDelete={openDeleteModal}
                  />
                ))}
              </div>

              {hasMore ? (
                <div className="border-t border-slate-200 p-5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (sortBy === "most_posts" && rankedUsers.length > 0) {
                        const nextLength = Math.min(
                          users.length + PAGE_SIZE,
                          rankedUsers.length,
                        );

                        setUsers(rankedUsers.slice(0, nextLength));
                        setHasMore(nextLength < rankedUsers.length);
                        return;
                      }

                      void loadUsers(false);
                    }}
                    disabled={loadingMore}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    Load more
                  </button>
                </div>
              ) : (
                <div className="border-t border-slate-200 px-5 py-4 text-center text-sm font-bold text-slate-400">
                  All users loaded
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {editTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditModal();
          }}
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Pencil className="h-5 w-5" />
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingUsername}
                className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2 className="mt-6 text-2xl font-black">Edit username</h2>

            <input
              value={editedUsername}
              onChange={(event) => setEditedUsername(event.target.value)}
              placeholder="Username"
              className="mt-6 h-12 w-full rounded-xl border border-slate-300 px-4 font-bold outline-none focus:border-emerald-600"
            />

            <p className="mt-5 text-sm text-slate-600">
              Type <strong>CONFIRM</strong> to save.
            </p>

            <input
              value={editConfirmation}
              onChange={(event) => setEditConfirmation(event.target.value)}
              placeholder="CONFIRM"
              className="mt-3 h-12 w-full rounded-xl border border-slate-300 px-4 font-black outline-none focus:border-emerald-600"
            />

            <button
              type="button"
              onClick={() => void saveUsername()}
              disabled={
                editConfirmation !== "CONFIRM" ||
                !editedUsername.trim() ||
                savingUsername
              }
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white disabled:opacity-40"
            >
              {savingUsername ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
              Save username
            </button>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal();
          }}
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-red-700">
                <Trash2 className="h-5 w-5" />
              </div>

              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deletingUser}
                className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2 className="mt-6 text-2xl font-black">
              Delete {deleteTarget.username || "this user"}?
            </h2>

            <p className="mt-3 text-slate-600">
              Type <strong>DELETE</strong> to confirm.
            </p>

            <input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder="DELETE"
              className="mt-6 h-12 w-full rounded-xl border border-slate-300 px-4 font-black outline-none focus:border-red-500"
            />

            <button
              type="button"
              onClick={() => void deleteUser()}
              disabled={
                deleteConfirmation !== "DELETE" ||
                deletingUser
              }
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white disabled:opacity-40"
            >
              {deletingUser ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete user
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type UserRowProps = {
  user: AdminUser;
  updating: boolean;
  onToggleRole: (user: AdminUser) => Promise<void>;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
};

function UserRow({
  user,
  updating,
  onToggleRole,
  onEdit,
  onDelete,
}: UserRowProps) {
  const isAdmin = user.role === "admin";

  return (
    <article className="flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${
            isAdmin
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {isAdmin ? (
            <ShieldCheck className="h-6 w-6" />
          ) : (
            <UserRound className="h-6 w-6" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-lg px-2.5 py-1 text-xs font-black capitalize ${
                isAdmin
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {user.role || "user"}
            </span>
          </div>

          <h3 className="mt-3 truncate text-xl font-black tracking-[-0.025em]">
            {user.username?.trim() || "Unnamed User"}
          </h3>

          <p className="mt-2 truncate text-sm font-semibold text-slate-500">
            User ID: {user.id}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
              {user.pageCount} {user.pageCount === 1 ? "page" : "pages"}
            </span>

            <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700">
              {user.postCount} {user.postCount === 1 ? "post" : "posts"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onEdit(user)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-black hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4" />
          Edit username
        </button>

        <button
          type="button"
          onClick={() => void onToggleRole(user)}
          disabled={updating}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition disabled:opacity-50 ${
            isAdmin
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {updating ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {isAdmin ? "Remove admin" : "Make admin"}
        </button>

        <button
          type="button"
          onClick={() => onDelete(user)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </article>
  );
}