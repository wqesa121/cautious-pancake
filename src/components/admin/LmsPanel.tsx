import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "../ui/button";
import SelectMenu from "../ui/select-menu";

type Course = { _id: string; title: string; description?: string };
type Group = { _id: string; name: string; course?: { _id: string; title: string } | string };
type Teacher = { _id: string; fullName?: string; username: string };
type Theme = {
  _id: string;
  title: string;
  description?: string;
  course?: { _id: string; title: string } | string;
  teacher?: { _id: string; fullName?: string; username: string } | string | null;
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
type DashboardData = {
  studentsLastLogin: Array<{ _id: string; fullName: string; username: string; lastLogin?: string; group?: { name: string } | string }>;
  completedAssignments: number;
  overdueAssignments: number;
  averageScore: number;
  groupStats: Array<{ groupId: string; groupName: string; studentsCount: number; averageScore: number }>;
};

interface LmsPanelProps {
  token: string | null;
  setError: (error: string | null) => void;
}

export default function LmsPanel({ token, setError }: LmsPanelProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "courses" | "groups" | "themes" | "categories" | "students">("dashboard");
  const [loading, setLoading] = useState(true);

  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [courseForm, setCourseForm] = useState({ title: "", description: "" });
  const [groupForm, setGroupForm] = useState({ name: "", course: "" });
  const [themeForm, setThemeForm] = useState({ title: "", description: "", course: "", teacher: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "" });

  const studentUsers = useMemo(() => users.filter((user) => user.role === "student"), [users]);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchAll = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const [coursesRes, groupsRes, themesRes, categoriesRes, usersRes, teachersRes, dashboardRes] = await Promise.all([
        fetch("/api/admin/courses", { headers: authHeaders }),
        fetch("/api/admin/groups", { headers: authHeaders }),
        fetch("/api/admin/themes", { headers: authHeaders }),
        fetch("/api/admin/categories", { headers: authHeaders }),
        fetch("/api/admin/users", { headers: authHeaders }),
        fetch("/api/admin/teachers", { headers: authHeaders }),
        fetch("/api/admin/dashboard-lms", { headers: authHeaders }),
      ]);

      const responses = [coursesRes, groupsRes, themesRes, categoriesRes, usersRes, teachersRes, dashboardRes];
      for (const response of responses) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setError("Сессия истекла. Пожалуйста, войдите заново.");
          return;
        }
      }

      const [coursesData, groupsData, themesData, categoriesData, usersData, teachersData, dashboardData] = await Promise.all(
        responses.map((response) => response.json())
      );

      setCourses(coursesData);
      setGroups(groupsData);
      setThemes(themesData);
      setCategories(categoriesData);
      setUsers(usersData);
      setTeachers(teachersData);
      setDashboard(dashboardData);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Ошибка загрузки LMS данных");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [token]);

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

  const tabs = [
    { id: "dashboard", label: "LMS Dashboard" },
    { id: "courses", label: "Курсы" },
    { id: "groups", label: "Группы" },
    { id: "themes", label: "Темы + преподаватели" },
    { id: "categories", label: "Категории" },
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
        Админ управляет структурой LMS и привязками. Задания и оценки ведёт преподаватель в разделе "Мой LMS" (маршрут: /teacher-lms).
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
                <Button size="sm" variant="outline" className="!border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => deleteItem(`/api/admin/groups/${group._id}`, "Группа удалена")}>Удалить</Button>
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
            <SelectMenu
              value={themeForm.teacher}
              options={[{ value: "", label: "Преподаватель не назначен" }, ...teachers.map((teacher) => ({ value: teacher._id, label: teacher.fullName || teacher.username }))]}
              onChange={(value) => setThemeForm((prev) => ({ ...prev, teacher: value }))}
            />
            <Button onClick={() => createItem("/api/admin/themes", themeForm, "Тема создана", () => setThemeForm({ title: "", description: "", course: "", teacher: "" }))}>Создать тему</Button>
          </div>
          <div className="space-y-3">
            {themes.map((theme) => (
              <div key={theme._id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900">{theme.title}</h4>
                    <p className="text-sm text-slate-600">{theme.description || "Без описания"}</p>
                    <p className="text-xs text-slate-500">Курс: {typeof theme.course === "string" ? theme.course : theme.course?.title || "-"}</p>
                    <p className="text-xs text-slate-500">Преподаватель: {typeof theme.teacher === "string" ? theme.teacher : theme.teacher?.fullName || theme.teacher?.username || "не назначен"}</p>
                  </div>
                </div>
                <div className="mt-3 max-w-[260px]">
                  <SelectMenu
                    value={typeof theme.teacher === "string" ? theme.teacher : theme.teacher?._id || ""}
                    options={[{ value: "", label: "Без преподавателя" }, ...teachers.map((teacher) => ({ value: teacher._id, label: teacher.fullName || teacher.username }))]}
                    onChange={(value) => updateItem(`/api/admin/themes/${theme._id}`, { teacher: value || null }, "Преподаватель темы обновлён")}
                  />
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
                <Button size="sm" variant="outline" className="!border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => deleteItem(`/api/admin/categories/${category._id}`, "Категория удалена")}>Удалить</Button>
              </div>
            ))}
          </div>
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
