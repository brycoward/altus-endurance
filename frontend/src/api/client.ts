import axios from 'axios';

const API_URL = `${window.location.protocol}//${window.location.hostname}:8001`;

export const client = axios.create({
  baseURL: API_URL,
});

export const getBaseUrl = () => API_URL;

// Interceptor to add the token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('altus_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  register: (data: any) => client.post('/api/auth/register', data).then(r => r.data),
  login: (data: any) => client.post('/api/auth/login', data).then(r => r.data),
  login2fa: (userId: string, token: string) => client.post('/api/auth/login/2fa', { token }, { params: { user_id: userId } }).then(r => r.data),
  setup2fa: () => client.post('/api/auth/2fa/setup').then(r => r.data),
  verify2fa: (token: string) => client.post('/api/auth/2fa/verify', { token }).then(r => r.data),
  requestRecovery: (email: string) => client.post('/api/auth/recovery/request', { email }).then(r => r.data),
  verifyRecovery: (data: any) => client.post('/api/auth/recovery/verify', data).then(r => r.data),

  // V1 secured
  getSnapshot: () => client.get(`/api/snapshot/today`).then(r => r.data),
  getHistory: (days: number = 90) => client.get(`/api/snapshot/history`, { params: { days } }).then(r => r.data),
  getGoal: () => client.get(`/api/goal`).then(r => r.data),
  getUser: () => client.get(`/api/user/me`).then(r => r.data),
  updateUser: (data: any) => client.put(`/api/user/me`, data).then(r => r.data),
  getJournal: () => client.get(`/api/journal/today`).then(r => r.data),
  getJournalForDate: (dateStr: string) => client.get(`/api/journal/date/${dateStr}`).then(r => r.data),
  updateGoal: (data: any) => client.put(`/api/goal`, data).then(r => r.data),
  logFood: (data: any) => client.post('/api/food', data).then(r => r.data),
  updateFood: (foodId: number, data: any) => client.put(`/api/food/${foodId}`, data).then(r => r.data),
  deleteFood: (foodId: number) => client.delete(`/api/food/${foodId}`).then(r => r.data),
  logActivity: (data: any) => client.post('/api/activity', data).then(r => r.data),
  updateActivity: (activityId: number, data: any) => client.put(`/api/activity/${activityId}`, data).then(r => r.data),
  deleteActivity: (activityId: number) => client.delete(`/api/activity/${activityId}`).then(r => r.data),
  logHealth: (data: any) => client.post('/api/health', data).then(r => r.data),
  updateHealth: (healthId: number, data: any) => client.put(`/api/health/${healthId}`, data).then(r => r.data),
  deleteHealth: (healthId: number) => client.delete(`/api/health/${healthId}`).then(r => r.data),
  getLatestHealth: () => client.get('/api/health/latest').then(r => r.data),
  chatLog: (data: any) => client.post('/api/log', data).then(r => r.data),
  estimate: (text: string) => client.post('/api/estimate', { text }).then(r => r.data),
  
  // Endurance
  uploadFitFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/api/endurance/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(r => r.data);
  },
  getEnduranceDashboard: () => client.get('/api/endurance/dashboard').then(r => r.data),

  // Data Portability
  getBaseUrl: () => API_URL,
  exportJson: () => client.get('/api/data/export/json', { responseType: 'blob' }).then(r => r.data),
  exportCsv: () => client.get('/api/data/export/csv', { responseType: 'blob' }).then(r => r.data),
  importData: (file: File, mode: 'merge' | 'replace') => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/api/data/import?mode=${mode}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
};
