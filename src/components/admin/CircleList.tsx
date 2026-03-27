import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "react-toastify";
import CircleModal from "./CircleModal";

interface Circle {
  _id: string;
  title: string;
  description: string;
  category: string;
  maxPlaces: number;
  currentPlaces: number;
  price: number;
  schedule: string;
  imageUrl: string;
  teacher?: string | null;
}

interface Teacher {
  _id: string;
  fullName: string;
  username: string;
}

interface CircleListProps {
  token: string | null;
  setError: (error: string | null) => void;
}

export default function CircleList({ token, setError }: CircleListProps) {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [newCircle, setNewCircle] = useState<Circle>({
    _id: "",
    title: "",
    description: "",
    category: "",
    maxPlaces: 20,
    currentPlaces: 0,
    price: 0,
    schedule: "",
    imageUrl: "",
    teacher: null,
  });
  const [editingCircle, setEditingCircle] = useState<Circle | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    if (!token) return;
    const fetchCircles = async () => {
      try {
        const response = await fetch("/api/admin/circles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Ошибка загрузки кружков");
        const data = await response.json();
        const validated = data.map((c: any) => ({
          _id: c._id.toString(),
          title: c.title,
          description: c.description || "",
          category: c.category || "",
          maxPlaces: c.maxPlaces,
          currentPlaces: c.currentPlaces,
          price: typeof c.price === "number" ? c.price : Number(c.price) || 0,
          schedule: c.schedule || "",
          imageUrl: c.imageUrl || "",
          teacher: c.teacher?._id ?? c.teacher ?? null,
        }));
        setCircles(validated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      }
    };
    fetchCircles();
  }, [token, setError]);

  useEffect(() => {
    if (!token) return;
    const fetchTeachers = async () => {
      try {
        const response = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        setTeachers(data.filter((u: { role: string }) => u.role === "teacher"));
      } catch {
        // ignore
      }
    };
    fetchTeachers();
  }, [token]);

  const handleAddCircle = async (circle: Circle) => {
    try {
      // Удаляем _id при создании
      const { _id, ...circleData } = circle;

      const response = await fetch("/api/admin/circles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(circleData),
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
        throw new Error(errorData.message || "Ошибка при добавлении кружка");
      }

      const added = await response.json();
      setCircles([...circles, added.circle]);
      setNewCircle({
        _id: "",
        title: "",
        description: "",
        category: "",
        maxPlaces: 20,
        currentPlaces: 0,
        price: 0,
        schedule: "",
        imageUrl: "",
        teacher: null,
      });
      setIsAddModalOpen(false);
      toast.success("Кружок добавлен!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      toast.error("Не удалось добавить кружок");
    }
  };

  const handleEditCircle = async (circle: Circle) => {
    try {
      const response = await fetch(`/api/admin/circles/${circle._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(circle),
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
        throw new Error(errorData.message || "Ошибка при обновлении кружка");
      }

      const updated = await response.json();
      setCircles(circles.map((c) => (c._id === updated.circle._id ? updated.circle : c)));
      setEditingCircle(null);
      setIsEditModalOpen(false);
      toast.success("Кружок обновлён!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      toast.error("Не удалось обновить кружок");
    }
  };

  const handleDeleteCircle = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/circles/${id}`, {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка при удалении кружка");
      }

      setCircles(circles.filter((c) => c._id !== id));
      setEditingCircle(null);
      setIsEditModalOpen(false);
      toast.success("Кружок удалён!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      toast.error("Не удалось удалить кружок");
    }
  };

  return (
    <>
      <div className="mb-6">
        <Button
          onClick={() => setIsAddModalOpen(true)}
          size="md"
          variant="primary"
          className="inline-flex items-center gap-2 !bg-primary-500 hover:!bg-primary-600"
        >
          <Plus className="w-5 h-5" />
          Добавить кружок
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Кружки и секции</h2>
        {circles.length === 0 ? (
          <p className="text-slate-600 font-medium">Кружков пока нет</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {circles.map((circle) => (
              <div
                key={circle._id}
                className="bg-slate-50 rounded-xl p-5 border border-slate-100 shadow-soft hover:shadow-soft-lg hover:border-slate-200 transition-all duration-200"
              >
                <div className="min-h-[100px] flex items-center justify-center bg-slate-100 rounded-lg mb-4 px-3 py-4">
                  <h3 className="text-lg font-bold text-slate-900 text-center line-clamp-2">{circle.title}</h3>
                </div>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{circle.description || "Без описания"}</p>
                <p className="text-sm text-slate-700 mb-1"><span className="font-semibold">Категория:</span> {circle.category || "—"}</p>
                <p className="text-sm text-slate-700 mb-1"><span className="font-semibold">Расписание:</span> {circle.schedule || "—"}</p>
                <p className="text-sm text-slate-700 mb-1"><span className="font-semibold">Места:</span> {circle.currentPlaces} / {circle.maxPlaces}</p>
                <p className="text-sm text-slate-700 mb-4"><span className="font-semibold">Цена:</span> {circle.price > 0 ? `${circle.price} ₸` : "Бесплатно"}</p>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingCircle(circle);
                      setIsEditModalOpen(true);
                    }}
                  >
                    Редактировать
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteCircle(circle._id)}
                    className="!border-red-200 !text-red-600 hover:!bg-red-50 hover:!border-red-300"
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <CircleModal
          mode="add"
          circle={newCircle}
          teachers={teachers}
          onSave={handleAddCircle}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {isEditModalOpen && editingCircle && (
        <CircleModal
          mode="edit"
          circle={editingCircle}
          teachers={teachers}
          onSave={handleEditCircle}
          onDelete={() => handleDeleteCircle(editingCircle._id)}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </>
  );
}