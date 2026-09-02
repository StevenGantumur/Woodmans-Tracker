import { useState } from "react";

const FIELD =
  "px-3 py-2 bg-ink-700 border border-ink-600 rounded-lg text-haze-100 " +
  "placeholder:text-haze-500 focus:outline-none focus:ring-2 focus:ring-signal-route";

function UpdateForm({ apiBase = "", token, corrals = [], onUpdate, onAuthExpired }) {
  const [corral, setCorral] = useState("");
  const [count, setCount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const id = corral.trim().toUpperCase();
    const parsedCount = Number(count);

    if (!id) return setError("Pick a corral");
    if (count === "" || !Number.isInteger(parsedCount) || parsedCount < 0) {
      return setError("Count must be a non-negative integer");
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/corrals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ corral_id: id, count: parsedCount }),
      });

      const data = await res.json().catch(() => ({}));

      // An expired shift token should send the worker back to the login form
      // rather than showing a generic failure they cannot act on.
      if (res.status === 401) {
        onAuthExpired?.();
        throw new Error(data.error || "Session expired");
      }
      if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);

      onUpdate(data);
      setSuccess(`Corral ${id} set to ${parsedCount} ${parsedCount === 1 ? "cart" : "carts"}`);
      setCorral("");
      setCount("");
    } catch (err) {
      setError(`Could not save. ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <select
          value={corral}
          onChange={(e) => setCorral(e.target.value)}
          aria-label="Corral"
          className={FIELD}
        >
          <option value="">Select a corral…</option>
          {corrals.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id} · {c.type === "supply" ? "storefront" : "lot"}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          placeholder="Cart count"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          aria-label="Cart count"
          className={FIELD}
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-signal-route text-ink-900 rounded-lg font-semibold
            hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? "Saving…" : "Update"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-signal-stop">
          {error}
        </p>
      )}
      {success && <p className="text-sm text-signal-go">{success}</p>}
    </form>
  );
}

export default UpdateForm;
