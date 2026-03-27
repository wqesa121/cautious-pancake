import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Circle {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  maxPlaces: number;
  currentPlaces: number;
  price: number;
  schedule?: string;
  imageUrl?: string;
}

export default function CirclesList() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCircles = async () => {
      try {
        const res = await fetch("/api/circles");
        if (!res.ok) {
          throw new Error("Не удалось загрузить список кружков");
        }
        const data = await res.json();
        setCircles(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Ошибка сервера");
      } finally {
        setLoading(false);
      }
    };

    fetchCircles();
  }, []);

  const categories = Array.from(
    new Set(circles.map((c) => c.category?.trim()).filter(Boolean) as string[])
  ).sort();
  const filteredCircles = categoryFilter
    ? circles.filter((c) => (c.category?.trim() || "") === categoryFilter)
    : circles;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <p className="text-red-600 text-lg font-medium text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-slate-50 pt-16 pb-20 sm:pt-20 sm:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.12),transparent)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight animate-fade-in">
            Кружки и секции
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto animate-slide-up">
            Выберите направление и запишитесь на занятие. Спорт, творчество, языки и многое другое.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10 animate-slide-up">
            <button
              onClick={() => setCategoryFilter("")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                !categoryFilter
                  ? "bg-slate-900 text-white shadow-soft"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Все
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  categoryFilter === cat
                    ? "bg-slate-900 text-white shadow-soft"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {circles.length === 0 ? (
          <div className="text-center py-20 text-slate-600 text-lg font-medium">
            Пока нет доступных кружков. Скоро появятся!
          </div>
        ) : filteredCircles.length === 0 ? (
          <div className="text-center py-20 text-slate-600 text-lg font-medium">
            В выбранной категории нет кружков.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredCircles.map((circle, i) => (
              <article
                key={circle._id}
                className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-soft hover:shadow-soft-lg hover:-translate-y-1 hover:border-slate-200 transition-all duration-300 flex flex-col animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="relative min-h-[120px] flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 px-4 py-6">
                  <h2 className="text-xl font-bold text-slate-900 text-center line-clamp-2">
                    {circle.title}
                  </h2>
                  {circle.category && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 border border-slate-200 text-xs font-semibold text-slate-700">
                      {circle.category}
                    </span>
                  )}
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-xs font-semibold">
                    {circle.currentPlaces} / {circle.maxPlaces} мест
                  </div>
                </div>

                <div className="p-5 sm:p-6 flex flex-col flex-grow">

                  <p className="text-slate-600 text-sm line-clamp-3 flex-grow mb-4">
                    {circle.description || "Без описания"}
                  </p>

                  <div className="flex items-center justify-between gap-3 mb-5 text-sm">
                    <span className="text-slate-500">
                      {circle.schedule || "—"}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {circle.price > 0 ? `${circle.price} ₸` : "Бесплатно"}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/circle/${circle._id}`)}
                    className="mt-auto w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all duration-200 shadow-soft"
                  >
                    Подробнее
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
