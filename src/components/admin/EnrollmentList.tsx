import { useEffect, useState, useMemo } from "react";
import { Button } from "../../components/ui/button";
import { Check, X, Trash2, ChevronRight, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import KickModal from "../KickModal";

interface User {
  _id: string;
  username: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

interface Circle {
  _id: string;
  title: string;
}

interface Enrollment {
  _id: string;
  user: User;
  circle: Circle;
  status: "pending" | "approved" | "rejected" | "cancelled";
  comment?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface EnrollmentListProps {
  token: string | null;
  setError: (error: string | null) => void;
}

type CircleWithEnrollments = {
  circle: Circle;
  approved: Enrollment[];
  pending: Enrollment[];
};

export default function EnrollmentList({ token, setError }: EnrollmentListProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [removeModalEnr, setRemoveModalEnr] = useState<Enrollment | null>(null);

  const circlesWithEnrollments = useMemo(() => {
    const byCircle = new Map<string, CircleWithEnrollments>();
    for (const enr of enrollments) {
      const cid = enr.circle._id;
      if (!byCircle.has(cid)) {
        byCircle.set(cid, { circle: enr.circle, approved: [], pending: [] });
      }
      const row = byCircle.get(cid)!;
      if (enr.status === "approved") row.approved.push(enr);
      else if (enr.status === "pending") row.pending.push(enr);
    }
    return Array.from(byCircle.values()).sort((a, b) =>
      a.circle.title.localeCompare(b.circle.title)
    );
  }, [enrollments]);

  const selectedCircle = useMemo(
    () => circlesWithEnrollments.find((c) => c.circle._id === selectedCircleId) ?? null,
    [circlesWithEnrollments, selectedCircleId]
  );

  useEffect(() => {
    if (!token) return;

    const fetchEnrollments = async () => {
      try {
        const response = await fetch("/api/admin/enrollments", {
          headers: { Authorization: `Bearer ${token}` },
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
          throw new Error(errorData.message || "Ошибка при загрузке заявок");
        }

        const data = await response.json();
        setEnrollments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, [token, setError]);

  const changeStatus = async (id: string, status: "approved" | "rejected" | "cancelled", rejectionReason?: string, successMessage?: string) => {
    try {
      const body: { status: string; rejectionReason?: string } = { status };
      if (status === "rejected" && rejectionReason) body.rejectionReason = rejectionReason;
      const response = await fetch(`/api/admin/enrollments/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
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
        throw new Error(errorData.message || "Ошибка изменения статуса");
      }

      setEnrollments((prev) =>
        prev.map((enr) =>
          enr._id === id ? { ...enr, status, rejectionReason: status === "rejected" ? rejectionReason : undefined } : enr
        )
      );
      setRejectReasons((prev) => ({ ...prev, [id]: "" }));
      toast.success(successMessage ?? "Статус изменён");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      toast.error("Не удалось изменить статус");
    }
  };

  const handleRemoveConfirm = async (reason: string) => {
    if (!removeModalEnr) return;
    try {
      const isKick = removeModalEnr.status === "approved";
      await changeStatus(
        removeModalEnr._id,
        "rejected",
        reason.trim() || undefined,
        isKick ? "Участник исключён из кружка" : "Заявка отклонена"
      );
      setRemoveModalEnr(null);
    } catch {
      // ошибка уже показана в changeStatus
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Выбран конкретный кружок — показываем участников и заявки
  if (selectedCircle) {
    const { circle, approved, pending } = selectedCircle;
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setSelectedCircleId(null)}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к списку кружков
        </button>

        <h2 className="text-xl font-bold text-slate-900">{circle.title}</h2>

        {/* Участники кружка (одобренные) */}
        <div>
          <h3 className="text-base font-semibold text-slate-800 mb-3">
            Участники кружка ({approved.length})
          </h3>
          {approved.length === 0 ? (
            <p className="text-slate-500 text-sm">Пока нет участников</p>
          ) : (
            <ul className="space-y-2">
              {approved.map((enr) => (
                <li
                  key={enr._id}
                  className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {enr.user.fullName || enr.user.username}
                    </p>
                    {enr.user.email && (
                      <p className="text-xs text-slate-500">{enr.user.email}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoveModalEnr(enr)}
                    className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-red-600 transition-colors"
                    title="Исключить из кружка"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <KickModal
          open={!!removeModalEnr}
          onClose={() => setRemoveModalEnr(null)}
          title={removeModalEnr?.status === "approved" ? "Исключить из кружка" : "Отклонить заявку"}
          participantName={removeModalEnr ? (removeModalEnr.user.fullName || removeModalEnr.user.username) : undefined}
          confirmLabel={removeModalEnr?.status === "approved" ? "Подтвердить исключение" : "Отклонить заявку"}
          reasonPlaceholder="Причина (необязательно)"
          onSubmit={handleRemoveConfirm}
        />

        {/* Заявки на кружок (ожидающие) */}
        <div>
          <h3 className="text-base font-semibold text-slate-800 mb-3">
            Заявки на кружок ({pending.length})
          </h3>
          {pending.length === 0 ? (
            <p className="text-slate-500 text-sm">Нет заявок на рассмотрении</p>
          ) : (
            <ul className="space-y-4">
              {pending.map((enr) => (
                <li
                  key={enr._id}
                  className="bg-amber-50/50 rounded-xl p-4 border border-amber-100"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {enr.user.fullName || enr.user.username}
                      </p>
                      {(enr.user.email || enr.user.phone) && (
                        <p className="text-xs text-slate-500">
                          {[enr.user.email, enr.user.phone].filter(Boolean).join(" • ")}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(enr.createdAt).toLocaleString("ru-RU")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRemoveModalEnr(enr)}
                      className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-red-600 transition-colors"
                      title="Отклонить заявку"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {enr.comment && (
                    <p className="text-sm text-slate-600 italic mb-3">Комментарий: {enr.comment}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={rejectReasons[enr._id] ?? ""}
                      onChange={(e) => setRejectReasons((prev) => ({ ...prev, [enr._id]: e.target.value }))}
                      placeholder="Причина отклонения (необязательно)"
                      className="flex-1 min-w-[180px] rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                    />
                    <Button
                      size="sm"
                      onClick={() => changeStatus(enr._id, "approved")}
                      className="!bg-emerald-600 hover:!bg-emerald-700 text-white flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Одобрить
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => changeStatus(enr._id, "rejected", rejectReasons[enr._id]?.trim() || undefined)}
                      className="!border-red-200 !text-red-600 hover:!bg-red-50 flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      Отклонить
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // Список кружков
  if (circlesWithEnrollments.length === 0) {
    return <p className="text-slate-600 font-medium py-8">Записей и кружков с заявками пока нет</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Записи по кружкам</h2>
      <p className="text-sm text-slate-600">Выберите кружок, чтобы увидеть участников и заявки</p>

      <ul className="space-y-2">
        {circlesWithEnrollments.map(({ circle, approved, pending }) => (
          <li key={circle._id}>
            <button
              type="button"
              onClick={() => setSelectedCircleId(circle._id)}
              className="w-full flex items-center justify-between gap-4 bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-4 border border-slate-100 hover:border-slate-200 transition-all text-left"
            >
              <div>
                <p className="font-semibold text-slate-900">{circle.title}</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  Участников: {approved.length}
                  {pending.length > 0 && ` • Заявок: ${pending.length}`}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
