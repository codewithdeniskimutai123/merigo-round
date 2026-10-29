
import api from './axios.js'


export async function loginUser(credentials) {
  const response = await api.post('/api/auth/login/', credentials)
  return response.data
}


export async function registerUser(userData) {
  const response = await api.post('/api/auth/register/', userData)
  return response.data
}

export async function refreshToken(refresh) {
  const response = await api.post('/api/auth/refresh/', { refresh })
  return response.data
}


export async function getCurrentUser() {
  const response = await api.get('/api/auth/me/')
  return response.data
}


export async function updateCurrentUser(profileData) {
  const response = await api.patch('/api/auth/me/', profileData, {
    headers: {
      'Content-Type': undefined,
    },
  })

  return response.data
}



export async function changePassword(passwordData) {
  const response = await api.post(
    '/api/auth/change-password/',
    passwordData,
  )
  return response.data
}


export async function requestPasswordReset(email) {
  const response = await api.post('/api/auth/forgot-password/', { email })
  return response.data
}


export async function resetPassword(resetData) {
  const response = await api.post('/api/auth/reset-password/', resetData)
  return response.data
}




export async function loginWithGoogle(credential) {
  const response = await api.post('/api/auth/google/', {
    token: credential,
  })

  return response.data
}

