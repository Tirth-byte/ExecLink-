"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import "./login.css";
import { ExecLinkBrand } from "@/components/execlink-brand";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Email or password is incorrect.");
      setLoading(false);
    }
  };

  const handleDemoFill = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Demo123!");
    setLoading(true);
    setError("");
    try {
      await login(demoEmail, "Demo123!");
    } catch (err: any) {
      setError(err.message || "Email or password is incorrect.");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-header flex items-center justify-between">
        <ExecLinkBrand size="lg" />
        <div className="text-xs text-[var(--text-muted)] font-medium">Secure workspace</div>
      </div>
      
      <div className="login-card">
        <div className="login-welcome">
          <h2>Welcome back</h2>
          <p>Sign in to your project workspace</p>
        </div>

        {error && <div className="login-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Work email</label>
            <input 
              type="email" 
              id="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input 
                type="password" 
                id="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="login-submit" disabled={loading || !email || !password}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="login-footer">
          Secure project-controls access
        </div>
      </div>

      <div className="login-subtitle">
        Planning ↔ Execution Intelligence
      </div>

      {process.env.NODE_ENV === "development" && (
        <div className="demo-access">
          <p>Demo access</p>
          <div className="demo-chips">
            <button onClick={() => handleDemoFill("planner@execlink.demo")}>Lead Planner</button>
            <button onClick={() => handleDemoFill("manager@execlink.demo")}>Project Manager</button>
            <button onClick={() => handleDemoFill("engineer@execlink.demo")}>Planning Engineer</button>
            <button onClick={() => handleDemoFill("asha@execlink.demo")}>Field Supervisor</button>
            <button onClick={() => handleDemoFill("viewer@execlink.demo")}>Viewer</button>
          </div>
        </div>
      )}
    </div>
  );
}
