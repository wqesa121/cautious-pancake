import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'

import Header from './components/Header.tsx'
import AdminRoute from './components/AdminRoute.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'

// Страницы
import Login from './Pages/Login.tsx'
import Register from './Pages/Register.tsx'
import LmsStudent from './Pages/LmsStudent.tsx'
import AdminPanel from './Pages/AdminPanel.tsx'

const token = localStorage.getItem("token")

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={token ? <Navigate to="/lms" replace /> : <Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Только для авторизованных */}
            <Route element={<ProtectedRoute />}>
              <Route path="/lms" element={<LmsStudent />} />
            </Route>

            {/* Только для админа */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPanel />} />
            </Route>

            <Route path="*" element={
              <div className="flex items-center justify-center min-h-[80vh] text-2xl text-slate-500 font-medium">
                404 — Страница не найдена
              </div>
            } />
          </Routes>
        </main>
        <div
          aria-hidden="true"
          className="pointer-events-none fixed bottom-3 right-3 z-40 select-none flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/75 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-slate-600 backdrop-blur-sm"
        >
          <img src="/logo.png" alt="" className="h-4 w-auto opacity-70" />
          <span>F.D.</span>
        </div>
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar
          theme="light"
          toastStyle={{ borderRadius: "1rem", boxShadow: "0 4px 20px rgb(0 0 0 / 0.08)" }}
        />
      </div>
    </Router>
  </React.StrictMode>
)