export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5080/api'
  : 'http://10.76.147.209:5080/api';
