import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import SelectMenu from "../components/ui/select-menu";
import { Button } from "../components/ui/button";

type Theme = { _id: string; title: string; course?: { title: string } };
type Group = { _id: string; name: string; course?: { _id: string; title: string } | string };
type Category = { _id: string; name: string };
type Assignment = {
  _id: string;
  title: string;
  description?: string;
  type: "TEST" | "DOCUMENT";
  theme?: { _id: string; title: string } | string;
  group?: { _id: string; name: string } | string;
  category?: { _id: string; name: string } | string;
  deadline: string;
  maxScore: number;
};
type GradeRow = {
  _id: string;
  finalScore?: number;
  status: string;
  attempt: number;
  student?: { _id: string; fullName?: string; username: string };
  assignment?: { _id: string; title: string; type: string; maxScore: number };
};

const emptyForm = {
  title: "",
  description: "",
  type: "TEST" as "TEST" | "DOCUMENT",
  theme: "",
  group: "",
  category: "",
  startAt: "",
  deadline: "",
  maxScore: 100,
};

export default function TeacherLms() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [themesRes, groupsRes, categoriesRes, assignmentsRes, gradesRes] = await Promise.all([
        fetch("/api/teacher/lms/themes", { headers: authHeaders }),
        fetch("/api/teacher/lms/groups", { headers: authHeaders }),
        fetch("/api/teacher/lms/categories", { headers: authHeaders }),
        fetch("/api/teacher/lms/assignments", { headers: authHeaders }),
        fetch("/api/teacher/lms/grades", { headers: authHeaders }),
      ]);

      const [themesData, groupsData, categoriesData, assignmentsData, gradesData] = await Promise.all([
        themesRes.json(), groupsRes.json(), categoriesRes.json(), assignmentsRes.json(), gradesRes.json(),
      ]);

      if (!themesRes.ok || !groupsRes.ok || !categoriesRes.ok || !assignmentsRes.ok || !gradesRes.ok) {
        throw new Error(themesData.message || groupsData.message || categoriesData.message || assignmentsData.message || gradesData.message || "Ошибка загрузки данных");
      }

      setThemes(themesData);
      setGroups(groupsData);
      setCategories(categoriesData);
      setAssignments(assignmentsData);
      setGrades(gradesData);
      setScoreInputs(Object.fromEntries((gradesData as GradeRow[]).map((row) => [row._id, String(row.finalScore ?? "")])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки данных преподавателя");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [token]);

  const createAssignment = async () => {
    if (!form.title || !form.theme || !form.group || !form.category || !form.startAt || !form.deadline) {
      toast.error("Заполните обязательные поля");
      return;
    }
    try {
      const response = await fetch("/api/teacher/lms/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          ...form,
          startAt: new Date(form.startAt).toISOString(),
          deadline: new Date(form.deadline).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка создания задания");
      toast.success("Задание создано");
      setForm(emptyForm);
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка создания задания");
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const confirmed = window.confirm("Удалить задание?");
      if (!confirmed) return;
      const response = await fetch(`/api/teacher/lms/assignments/${id}`, { method: "DELETE", headers: authHeaders });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка удаления задания");
      toast.success("Задание удалено");
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка удаления задания");
    }
  };

  const saveGrade = async (submissionId: string) => {
    try {
      const response = await fetch(`/api/teacher/lms/grades/${submissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ manualScore: Number(scoreInputs[submissionId]) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка сохранения оценки");
      toast.success("Оценка сохранена");
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка сохранения оценки");
    }
  };

  const recalcGrade = async (submissionId: string) => {
    try {
      const response = await fetch(`/api/teacher/lms/grades/${submissionId}/recalculate`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка пересчета");
      toast.success("Оценка пересчитана");
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка пересчета");
    }
  };

  const retake = async (assignmentId: string, studentId: string) => {
    try {
      const response = await fetch(`/api/teacher/lms/assignments/${assignmentId}/retake/${studentId}`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка повторной попытки");
      toast.success("Повторная попытка создана");
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка повторной попытки");
    }
  };

  if (!token) {
    return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 text-slate-600">Войдите в систему.</div>;
  }

  if (user.role !== "teacher") {
    return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 text-slate-600">Раздел доступен только преподавателю.</div>;
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Мой LMS (преподаватель)</h1>
          <p className="mt-2 text-slate-600">Создавайте задания по своим темам и выставляйте оценки только по своим предметам.</p>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Новое задание</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="input-base" placeholder="Название" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
            <SelectMenu value={form.type} options={[{ value: "TEST", label: "Тест" }, { value: "DOCUMENT", label: "Документ" }]} onChange={(value) => setForm((prev) => ({ ...prev, type: value as "TEST" | "DOCUMENT" }))} />
            <SelectMenu value={form.theme} options={[{ value: "", label: "Выберите тему" }, ...themes.map((theme) => ({ value: theme._id, label: theme.title }))]} onChange={(value) => setForm((prev) => ({ ...prev, theme: value }))} />
            <SelectMenu value={form.group} options={[{ value: "", label: "Выберите группу" }, ...groups.map((group) => ({ value: group._id, label: group.name }))]} onChange={(value) => setForm((prev) => ({ ...prev, group: value }))} />
            <SelectMenu value={form.category} options={[{ value: "", label: "Выберите категорию" }, ...categories.map((category) => ({ value: category._id, label: category.name }))]} onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} />
            <input className="input-base" type="number" min="1" max="100" value={form.maxScore} onChange={(e) => setForm((prev) => ({ ...prev, maxScore: Number(e.target.value) || 100 }))} />
            <input className="input-base" type="datetime-local" value={form.startAt} onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))} />
            <input className="input-base" type="datetime-local" value={form.deadline} onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))} />
          </div>
          <textarea className="input-base min-h-24" placeholder="Описание" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          <Button onClick={createAssignment}>Создать задание</Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card p-5 space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Мои задания</h2>
            {assignments.length === 0 && <p className="text-sm text-slate-500">Заданий пока нет</p>}
            {assignments.map((assignment) => (
              <div key={assignment._id} className="rounded-xl border border-slate-100 p-4 bg-slate-50">
                <p className="font-bold text-slate-900">{assignment.title}</p>
                <p className="text-sm text-slate-600">{assignment.description || "Без описания"}</p>
                <p className="text-xs text-slate-500 mt-1">Тип: {assignment.type} · Дедлайн: {new Date(assignment.deadline).toLocaleString("ru-RU")}</p>
                <Button size="sm" variant="outline" className="mt-3 !border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => deleteAssignment(assignment._id)}>Удалить</Button>
              </div>
            ))}
          </div>

          <div className="card p-5 space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Оценивание</h2>
            {grades.length === 0 && <p className="text-sm text-slate-500">Нет работ на оценивание</p>}
            {grades.map((row) => (
              <div key={row._id} className="rounded-xl border border-slate-100 p-4 bg-slate-50 space-y-2">
                <p className="font-bold text-slate-900">{row.assignment?.title || "Задание"}</p>
                <p className="text-sm text-slate-600">{row.student?.fullName || row.student?.username} · Попытка {row.attempt}</p>
                <p className="text-xs text-slate-500">Статус: {row.status} · Текущий балл: {row.finalScore ?? 0}</p>
                <div className="flex flex-wrap gap-2">
                  <input className="input-base max-w-[150px]" type="number" min="0" max={row.assignment?.maxScore ?? 100} value={scoreInputs[row._id] ?? ""} onChange={(e) => setScoreInputs((prev) => ({ ...prev, [row._id]: e.target.value }))} />
                  <Button size="sm" onClick={() => saveGrade(row._id)}>Сохранить</Button>
                  {row.assignment?.type === "TEST" && <Button size="sm" variant="secondary" onClick={() => recalcGrade(row._id)}>Пересчитать</Button>}
                  {row.assignment?._id && row.student?._id && <Button size="sm" variant="outline" onClick={() => retake(row.assignment!._id, row.student!._id)}>Повторная</Button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
