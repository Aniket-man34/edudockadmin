import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/admin/AdminLayout'
import Dashboard from './pages/Dashboard'
import PdfsManager from './pages/PdfsManager'
import UpdatesManager from './pages/UpdatesManager'
import ToolsManager from './pages/ToolsManager'
import CategoriesManager from './pages/CategoriesManager'
import MessagesManager from './pages/MessagesManager'
import Login from './pages/Login'
import { Toaster } from './components/ui/toaster'
import { AuthProvider } from './contexts/AuthContext'
import { GlobalSearchProvider } from './contexts/GlobalSearchContext'
import GlobalEditModal from './components/shared/GlobalEditModal'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <GlobalSearchProvider>
        <Router>
          <GlobalEditModal />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="pdfs" element={<PdfsManager />} />
              <Route path="updates" element={<UpdatesManager />} />
              <Route path="tools" element={<ToolsManager />} />
              <Route path="categories" element={<CategoriesManager />} />
              <Route path="messages" element={<MessagesManager />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <Toaster />
        </Router>
      </GlobalSearchProvider>
    </AuthProvider>
  )
}

export default App
