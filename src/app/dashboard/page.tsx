import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomersManager } from "@/components/customers-manager";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: customers } = await supabase
    .from("customers")
    .select("id,name,email,company,notes,created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600">Signed in as {user.email}</p>
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="rounded border px-3 py-2 text-sm">Sign out</button>
        </form>
      </div>

      <CustomersManager initialCustomers={customers ?? []} />
    </main>
  );
}
