"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, DEMO_ACCOUNTS, UserRole } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  ShieldCheck,
  Shield,
  Lock,
  Mail,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInAsDemo, user } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("ANALYST");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUpWithEmail(
          email,
          password,
          fullName,
          selectedRole,
        );
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg("Account created! Redirecting to Dashboard...");
          setTimeout(() => router.push("/dashboard"), 1200);
        }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg("Welcome back! Redirecting to Dashboard...");
          setTimeout(() => router.push("/dashboard"), 800);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    signInAsDemo(role);
    setSuccessMsg(`Logged in as ${DEMO_ACCOUNTS[role].name} (${role})!`);
    setTimeout(() => router.push("/dashboard"), 600);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        background:
          "radial-gradient(ellipse at top, rgba(30, 58, 138, 0.15) 0%, rgba(10, 14, 26, 1) 70%)",
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            textDecoration: "none",
            color: "#fff",
            marginBottom: "0.5rem",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)",
            }}
          >
            <ShieldCheck size={24} color="#fff" />
          </div>
          <span
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            SignalX
          </span>
        </Link>
        <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
          Autonomous Merchant Fraud Defense & Chargeback Protection
        </p>
      </div>

      {/* Main Glass Card */}
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "2rem",
          background: "rgba(15, 20, 34, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/*  1-CLICK JUDGE / DEMO ACCESS SECTION  */}
        <div
          style={{
            padding: "1rem",
            marginBottom: "1.5rem",
            borderRadius: "10px",
            background: "rgba(59, 130, 246, 0.06)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                color: "#60a5fa",
                fontSize: "0.8125rem",
                fontWeight: 600,
              }}
            >
              <Zap size={15} />
              <span>1-Click Judge & Evaluator Access</span>
            </div>
            <span className="badge badge-low" style={{ fontSize: "0.625rem" }}>
              {isSupabaseConfigured ? "Supabase Live" : "Demo Engine"}
            </span>
          </div>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
              marginBottom: "0.85rem",
              lineHeight: 1.4,
            }}
          >
            Instantly evaluate the platform with pre-configured role permissions
            (no registration required):
          </p>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <button
              type="button"
              onClick={() => handleDemoLogin("ANALYST")}
              className="btn btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.65rem 0.85rem",
                fontSize: "0.8125rem",
                borderColor: "rgba(6, 182, 212, 0.3)",
                background: "rgba(6, 182, 212, 0.05)",
                textAlign: "left",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
                <Shield size={16} color="#06b6d4" />
                <div>
                  <div style={{ fontWeight: 600, color: "#fff" }}>
                    MA RIZWAN
                  </div>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Senior Fraud Investigator (Analyst Role)
                  </div>
                </div>
              </div>
              <span className="badge badge-low" style={{ fontSize: "0.65rem" }}>
                ANALYST
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin("ADMIN")}
              className="btn btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.65rem 0.85rem",
                fontSize: "0.8125rem",
                borderColor: "rgba(168, 85, 247, 0.3)",
                background: "rgba(168, 85, 247, 0.05)",
                textAlign: "left",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
                <User size={16} color="#c084fc" />
                <div>
                  <div style={{ fontWeight: 600, color: "#fff" }}>MARQ</div>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Chief Risk Officer (Admin Role)
                  </div>
                </div>
              </div>
              <span
                className="badge badge-medium"
                style={{ fontSize: "0.65rem" }}
              >
                ADMIN
              </span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            margin: "1.25rem 0",
            color: "var(--text-tertiary)",
            fontSize: "0.75rem",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <span>OR SIGN IN WITH SUPABASE</span>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "rgba(255,255,255,0.08)",
            }}
          />
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div
            style={{
              padding: "0.75rem",
              marginBottom: "1rem",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              fontSize: "0.8125rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: "0.75rem",
              marginBottom: "1rem",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
              fontSize: "0.8125rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Mode Tabs */}
        <div
          style={{
            display: "flex",
            background: "rgba(0, 0, 0, 0.3)",
            borderRadius: "8px",
            padding: "3px",
            marginBottom: "1.25rem",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg(null);
            }}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "6px",
              fontSize: "0.8125rem",
              fontWeight: !isSignUp ? 600 : 400,
              background: !isSignUp
                ? "rgba(255, 255, 255, 0.08)"
                : "transparent",
              color: !isSignUp ? "#fff" : "var(--text-tertiary)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg(null);
            }}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "6px",
              fontSize: "0.8125rem",
              fontWeight: isSignUp ? 600 : 400,
              background: isSignUp
                ? "rgba(255, 255, 255, 0.08)"
                : "transparent",
              color: isSignUp ? "#fff" : "var(--text-tertiary)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {isSignUp && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.35rem",
                }}
              >
                Full Name
              </label>
              <div style={{ position: "relative" }}>
                <User
                  size={15}
                  style={{
                    position: "absolute",
                    left: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-tertiary)",
                  }}
                />
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                  style={{
                    width: "100%",
                    paddingLeft: "2.25rem",
                    fontSize: "0.875rem",
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                marginBottom: "0.35rem",
              }}
            >
              Work Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={15}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-tertiary)",
                }}
              />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{
                  width: "100%",
                  paddingLeft: "2.25rem",
                  fontSize: "0.875rem",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                marginBottom: "0.35rem",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={15}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-tertiary)",
                }}
              />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{
                  width: "100%",
                  paddingLeft: "2.25rem",
                  fontSize: "0.875rem",
                }}
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.35rem",
                }}
              >
                Assign Initial Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="form-select"
                style={{ width: "100%", fontSize: "0.875rem" }}
              >
                <option value="ANALYST">
                  Risk Analyst (Review queue, evidence synthesis)
                </option>
                <option value="ADMIN">
                  Merchant Admin (Full engine tuning & API keys)
                </option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              marginTop: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.75rem",
              fontSize: "0.875rem",
            }}
          >
            <span>
              {loading
                ? "Authenticating..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In to SignalX"}
            </span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Back Link */}
        <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
          <Link
            href="/"
            style={{
              color: "var(--text-tertiary)",
              fontSize: "0.75rem",
              textDecoration: "none",
            }}
          >
            ← Back to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}
