"use client";

import { useState, useRef, useEffect } from "react";
import { FaWallet } from "react-icons/fa";
import type { AuthUser } from "@/lib/types";

interface AuthFormProps {
  onAuthSuccess: (user: AuthUser) => void;
}

type MessageType = "success" | "error" | "";

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("");
  const [loading, setLoading] = useState(false);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);

  function showMessage(msg: string, type: "success" | "error") {
    setMessage(msg);
    setMessageType(type);
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3000);
  }

  function validatePassword(password: string): { valid: boolean; message: string } {
    if (password.length < 8) {
      return { valid: false, message: "密码长度至少8位" };
    }
    if (!/[A-Za-z]/.test(password)) {
      return { valid: false, message: "密码必须包含字母" };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: "密码必须包含数字" };
    }
    return { valid: true, message: "" };
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const result = await res.json();
      if (result.success) {
        showMessage("登录成功", "success");
        onAuthSuccess(result.user);
      } else {
        showMessage(result.message || "登录失败", "error");
      }
    } catch {
      showMessage("登录失败，请检查网络", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const check = validatePassword(regPassword);
    if (!check.valid) {
      showMessage(check.message, "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          email: regEmail,
        }),
      });
      const result = await res.json();
      if (result.success) {
        showMessage("注册成功", "success");
        onAuthSuccess(result.user);
      } else {
        showMessage(result.message || "注册失败", "error");
      }
    } catch {
      showMessage("注册失败，请检查网络", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 card-shadow">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaWallet className="text-primary text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">简记</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">跨设备同步记账工具</p>
        </div>

        <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-xl p-1 mb-6">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2 rounded-lg font-medium btn-hover ${
              mode === "login"
                ? "bg-white dark:bg-neutral-600 text-primary"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            登录
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 py-2 rounded-lg font-medium btn-hover ${
              mode === "register"
                ? "bg-white dark:bg-neutral-600 text-primary"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            注册
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1">用户名</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="请输入用户名"
                required
                className="w-full border rounded-xl px-4 py-3 input-focus"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1">密码</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="请输入密码"
                required
                className="w-full border rounded-xl px-4 py-3 input-focus"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl font-medium btn-hover disabled:opacity-50"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1">用户名</label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="请输入用户名"
                required
                className="w-full border rounded-xl px-4 py-3 input-focus"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1">密码</label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="至少8位，包含字母和数字"
                required
                className="w-full border rounded-xl px-4 py-3 input-focus"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1">邮箱</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="请输入邮箱"
                required
                className="w-full border rounded-xl px-4 py-3 input-focus"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl font-medium btn-hover disabled:opacity-50"
            >
              {loading ? "注册中..." : "注册"}
            </button>
          </form>
        )}

        <div
          className={`mt-4 text-center text-sm ${
            messageType === "error"
              ? "text-expense"
              : messageType === "success"
              ? "text-income"
              : ""
          }`}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
