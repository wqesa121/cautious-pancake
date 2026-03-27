import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import SelectMenu from "../ui/select-menu";

interface User {
  _id: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: "student" | "admin" | "teacher";
  createdAt: string;
}

interface UserListProps {
  token: string | null;
  setError: (error: string | null) => void;
}

export default function UserList({ token, setError }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const roleOptions = [
    { value: "student", label: "Участник" },
    { value: "teacher", label: "Преподаватель" },
    { value: "admin", label: "Админ" },
  ];

  useEffect(() => {
    if (!token) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/admin/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("auth");
          localStorage.removeItem("user");
          setError("Сессия истекла. Пожалуйста, войдите заново.");
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Ошибка при загрузке пользователей");
        }

        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token, setError]);

  const changeRole = async (userId: string, role: "student" | "admin" | "teacher") => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("auth");
        localStorage.removeItem("user");
        setError("Сессия истекла. Пожалуйста, войдите заново.");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Не удалось изменить роль");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role } : u))
      );
      toast.success("Роль обновлена", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        theme: "light",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-4">Пользователи</h2>
      {users.length === 0 ? (
        <p className="text-slate-600 font-medium">Пользователей нет</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100 min-h-[520px] bg-white">
          <table className="w-full text-sm text-left text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                <th className="py-3.5 px-4">Логин</th>
                <th className="py-3.5 px-4">ФИО</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Роль</th>
                <th className="py-3.5 px-4">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-slate-900">{user.username}</td>
                  <td className="py-4 px-4">{user.fullName || "—"}</td>
                  <td className="py-4 px-4">{user.email || "—"}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        user.role === "admin"
                          ? "bg-primary-100 text-primary-800"
                          : user.role === "teacher"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {user.role === "admin" ? "Админ" : user.role === "teacher" ? "Преподаватель" : "Участник"}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <SelectMenu
                      value={user.role}
                      options={roleOptions}
                      onChange={(value) => changeRole(user._id, value as "student" | "admin" | "teacher")}
                      className="max-w-[190px]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
