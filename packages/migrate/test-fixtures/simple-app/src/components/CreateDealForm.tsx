import { useState } from "react";

type FormState = { title: string; stage: string; amount: number };

export function CreateDealForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [form, setForm] = useState<FormState>({ title: "", stage: "discovery", amount: 0 });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const created = (await res.json()) as { id: string };
        onCreated(created.id);
      }}
    >
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Title"
      />
      <input
        type="number"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
      />
      <button type="submit">Create</button>
    </form>
  );
}
