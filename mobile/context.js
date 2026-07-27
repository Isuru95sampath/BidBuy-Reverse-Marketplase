import { createContext, useContext } from 'react';

export const API_BASE_URL = 'https://Sampath95.pythonanywhere.com/api';
export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
