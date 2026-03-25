"use client";

import { useState } from "react";

type Customer = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  notes?: string | null;
  created_at: string;
};

export function CustomersManager({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, company: company || null, notes: notes || null }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error?.formErrors?.[0] || json.error || "Failed to create customer");
      return;
    }

    setName("");
    setEmail("");
    setCompany("");
    setNotes("");
    setCustomers((prev) => [json.data, ...prev]);
  }

  async function deleteCustomer(id: string) {
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <section className="space-y-6">
      <form onSubmit={createCustomer} className="space-y-3 rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Add customer</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded border px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="rounded border px-3 py-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="rounded border px-3 py-2" placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
          <input className="rounded border px-3 py-2" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="rounded bg-black px-4 py-2 text-white">Create customer</button>
      </form>

      <div className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Customers</h2>
        {customers.length === 0 ? <p className="mt-3 text-sm text-gray-500">No customers yet.</p> : null}
        <ul className="mt-3 divide-y">
          {customers.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-gray-600">
                  {c.email}
                  {c.company ? ` · ${c.company}` : ""}
                </p>
              </div>
              <button onClick={() => deleteCustomer(c.id)} className="text-sm underline">
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
