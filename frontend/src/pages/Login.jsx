
import { useState } from "react";
import "./Login.css";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    // Authentication will be implemented in Commit 4.
    // Do not grant access before FastAPI verifies credentials.
    setError(
      "Login authentication is not connected yet."
    );
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">TL</div>
          <h1>ThreatLens</h1>
          <p>Security Investigation Platform</p>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <h2>Analyst Sign In</h2>

          <p className="login-description">
            Sign in with your authorized ThreatLens account.
          </p>

          <label htmlFor="email">
            Email Address
          </label>

          <input
            id="email"
            name="email"
            type="email"
            placeholder="analyst@threatlens.com"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">
            Password
          </label>

          <div className="password-field">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="login-submit"
            type="submit"
          >
            Sign In
          </button>

          <p className="login-notice">
            Authorized ThreatLens personnel only.
          </p>
        </form>

        <p className="login-footer">
          ThreatLens — AI-Assisted IAM Security Investigations
        </p>
      </div>
    </div>
  );
}

export default Login;
