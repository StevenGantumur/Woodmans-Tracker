import { useState } from "react";
import ALLOWED_CORRALS from "../../../shared/corrals.json";

function UpdateForm({ onUpdate, apiBase = "" }) {
  const [corral, setCorral] = useState("");
  const [count, setCount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Mirrors the server's rules so obvious mistakes are caught without a round trip.
  // The server revalidates regardless — client checks are for feedback, not enforcement.
  const validate = (id, parsedCount) => {
    if (!id) return "Corral is required";
    if (!ALLOWED_CORRALS.includes(id)) return `Unknown corral. Use A through ${ALLOWED_CORRALS.at(-1)}.`;
    if (count === "" || Number.isNaN(parsedCount)) return "Count must be a number";
    if (!Number.isInteger(parsedCount) || parsedCount < 0) return "Count must be a non-negative integer";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const id = corral.trim().toUpperCase();
    const parsedCount = Number(count);

    const validationError = validate(id, parsedCount);
    if (validationError) return setError(validationError);

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/corrals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corral_id: id, count: parsedCount }),
      });

      const data = await res.json().catch(() => ({}));

      // Previously this only logged to the console, so a failed save looked
      // identical to a successful one from the user's side.
      if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);

      onUpdate(data.currentStatus, data.normalizedId || id);
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
        <input
          type="text"
          placeholder="Corral (e.g. A)"
          value={corral}
          onChange={(e) => setCorral(e.target.value)}
          aria-label="Corral letter"
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          min="0"
          placeholder="Cart count"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          aria-label="Cart count"
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
            disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {submitting ? "Saving…" : "Update Corral"}
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}
    </form>
  );
}

export default UpdateForm;
