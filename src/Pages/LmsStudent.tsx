import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import SelectMenu from "../components/ui/select-menu";

const DESKTOP_BREAKPOINT = "(min-width: 1024px)";

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

type GradeRow = {
  _id: string;
  attempt: number;
  status: string;
  autoScore?: number;
  manualScore?: number;
  finalScore?: number;
  submittedAt?: string;
  gradedAt?: string;
  assignment?: {
    title: string;
    type: string;
    deadline?: string;
    maxScore: number;
  };
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
  const [activeTab, setActiveTab] = useState<"tasks" | "grades">("tasks");
  const [assignmentDetail, setAssignmentDetail] = useState<AssignmentDetail | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [enteredAttemptView, setEnteredAttemptView] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(DESKTOP_BREAKPOINT).matches;
  });

  const selectedAssignmentSummary = useMemo(
    () => assignments.find((item) => item._id === selectedAssignmentId) || null,
    [assignments, selectedAssignmentId]
  );
  const isAttemptActive = selectedAssignmentSummary?.status === "в процессе";
  const testQuestions = assignmentDetail?.questions || [];
  const isFocusTestView = assignmentDetail?.type === "TEST" && isAttemptActive && enteredAttemptView;
  const showAssignmentWorkspace = isDesktop || enteredAttemptView;
  const answeredQuestionsCount = useMemo(
    () => testQuestions.filter((question) => (answers[question._id] || []).length > 0).length,
    [testQuestions, answers]
  );
  const progressPercent = testQuestions.length > 0 ? Math.round((answeredQuestionsCount / testQuestions.length) * 100) : 0;

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

  const fetchGrades = async () => {
    if (!token) return;
    try {
      const response = await fetch("/api/student/grades", { headers: authHeaders });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка загрузки оценок");
      setGrades(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки оценок");
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
      setSelectedAssignmentId("");
      setAssignmentDetail(null);
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
    fetchGrades();
  }, [token]);

  useEffect(() => {
    setCurrentQuestionIndex(0);
  }, [selectedAssignmentId]);

  useEffect(() => {
    if (!selectedAssignmentId) {
      setEnteredAttemptView(false);
    }
  }, [selectedAssignmentId]);

  useEffect(() => {
    if (!isAttemptActive) {
      setCurrentQuestionIndex(0);
    }
  }, [isAttemptActive]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setIsAssignmentModalOpen(false);
      }
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isAssignmentModalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isAssignmentModalOpen]);

  const handleStart = async () => {
    if (!selectedAssignmentId) return;
    const startedAssignmentId = selectedAssignmentId;

    if (selectedAssignmentSummary?.status === "в процессе") {
      setEnteredAttemptView(true);
      if (!isDesktop) {
        setIsAssignmentModalOpen(false);
      }
      return;
    }

    setWorking(true);
    try {
      const response = await fetch(`/api/student/assignments/${selectedAssignmentId}/start`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось начать задание");
      toast.success(data.message || "Попытка начата");
      setEnteredAttemptView(true);
      if (!isDesktop) {
        setIsAssignmentModalOpen(false);
      }
      await fetchAssignments(selectedThemeId);
      setSelectedAssignmentId(startedAssignmentId);
      await fetchAssignmentDetails(startedAssignmentId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка запуска задания");
    } finally {
      setWorking(false);
    }
  };

  const handleSingleChoice = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionIndex] }));
  };

  const autoAdvanceToNextQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, testQuestions.length - 1));
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
      toast.success(`Тест отправлен. Результат: ${data.submission.finalScore ?? 0}%`);
      await fetchAssignments(selectedThemeId);
      await fetchAssignmentDetails(assignmentDetail._id);
      await fetchGrades();
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
      await fetchGrades();
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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-10 space-y-5 sm:space-y-6 page-entrance">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">LMS студента</h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">Курсы, темы, задания, тесты и сдача работ в одном месте.</p>
        </div>

        <div className="glass-panel p-1.5 inline-flex flex-wrap gap-1 border-b-0">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "tasks" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Задания и тесты
          </button>
          <button
            onClick={() => setActiveTab("grades")}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "grades" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Мои оценки
          </button>
        </div>

        {activeTab === "grades" ? (
          <div className="space-y-4">
            {grades.length === 0 ? (
              <div className="card p-6">
                <p className="text-slate-600">У вас пока нет оценок.</p>
              </div>
            ) : (
              grades.map((row) => (
                <div key={row._id} className="card p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-slate-900">{row.assignment?.title || "Задание"}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{row.assignment?.type || "-"}</span>
                    </div>
                    <p className="text-sm text-slate-600">Попытка {row.attempt} · Статус: {row.status}</p>
                    <p className="text-xs text-slate-500">Дедлайн: {row.assignment?.deadline ? new Date(row.assignment.deadline).toLocaleString("ru-RU") : "-"}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 min-w-[120px]">
                      <p className="text-xs text-slate-500">Авто</p>
                      <p className="text-lg font-bold text-slate-900">{row.autoScore ?? 0}%</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 min-w-[120px]">
                      <p className="text-xs text-slate-500">Ручная</p>
                      <p className="text-lg font-bold text-slate-900">{row.manualScore !== undefined ? `${row.manualScore}%` : "-"}</p>
                    </div>
                    <div className="rounded-xl bg-primary-50 border border-primary-100 px-4 py-3 min-w-[140px]">
                      <p className="text-xs text-primary-700">Итог</p>
                      <p className="text-2xl font-bold text-primary-700">{row.finalScore ?? 0}%</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="card p-6">
            <p className="text-slate-600">У вас пока нет курса или не назначена учебная группа. Администратор должен назначить вас в группу.</p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${isFocusTestView ? "xl:grid-cols-1" : "xl:grid-cols-12"}`}>
            {!isFocusTestView && (
            <aside className="xl:col-span-4 space-y-4 sm:space-y-5 xl:sticky xl:top-24 xl:self-start">
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
                <div className="space-y-2 max-h-[260px] sm:max-h-[420px] overflow-y-auto pr-1">
                  {assignments.length === 0 && <p className="text-sm text-slate-500">По теме пока нет активных заданий</p>}
                  {assignments.map((assignment) => (
                    <button
                      key={assignment._id}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${selectedAssignmentId === assignment._id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-800"}`}
                      onClick={async () => {
                        setEnteredAttemptView(false);
                        setSelectedAssignmentId(assignment._id);
                        if (!isDesktop) {
                          setIsAssignmentModalOpen(true);
                        }
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
            )}

            {showAssignmentWorkspace && (
            <section className={isFocusTestView ? "xl:col-span-1" : "xl:col-span-8"}>
              <div className="card p-4 sm:p-8 min-h-[420px] sm:min-h-[600px]">
                {detailsLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !selectedAssignmentId ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-center px-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <p className="font-semibold text-slate-700">Выберите задание</p>
                    <p className="text-sm text-slate-500 max-w-xs">Нажмите на любое задание или тест из списка слева, чтобы открыть его и начать выполнение.</p>
                  </div>
                ) : !assignmentDetail || !selectedAssignmentSummary ? (
                  <p className="text-slate-500">Загрузка...</p>
                ) : (
                  <div className="space-y-6">
                    {!isFocusTestView && (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{assignmentDetail.title}</h2>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{assignmentDetail.type}</span>
                        </div>
                        <p className="text-slate-600">{assignmentDetail.description || "Без описания"}</p>
                        <p className="text-sm text-slate-500 mt-3">Категория: {assignmentDetail.category?.name || "-"}</p>
                        <p className="text-sm text-slate-500">Тема: {assignmentDetail.theme?.title || "-"}</p>
                        <p className="text-sm text-slate-500">Статус: {selectedAssignmentSummary.status}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 w-full sm:w-auto sm:min-w-[220px]">
                        <p className="text-sm text-slate-500">Максимум</p>
                        <p className="text-2xl font-bold text-slate-900">{assignmentDetail.maxScore}%</p>
                        <p className="text-xs text-slate-500 mt-2">Начало: {new Date(assignmentDetail.startAt).toLocaleString("ru-RU")}</p>
                        <p className="text-xs text-slate-500">Дедлайн: {new Date(assignmentDetail.deadline).toLocaleString("ru-RU")}</p>
                      </div>
                    </div>
                    )}

                    {!isFocusTestView && (
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={handleStart}
                          disabled={working || selectedAssignmentSummary.status === "выполнено" || selectedAssignmentSummary.status === "просрочено"}
                          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold transition-colors ${isDesktop ? "bg-slate-900 text-white hover:bg-slate-800" : "hidden"} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {working ? "..." : selectedAssignmentSummary.status === "в процессе" ? "Продолжить задание" : "Начать задание"}
                        </button>
                        {selectedAssignmentSummary.latestSubmission && (
                          <span className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-700 font-medium w-full sm:w-auto">
                            Последняя попытка: {selectedAssignmentSummary.latestSubmission.attempt}
                            {selectedAssignmentSummary.latestSubmission.finalScore !== undefined ? ` · Результат: ${selectedAssignmentSummary.latestSubmission.finalScore}%` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    )}

                    {assignmentDetail.type === "TEST" && (
                      <div className="space-y-5">
                        {!isAttemptActive ? (
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                            <h3 className="font-bold text-slate-900 mb-2">Тест не развернут</h3>
                            <p className="text-sm text-slate-600">
                              Нажмите кнопку "Начать попытку", чтобы открыть вопросы теста и приступить к выполнению.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="glass-panel border border-slate-200/70 p-4 sm:p-5 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-700">Прогресс теста</p>
                                  <p className="text-sm text-slate-500">
                                    Ответов: {answeredQuestionsCount} из {testQuestions.length}
                                  </p>
                                </div>
                              </div>
                              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 ease-out"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <p className="text-xs text-slate-500">Выполнено: {progressPercent}%</p>
                            </div>

                            {testQuestions.length === 0 ? (
                              <p className="text-sm text-slate-500">В этом тесте пока нет вопросов.</p>
                            ) : (
                              <>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-6 space-y-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-slate-600">Вопрос {currentQuestionIndex + 1} из {testQuestions.length}</p>
                                    <span className="rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                      {(answers[testQuestions[currentQuestionIndex]?._id] || []).length > 0 ? "Ответ выбран" : "Ожидает ответ"}
                                    </span>
                                  </div>

                                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 ease-out"
                                      style={{ width: `${((currentQuestionIndex + 1) / testQuestions.length) * 100}%` }}
                                    />
                                  </div>

                                  <p className="text-xs text-slate-500">
                                    Автопереход включен для вопросов с одним правильным ответом.
                                  </p>

                                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                                    {currentQuestionIndex + 1}. {testQuestions[currentQuestionIndex]?.text}
                                  </h3>

                                  <div className="space-y-2">
                                    {(testQuestions[currentQuestionIndex]?.options || []).map((option, optionIndex) => {
                                      const question = testQuestions[currentQuestionIndex];
                                      const selected = (answers[question._id] || []).includes(optionIndex);
                                      return (
                                        <label key={optionIndex} className={`answer-option ${selected ? "is-selected" : ""}`}>
                                          <input
                                            type={question.allowMultiple ? "checkbox" : "radio"}
                                            name={question._id}
                                            checked={selected}
                                            className="sr-only"
                                            onChange={(event) => {
                                              if (question.allowMultiple) {
                                                handleMultipleChoice(question._id, optionIndex, event.target.checked);
                                              } else {
                                                handleSingleChoice(question._id, optionIndex);
                                                if (currentQuestionIndex < testQuestions.length - 1) {
                                                  setTimeout(() => {
                                                    autoAdvanceToNextQuestion();
                                                  }, 180);
                                                }
                                              }
                                            }}
                                          />
                                          <span className={`answer-option-control ${question.allowMultiple ? "checkbox" : "radio"}`} aria-hidden>
                                            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              <path d="M5 10.5L8.5 14L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                          </span>
                                          <span className="text-slate-800">{option.text}</span>
                                        </label>
                                      );
                                    })}
                                  </div>

                                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                                    <button
                                      type="button"
                                      disabled={currentQuestionIndex === 0}
                                      onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}
                                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
                                    >
                                      Предыдущий
                                    </button>
                                    <button
                                      type="button"
                                      disabled={currentQuestionIndex === testQuestions.length - 1}
                                      onClick={() => setCurrentQuestionIndex((prev) => Math.min(prev + 1, testQuestions.length - 1))}
                                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
                                    >
                                      Следующий
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={handleSubmitTest}
                              disabled={working}
                              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-50"
                            >
                              {working ? "Отправка..." : "Отправить тест"}
                            </button>
                          </>
                        )}
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
                            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-50"
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
            )}
          </div>
        )}

        {!isDesktop && isAssignmentModalOpen && selectedAssignmentSummary && (
          <div
            className="fixed inset-0 z-[90] flex items-end bg-slate-950/40"
            onClick={() => setIsAssignmentModalOpen(false)}
          >
            <div
              className="w-full rounded-t-3xl bg-white px-5 pt-4 pb-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-slate-200" />

              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-xl font-bold text-slate-900 leading-tight">{selectedAssignmentSummary.title}</h3>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{selectedAssignmentSummary.type}</span>
              </div>

              {selectedAssignmentSummary.description && (
                <p className="text-sm text-slate-500 mb-3">{selectedAssignmentSummary.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-5">
                {assignmentDetail?.category?.name && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">{assignmentDetail.category.name}</span>
                )}
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  selectedAssignmentSummary.status === "в процессе" ? "bg-amber-50 text-amber-600" :
                  selectedAssignmentSummary.status === "выполнено" ? "bg-green-50 text-green-600" :
                  selectedAssignmentSummary.status === "просрочено" ? "bg-red-50 text-red-500" :
                  "bg-slate-100 text-slate-500"
                }`}>{selectedAssignmentSummary.status}</span>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Максимум</p>
                  <p className="text-3xl font-bold text-slate-900">{assignmentDetail?.maxScore ?? selectedAssignmentSummary.maxScore}%</p>
                </div>
                <div className="text-right text-xs text-slate-400 space-y-1">
                  <p>Начало<br /><span className="text-slate-600 font-medium">{new Date(assignmentDetail?.startAt || selectedAssignmentSummary.startAt).toLocaleDateString("ru-RU")}</span></p>
                  <p>Дедлайн<br /><span className="text-slate-600 font-medium">{new Date(assignmentDetail?.deadline || selectedAssignmentSummary.deadline).toLocaleDateString("ru-RU")}</span></p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStart}
                disabled={working || selectedAssignmentSummary.status === "выполнено" || selectedAssignmentSummary.status === "просрочено"}
                className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-base hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed mb-2"
              >
                {working ? "..." : selectedAssignmentSummary.status === "в процессе" ? "Продолжить попытку" : "Начать попытку"}
              </button>
              <button
                type="button"
                onClick={() => setIsAssignmentModalOpen(false)}
                className="w-full py-2.5 rounded-2xl text-slate-400 font-medium text-sm hover:text-slate-600"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
