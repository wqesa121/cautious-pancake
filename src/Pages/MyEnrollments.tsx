import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { MessageCircle, Trash2, Bell } from "lucide-react";
import CircleChat from "../components/CircleChat";

interface Circle {
  _id: string;
  title: string;
}

interface Enrollment {
  _id: string;
  circle: Circle;
  status: string;
  createdAt: string;
  comment?: string;
  rejectionReason?: string;
  /** "application" = заявка отклонена, "removed_from_circle" = исключили из кружка */
  rejectedAs?: "application" | "removed_from_circle";
  unreadCount?: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Ожидает одобрения",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  approved: {
    label: "Одобрено",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  rejected: {
    label: "Отклонено",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  cancelled: {
    label: "Отменено",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export default function MyEnrollments() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatCircle, setChatCircle] = useState<{ id: string; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const fetchMyEnrollments = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/my-enrollments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Ошибка загрузки записей");
      const data = await res.json();
      setEnrollments(data);
    } catch (err) {
      toast.error("Не удалось загрузить ваши записи");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    fetchMyEnrollments();
  }, [navigate]);

  const handleCloseChat = () => {
    setChatCircle(null);
    fetchMyEnrollments();
  };

  const canDelete = (status: string) => status === "rejected" || status === "cancelled";

  const handleDelete = async (id: string) => {
    if (!token) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/my-enrollments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Не удалось удалить запись");
        return;
      }
      setEnrollments((prev) => prev.filter((e) => e._id !== id));
      toast.success("Запись удалена");
    } catch {
      toast.error("Не удалось удалить запись");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Мои записи
          </h1>
          <p className="mt-2 text-slate-600">
            Статус ваших заявок на кружки и секции
          </p>
        </div>

        {enrollments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-12 text-center">
            <p className="text-slate-600 text-lg font-medium mb-4">
              Вы ещё не записаны ни на один кружок
            </p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all duration-200"
            >
              Выбрать кружок
            </button>
          </div>
        ) : (
          <ul className="space-y-4">
            {enrollments.map((enr) => {
              const config = statusConfig[enr.status] || statusConfig.pending;
              return (
                <li
                  key={enr._id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-soft p-6 hover:shadow-soft-lg hover:border-slate-200 transition-all duration-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 mb-2">
                        {enr.circle.title}
                      </h2>
                      <span
                        className={`inline-block px-2.5 py-1.5 rounded-full text-sm font-semibold border ${config.className}`}
                      >
                        {config.label}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500 font-medium">
                      {new Date(enr.createdAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {enr.comment && (
                    <p className="mt-4 text-slate-600 text-sm italic border-t border-slate-100 pt-4">
                      {enr.comment}
                    </p>
                  )}
                  {enr.status === "rejected" && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="flex gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                          <Bell className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-red-800 text-sm mb-1">
                            Уведомление
                          </p>
                          <p className="text-red-700 text-sm">
                            {enr.rejectedAs === "removed_from_circle"
                              ? <>Вас исключили из кружка.{enr.rejectionReason && <> Причина: <span className="font-medium">&laquo;{enr.rejectionReason}&raquo;</span></>}</>
                              : enr.rejectionReason
                                ? <>Ваша заявка не одобрена. Причина: <span className="font-medium">&laquo;{enr.rejectionReason}&raquo;</span></>
                                : "Ваша заявка не одобрена."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {canDelete(enr.status) && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={deletingId === enr._id}
                        onClick={() => handleDelete(enr._id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 transition-colors"
                        title="Удалить запись из списка"
                      >
                        <Trash2 className="w-4 h-4" />
                        Удалить запись
                      </button>
                    </div>
                  )}
                  {enr.status === "approved" && enr.circle?._id && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                      <p className="text-xs text-slate-500">
                        Чат с преподавателем — только просмотр сообщений
                      </p>
                      <button
                        type="button"
                        onClick={() => setChatCircle({ id: enr.circle._id, title: enr.circle.title })}
                        className="relative inline-flex items-center justify-center p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="Чат с преподавателем"
                      >
                        {(enr.unreadCount ?? 0) > 0 && (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
                            aria-label="Есть непрочитанные сообщения"
                          />
                        )}
                        <MessageCircle className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {chatCircle && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-soft-lg border border-slate-100 p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
              <CircleChat
                circleId={chatCircle.id}
                circleTitle={chatCircle.title}
                canWrite={false}
                onClose={handleCloseChat}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
