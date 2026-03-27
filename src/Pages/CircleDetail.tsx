import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Button } from "../components/ui/button";

interface Circle {
  _id: string;
  title: string;
  description: string;
  category: string;
  maxPlaces: number;
  currentPlaces: number;
  price: number;
  schedule: string;
  imageUrl?: string;
}

interface MyEnrollment {
  _id: string;
  circle: { _id: string };
  status: string;
}

export default function CircleDetail() {
  const { id } = useParams<{ id: string }>();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [myEnrollment, setMyEnrollment] = useState<MyEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchCircle = async () => {
      try {
        const res = await fetch(`/api/circles/${id}`);
        if (!res.ok) throw new Error("Кружок не найден");
        const data = await res.json();
        setCircle(data);
      } catch (err) {
        toast.error("Не удалось загрузить кружок");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchCircle();
  }, [id, navigate]);

  useEffect(() => {
    if (!token || !id) return;
    const fetchMyEnrollments = async () => {
      try {
        const res = await fetch("/api/my-enrollments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const forThisCircle = data.find((e: MyEnrollment) => e.circle._id === id);
        if (forThisCircle) setMyEnrollment(forThisCircle);
      } catch {
        // ignore
      }
    };
    fetchMyEnrollments();
  }, [token, id]);

  const handleEnroll = async () => {
    if (!token) {
      toast.info("Войдите, чтобы записаться");
      navigate("/login");
      return;
    }

    setEnrollLoading(true);
    try {
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ circleId: id }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.info(data.message || "Вы уже записаны на этот кружок. Ваша заявка на рассмотрении.");
          setMyEnrollment({ _id: "", circle: { _id: id! }, status: "pending" });
        } else {
          toast.error(data.message || "Не удалось записаться");
        }
        return;
      }

      toast.success("Заявка отправлена! Ожидайте одобрения администратора.");
      setMyEnrollment({ _id: data.enrollment?._id || "", circle: { _id: id! }, status: "pending" });
    } catch (err) {
      toast.error("Ошибка при записи");
    } finally {
      setEnrollLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!circle) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-red-600 text-lg font-medium">Кружок не найден</p>
      </div>
    );
  }

  const isFull = circle.currentPlaces >= circle.maxPlaces;
  const pendingEnrollment = myEnrollment?.status === "pending";
  const approvedEnrollment = myEnrollment?.status === "approved";
  const rejectedEnrollment = myEnrollment?.status === "rejected";
  const alreadyEnrolled = approvedEnrollment || pendingEnrollment;

  const getButtonText = () => {
    if (approvedEnrollment) return "Вы уже записаны";
    if (pendingEnrollment) return "Ваша заявка на рассмотрении";
    if (isFull) return "Мест нет";
    if (rejectedEnrollment) return "Подать заявку снова";
    return "Записаться на кружок";
  };

  const canEnroll = !isFull && !alreadyEnrolled;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-8 transition-colors"
        >
          <span aria-hidden>←</span> Назад к списку
        </button>

        <article className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-soft-lg">
          <div className="bg-gradient-to-br from-slate-100 to-slate-50 px-6 sm:px-8 py-10 sm:py-12 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              {circle.title}
            </h1>
            {circle.category && (
              <span className="inline-block mt-3 px-3 py-1 rounded-full bg-slate-200/80 text-slate-700 text-sm font-semibold">
                {circle.category}
              </span>
            )}
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 p-6 rounded-xl bg-slate-50/80 border border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Расписание</p>
                <p className="text-slate-900 font-medium">{circle.schedule || "Не указано"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Цена</p>
                <p className="text-slate-900 font-semibold">
                  {circle.price > 0 ? `${circle.price} ₸` : "Бесплатно"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Места</p>
                <p
                  className={`font-bold ${
                    isFull ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {circle.currentPlaces} / {circle.maxPlaces}
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Описание</h2>
              <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                {circle.description || "Подробное описание отсутствует"}
              </p>
            </div>

            {alreadyEnrolled && (
              <p className="mb-4 text-sm font-medium text-slate-600">
                {pendingEnrollment
                  ? "Ваша заявка на рассмотрении. Ожидайте одобрения администратора."
                  : "Вы уже записаны на этот кружок."}
              </p>
            )}
            {rejectedEnrollment && (
              <p className="mb-4 text-sm font-medium text-amber-700">
                Ваша заявка была отклонена. Вы можете подать заявку снова.
              </p>
            )}

            <Button
              onClick={handleEnroll}
              disabled={!canEnroll || enrollLoading}
              size="lg"
              variant="primary"
              className={`w-full sm:w-auto min-w-[200px] ${
                !canEnroll || enrollLoading
                  ? "!bg-slate-300 !text-slate-500 cursor-not-allowed"
                  : "!bg-primary-500 hover:!bg-primary-600"
              }`}
            >
              {enrollLoading ? "Отправка..." : getButtonText()}
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
}
