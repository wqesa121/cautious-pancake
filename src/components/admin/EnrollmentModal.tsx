import { X } from "lucide-react";
import { Button } from "../../components/ui/button";
import SelectMenu from "../../components/ui/select-menu";

interface User {
  _id: string;
  username: string;
  fullName?: string;
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
  createdAt: string;
}

interface EnrollmentModalProps {
  enrollment: Enrollment; // теперь не optional, т.к. модалка открывается только при наличии данных
  editData: Partial<Enrollment>;
  setEditData: (data: Partial<Enrollment>) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function EnrollmentModal({
  enrollment,
  editData,
  setEditData,
  onSave,
  onClose,
}: EnrollmentModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Заявка #{enrollment._id.slice(-6)}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Информация о студенте */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Студент</h3>
            <p className="text-base text-gray-900">
              {enrollment.user.fullName || enrollment.user.username}
            </p>
          </div>

          {/* Информация о кружке */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Кружок</h3>
            <p className="text-base text-gray-900">{enrollment.circle.title}</p>
          </div>

          {/* Комментарий (если есть) */}
          {enrollment.comment && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Комментарий студента</h3>
              <p className="text-sm text-gray-600 italic">{enrollment.comment}</p>
            </div>
          )}

          {/* Дата создания */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Дата подачи заявки
            </label>
            <p className="text-base text-gray-900">
              {new Date(enrollment.createdAt).toLocaleString("ru-RU")}
            </p>
          </div>

          {/* Статус */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Статус заявки
            </label>
            <SelectMenu
              value={editData.status || enrollment.status}
              onChange={(value) => setEditData({ ...editData, status: value as Enrollment["status"] })}
              options={[
                { value: "pending", label: "Ожидает" },
                { value: "approved", label: "Одобрено" },
                { value: "rejected", label: "Отклонено" },
                { value: "cancelled", label: "Отменено" },
              ]}
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-4 mt-8">
            <Button
              onClick={onSave}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3"
            >
              Сохранить изменения
            </Button>

            <Button
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3"
            >
              Отмена
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}