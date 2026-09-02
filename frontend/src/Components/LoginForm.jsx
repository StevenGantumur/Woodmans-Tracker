import { useState } from "react";

function LoginForm({ apiBase, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <p className="text-sm text-haze-300">Log in to update cart counts.</p>
      <input
        type="text"
        placeholder="Username"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        aria-label="Username"
        className="field"
      />
      <input
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-label="Password"
        className="field"
      />
      <button
        type="submit"
        disabled={submitting}
        className="btn cut-sm"
      >
        {submitting ? "Logging in…" : "Log in"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-signal-stop">
          {error}
        </p>
      )}
    </form>
  );
}

export default LoginForm;
