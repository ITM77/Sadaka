import axios from 'axios';
import { SITE_CONFIG } from './config';

const apiClient = axios.create({
  baseURL: SITE_CONFIG.apiUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
