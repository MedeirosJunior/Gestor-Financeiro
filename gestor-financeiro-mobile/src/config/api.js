// URL base da API — troque por sua URL de produção se necessário
export const API_URL = 'https://gestor-financeito.onrender.com';

export const CATEGORIES = {
    entrada: [
        { id: 'Salário', label: 'Salário', icon: '💼' },
        { id: 'Freelance', label: 'Freelance', icon: '💻' },
        { id: 'Investimentos', label: 'Investimentos', icon: '📈' },
        { id: 'Vendas', label: 'Vendas', icon: '🏷️' },
        { id: 'Outros', label: 'Outros', icon: '💰' },
    ],
    despesa: [
        { id: 'Alimentação', label: 'Alimentação', icon: '🍽️' },
        { id: 'Transporte', label: 'Transporte', icon: '🚗' },
        { id: 'Moradia', label: 'Moradia', icon: '🏠' },
        { id: 'Saúde', label: 'Saúde', icon: '⚕️' },
        { id: 'Educação', label: 'Educação', icon: '📚' },
        { id: 'Lazer', label: 'Lazer', icon: '🎮' },
        { id: 'Outros', label: 'Outros', icon: '💸' },
    ],
};

export const COLORS = {
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    surface: '#ffffff',
    background: '#f8fafc',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
};
