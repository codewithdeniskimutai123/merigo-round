
import api from './axios.js'


export async function loginUser(credentials) {
  const response = await api.post('/api/auth/login/', credentials)
  return response.data
}


export async function registerUser(userData) {
  const response = await api.post('/api/auth/register/', userData)
  return response.data
}

// Get a new access token using a refresh token.
export async function refreshToken(refresh) {
  const response = await api.post('/api/auth/refresh/', { refresh })
  return response.data
}

// Get the currently authenticated user's profile.
export async function getCurrentUser() {
  const response = await api.get('/api/auth/me/')
  return response.data
}

// Change the password of an authenticated user.
export async function changePassword(passwordData) {
  const response = await api.post(
    '/api/auth/change-password/',
    passwordData,
  )
  return response.data
}

// Request a password reset email.
export async function requestPasswordReset(email) {
  const response = await api.post('/api/auth/forgot-password/', { email })
  return response.data
}

// Submit the new password and reset token.
export async function resetPassword(resetData) {
  const response = await api.post('/api/auth/reset-password/', resetData)
  return response.data
}

// Authenticate using a Google credential.
export async function loginWithGoogle(credential) {
  const response = await api.post('/api/auth/google/', { credential })
  return response.data
}
