import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "../ui/button";
import SelectMenu from "../ui/select-menu";

type Course = { _id: string; title: string; description?: string };
type Group = { _id: string; name: string; course?: { _id: string; title: string } | string };
type Theme = {
  _id: string;
  title: string;
  description?: string;
  course?: { _id: string; title: string } | string;
};
type Category = { _id: string; name: string };
type User = {
  _id: string;
  username: string;
  fullName: string;
  email?: string;
  role: string;
  group?: { _id: string; name: string } | string | null;
};

type Assignment = {
  _id: string;
  title: string;
  description?: string;
  type: "TEST" | "DOCUMENT";
  startAt: string;
  deadline: string;
  maxScore: number;
  theme?: { _id: string; title: string } | string;
  group?: { _id: string; name: string } | string;
  category?: { _id: string; name: string } | string;
  documentFile?: string;
  questions?: Array<{
    _id?: string;
    text: string;
    image?: string;
    allowMultiple?: boolean;
    options: Array<{ text: string; isCorrect: boolean }>;
  }>;
};

type TestOptionDraft = {
  text: string;
  isCorrect: boolean;
};

type TestQuestionDraft = {
  text: string;
  image?: string;
  allowMultiple: boolean;
  options: TestOptionDraft[];
};

type GradeRow = {
  _id: string;
  attempt: number;
  status: string;
  autoScore?: number;
  manualScore?: number;
  finalScore?: number;
  submittedAt?: string;
  gradedAt?: string;
  student?: { _id: string; fullName?: string; username: string; email?: string };
  assignment?: { _id: string; title: string; type: string; maxScore: number; deadline?: string };
};

type DashboardData = {
  studentsLastLogin: Array<{ _id: string; fullName: string; username: string; lastLogin?: string; group?: { name: string } | string }>;
  completedAssignments: number;
  overdueAssignments: number;
  averageScore: number;
  groupStats: Array<{ groupId: string; groupName: string; studentsCount: number; averageScore: number }>;
  studentGrades: Array<{
    studentId: string;
    fullName: string;
    username: string;
    groupName: string;
    averageScore: number;
    grades: Array<{
      submissionId: string;
      assignmentTitle: string;
      assignmentType: string;
      score: number;
      gradedAt?: string;
    }>;
  }>;
  completedAssignmentsList: Array<{
    submissionId: string;
    status: string;
    finalScore: number;
    updatedAt?: string;
    student?: { _id: string; fullName?: string; username: string } | null;
    assignment?: { _id: string; title: string; type: string; deadline?: string } | null;
  }>;
  overdueAssignmentsList: Array<{
    submissionId: string;
    status: string;
    updatedAt?: string;
    student?: { _id: string; fullName?: string; username: string } | null;
    assignment?: { _id: string; title: string; type: string; deadline?: string } | null;
  }>;
};

interface LmsPanelProps {
  token: string | null;
  setError: (error: string | null) => void;
}

const emptyAssignmentForm = {
  title: "",
  description: "",
  theme: "",
  group: "",
  category: "",
  type: "TEST" as "TEST" | "DOCUMENT",
  startAt: "",
  deadline: "",
};

const toIsoDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

