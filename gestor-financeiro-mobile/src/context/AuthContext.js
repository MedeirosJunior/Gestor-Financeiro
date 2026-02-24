import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Carrega sessão salva ao iniciar
    useEffect(() => {
        (async () => {
            try {
                const savedToken = await SecureStore.getItemAsync('authToken');
                const savedUser = await SecureStore.getItemAsync('authUser');
                if (savedToken && savedUser) {
                    setToken(savedToken);
                    setUser(JSON.parse(savedUser));
                }
            } catch (e) {
                console.warn('Erro ao restaurar sessão:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const login = async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao fazer login');

        await SecureStore.setItemAsync('authToken', data.token);
        await SecureStore.setItemAsync('authUser', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data.user;
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('authUser');
        setToken(null);
        setUser(null);
    };

    // Fetch autenticado — adiciona Bearer token automaticamente
    const authFetch = async (path, options = {}) => {
        const res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...(options.headers || {}),
            },
        });
        if (res.status === 401) {
            await logout();
            throw new Error('Sessão expirada. Faça login novamente.');
        }
        return res;
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, authFetch }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
    return ctx;
};
