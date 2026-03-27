import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (password.length < 6) {
      setError("Пароль должен быть минимум 6 символов");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, fullName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Ошибка регистрации");
      }

      setSuccess("Регистрация успешна! Перенаправляем на вход...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось зарегистрироваться");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Регистрация
          </h1>
          <p className="mt-2 text-slate-600">
            Создайте аккаунт, чтобы записываться на кружки
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="bg-white rounded-2xl border border-slate-100 shadow-soft-lg p-8 sm:p-10"
        >
          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Логин
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.trim())}
            placeholder="username"
            required
            className="input-base mb-5"
          />

          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Пароль (минимум 6 символов)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="input-base mb-5"
          />

          <label className="block mb-2 text-sm font-semibold text-slate-700">
            ФИО
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Иванов Иван Иванович"
            required
            className="input-base mb-6"
          />

          {error && (
            <p className="mb-4 text-sm text-red-600 font-medium text-center bg-red-50 rounded-xl py-2 px-3">
              {error}
            </p>
          )}
          {success && (
            <p className="mb-4 text-sm text-emerald-600 font-medium text-center bg-emerald-50 rounded-xl py-2 px-3">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-all duration-200 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Регистрация..." : "Зарегистрироваться"}
          </button>

          <p className="mt-6 text-center text-sm text-slate-600">
            Уже есть аккаунт?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Войти
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
