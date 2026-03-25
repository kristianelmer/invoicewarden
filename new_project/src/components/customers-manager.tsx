"use client";

import { useEffect, useState } from "react";

type Customer = {
  id: string;
  name: string;
  email?: string;
  company?: string;
  createdAt: string;
};

export function CustomersManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadCustomers() {
    const res = await fetch("/api/customers", { cache: "no-store" });
    const json = await res.json();
    setCustomers(json.data ?? []);
  }

  useEffect(() => {
    loadCustomers().catch(() => setError("Could not load customers."));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, company })
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? "Could not create customer.");
      return;
    }

    setName("");
    setEmail("");
    setCompany("");
    await loadCustomers();
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: 8 }}>
        <strong>Create customer</strong>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
        <button disabled={saving} type="submit">{saving ? "Saving..." : "Create customer"}</button>
        {error ? <span style={{ color: "#ef4444" }}>{error}</span> : null}
      </form>

      <div className="card">
        <strong>Customers</strong>
        {customers.length === 0 ? (
          <p className="subtle">No customers yet.</p>
        ) : (
          <ul>
            {customers.map((c) => (
              <li key={c.id}>{c.name} {c.company ? `(${c.company})` : ""} {c.email ? `— ${c.email}` : ""}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
