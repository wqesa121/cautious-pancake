import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";
  const isStudent = user.role === "student";
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navLink =
    "text-slate-600 hover:text-slate-900 font-medium transition-colors duration-200";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-2">
        <Link
          to="/"
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          <img
            src="/logo.png"
            alt="Student LMS"
            className="h-8 sm:h-10 w-auto object-contain"
          />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto max-w-full">
          {token ? (
            <>
              {isStudent && (
                <Link
                  to="/lms"
                  className={`px-3 py-2 rounded-lg whitespace-nowrap ${navLink}`}
                >
                  LMS
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-3 py-2 rounded-lg whitespace-nowrap text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Админ
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 sm:ml-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 whitespace-nowrap"
              >
                Выйти
              </button>
            </>
          ) : !isAuthPage ? (
            <>
              <Link
                to="/login"
                className={`px-3 py-2 rounded-lg whitespace-nowrap ${navLink}`}
              >
                Войти
              </Link>
              <Link
                to="/register"
                className="ml-1 sm:ml-2 px-3 sm:px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all duration-200 shadow-soft whitespace-nowrap"
              >
                Регистрация
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