const createEmptyQuestion = (): TestQuestionDraft => ({
  text: "",
  image: "",
  allowMultiple: false,
  options: [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
});

export default function LmsPanel({ token, setError }: LmsPanelProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "courses" | "groups" | "themes" | "categories" | "assignments" | "grades" | "students">("dashboard");
  const [loading, setLoading] = useState(true);

  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [courseForm, setCourseForm] = useState({ title: "", description: "" });
  const [groupForm, setGroupForm] = useState({ name: "", course: "" });
  const [themeForm, setThemeForm] = useState({ title: "", description: "", course: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "" });
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);

  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [testBuilders, setTestBuilders] = useState<Record<string, TestQuestionDraft[]>>({});
  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({});
  const [openedTestAssignmentId, setOpenedTestAssignmentId] = useState<string | null>(null);

  const studentUsers = useMemo(() => users.filter((user) => user.role === "student"), [users]);
  const openedTestAssignment = useMemo(
    () => assignments.find((assignment) => assignment._id === openedTestAssignmentId && assignment.type === "TEST") || null,
    [assignments, openedTestAssignmentId]
  );

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchAll = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const [coursesRes, groupsRes, themesRes, categoriesRes, usersRes, assignmentsRes, gradesRes, dashboardRes] = await Promise.all([
        fetch("/api/admin/courses", { headers: authHeaders }),
        fetch("/api/admin/groups", { headers: authHeaders }),
        fetch("/api/admin/themes", { headers: authHeaders }),
        fetch("/api/admin/categories", { headers: authHeaders }),
        fetch("/api/admin/users", { headers: authHeaders }),
        fetch("/api/admin/assignments", { headers: authHeaders }),
        fetch("/api/admin/grades", { headers: authHeaders }),
        fetch("/api/admin/dashboard-lms", { headers: authHeaders }),
      ]);

      const responses = [coursesRes, groupsRes, themesRes, categoriesRes, usersRes, assignmentsRes, gradesRes, dashboardRes];
      for (const response of responses) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setError("Сессия истекла. Пожалуйста, войдите заново.");
          return;
        }
      }

      const [coursesData, groupsData, themesData, categoriesData, usersData, assignmentsData, gradesData, dashboardData] = await Promise.all(
        responses.map((response) => response.json())
      );

      setCourses(coursesData);
      setGroups(groupsData);
      setThemes(themesData);
      setCategories(categoriesData);
      setUsers(usersData);
      setAssignments(assignmentsData);
      setGrades(gradesData);
      setDashboard(dashboardData);
      setScoreInputs(Object.fromEntries((gradesData as GradeRow[]).map((row) => [row._id, String(row.finalScore ?? "")])));

      setTestBuilders((prev) => {
        const next = { ...prev };
        for (const assignment of assignmentsData as Assignment[]) {
          if (assignment.type !== "TEST") continue;
          if (next[assignment._id]) continue;
          const questions = (assignment.questions || []).map((q) => ({
            text: q.text || "",
            image: q.image || "",
            allowMultiple: !!q.allowMultiple,
            options: (q.options || []).map((o) => ({ text: o.text || "", isCorrect: !!o.isCorrect })),
          }));
          next[assignment._id] = questions.length > 0 ? questions : [createEmptyQuestion()];
        }

        for (const key of Object.keys(next)) {
          if (!(assignmentsData as Assignment[]).some((a) => a._id === key && a.type === "TEST")) {
            delete next[key];
          }
        }

        return next;
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Ошибка загрузки LMS данных");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [token]);

  useEffect(() => {
    if (openedTestAssignmentId && !assignments.some((assignment) => assignment._id === openedTestAssignmentId && assignment.type === "TEST")) {
      setOpenedTestAssignmentId(null);
    }
  }, [assignments, openedTestAssignmentId]);

  useEffect(() => {
    if (!openedTestAssignmentId) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [openedTestAssignmentId]);

  const createItem = async (url: string, body: object, successMessage: string, reset?: () => void) => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Ошибка создания");
      }
      toast.success(successMessage);
      reset?.();
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка создания");
    }
  };

  const updateItem = async (url: string, body: object, successMessage: string) => {
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка обновления");
      toast.success(successMessage);
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка обновления");
    }
  };

  const deleteItem = async (url: string, successMessage: string) => {
    try {
      const confirmed = window.confirm("Подтвердите удаление");
      if (!confirmed) return;
      const response = await fetch(url, { method: "DELETE", headers: authHeaders });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка удаления");
      toast.success(successMessage);
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка удаления");
    }
  };

  const createAssignment = async () => {
    if (!assignmentForm.title.trim() || !assignmentForm.theme || !assignmentForm.group || !assignmentForm.category || !assignmentForm.startAt || !assignmentForm.deadline) {
      toast.error("Заполните все обязательные поля задания");
      return;
    }

    await createItem(
      "/api/admin/assignments",
      {
        ...assignmentForm,
        startAt: toIsoDateTime(assignmentForm.startAt),
        deadline: toIsoDateTime(assignmentForm.deadline),
        maxScore: 100,
        questions: assignmentForm.type === "TEST" ? [] : undefined,
        documentFile: undefined,
      },
      "Задание создано",
      () => setAssignmentForm(emptyAssignmentForm)
    );
  };

  const updateTestBuilder = (assignmentId: string, updater: (prev: TestQuestionDraft[]) => TestQuestionDraft[]) => {
    setTestBuilders((prev) => ({
      ...prev,
      [assignmentId]: updater(prev[assignmentId] || [createEmptyQuestion()]),
    }));
  };

  const addQuestion = (assignmentId: string) => {
    updateTestBuilder(assignmentId, (prev) => [...prev, createEmptyQuestion()]);
  };

  const removeQuestion = (assignmentId: string, questionIndex: number) => {
    updateTestBuilder(assignmentId, (prev) => {
      const next = prev.filter((_, idx) => idx !== questionIndex);
      return next.length > 0 ? next : [createEmptyQuestion()];
    });
  };

  const setQuestionField = (assignmentId: string, questionIndex: number, field: "text" | "image", value: string) => {
    updateTestBuilder(assignmentId, (prev) => prev.map((q, idx) => (idx === questionIndex ? { ...q, [field]: value } : q)));
  };

  const toggleAllowMultiple = (assignmentId: string, questionIndex: number, allowMultiple: boolean) => {
    updateTestBuilder(assignmentId, (prev) => prev.map((q, idx) => {
      if (idx !== questionIndex) return q;
      if (allowMultiple) return { ...q, allowMultiple: true };
      let seenCorrect = false;
      const options = q.options.map((opt) => {
        if (!opt.isCorrect) return opt;
        if (!seenCorrect) {
          seenCorrect = true;
          return opt;
        }
        return { ...opt, isCorrect: false };
      });
      return { ...q, allowMultiple: false, options };
    }));
  };

  const setOptionText = (assignmentId: string, questionIndex: number, optionIndex: number, text: string) => {
    updateTestBuilder(assignmentId, (prev) => prev.map((q, qIdx) => {
      if (qIdx !== questionIndex) return q;
      return {
        ...q,
        options: q.options.map((opt, oIdx) => (oIdx === optionIndex ? { ...opt, text } : opt)),
      };
    }));
  };

  const toggleOptionCorrect = (assignmentId: string, questionIndex: number, optionIndex: number, checked: boolean) => {
    updateTestBuilder(assignmentId, (prev) => prev.map((q, qIdx) => {
      if (qIdx !== questionIndex) return q;
      if (q.allowMultiple) {
        return {
          ...q,
          options: q.options.map((opt, oIdx) => (oIdx === optionIndex ? { ...opt, isCorrect: checked } : opt)),
        };
      }
      return {
        ...q,
        options: q.options.map((opt, oIdx) => ({ ...opt, isCorrect: oIdx === optionIndex ? checked : false })),
      };
    }));
  };

  const addOption = (assignmentId: string, questionIndex: number) => {
    updateTestBuilder(assignmentId, (prev) => prev.map((q, qIdx) => {
      if (qIdx !== questionIndex) return q;
      return { ...q, options: [...q.options, { text: "", isCorrect: false }] };
    }));
  };

  const removeOption = (assignmentId: string, questionIndex: number, optionIndex: number) => {
    updateTestBuilder(assignmentId, (prev) => prev.map((q, qIdx) => {
      if (qIdx !== questionIndex) return q;
      const options = q.options.filter((_, idx) => idx !== optionIndex);
      const safeOptions = options.length >= 2 ? options : [...options, { text: "", isCorrect: false }];
      return { ...q, options: safeOptions };
    }));
  };

  const saveTestQuestions = async (assignmentId: string) => {
    const questions = (testBuilders[assignmentId] || []).map((q) => ({
      text: q.text.trim(),
      image: q.image?.trim() || undefined,
      allowMultiple: !!q.allowMultiple,
      options: q.options.map((o) => ({ text: o.text.trim(), isCorrect: !!o.isCorrect })),
    }));

    if (questions.length === 0) {
      toast.error("Добавьте хотя бы один вопрос");
      return;
    }

    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];
      if (!question.text) {
        toast.error(`Заполните текст вопроса #${i + 1}`);
        return;
      }
      if (!Array.isArray(question.options) || question.options.length < 2) {
        toast.error(`В вопросе #${i + 1} должно быть минимум 2 варианта`);
        return;
      }
      if (question.options.some((o) => !o.text)) {
        toast.error(`Заполните все варианты вопроса #${i + 1}`);
        return;
      }
      if (!question.options.some((o) => o.isCorrect)) {
        toast.error(`Отметьте правильный ответ в вопросе #${i + 1}`);
        return;
      }
      if (!question.allowMultiple && question.options.filter((o) => o.isCorrect).length > 1) {
        toast.error(`Вопрос #${i + 1} допускает только один правильный ответ`);
        return;
      }
    }

    await updateItem(`/api/admin/assignments/${assignmentId}/test`, { questions }, "Тест обновлён");
  };

  const uploadDocument = async (assignmentId: string) => {
    const file = documentFiles[assignmentId];
    if (!file) {
      toast.error("Выберите файл задания");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/admin/assignments/${assignmentId}/document`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка загрузки файла");
      toast.success("Файл задания загружен");
      setDocumentFiles((prev) => ({ ...prev, [assignmentId]: null }));
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки файла");
    }
  };

  const saveGrade = async (submissionId: string) => {
    const raw = scoreInputs[submissionId];
    const manualScore = Number(raw);
    if (Number.isNaN(manualScore)) {
      toast.error("Введите корректную оценку");
      return;
    }
    await updateItem(`/api/admin/grades/${submissionId}`, { manualScore }, "Оценка обновлена");
  };

  const recalcGrade = async (submissionId: string) => {
    try {
      const response = await fetch(`/api/admin/grades/${submissionId}/recalculate`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка пересчёта");
      toast.success("Оценка пересчитана");
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка пересчёта");
    }
  };

  const createRetake = async (assignmentId: string, studentId: string) => {
    try {
      const response = await fetch(`/api/admin/assignments/${assignmentId}/retake/${studentId}`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка создания повторной попытки");
      toast.success("Повторная попытка создана");
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка повторной попытки");
    }
  };

  const tabs = [
    { id: "dashboard", label: "LMS Dashboard" },
    { id: "courses", label: "Курсы" },
    { id: "groups", label: "Группы" },
    { id: "themes", label: "Темы" },
    { id: "categories", label: "Категории" },
    { id: "assignments", label: "Задания и тесты" },
    { id: "grades", label: "Оценки" },
    { id: "students", label: "Студенты по группам" },
  ] as const;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-800">
        Админ управляет структурой LMS, заданиями, оценками и повторными попытками. Доступны только роли Админ и Студент.
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-sm text-slate-500">Средний балл</p>
              <p className="text-3xl font-bold text-slate-900">{dashboard.averageScore}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Выполнено</p>
              <p className="text-3xl font-bold text-slate-900">{dashboard.completedAssignments}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Просрочено</p>
              <p className="text-3xl font-bold text-slate-900">{dashboard.overdueAssignments}</p>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Последние входы студентов</h3>
            <div className="space-y-2">
              {dashboard.studentsLastLogin.slice(0, 20).map((student) => (
                <div key={student._id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{student.fullName || student.username}</p>
                    <p className="text-xs text-slate-500">Группа: {typeof student.group === "string" ? student.group : student.group?.name || "-"}</p>
                  </div>
                  <p className="text-xs text-slate-500">{student.lastLogin ? new Date(student.lastLogin).toLocaleString("ru-RU") : "ещё не входил"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Статистика по группам</h3>
            <div className="space-y-2">
              {dashboard.groupStats.map((group) => (
                <div key={group.groupId} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{group.groupName}</p>
                  <p className="text-sm text-slate-600">Студентов: {group.studentsCount} · Средний: {group.averageScore}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Оценки по студентам</h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {dashboard.studentGrades.map((row) => (
                <div key={row.studentId} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{row.fullName} ({row.username})</p>
                  <p className="text-sm text-slate-600">Группа: {row.groupName} · Средний балл: {row.averageScore}</p>
                  <div className="mt-2 space-y-1">
                    {row.grades.slice(0, 5).map((grade) => (
                      <p key={grade.submissionId} className="text-xs text-slate-500">{grade.assignmentTitle} ({grade.assignmentType}) · {grade.score}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Список выполненных заданий</h3>
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {dashboard.completedAssignmentsList.map((item) => (
                  <div key={item.submissionId} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="font-semibold text-slate-900">{item.assignment?.title || "-"}</p>
                    <p className="text-xs text-slate-500">{item.student?.fullName || item.student?.username || "-"} · {item.status} · Балл: {item.finalScore}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Список просроченных заданий</h3>
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {dashboard.overdueAssignmentsList.map((item) => (
                  <div key={item.submissionId} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="font-semibold text-slate-900">{item.assignment?.title || "-"}</p>
                    <p className="text-xs text-slate-500">{item.student?.fullName || item.student?.username || "-"} · {item.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "courses" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Создать курс</h3>
            <input className="input-base" placeholder="Название курса" value={courseForm.title} onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))} />
            <textarea className="input-base min-h-28" placeholder="Описание" value={courseForm.description} onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))} />
            <Button onClick={() => createItem("/api/admin/courses", courseForm, "Курс создан", () => setCourseForm({ title: "", description: "" }))}>Создать курс</Button>
          </div>
          <div className="space-y-3">
            {courses.map((course) => (
              <div key={course._id} className="card p-5 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900">{course.title}</h4>
                  <p className="text-sm text-slate-600">{course.description || "Без описания"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => {
                    const title = window.prompt("Название курса", course.title);
                    if (!title) return;
                    const description = window.prompt("Описание", course.description || "") ?? course.description;
                    updateItem(`/api/admin/courses/${course._id}`, { title, description }, "Курс обновлён");
                  }}>Изменить</Button>
                  <Button size="sm" variant="outline" className="!border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => deleteItem(`/api/admin/courses/${course._id}`, "Курс удалён")}>Удалить</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "groups" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Создать группу</h3>
            <input className="input-base" placeholder="Название группы" value={groupForm.name} onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))} />
            <SelectMenu
              value={groupForm.course}
              options={[{ value: "", label: "Выберите курс" }, ...courses.map((course) => ({ value: course._id, label: course.title }))]}
              onChange={(value) => setGroupForm((prev) => ({ ...prev, course: value }))}
            />
            <Button onClick={() => createItem("/api/admin/groups", groupForm, "Группа создана", () => setGroupForm({ name: "", course: "" }))}>Создать группу</Button>
          </div>
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group._id} className="card p-5 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900">{group.name}</h4>
                  <p className="text-sm text-slate-600">Курс: {typeof group.course === "string" ? group.course : group.course?.title || "-"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => {
                    const name = window.prompt("Название группы", group.name);
                    if (!name) return;
                    const currentCourseId = typeof group.course === "string" ? group.course : group.course?._id || "";
                    const course = window.prompt("ID курса", currentCourseId) || currentCourseId;
                    updateItem(`/api/admin/groups/${group._id}`, { name, course }, "Группа обновлена");
                  }}>Изменить</Button>
                  <Button size="sm" variant="outline" className="!border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => deleteItem(`/api/admin/groups/${group._id}`, "Группа удалена")}>Удалить</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "themes" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Создать тему</h3>
            <input className="input-base" placeholder="Название темы" value={themeForm.title} onChange={(e) => setThemeForm((prev) => ({ ...prev, title: e.target.value }))} />
            <textarea className="input-base min-h-28" placeholder="Описание" value={themeForm.description} onChange={(e) => setThemeForm((prev) => ({ ...prev, description: e.target.value }))} />
            <SelectMenu
              value={themeForm.course}
              options={[{ value: "", label: "Выберите курс" }, ...courses.map((course) => ({ value: course._id, label: course.title }))]}
              onChange={(value) => setThemeForm((prev) => ({ ...prev, course: value }))}
            />
            <Button onClick={() => createItem("/api/admin/themes", themeForm, "Тема создана", () => setThemeForm({ title: "", description: "", course: "" }))}>Создать тему</Button>
          </div>
          <div className="space-y-3">
            {themes.map((theme) => (
              <div key={theme._id} className="card p-5 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900">{theme.title}</h4>
                  <p className="text-sm text-slate-600">{theme.description || "Без описания"}</p>
                  <p className="text-xs text-slate-500">Курс: {typeof theme.course === "string" ? theme.course : theme.course?.title || "-"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => {
                    const title = window.prompt("Название темы", theme.title);
                    if (!title) return;
                    const description = window.prompt("Описание", theme.description || "") ?? theme.description;
                    const currentCourseId = typeof theme.course === "string" ? theme.course : theme.course?._id || "";
                    const course = window.prompt("ID курса", currentCourseId) || currentCourseId;
                    updateItem(`/api/admin/themes/${theme._id}`, { title, description, course }, "Тема обновлена");
                  }}>Изменить</Button>
                  <Button size="sm" variant="outline" className="!border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => deleteItem(`/api/admin/themes/${theme._id}`, "Тема удалена")}>Удалить</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Создать категорию</h3>
            <input className="input-base" placeholder="Название категории" value={categoryForm.name} onChange={(e) => setCategoryForm({ name: e.target.value })} />
            <Button onClick={() => createItem("/api/admin/categories", categoryForm, "Категория создана", () => setCategoryForm({ name: "" }))}>Создать категорию</Button>
          </div>
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category._id} className="card p-5 flex items-center justify-between gap-3">
                <h4 className="font-bold text-slate-900">{category.name}</h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => {
                    const name = window.prompt("Название категории", category.name);
                    if (!name) return;
                    updateItem(`/api/admin/categories/${category._id}`, { name }, "Категория обновлена");
                  }}>Изменить</Button>
                  <Button size="sm" variant="outline" className="!border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => deleteItem(`/api/admin/categories/${category._id}`, "Категория удалена")}>Удалить</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "assignments" && (
        <div className="space-y-6">
          <div className="card p-5 space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Создать задание</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <input className="input-base" placeholder="Название задания" value={assignmentForm.title} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, title: e.target.value }))} />
              <SelectMenu value={assignmentForm.type} options={[{ value: "TEST", label: "Тест" }, { value: "DOCUMENT", label: "Документ" }]} onChange={(value) => setAssignmentForm((prev) => ({ ...prev, type: value as "TEST" | "DOCUMENT" }))} />
              <SelectMenu value={assignmentForm.theme} options={[{ value: "", label: "Тема" }, ...themes.map((theme) => ({ value: theme._id, label: theme.title }))]} onChange={(value) => setAssignmentForm((prev) => ({ ...prev, theme: value }))} />
              <SelectMenu value={assignmentForm.group} options={[{ value: "", label: "Группа" }, ...groups.map((group) => ({ value: group._id, label: group.name }))]} onChange={(value) => setAssignmentForm((prev) => ({ ...prev, group: value }))} />
              <SelectMenu value={assignmentForm.category} options={[{ value: "", label: "Категория" }, ...categories.map((category) => ({ value: category._id, label: category.name }))]} onChange={(value) => setAssignmentForm((prev) => ({ ...prev, category: value }))} />
              <input className="input-base" type="datetime-local" value={assignmentForm.startAt} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, startAt: e.target.value }))} />
              <input className="input-base" type="datetime-local" value={assignmentForm.deadline} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, deadline: e.target.value }))} />
            </div>
            <textarea className="input-base min-h-24" placeholder="Описание" value={assignmentForm.description} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, description: e.target.value }))} />
            <Button onClick={createAssignment}>Создать задание</Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {assignments.map((assignment) => (
              <div
                key={assignment._id}
                className={`card p-5 space-y-3 ${assignment.type === "TEST" ? "cursor-pointer hover:border-amber-200" : ""}`}
                onClick={() => {
                  if (assignment.type === "TEST") {
                    setOpenedTestAssignmentId(assignment._id);
                  }
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900">{assignment.title}</h4>
                    <p className="text-sm text-slate-600">{assignment.description || "Без описания"}</p>
                    <p className="text-xs text-slate-500">Тип: {assignment.type} · Макс. балл: 100</p>
                    <p className="text-xs text-slate-500">Дедлайн: {new Date(assignment.deadline).toLocaleString("ru-RU")}</p>
                    {assignment.type === "TEST" && (
                      <p className="text-xs text-amber-700 mt-1">Нажмите на карточку, чтобы открыть содержимое теста</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={(event) => {
                      event.stopPropagation();
                      const title = window.prompt("Название задания", assignment.title);
                      if (!title) return;
                      const description = window.prompt("Описание", assignment.description || "") ?? assignment.description;
                      const startAt = window.prompt("Дата начала (ISO)", assignment.startAt) || assignment.startAt;
                      const deadline = window.prompt("Дедлайн (ISO)", assignment.deadline) || assignment.deadline;
                      const theme = typeof assignment.theme === "string" ? assignment.theme : assignment.theme?._id || "";
                      const group = typeof assignment.group === "string" ? assignment.group : assignment.group?._id || "";
                      const category = typeof assignment.category === "string" ? assignment.category : assignment.category?._id || "";
                      updateItem(`/api/admin/assignments/${assignment._id}`, {
                        title,
                        description,
                        startAt: toIsoDateTime(startAt),
                        deadline: toIsoDateTime(deadline),
                        theme,
                        group,
                        category,
                        type: assignment.type,
                      }, "Задание обновлено");
                    }}>Изменить</Button>
                    <Button size="sm" variant="outline" className="!border-red-200 !text-red-600 hover:!bg-red-50" onClick={(event) => {
                      event.stopPropagation();
                      deleteItem(`/api/admin/assignments/${assignment._id}`, "Задание удалено");
                    }}>Удалить</Button>
                  </div>
                </div>

                {assignment.type === "TEST" && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-700">Экзаменационные вопросы</p>
                    <p className="text-xs text-slate-500 mt-1">Вопросов: {(assignment.questions || []).length}</p>
                    {(assignment.questions || []).length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {(assignment.questions || []).slice(0, 2).map((question, index) => (
                          <p key={question._id || `${assignment._id}-preview-${index}`} className="text-xs text-slate-600 truncate">
                            {index + 1}. {question.text}
                          </p>
                        ))}
                        {(assignment.questions || []).length > 2 && (
                          <p className="text-xs text-slate-500">...и еще {(assignment.questions || []).length - 2} вопрос(а)</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2">Вопросы еще не добавлены</p>
                    )}
                  </div>
                )}

                {assignment.type === "DOCUMENT" && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">Файл задания</p>
                    {assignment.documentFile ? (
                      <a href={assignment.documentFile} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:text-primary-700 font-semibold">
                        Текущий файл задания
                      </a>
                    ) : (
                      <p className="text-xs text-slate-500">Файл еще не загружен</p>
                    )}
                    <input
                      type="file"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(e) => setDocumentFiles((prev) => ({ ...prev, [assignment._id]: e.target.files?.[0] || null }))}
                      className="block text-sm text-slate-700"
                    />
                    <Button size="sm" onClick={(event) => {
                      event.stopPropagation();
                      uploadDocument(assignment._id);
                    }}>Загрузить файл задания</Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {openedTestAssignment && (
            <div
              className="fixed inset-0 z-[70] bg-slate-900/45 backdrop-blur-sm"
              onClick={() => setOpenedTestAssignmentId(null)}
            >
              <div
                className="h-full w-full overflow-y-auto bg-slate-50"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
                  <div className="sticky top-0 z-10 -mx-2 sm:-mx-4 lg:-mx-6 mb-4 border-b border-slate-200 bg-slate-50/95 px-2 sm:px-4 lg:px-6 py-3 backdrop-blur">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg sm:text-2xl font-bold text-slate-900">{openedTestAssignment.title}</h3>
                        <p className="text-sm text-slate-600">{openedTestAssignment.description || "Без описания"}</p>
                        <p className="text-xs text-slate-500 mt-1">Полноэкранный редактор теста</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setOpenedTestAssignmentId(null)}>Закрыть</Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Конструктор теста</p>
                    {(testBuilders[openedTestAssignment._id] || [createEmptyQuestion()]).map((question, questionIndex) => (
                      <div key={`${openedTestAssignment._id}-q-${questionIndex}`} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">Вопрос {questionIndex + 1}</p>
                          <Button size="sm" variant="outline" className="!border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => removeQuestion(openedTestAssignment._id, questionIndex)}>
                            Удалить вопрос
                          </Button>
                        </div>

                        <input
                          className="input-base"
                          placeholder="Текст вопроса"
                          value={question.text}
                          onChange={(e) => setQuestionField(openedTestAssignment._id, questionIndex, "text", e.target.value)}
                        />

                        <input
                          className="input-base"
                          placeholder="Ссылка на изображение (необязательно)"
                          value={question.image || ""}
                          onChange={(e) => setQuestionField(openedTestAssignment._id, questionIndex, "image", e.target.value)}
                        />

                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={question.allowMultiple}
                            onChange={(e) => toggleAllowMultiple(openedTestAssignment._id, questionIndex, e.target.checked)}
                          />
                          Несколько правильных ответов
                        </label>

                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={`${openedTestAssignment._id}-q-${questionIndex}-o-${optionIndex}`} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                className="input-base flex-1"
                                placeholder={`Вариант ${optionIndex + 1}`}
                                value={option.text}
                                onChange={(e) => setOptionText(openedTestAssignment._id, questionIndex, optionIndex, e.target.value)}
                              />
                              <label className="inline-flex items-center gap-2 text-sm text-slate-700 whitespace-nowrap">
                                <input
                                  type={question.allowMultiple ? "checkbox" : "radio"}
                                  name={`${openedTestAssignment._id}-q-${questionIndex}-correct`}
                                  checked={option.isCorrect}
                                  onChange={(e) => toggleOptionCorrect(openedTestAssignment._id, questionIndex, optionIndex, e.target.checked)}
                                />
                                Верный
                              </label>
                              <Button
                                size="sm"
                                variant="outline"
                                className="!border-red-200 !text-red-600 hover:!bg-red-50"
                                onClick={() => removeOption(openedTestAssignment._id, questionIndex, optionIndex)}
                              >
                                Удалить
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button size="sm" variant="secondary" onClick={() => addOption(openedTestAssignment._id, questionIndex)}>
                          Добавить вариант
                        </Button>
                      </div>
                    ))}

                    <div className="flex flex-wrap gap-2 pt-1 pb-4">
                      <Button size="sm" variant="secondary" onClick={() => addQuestion(openedTestAssignment._id)}>Добавить вопрос</Button>
                      <Button size="sm" onClick={() => saveTestQuestions(openedTestAssignment._id)}>Сохранить тест</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "grades" && (
        <div className="space-y-4">
          {grades.map((row) => (
            <div key={row._id} className="card p-5 space-y-3">
              <div>
                <h4 className="font-bold text-slate-900">{row.assignment?.title || "Задание"}</h4>
                <p className="text-sm text-slate-600">{row.student?.fullName || row.student?.username || "Студент"} · Попытка {row.attempt}</p>
                <p className="text-xs text-slate-500">Статус: {row.status} · Текущий балл: {row.finalScore ?? 0}</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  className="input-base max-w-[140px]"
                  type="number"
                  min="0"
                  max="100"
                  value={scoreInputs[row._id] ?? ""}
                  onChange={(e) => setScoreInputs((prev) => ({ ...prev, [row._id]: e.target.value }))}
                />
                <Button size="sm" onClick={() => saveGrade(row._id)}>Сохранить оценку</Button>
                {row.assignment?.type === "TEST" && <Button size="sm" variant="secondary" onClick={() => recalcGrade(row._id)}>Пересчитать</Button>}
                {row.assignment?._id && row.student?._id && (
                  <Button size="sm" variant="outline" onClick={() => createRetake(row.assignment!._id, row.student!._id)}>Назначить повтор</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "students" && (
        <div className="space-y-4">
          {studentUsers.map((user) => (
            <div key={user._id} className="card p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h4 className="font-bold text-slate-900">{user.fullName || user.username}</h4>
                <p className="text-sm text-slate-600">{user.username}{user.email ? ` · ${user.email}` : ""}</p>
                <p className="text-xs text-slate-500">Текущая группа: {typeof user.group === "string" ? user.group : user.group?.name || "не назначена"}</p>
              </div>
              <div className="w-full max-w-[300px]">
                <SelectMenu
                  value={typeof user.group === "string" ? user.group : user.group?._id || ""}
                  options={[{ value: "", label: "Без группы" }, ...groups.map((group) => ({ value: group._id, label: group.name }))]}
                  onChange={(value) => updateItem(`/api/admin/users/${user._id}`, { group: value || null }, "Группа назначена")}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
