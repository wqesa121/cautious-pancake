import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Ошибка входа");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Вход в систему
          </h1>
          <p className="mt-2 text-slate-600">
            Введите логин и пароль для входа
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl border border-slate-100 shadow-soft-lg p-8 sm:p-10"
        >
          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Логин
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            required
            className="input-base mb-5"
          />

          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Пароль
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="input-base mb-6"
          />

          {error && (
            <p className="mb-4 text-sm text-red-600 font-medium text-center bg-red-50 rounded-xl py-2 px-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all duration-200 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Вход..." : "Войти"}
          </button>

          <p className="mt-6 text-center text-sm text-slate-600">
            Нет аккаунта?{" "}
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Зарегистрироваться
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
