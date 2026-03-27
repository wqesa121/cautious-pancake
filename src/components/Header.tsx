import { Link, useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";
  const isTeacher = user.role === "teacher";
  const isStudent = user.role === "student";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navLink =
    "text-slate-600 hover:text-slate-900 font-medium transition-colors duration-200";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        <Link
          to="/"
          className="text-xl font-bold text-slate-900 tracking-tight hover:text-primary-600 transition-colors"
        >
          Student LMS
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {token ? (
            <>
              <Link to="/" className={`px-3 py-2 rounded-lg ${navLink}`}>
                Главная
              </Link>
              <Link
                to="/my-enrollments"
                className={`px-3 py-2 rounded-lg ${navLink}`}
              >
                Мои записи
              </Link>
              {isStudent && (
                <>
                  <Link
                    to="/lms"
                    className={`px-3 py-2 rounded-lg ${navLink}`}
                  >
                    LMS
                  </Link>
                  <Link
                    to="/grades"
                    className={`px-3 py-2 rounded-lg ${navLink}`}
                  >
                    Оценки
                  </Link>
                </>
              )}
              {isTeacher && (
                <Link
                  to="/teacher-lms"
                  className="px-3 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 font-semibold transition-colors duration-200"
                >
                  Мой LMS
                </Link>
              )}
              {(isTeacher || isAdmin) && (
                <Link
                  to="/my-circles"
                  className={`px-3 py-2 rounded-lg ${navLink}`}
                >
                  Мои кружки
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-3 py-2 rounded-lg text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Админ
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`px-3 py-2 rounded-lg ${navLink}`}
              >
                Войти
              </Link>
              <Link
                to="/register"
                className="ml-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all duration-200 shadow-soft"
              >
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
