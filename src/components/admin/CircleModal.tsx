import { useState } from "react";
import { Button } from "../../components/ui/button";
import { X } from "lucide-react";
import SelectMenu from "../../components/ui/select-menu";

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

interface CircleModalProps {
  mode: "add" | "edit";
  circle: Circle;
  teachers: Teacher[];
  onSave: (circle: Circle) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

export default function CircleModal({
  mode,
  circle,
  teachers,
  onSave,
  onDelete,
  onClose,
}: CircleModalProps) {
  const [formData, setFormData] = useState<Circle>({
    ...circle,
    teacher: circle.teacher ?? null,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Валидация
    if (!formData.title.trim()) {
      setFormError("Название кружка обязательно");
      return;
    }
    if (formData.maxPlaces < 1) {
      setFormError("Максимальное количество мест должно быть минимум 1");
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-soft-lg border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {mode === "add" ? "Добавить кружок" : "Редактировать кружок"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Название кружка *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Категория</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="IT, Спорт, Языки..."
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Расписание</label>
            <input
              type="text"
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              placeholder="Пн, Ср 18:00–20:00"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Максимальное количество мест *</label>
            <input
              type="number"
              min="1"
              value={formData.maxPlaces || ""}
              onChange={(e) => setFormData({ ...formData, maxPlaces: Number(e.target.value) })}
              className="input-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Цена (₸). 0 — бесплатно</label>
            <input
              type="number"
              min="0"
              step="100"
              value={formData.price !== undefined && formData.price !== null ? formData.price : ""}
              onChange={(e) => {
                const v = e.target.value;
                setFormData({ ...formData, price: v === "" ? 0 : Number(v) || 0 });
              }}
              className="input-base"
              placeholder="0 — бесплатно"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Преподаватель кружка</label>
            <SelectMenu
              value={formData.teacher ?? ""}
              onChange={(value) => setFormData({ ...formData, teacher: value || null })}
              options={[
                { value: "", label: "— Не назначен" },
                ...teachers.map((t) => ({ value: t._id, label: t.fullName || t.username })),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ссылка на изображение</label>
            <input
              type="text"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Подробное описание, возраст, уровень..."
              className="input-base h-32 resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
            <Button
              type="submit"
              size="md"
              variant="primary"
              className={`flex-1 min-w-[140px] ${mode === "add" ? "!bg-primary-500 hover:!bg-primary-600" : "!bg-slate-900 hover:!bg-slate-800"}`}
            >
              {mode === "add" ? "Создать кружок" : "Сохранить"}
            </Button>
            {mode === "edit" && onDelete && (
              <Button type="button" onClick={onDelete} size="md" variant="outline" className="!border-red-200 !text-red-600 hover:!bg-red-50">
                Удалить
              </Button>
            )}
            <Button type="button" onClick={onClose} size="md" variant="secondary">
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}