import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import SelectMenu from "../ui/select-menu";

interface User {
  _id: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: "student" | "admin" | "head_admin";
  createdAt: string;
  lastLogin?: string;
  lastSeenAt?: string;
  isOnline?: boolean;
  canManageAdminRoles?: boolean;
  group?: { _id: string; name: string } | string | null;
}

interface UserListProps {
  token: string | null;
  setError: (error: string | null) => void;
}

export default function UserList({ token, setError }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser?._id || "";
  const canManageAdminRoles = users[0]?.canManageAdminRoles ?? (currentUser?.role === "head_admin");
  const canDeleteUsers = currentUser?.role === "head_admin";

  const roleOptions = canManageAdminRoles
    ? [
        { value: "student", label: "Участник" },
        { value: "admin", label: "Админ" },
        { value: "head_admin", label: "Head admin" },
      ]
    : [{ value: "student", label: "Участник" }];

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

  const changeRole = async (userId: string, role: "student" | "admin" | "head_admin") => {
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
        prev.map((u) => (u._id === userId ? { ...u, ...data.user } : u))
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

  const deleteUser = async (user: User) => {
    const confirmDelete = window.confirm(`Удалить пользователя ${user.fullName || user.username}?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: "DELETE",
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

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Не удалось удалить пользователя");
        return;
      }

      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      toast.success("Пользователь удалён", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        theme: "light",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  const roleLabel = (role: User["role"]) => {
    if (role === "head_admin") return "Head admin";
    if (role === "admin") return "Админ";
    return "Участник";
  };

  const pluralize = (value: number, forms: [string, string, string]) => {
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
  };

  const getLastSeenMeta = (user: User) => {
    const source = user.lastSeenAt || user.lastLogin;
    if (!source) {
      return {
        statusLabel: "Не заходил",
        seenLabel: "ещё не входил",
      };
    }

    if (user.isOnline) {
      return {
        statusLabel: "Онлайн",
        seenLabel: "в сети сейчас",
      };
    }

    const diffMs = Math.max(0, Date.now() - new Date(source).getTime());
    const diffMin = Math.floor(diffMs / (60 * 1000));
    const diffHour = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDay = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMin < 1) {
      return {
        statusLabel: "Был недавно",
        seenLabel: "был(а) в сети только что",
      };
    }

    if (diffMin < 60) {
      return {
        statusLabel: diffMin <= 10 ? "Был недавно" : "Был в сети",
        seenLabel: `был(а) в сети ${diffMin} ${pluralize(diffMin, ["минуту", "минуты", "минут"])} назад`,
      };
    }

    if (diffHour < 24) {
      return {
        statusLabel: diffHour <= 3 ? "Был недавно" : "Был давно",
        seenLabel: `был(а) в сети ${diffHour} ${pluralize(diffHour, ["час", "часа", "часов"])} назад`,
      };
    }

    return {
      statusLabel: "Был давно",
      seenLabel: diffDay < 7
        ? `был(а) в сети ${diffDay} ${pluralize(diffDay, ["день", "дня", "дней"])} назад`
        : `был(а) в сети ${new Date(source).toLocaleDateString("ru-RU")}`,
    };
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
                <th className="py-3.5 px-4">Статус</th>
                <th className="py-3.5 px-4">Был в сети</th>
                <th className="py-3.5 px-4">Роль</th>
                <th className="py-3.5 px-4">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const lastSeenMeta = getLastSeenMeta(user);
                return (
                <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-slate-900">{user.username}</td>
                  <td className="py-4 px-4">{user.fullName || "—"}</td>
                  <td className="py-4 px-4">{user.email || "—"}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      user.isOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${user.isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {lastSeenMeta.statusLabel}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {lastSeenMeta.seenLabel}
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        user.role === "head_admin"
                          ? "bg-violet-100 text-violet-800"
                          : user.role === "admin"
                          ? "bg-primary-100 text-primary-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {user.role !== "admin" && user.role !== "head_admin" ? (
                      <div className="w-[190px]">
                        {canManageAdminRoles ? (
                          <SelectMenu
                            value={user.role}
                            options={roleOptions}
                            onChange={(value) => changeRole(user._id, value as "student" | "admin" | "head_admin")}
                            className="max-w-[190px]"
                          />
                        ) : (
                          <div className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center">
                            Роли меняет head admin
                          </div>
                        )}
                      </div>
                      ) : (
                      <div className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center w-[190px]">
                        {user.role === "head_admin" ? "Head admin" : "Админ (Куратор)"}
                      </div>
                      )}
                      {canDeleteUsers && (
                      <button
                        type="button"
                        onClick={() => deleteUser(user)}
                        disabled={user._id === currentUserId}
                        className="px-3 py-2 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Удалить
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!canManageAdminRoles && (
        <p className="mt-3 text-xs text-slate-500">
          Вы можете просматривать онлайн-статус и удалять пользователей, но назначение админских ролей доступно только head admin.
        </p>
      )}
    </div>
  );
}
