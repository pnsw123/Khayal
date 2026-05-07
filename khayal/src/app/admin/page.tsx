import { supabaseServer } from "@/lib/supabase-server";
import { Film, Tv, Users, MessageSquare, Star } from "lucide-react";

export const revalidate = 0;

async function getStats() {
  const sb = await supabaseServer();
  const today = new Date().toISOString().split("T")[0];

  const [movies, tv, users, reviews, ratings] = await Promise.all([
    sb.from("movies").select("*", { count: "exact", head: true }),
    sb.from("tv_series").select("*", { count: "exact", head: true }),
    sb.from("profiles").select("*", { count: "exact", head: true }),
    sb.from("movie_reviews").select("*", { count: "exact", head: true }).gte("created_at", today),
    sb.from("movie_ratings").select("*", { count: "exact", head: true }),
  ]);

  return {
    movies:        movies.count  ?? 0,
    tv:            tv.count      ?? 0,
    users:         users.count   ?? 0,
    reviewsToday:  reviews.count ?? 0,
    ratings:       ratings.count ?? 0,
  };
}

async function getRecentUsers() {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("profiles")
    .select("id, username, role, created_at")
    .order("created_at", { ascending: false })
    .limit(8);
  return data ?? [];
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-100">{value.toLocaleString()}</p>
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  const [stats, recentUsers] = await Promise.all([getStats(), getRecentUsers()]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={Film}          label="Movies"         value={stats.movies}       color="bg-blue-600" />
        <StatCard icon={Tv}            label="TV Series"      value={stats.tv}           color="bg-purple-600" />
        <StatCard icon={Users}         label="Users"          value={stats.users}        color="bg-emerald-600" />
        <StatCard icon={MessageSquare} label="Reviews Today"  value={stats.reviewsToday} color="bg-amber-600" />
        <StatCard icon={Star}          label="Total Ratings"  value={stats.ratings}      color="bg-rose-600" />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Recent Sign-ups</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-zinc-800">
              <th className="pb-2 font-medium">Username</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((u) => (
              <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="py-2.5 text-zinc-200">{u.username ?? "—"}</td>
                <td className="py-2.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    u.role === "admin"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-zinc-700 text-zinc-300"
                  }`}>{u.role}</span>
                </td>
                <td className="py-2.5 text-zinc-400">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
