import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import SelectMenu from "../components/ui/select-menu";

type Course = { _id: string; title: string; description?: string };
type Theme = { _id: string; title: string; description?: string };
type AssignmentListItem = {
  _id: string;
  title: string;
  description?: string;
  type: "TEST" | "DOCUMENT";
  status: string;
  deadline: string;
  startAt: string;
  maxScore: number;
  documentFile?: string;
  category?: { name: string };
  latestSubmission?: {
    _id: string;
    status: string;
    attempt: number;
    finalScore?: number;
  } | null;
};
type AssignmentDetail = {
  _id: string;
  title: string;
  description?: string;
  type: "TEST" | "DOCUMENT";
  startAt: string;
  deadline: string;
  maxScore: number;
  documentFile?: string;
  questions?: Array<{
    _id: string;
    text: string;
    allowMultiple?: boolean;
    options: Array<{ text: string }>;
  }>;
  category?: { name: string };
  theme?: { title: string };
  group?: { name: string };
};

type AnswerState = Record<string, number[]>;

export default function LmsStudent() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [courses, setCourses] = useState<Course[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [assignmentDetail, setAssignmentDetail] = useState<AssignmentDetail | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [working, setWorking] = useState(false);

  const selectedAssignmentSummary = useMemo(
    () => assignments.find((item) => item._id === selectedAssignmentId) || null,
    [assignments, selectedAssignmentId]
  );

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchCourses = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch("/api/student/courses", { headers: authHeaders });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка загрузки курсов");
      setCourses(data);
      const firstCourseId = data[0]?._id || "";
      setSelectedCourseId(firstCourseId);
      if (firstCourseId) {
        await fetchThemes(firstCourseId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки курсов");
    } finally {
      setLoading(false);
    }
  };

  const fetchThemes = async (courseId: string) => {
    if (!token || !courseId) return;
    try {
      const response = await fetch(`/api/student/courses/${courseId}/themes`, { headers: authHeaders });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка загрузки тем");
      setThemes(data);
      const firstThemeId = data[0]?._id || "";
      setSelectedThemeId(firstThemeId);
      setAssignments([]);
      setSelectedAssignmentId("");
      setAssignmentDetail(null);
      if (firstThemeId) {
        await fetchAssignments(firstThemeId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки тем");
    }
  };

  const fetchAssignments = async (themeId: string) => {
    if (!token || !themeId) return;
    try {
      const response = await fetch(`/api/student/themes/${themeId}/assignments`, { headers: authHeaders });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка загрузки заданий");
      setAssignments(data);
      const firstAssignmentId = data[0]?._id || "";
      setSelectedAssignmentId(firstAssignmentId);
      if (firstAssignmentId) {
        await fetchAssignmentDetails(firstAssignmentId);
      } else {
        setAssignmentDetail(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки заданий");
    }
  };

  const fetchAssignmentDetails = async (assignmentId: string) => {
    if (!token || !assignmentId) return;
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/student/assignments/${assignmentId}`, { headers: authHeaders });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка загрузки задания");
      setAssignmentDetail(data);
      setAnswers({});
      setDocumentFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки задания");
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchCourses();
  }, [token]);

  const handleStart = async () => {
    if (!selectedAssignmentId) return;
    setWorking(true);
    try {
      const response = await fetch(`/api/student/assignments/${selectedAssignmentId}/start`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось начать задание");
      toast.success(data.message || "Попытка начата");
      await fetchAssignments(selectedThemeId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка запуска задания");
    } finally {
      setWorking(false);
    }
  };

  const handleSingleChoice = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionIndex] }));
  };

  const handleMultipleChoice = (questionId: string, optionIndex: number, checked: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      return {
        ...prev,
        [questionId]: checked ? [...current, optionIndex] : current.filter((index) => index !== optionIndex),
      };
    });
  };

  const handleSubmitTest = async () => {
    if (!assignmentDetail) return;
    const preparedAnswers = (assignmentDetail.questions || []).map((question) => ({
      questionId: question._id,
      optionIndexes: answers[question._id] || [],
    }));

    setWorking(true);
    try {
      const response = await fetch(`/api/student/assignments/${assignmentDetail._id}/test-submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ answers: preparedAnswers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось отправить тест");
      toast.success(`Тест отправлен. Балл: ${data.submission.finalScore}`);
      await fetchAssignments(selectedThemeId);
      await fetchAssignmentDetails(assignmentDetail._id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка отправки теста");
    } finally {
      setWorking(false);
    }
  };

  const handleDocumentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDocumentFile(event.target.files?.[0] || null);
  };

  const handleSubmitDocument = async () => {
    if (!assignmentDetail || !documentFile) {
      toast.error("Выберите файл ответа");
      return;
    }

    setWorking(true);
    try {
      const formData = new FormData();
      formData.append("file", documentFile);
      const response = await fetch(`/api/student/assignments/${assignmentDetail._id}/document-submit`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось отправить документ");
      toast.success("Файл ответа отправлен");
      await fetchAssignments(selectedThemeId);
      await fetchAssignmentDetails(assignmentDetail._id);
      setDocumentFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка отправки файла");
    } finally {
      setWorking(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-slate-600">Войдите, чтобы открыть LMS.</p>
      </div>
    );
  }

  if (user.role !== "student") {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-slate-600">Раздел LMS для студентов.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">LMS студента</h1>
          <p className="mt-2 text-slate-600">Курсы, темы, задания, тесты и сдача работ в одном месте.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="card p-6">
            <p className="text-slate-600">У вас пока нет курса или не назначена учебная группа. Администратор должен назначить вас в группу.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <aside className="xl:col-span-4 space-y-5">
              <div className="card p-5 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">Курсы</h2>
                <SelectMenu
                  value={selectedCourseId}
                  options={courses.map((course) => ({ value: course._id, label: course.title }))}
                  onChange={async (value) => {
                    setSelectedCourseId(value);
                    await fetchThemes(value);
                  }}
                />
                <p className="text-sm text-slate-600">{courses.find((course) => course._id === selectedCourseId)?.description || ""}</p>
              </div>

              <div className="card p-5 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">Темы</h2>
                <div className="space-y-2">
                  {themes.map((theme) => (
                    <button
                      key={theme._id}
                      className={`w-full rounded-xl px-4 py-3 text-left transition-colors ${selectedThemeId === theme._id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                      onClick={async () => {
                        setSelectedThemeId(theme._id);
                        await fetchAssignments(theme._id);
                      }}
                    >
                      <p className="font-semibold">{theme.title}</p>
                      {theme.description && <p className={`text-xs mt-1 ${selectedThemeId === theme._id ? "text-slate-300" : "text-slate-500"}`}>{theme.description}</p>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card p-5 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">Задания и тесты</h2>
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {assignments.length === 0 && <p className="text-sm text-slate-500">По теме пока нет активных заданий</p>}
                  {assignments.map((assignment) => (
                    <button
                      key={assignment._id}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${selectedAssignmentId === assignment._id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-800"}`}
                      onClick={async () => {
                        setSelectedAssignmentId(assignment._id);
                        await fetchAssignmentDetails(assignment._id);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{assignment.title}</p>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${selectedAssignmentId === assignment._id ? "bg-white/15 text-white" : "bg-slate-200 text-slate-700"}`}>{assignment.type}</span>
                      </div>
                      <p className={`text-xs mt-1 ${selectedAssignmentId === assignment._id ? "text-slate-300" : "text-slate-500"}`}>Статус: {assignment.status}</p>
                      <p className={`text-xs ${selectedAssignmentId === assignment._id ? "text-slate-300" : "text-slate-500"}`}>Дедлайн: {new Date(assignment.deadline).toLocaleString("ru-RU")}</p>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section className="xl:col-span-8">
              <div className="card p-6 sm:p-8 min-h-[600px]">
                {detailsLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !assignmentDetail || !selectedAssignmentSummary ? (
                  <p className="text-slate-500">Выберите задание слева.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h2 className="text-2xl font-bold text-slate-900">{assignmentDetail.title}</h2>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{assignmentDetail.type}</span>
                        </div>
                        <p className="text-slate-600">{assignmentDetail.description || "Без описания"}</p>
                        <p className="text-sm text-slate-500 mt-3">Категория: {assignmentDetail.category?.name || "-"}</p>
                        <p className="text-sm text-slate-500">Тема: {assignmentDetail.theme?.title || "-"}</p>
                        <p className="text-sm text-slate-500">Статус: {selectedAssignmentSummary.status}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 min-w-[220px]">
                        <p className="text-sm text-slate-500">Максимум баллов</p>
                        <p className="text-2xl font-bold text-slate-900">{assignmentDetail.maxScore}</p>
                        <p className="text-xs text-slate-500 mt-2">Начало: {new Date(assignmentDetail.startAt).toLocaleString("ru-RU")}</p>
                        <p className="text-xs text-slate-500">Дедлайн: {new Date(assignmentDetail.deadline).toLocaleString("ru-RU")}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleStart}
                        disabled={working || selectedAssignmentSummary.status === "выполнено" || selectedAssignmentSummary.status === "просрочено"}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {working ? "..." : "Начать попытку"}
                      </button>
                      {selectedAssignmentSummary.latestSubmission && (
                        <span className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-700 font-medium">
                          Последняя попытка: {selectedAssignmentSummary.latestSubmission.attempt}
                          {selectedAssignmentSummary.latestSubmission.finalScore !== undefined ? ` · Балл: ${selectedAssignmentSummary.latestSubmission.finalScore}` : ""}
                        </span>
                      )}
                    </div>

                    {assignmentDetail.type === "TEST" && (
                      <div className="space-y-5">
                        {(assignmentDetail.questions || []).map((question, questionIndex) => (
                          <div key={question._id} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3">
                            <h3 className="font-bold text-slate-900">{questionIndex + 1}. {question.text}</h3>
                            <div className="space-y-2">
                              {question.options.map((option, optionIndex) => {
                                const selected = (answers[question._id] || []).includes(optionIndex);
                                return (
                                  <label key={optionIndex} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 border border-slate-100 cursor-pointer hover:border-slate-200">
                                    <input
                                      type={question.allowMultiple ? "checkbox" : "radio"}
                                      name={question._id}
                                      checked={selected}
                                      onChange={(event) => {
                                        if (question.allowMultiple) {
                                          handleMultipleChoice(question._id, optionIndex, event.target.checked);
                                        } else {
                                          handleSingleChoice(question._id, optionIndex);
                                        }
                                      }}
                                    />
                                    <span className="text-slate-800">{option.text}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={handleSubmitTest}
                          disabled={working}
                          className="px-5 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-50"
                        >
                          {working ? "Отправка..." : "Отправить тест"}
                        </button>
                      </div>
                    )}

                    {assignmentDetail.type === "DOCUMENT" && (
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                          <h3 className="font-bold text-slate-900 mb-2">Файл задания</h3>
                          {assignmentDetail.documentFile ? (
                            <a href={assignmentDetail.documentFile} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700 font-semibold">
                              Скачать задание
                            </a>
                          ) : (
                            <p className="text-slate-500">Файл задания пока не загружен.</p>
                          )}
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3">
                          <h3 className="font-bold text-slate-900">Загрузить ответ</h3>
                          <input type="file" onChange={handleDocumentChange} className="block text-sm text-slate-700" />
                          <button
                            type="button"
                            onClick={handleSubmitDocument}
                            disabled={working || !documentFile}
                            className="px-5 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-50"
                          >
                            {working ? "Отправка..." : "Отправить файл"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
