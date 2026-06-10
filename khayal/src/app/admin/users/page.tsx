import { supabaseServer } from "@/lib/supabase-server";
import { PromoteButton } from "./promote-button";
import { AdminPagination } from "@/components/admin-pagination";

export const revalidate = 0;

const PAGE_SIZE = 25;

type SearchParams = { page?: string };

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sb = await supabaseServer();
  const { data: users, count } = await sb
    .from("profiles")
    .select("id, username, role, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">User Management</h1>
        <p className="text-sm text-zinc-500">
          <span className="text-zinc-300">{(count ?? 0).toLocaleString()}</span> total users
        </p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table
          className="w-full text-sm"
          data-testid="admin-users-table"
        >
          <thead className="border-b border-zinc-800">
            <tr className="text-left text-zinc-500">
              <th className="p-4 font-medium">Username</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Joined</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr
                key={u.id}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/20"
              >
                <td className="p-4 text-zinc-200 font-medium">
                  {u.username ?? "—"}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-zinc-400">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="p-4">
                  {u.role !== "admin" && <PromoteButton userId={u.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminPagination
          current={page}
          totalPages={totalPages}
          totalRows={count ?? 0}
          basePath="/admin/users"
        />
      </div>
    </div>
  );
}
