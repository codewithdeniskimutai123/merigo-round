
import { Routes, Route, Navigate } from 'react-router-dom'

import PageLayout from './layouts/PageLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RequireCompleteProfile from './components/RequireCompleteProfile.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import ChangePasswordPage from './pages/ChangePasswordPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import EditProfilePage from './pages/EditProfilePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import HomePage from './pages/HomePage.jsx'
import MemberDashboard from './pages/MemberDashboard.jsx'
import CreateGroupPage from './pages/CreateGroupPage.jsx'
import GroupWorkspace from './pages/GroupWorkspace.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<PageLayout />}>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<MemberDashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/edit-profile" element={<EditProfilePage />} />
          <Route path="/complete-profile" element={<EditProfilePage completionMode />}/>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          <Route element={<RequireCompleteProfile />}>
            <Route path="/groups/create" element={<CreateGroupPage />} />
          </Route>
          <Route path="/groups/:id" element={<GroupWorkspace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
