import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'

import Header from './components/Header.tsx'
import AdminRoute from './components/AdminRoute.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'

// Страницы
import Login from './Pages/Login.tsx'
import Register from './Pages/Register.tsx'
import CirclesList from './Pages/CirclesList.tsx'
import CircleDetail from './Pages/CircleDetail.tsx'
import LmsStudent from './Pages/LmsStudent.tsx'
import MyGrades from './Pages/MyGrades.tsx'
import TeacherLms from './Pages/TeacherLms.tsx'
import MyEnrollments from './Pages/MyEnrollments.tsx'
import MyCircles from './Pages/MyCircles.tsx'
import AdminPanel from './Pages/AdminPanel.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<CirclesList />} />
            <Route path="/circle/:id" element={<CircleDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Только для авторизованных */}
            <Route element={<ProtectedRoute />}>
              <Route path="/lms" element={<LmsStudent />} />
              <Route path="/grades" element={<MyGrades />} />
              <Route path="/teacher-lms" element={<TeacherLms />} />
              <Route path="/my-enrollments" element={<MyEnrollments />} />
              <Route path="/my-circles" element={<MyCircles />} />
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