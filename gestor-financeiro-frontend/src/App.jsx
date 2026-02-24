import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import './App.css';
import './mobile.css';
import './professional.css';
import config from './config';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

// Componente de Loading para Suspense
const SuspenseLoader = ({ message = "Carregando..." }) => (
  <div className="suspense-loader">
    <div className="loading-spinner large"></div>
    <p>{message}</p>
  </div>
);

// ============ INTERCEPTOR GLOBAL DE FETCH ============
// Adiciona JWT automaticamente em todas as requisições para a API
// e faz logout automático em caso de 401 (token expirado/inválido)
(function setupFetchInterceptor() {
  const _origFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input?.url ?? '');
    // Adiciona JWT apenas em chamadas para a API do sistema
    if (typeof url === 'string' && url.startsWith(config.API_URL)) {
      const token = localStorage.getItem('authToken');
      if (token) {
        init = {
          ...init,
          headers: {
            'Authorization': `Bearer ${token}`,
            ...(init.headers || {})
          }
        };
      }
    }
    const response = await _origFetch(input, init);
    // Logout automático se token expirar ou for inválido (exceto no próprio login)
    if (response.status === 401 && typeof url === 'string' && !url.includes('/auth/login')) {
      ['isAuthenticated', 'currentUser', 'authToken', 'authTimestamp'].forEach(k => localStorage.removeItem(k));
      window.location.reload();
    }
    return response;
  };
})();

// Hook personalizado para debounce
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Funções de Validação
const ValidationUtils = {
  // Validar se é um número válido e positivo
  isValidPositiveNumber: (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0 && isFinite(num);
  },

  // Validar se string não está vazia
  isNotEmpty: (value) => {
    return typeof value === 'string' && value.trim().length > 0;
  },

  // Validar formato de data
  isValidDate: (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString.length === 10;
  },

  // Validar se data não é futura demais (máximo 1 ano no futuro)
  isReasonableDate: (dateString) => {
    if (!ValidationUtils.isValidDate(dateString)) return false;
    const date = new Date(dateString);
    const now = new Date();
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    return date <= oneYearFromNow;
  },

  // Validar valor monetário (máximo 1 milhão)
  isReasonableAmount: (value) => {
    const num = parseFloat(value);
    return ValidationUtils.isValidPositiveNumber(value) && num <= 1000000;
  },

  // Validar descrição (máximo 100 caracteres)
  isValidDescription: (description) => {
    return ValidationUtils.isNotEmpty(description) && description.trim().length <= 100;
  },

  // Validar categoria
  isValidCategory: (category, validCategories) => {
    return ValidationUtils.isNotEmpty(category) && validCategories.includes(category);
  },

  // Sanitizar entrada de texto
  sanitizeText: (text) => {
    if (typeof text !== 'string') return '';
    return text.trim().slice(0, 100);
  },

  // Validar credenciais de login
  isValidCredentials: (username, password) => {
    return ValidationUtils.isNotEmpty(username) &&
      ValidationUtils.isNotEmpty(password) &&
      username.length >= 3 &&
      password.length >= 3;
  }
};

// Função para tratamento de erros
const ErrorHandler = {
  // Tratar erros de API
  handleApiError: (error, operation = 'operação') => {
    console.error(`Erro na ${operation}:`, error);

    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      toast.error('Erro de conexão com servidor. Verifique sua internet e tente novamente.');
      return;
    }

    if (error.status) {
      switch (error.status) {
        case 400:
          toast.error('Dados inválidos. Verifique as informações e tente novamente.');
          break;
        case 401:
          toast.error('Não autorizado. Faça login novamente.');
          break;
        case 403:
          toast.error('Acesso negado. Você não tem permissão para esta ação.');
          break;
        case 404:
          toast.error('Servidor não encontrado. Verifique a conexão com a internet.');
          break;
        case 500:
          toast.error('Erro interno do servidor. Tente novamente mais tarde.');
          break;
        default:
          toast.error(`Erro ${error.status}: ${operation} falhou. Conexão com servidor necessária.`);
      }
    } else {
      toast.error(`Erro inesperado durante ${operation}. Conexão com servidor necessária.`);
    }
  },

  // Tratar erros de localStorage
  handleStorageError: (error, operation = 'salvar dados') => {
    console.error(`Erro de armazenamento ao ${operation}:`, error);

    if (error.name === 'QuotaExceededError') {
      toast.error('Espaço de armazenamento esgotado. Limpe alguns dados antigos.');
    } else {
      toast.error(`Erro ao ${operation}. Tente recarregar a página.`);
    }
  }
};

// Utilitários para conectividade
const ConnectivityUtils = {
  // Verificar se a API está disponível
  checkApiHealth: async () => {
    try {
      console.log('Testando conexão com API...');
      const response = await fetch(`${config.API_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000) // Timeout de 10 segundos
      });

      const isAvailable = response.ok;
      console.log('Resultado do teste de API:', isAvailable ? 'DISPONÍVEL' : 'INDISPONÍVEL');
      return isAvailable;
    } catch (error) {
      console.error('API não disponível:', error.message);
      return false;
    }
  },

  // Verificar conectividade básica
  isOnline: () => {
    return navigator.onLine;
  }
};

// Sistema de Categorias Personalizadas
const CategoryManager = {
  // Categorias padrão do sistema
  defaultCategories: {
    entrada: [
      { id: 'sal', name: 'Salário', icon: '💼', color: '#10b981' },
      { id: 'free', name: 'Freelance', icon: '💻', color: '#3b82f6' },
      { id: 'inv', name: 'Investimentos', icon: '📈', color: '#8b5cf6' },
      { id: 'out-ent', name: 'Outros', icon: '💰', color: '#6b7280' }
    ],
    despesa: [
      { id: 'alim', name: 'Alimentação', icon: '🍽️', color: '#ef4444' },
      { id: 'trans', name: 'Transporte', icon: '🚗', color: '#f59e0b' },
      { id: 'mor', name: 'Moradia', icon: '🏠', color: '#06b6d4' },
      { id: 'sau', name: 'Saúde', icon: '⚕️', color: '#84cc16' },
      { id: 'laz', name: 'Lazer', icon: '🎮', color: '#ec4899' },
      { id: 'out-desp', name: 'Outros', icon: '💸', color: '#6b7280' }
    ]
  },

  // Ícones disponíveis para seleção
  availableIcons: [
    '💼', '💻', '📈', '💰', '🏆', '🎯', '💎', '🔥',
    '🍽️', '🚗', '🏠', '⚕️', '🎮', '💸', '📚', '👕',
    '🎬', '✈️', '🏋️', '🎨', '🔧', '📱', '💊', '🎪',
    '🛒', '⛽', '💡', '🧾', '🎵', '📺', '🎈', '🌟'
  ],

  // Cores disponíveis para seleção
  availableColors: [
    '#ef4444', '#f59e0b', '#84cc16', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#6b7280'
  ],

  // Carregar categorias do localStorage
  loadCategories: () => {
    try {
      const saved = localStorage.getItem('customCategories');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          entrada: [...CategoryManager.defaultCategories.entrada, ...(parsed.entrada || [])],
          despesa: [...CategoryManager.defaultCategories.despesa, ...(parsed.despesa || [])]
        };
      }
      return CategoryManager.defaultCategories;
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      return CategoryManager.defaultCategories;
    }
  },

  // Salvar categorias customizadas (apenas as personalizadas)
  saveCustomCategories: (customCategories) => {
    try {
      localStorage.setItem('customCategories', JSON.stringify(customCategories));
      return true;
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'salvar categorias');
      return false;
    }
  },

  // Obter apenas categorias customizadas
  getCustomCategories: () => {
    try {
      const saved = localStorage.getItem('customCategories');
      return saved ? JSON.parse(saved) : { entrada: [], despesa: [] };
    } catch (error) {
      console.error('Erro ao obter categorias customizadas:', error);
      return { entrada: [], despesa: [] };
    }
  },

  // Validar dados da categoria
  validateCategory: (category) => {
    if (!ValidationUtils.isNotEmpty(category.name)) {
      return { valid: false, error: 'Nome da categoria é obrigatório' };
    }

    if (category.name.length > 30) {
      return { valid: false, error: 'Nome deve ter no máximo 30 caracteres' };
    }

    if (!category.icon || !CategoryManager.availableIcons.includes(category.icon)) {
      return { valid: false, error: 'Ícone inválido selecionado' };
    }

    if (!category.color || !CategoryManager.availableColors.includes(category.color)) {
      return { valid: false, error: 'Cor inválida selecionada' };
    }

    return { valid: true };
  },

  // Verificar se categoria já existe
  categoryExists: (name, type, excludeId = null) => {
    const categories = CategoryManager.loadCategories();
    return categories[type].some(cat =>
      cat.name.toLowerCase() === name.toLowerCase() && cat.id !== excludeId
    );
  },

  // Gerar ID único para nova categoria
  generateId: () => {
    return 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
};

// Avança uma data de vencimento pelo período de recorrência
const calcNextDue = (currentDueStr, frequency) => {
  const [y, m, d] = currentDueStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  switch (frequency) {
    case 'monthly': date.setMonth(date.getMonth() + 1); break;
    case 'bimonthly': date.setMonth(date.getMonth() + 2); break;
    case 'quarterly': date.setMonth(date.getMonth() + 3); break;
    case 'semiannual': date.setMonth(date.getMonth() + 6); break;
    case 'annual': date.setFullYear(date.getFullYear() + 1); break;
    case 'fifth-business-day': {
      const nm = new Date(y, m, 1); // primeiro dia do próximo mês
      let count = 0, td = 1;
      while (count < 5) {
        const t = new Date(nm.getFullYear(), nm.getMonth(), td);
        if (t.getDay() !== 0 && t.getDay() !== 6) count++;
        if (count < 5) td++;
      }
      return `${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, '0')}-${String(td).padStart(2, '0')}`;
    }
    default: date.setMonth(date.getMonth() + 1);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const RECURRING_CAT_MAP = {
  'Alimentação': 'alim', 'Transporte': 'trans', 'Moradia': 'mor',
  'Saúde': 'sau', 'Lazer': 'laz', 'Outros': 'out-desp'
};

// Lista de moedas suportadas
const CURRENCIES = [
  { code: 'BRL', symbol: 'R$', flag: '🇧🇷', name: 'Real Brasileiro' },
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'Dolar Americano' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', name: 'Libra Esterlina' },
  { code: 'ARS', symbol: '$', flag: '🇦🇷', name: 'Peso Argentino' },
  { code: 'JPY', symbol: '¥', flag: '🇯🇵', name: 'Iene Japones' },
  { code: 'CLP', symbol: '$', flag: '🇨🇱', name: 'Peso Chileno' },
  { code: 'MXN', symbol: '$', flag: '🇲🇽', name: 'Peso Mexicano' },
  { code: 'PYG', symbol: 'Gs', flag: '🇵🇾', name: 'Guarani Paraguaio' },
  { code: 'UYU', symbol: '$', flag: '🇺🇾', name: 'Peso Uruguaio' },
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingRecurring, setLoadingRecurring] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [dueAlerts, setDueAlerts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [goals, setGoals] = useState([]);
  // Estado para modo escuro — inicializa do localStorage
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Estado para painel de notificacoes
  const [notifOpen, setNotifOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('readNotifIds') || '[]')); }
    catch { return new Set(); }
  });
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Estado de moeda ativa e taxas de cambio
  const [activeCurrency, setActiveCurrency] = useState(() => localStorage.getItem('activeCurrency') || 'BRL');
  const [exchangeRates, setExchangeRates] = useState({ BRL: 1 });
  const [ratesLastUpdate, setRatesLastUpdate] = useState('');
  const [loadingRates, setLoadingRates] = useState(false);
  const [currencyPanelOpen, setCurrencyPanelOpen] = useState(false);

  // Estado para conectividade da API
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  const [apiChecked, setApiChecked] = useState(false);

  // Estado para categorias personalizadas
  const [categories, setCategories] = useState(CategoryManager.defaultCategories);
  const [customCategories, setCustomCategories] = useState({ entrada: [], despesa: [] });

  // Verificar autenticação no localStorage
  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    const userData = localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken');
    const authTimestamp = localStorage.getItem('authTimestamp');

    const clearAuth = () => {
      ['isAuthenticated', 'currentUser', 'authToken', 'authTimestamp'].forEach(k => localStorage.removeItem(k));
    };

    // Requer token JWT armazenado E timestamps válidos (7 dias)
    if (authStatus === 'true' && userData && authToken && authTimestamp) {
      const now = new Date().getTime();
      const authTime = parseInt(authTimestamp);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      if (now - authTime < sevenDays) {
        try {
          const user = JSON.parse(userData);
          setIsAuthenticated(true);
          setCurrentUser(user);
        } catch (error) {
          console.error('Erro ao restaurar sessão:', error);
          clearAuth();
        }
      } else {
        clearAuth();
        toast.info('Sessão expirada. Faça login novamente.');
      }
    }
  }, []);

  // Verificar disponibilidade da API na inicialização
  useEffect(() => {
    const checkApi = async () => {
      console.log('=== VERIFICANDO DISPONIBILIDADE DA API ===');
      setApiChecked(false);

      try {
        const available = await ConnectivityUtils.checkApiHealth();
        console.log('Resultado final da verificação:', available);

        setIsApiAvailable(available);
        setApiChecked(true);

        if (available) {
          console.log('✅ API disponível - sistema operacional');
          toast.success('Conectado ao servidor!', { autoClose: 2000 });
        } else {
          console.log('❌ API indisponível - sistema bloqueado');
          toast.error('Servidor indisponível. Verifique sua conexão.', { autoClose: 5000 });
        }
      } catch (error) {
        console.error('Erro ao verificar API:', error);
        setIsApiAvailable(false);
        setApiChecked(true);
        toast.error('Erro ao conectar com o servidor.', { autoClose: 5000 });
      }
    };

    checkApi();

    // Recheck API a cada 30 segundos se estiver offline
    const interval = setInterval(() => {
      if (!isApiAvailable) {
        console.log('Recheck da API...');
        checkApi();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isApiAvailable]);

  // Carregar categorias personalizadas
  useEffect(() => {
    const loadedCategories = CategoryManager.loadCategories();
    const customCats = CategoryManager.getCustomCategories();
    setCategories(loadedCategories);
    setCustomCategories(customCats);
  }, []);

  // Funções para categorias personalizadas
  const addCustomCategory = useCallback((type, categoryData) => {
    const validation = CategoryManager.validateCategory(categoryData);
    if (!validation.valid) {
      toast.error(validation.error);
      return false;
    }

    if (CategoryManager.categoryExists(categoryData.name, type)) {
      toast.error('Já existe uma categoria com este nome!');
      return false;
    }

    const newCategory = {
      ...categoryData,
      id: CategoryManager.generateId(),
      custom: true
    };

    const updatedCustomCategories = {
      ...customCategories,
      [type]: [...customCategories[type], newCategory]
    };

    if (CategoryManager.saveCustomCategories(updatedCustomCategories)) {
      setCustomCategories(updatedCustomCategories);
      const updatedCategories = {
        ...categories,
        [type]: [...categories[type], newCategory]
      };
      setCategories(updatedCategories);
      toast.success('Categoria criada com sucesso!');
      return true;
    }
    return false;
  }, [categories, customCategories]);

  const updateCustomCategory = useCallback((type, categoryId, categoryData) => {
    const validation = CategoryManager.validateCategory(categoryData);
    if (!validation.valid) {
      toast.error(validation.error);
      return false;
    }

    if (CategoryManager.categoryExists(categoryData.name, type, categoryId)) {
      toast.error('Já existe uma categoria com este nome!');
      return false;
    }

    const updatedCustomCategories = {
      ...customCategories,
      [type]: customCategories[type].map(cat =>
        cat.id === categoryId ? { ...categoryData, id: categoryId, custom: true } : cat
      )
    };

    if (CategoryManager.saveCustomCategories(updatedCustomCategories)) {
      setCustomCategories(updatedCustomCategories);
      const updatedCategories = CategoryManager.loadCategories();
      setCategories(updatedCategories);
      toast.success('Categoria atualizada com sucesso!');
      return true;
    }
    return false;
  }, [customCategories]);

  const deleteCustomCategory = useCallback((type, categoryId) => {
    const updatedCustomCategories = {
      ...customCategories,
      [type]: customCategories[type].filter(cat => cat.id !== categoryId)
    };

    if (CategoryManager.saveCustomCategories(updatedCustomCategories)) {
      setCustomCategories(updatedCustomCategories);
      const updatedCategories = CategoryManager.loadCategories();
      setCategories(updatedCategories);
      toast.success('Categoria excluída com sucesso!');
      return true;
    }
    return false;
  }, [customCategories]);

  // All hooks must be called before any conditional returns
  const fetchTransactions = useCallback(async () => {
    try {
      console.log('📡 Fazendo requisição para:', `${config.API_URL}/transactions?userId=${encodeURIComponent(currentUser.email)}`);
      const response = await fetch(`${config.API_URL}/transactions?userId=${encodeURIComponent(currentUser.email)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('📥 Dados recebidos:', data);
      if (!Array.isArray(data)) {
        throw new Error('Formato de dados inválido recebido do servidor');
      }
      setTransactions(data);
      console.log('✅ Transações carregadas com sucesso:', data.length, 'itens');
    } catch (error) {
      console.error('❌ Erro ao buscar transações da API:', error);
      setIsApiAvailable(false);
      ErrorHandler.handleApiError(error, 'buscar transações');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const addTransaction = useCallback(async (transaction) => {
    if (!ValidationUtils.isValidDescription(transaction.description)) {
      toast.error('Descrição deve ter entre 1 e 100 caracteres!');
      return;
    }

    if (!ValidationUtils.isReasonableAmount(transaction.value)) {
      toast.error('Valor deve ser um número positivo até R$ 1.000.000!');
      return;
    }

    if (!ValidationUtils.isValidDate(transaction.date)) {
      toast.error('Data inválida!');
      return;
    }

    if (!ValidationUtils.isReasonableDate(transaction.date)) {
      toast.error('Data não pode ser mais de 1 ano no futuro!');
      return;
    }

    const validCategoryIds = categories[transaction.type]?.map(cat => cat.id) || [];

    if (!validCategoryIds.includes(transaction.category)) {
      toast.error('Categoria inválida!');
      return;
    }

    setLoadingTransactions(true);
    try {
      if (!isApiAvailable) {
        toast.error('Conexão com servidor necessária para adicionar transações. Verifique sua internet.');
        return;
      }

      if (!currentUser?.email) {
        toast.error('Usuário não autenticado. Faça login novamente.');
        return;
      }

      const sanitizedTransaction = {
        ...transaction,
        description: ValidationUtils.sanitizeText(transaction.description),
        value: parseFloat(transaction.value),
        date: transaction.date,
        userId: currentUser.email
      };

      const response = await fetch(`${config.API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedTransaction),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Atualizar saldo da conta vinculada
      if (transaction.wallet_id) {
        const wallet = wallets.find(w => w.id === parseInt(transaction.wallet_id));
        if (wallet) {
          const delta = transaction.type === 'entrada'
            ? parseFloat(transaction.value)
            : -parseFloat(transaction.value);
          const newBalance = parseFloat(wallet.balance) + delta;
          await fetch(`${config.API_URL}/wallets/${wallet.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ balance: newBalance })
          });
          setWallets(prev => prev.map(w => w.id === wallet.id ? { ...w, balance: newBalance } : w));
        }
      }

      await fetchTransactions();
      toast.success(`${transaction.type === 'entrada' ? 'Receita' : 'Despesa'} adicionada com sucesso!`);
    } catch (error) {
      console.error('Erro ao adicionar transação via API:', error);
      setIsApiAvailable(false);
      ErrorHandler.handleApiError(error, 'adicionar transação');
    } finally {
      setLoadingTransactions(false);
    }
  }, [fetchTransactions, wallets, categories, isApiAvailable, currentUser]);

  // Lançar múltiplas parcelas de uma vez
  const addTransactionBatch = useCallback(async (batchData) => {
    const { transactions: batch, wallet_id, totalValue, type } = batchData;
    if (!batch || batch.length === 0) return;
    if (!isApiAvailable) {
      toast.error('Conexão com servidor necessária para adicionar parcelamentos.');
      return;
    }
    if (!currentUser?.email) {
      toast.error('Usuário não autenticado.');
      return;
    }
    setLoadingTransactions(true);
    try {
      const response = await fetch(`${config.API_URL}/transactions/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: batch.map(tx => ({ ...tx, userId: currentUser.email })),
          wallet_id: wallet_id || null,
          userId: currentUser.email
        })
      });
      if (!response.ok) {
        const d = await response.json();
        toast.error(d.error || 'Erro ao criar parcelamento');
        return;
      }
      // Atualizar saldo local da conta
      if (wallet_id) {
        const wallet = wallets.find(w => w.id === parseInt(wallet_id));
        if (wallet) {
          const delta = type === 'entrada' ? totalValue : -totalValue;
          setWallets(prev => prev.map(w =>
            w.id === wallet.id ? { ...w, balance: parseFloat(w.balance) + delta } : w
          ));
        }
      }
      await fetchTransactions();
      toast.success(`💳 ${batch.length} parcela(s) lançada(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao criar parcelamento:', error);
      ErrorHandler.handleApiError(error, 'criar parcelamento');
    } finally {
      setLoadingTransactions(false);
    }
  }, [fetchTransactions, wallets, isApiAvailable, currentUser]);

  const deleteTransaction = useCallback(async (id) => {
    if (!ValidationUtils.isValidPositiveNumber(id)) {
      toast.error('ID de transação inválido!');
      return;
    }

    if (!isApiAvailable) {
      toast.error('Conexão com servidor necessária para excluir transações. Verifique sua internet.');
      return;
    }

    if (!currentUser?.email) {
      toast.error('Usuário não autenticado. Faça login novamente.');
      return;
    }

    setLoadingTransactions(true);
    try {
      const response = await fetch(`${config.API_URL}/transactions/${id}?userId=${encodeURIComponent(currentUser.email)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error('Você não tem permissão para excluir esta transação.');
          return;
        } else if (response.status === 404) {
          toast.error('Transação não encontrada. Ela pode já ter sido excluída.');
          fetchTransactions();
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      fetchTransactions();

      // Reverter o saldo da conta vinculada
      const tx = transactions.find(t => t.id === id);
      if (tx?.wallet_id) {
        const wallet = wallets.find(w => w.id === parseInt(tx.wallet_id));
        if (wallet) {
          const delta = tx.type === 'entrada'
            ? -parseFloat(tx.value)
            : parseFloat(tx.value);
          const newBalance = parseFloat(wallet.balance) + delta;
          await fetch(`${config.API_URL}/wallets/${wallet.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ balance: newBalance })
          });
          setWallets(prev => prev.map(w => w.id === wallet.id ? { ...w, balance: newBalance } : w));
        }
      }

      toast.success('Transação excluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao excluir transação via API:', error);
      setIsApiAvailable(false);
      ErrorHandler.handleApiError(error, 'excluir transação');
    } finally {
      setLoadingTransactions(false);
    }
  }, [fetchTransactions, wallets, transactions, currentUser, isApiAvailable]);

  const updateTransaction = useCallback(async (id, transaction, oldTransaction) => {
    if (!isApiAvailable) {
      toast.error('Conexão com servidor necessária para editar transações.');
      return;
    }
    setLoadingTransactions(true);
    try {
      const response = await fetch(`${config.API_URL}/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...transaction, userId: currentUser.email })
      });
      const data = await response.json();
      if (response.ok) {
        // Reverter saldo da conta antiga e aplicar novo saldo, se necessário
        const oldWalletId = oldTransaction?.wallet_id ? parseInt(oldTransaction.wallet_id) : null;
        const newWalletId = transaction.wallet_id ? parseInt(transaction.wallet_id) : null;
        const oldValue = oldTransaction ? parseFloat(oldTransaction.value) : 0;
        const newValue = parseFloat(transaction.value);

        if (oldWalletId || newWalletId) {
          // Calcular novos saldos diretamente no estado local
          const updatedWallets = [...wallets];

          // Reverter efeito antigo
          if (oldWalletId) {
            const oldWallet = updatedWallets.find(w => w.id === oldWalletId);
            if (oldWallet) {
              const reversal = oldTransaction.type === 'entrada' ? -oldValue : oldValue;
              const newBal = parseFloat(oldWallet.balance) + reversal;
              await fetch(`${config.API_URL}/wallets/${oldWalletId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ balance: newBal })
              });
              oldWallet.balance = newBal;
            }
          }

          // Aplicar efeito novo
          if (newWalletId) {
            const newWallet = updatedWallets.find(w => w.id === newWalletId);
            if (newWallet) {
              const delta = transaction.type === 'entrada' ? newValue : -newValue;
              const newBal = parseFloat(newWallet.balance) + delta;
              await fetch(`${config.API_URL}/wallets/${newWalletId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ balance: newBal })
              });
              newWallet.balance = newBal;
            }
          }

          setWallets([...updatedWallets]);
        }

        await fetchTransactions();
        toast.success('Transação atualizada com sucesso!');
        return true;
      } else {
        toast.error(data.error || 'Erro ao atualizar transação');
        return false;
      }
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      toast.error('Erro de conexão ao atualizar transação');
      return false;
    } finally {
      setLoadingTransactions(false);
    }
  }, [fetchTransactions, wallets, currentUser, isApiAvailable]);

  const handleLogin = useCallback((user, token) => {
    if (!user || !ValidationUtils.isValidCredentials(user.name, user.email)) {
      toast.error('Dados de usuário inválidos!');
      return;
    }

    try {
      const sanitizedUser = {
        name: ValidationUtils.sanitizeText(user.name),
        email: user.email.toLowerCase().trim()
      };

      setIsAuthenticated(true);
      setCurrentUser(sanitizedUser);

      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('currentUser', JSON.stringify(sanitizedUser));
      localStorage.setItem('authTimestamp', new Date().getTime().toString());
      if (token) localStorage.setItem('authToken', token);

      toast.success(`Bem-vindo, ${sanitizedUser.name}!`);
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'realizar login');
    }
  }, []);

  const handleLogout = useCallback(() => {
    try {
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authTimestamp');
      localStorage.removeItem('authToken');
      setActiveTab('dashboard');
      toast.info('Logout realizado com sucesso!');
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'realizar logout');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions();
    }
  }, [isAuthenticated, fetchTransactions]);

  const fetchRecurringExpenses = useCallback(async () => {
    if (!currentUser?.email) return;
    try {
      const response = await fetch(`${config.API_URL}/recurring-expenses?userId=${encodeURIComponent(currentUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map(e => ({
          ...e,
          recurrence: e.frequency,
          nextDue: e.next_due_date
        }));
        setRecurringExpenses(mapped);
        checkDueExpenses(mapped);
      }
    } catch (error) {
      console.error('Erro ao buscar despesas recorrentes:', error);
    }
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecurringExpenses();
    }
  }, [isAuthenticated, fetchRecurringExpenses]);

  // Funções para despesas recorrentes
  const addRecurringExpense = async (expense) => {
    if (!ValidationUtils.isValidDescription(expense.description)) {
      toast.error('Descrição deve ter entre 1 e 100 caracteres!');
      return;
    }
    if (!ValidationUtils.isReasonableAmount(expense.value)) {
      toast.error('Valor deve ser um número positivo até R$ 1.000.000!');
      return;
    }
    if (!ValidationUtils.isValidDate(expense.startDate)) {
      toast.error('Data de início inválida!');
      return;
    }
    const validRecurrences = ['monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual', 'fifth-business-day'];
    if (!expense.recurrence || !validRecurrences.includes(expense.recurrence)) {
      toast.error('Recorrência inválida! Selecione uma opção válida.');
      return;
    }
    const validCategories = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Outros'];
    if (!ValidationUtils.isValidCategory(expense.category, validCategories)) {
      toast.error('Categoria inválida!');
      return;
    }

    setLoadingRecurring(true);
    try {
      // Avança a partir da data de início até o próximo vencimento futuro
      let nextDueDate = expense.startDate;
      const today = new Date().toISOString().split('T')[0];
      while (nextDueDate <= today) {
        nextDueDate = calcNextDue(nextDueDate, expense.recurrence);
      }
      const response = await fetch(`${config.API_URL}/recurring-expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.email,
          description: ValidationUtils.sanitizeText(expense.description),
          category: expense.category,
          value: parseFloat(expense.value),
          frequency: expense.recurrence,
          next_due_date: nextDueDate
        })
      });
      if (response.ok) {
        await fetchRecurringExpenses();
        toast.success('Despesa recorrente adicionada com sucesso!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao adicionar despesa recorrente');
      }
    } catch (error) {
      toast.error('Erro de conexão ao adicionar despesa recorrente');
    } finally {
      setLoadingRecurring(false);
    }
  };

  const deleteRecurringExpense = async (id) => {
    setLoadingRecurring(true);
    try {
      const response = await fetch(`${config.API_URL}/recurring-expenses/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchRecurringExpenses();
        toast.success('Despesa recorrente excluída com sucesso!');
      } else {
        toast.error('Erro ao excluir despesa recorrente');
      }
    } catch (error) {
      toast.error('Erro de conexão ao excluir despesa recorrente');
    } finally {
      setLoadingRecurring(false);
    }
  };

  const payRecurringExpense = useCallback(async (expense) => {
    if (!currentUser?.email) return;
    setLoadingRecurring(true);
    try {
      const dueDate = expense.next_due_date || expense.nextDue;
      const freq = expense.frequency || expense.recurrence;
      const catId = RECURRING_CAT_MAP[expense.category] || 'out-desp';

      // 1. Criar transação de despesa
      const txRes = await fetch(`${config.API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'despesa',
          description: expense.description,
          category: catId,
          value: parseFloat(expense.value),
          date: dueDate,
          userId: currentUser.email
        })
      });
      if (!txRes.ok) {
        toast.error('Erro ao registrar transação');
        return;
      }

      // 2. Avançar próximo vencimento
      const newDue = calcNextDue(dueDate, freq);
      await fetch(`${config.API_URL}/recurring-expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: expense.description,
          category: expense.category,
          value: parseFloat(expense.value),
          frequency: freq,
          next_due_date: newDue,
          is_active: 1
        })
      });

      await fetchTransactions();
      await fetchRecurringExpenses();
      toast.success(`✅ Pagamento registrado! Próximo vencimento: ${new Date(newDue + 'T00:00:00').toLocaleDateString('pt-BR')}`);
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    } finally {
      setLoadingRecurring(false);
    }
  }, [currentUser, fetchTransactions, fetchRecurringExpenses]);

  const updateRecurringExpense = useCallback(async (id, data) => {
    setLoadingRecurring(true);
    try {
      const res = await fetch(`${config.API_URL}/recurring-expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await fetchRecurringExpenses();
        toast.success('Despesa recorrente atualizada!');
        return true;
      }
      toast.error('Erro ao atualizar despesa recorrente');
      return false;
    } catch (error) {
      toast.error('Erro de conexão');
      return false;
    } finally {
      setLoadingRecurring(false);
    }
  }, [fetchRecurringExpenses]);

  // ============ ORÇAMENTOS ============
  const fetchBudgets = useCallback(async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch(`${config.API_URL}/budgets?userId=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) setBudgets(await res.json());
    } catch (e) { console.error('Erro ao buscar orçamentos', e); }
  }, [currentUser]);

  useEffect(() => { if (isAuthenticated) fetchBudgets(); }, [isAuthenticated, fetchBudgets]);

  const addBudget = useCallback(async (data) => {
    const res = await fetch(`${config.API_URL}/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: currentUser.email })
    });
    if (res.ok) { await fetchBudgets(); toast.success('Orçamento criado!'); return true; }
    const d = await res.json(); toast.error(d.error || 'Erro ao criar orçamento'); return false;
  }, [currentUser, fetchBudgets]);

  const deleteBudget = useCallback(async (id) => {
    const res = await fetch(`${config.API_URL}/budgets/${id}`, { method: 'DELETE' });
    if (res.ok) { await fetchBudgets(); toast.success('Orçamento removido!'); }
  }, [fetchBudgets]);

  const updateBudget = useCallback(async (id, data) => {
    const res = await fetch(`${config.API_URL}/budgets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) { await fetchBudgets(); toast.success('Orçamento atualizado!'); return true; }
    return false;
  }, [fetchBudgets]);

  // ============ CONTAS ============
  const fetchWallets = useCallback(async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch(`${config.API_URL}/wallets?userId=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) setWallets(await res.json());
    } catch (e) { console.error('Erro ao buscar contas', e); }
  }, [currentUser]);

  useEffect(() => { if (isAuthenticated) fetchWallets(); }, [isAuthenticated, fetchWallets]);

  const addWallet = useCallback(async (data) => {
    const res = await fetch(`${config.API_URL}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: currentUser.email })
    });
    if (res.ok) { await fetchWallets(); toast.success('Conta criada!'); return true; }
    const d = await res.json(); toast.error(d.error || 'Erro ao criar conta'); return false;
  }, [currentUser, fetchWallets]);

  const updateWallet = useCallback(async (id, data) => {
    const res = await fetch(`${config.API_URL}/wallets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) { await fetchWallets(); toast.success('Conta atualizada!'); return true; }
    return false;
  }, [fetchWallets]);

  const deleteWallet = useCallback(async (id) => {
    const res = await fetch(`${config.API_URL}/wallets/${id}`, { method: 'DELETE' });
    if (res.ok) { await fetchWallets(); toast.success('Conta removida!'); }
  }, [fetchWallets]);

  const transferBetweenWallets = useCallback(async (fromId, toId, amount, description, date) => {
    if (!isApiAvailable) {
      toast.error('Conexão com servidor necessária para transferências.');
      return false;
    }
    const from = wallets.find(w => w.id === fromId);
    const to = wallets.find(w => w.id === toId);
    if (!from || !to) { toast.error('Conta não encontrada!'); return false; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error('Valor inválido!'); return false; }
    if (fromId === toId) { toast.error('Selecione contas diferentes!'); return false; }
    try {
      const res = await fetch(`${config.API_URL}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.email,
          fromWalletId: fromId,
          toWalletId: toId,
          amount: amt,
          description: description || 'Transferência',
          date: date || new Date().toISOString().split('T')[0]
        })
      });
      const data = await res.json();
      if (res.ok) {
        await Promise.all([fetchWallets(), fetchTransactions()]);
        toast.success(`🔄 Transferência de R$ ${amt.toFixed(2)} realizada de "${from.name}" para "${to.name}"!`);
        return true;
      }
      toast.error(data.error || 'Erro na transferência!');
      return false;
    } catch (e) { toast.error('Erro de conexão na transferência!'); return false; }
  }, [wallets, fetchWallets, fetchTransactions, currentUser, isApiAvailable]);

  // ============ METAS ============
  const fetchGoals = useCallback(async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch(`${config.API_URL}/goals?userId=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) setGoals(await res.json());
    } catch (e) { console.error('Erro ao buscar metas', e); }
  }, [currentUser]);

  useEffect(() => { if (isAuthenticated) fetchGoals(); }, [isAuthenticated, fetchGoals]);

  const addGoal = useCallback(async (data) => {
    const res = await fetch(`${config.API_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: currentUser.email })
    });
    if (res.ok) { await fetchGoals(); toast.success('Meta criada!'); return true; }
    const d = await res.json(); toast.error(d.error || 'Erro ao criar meta'); return false;
  }, [currentUser, fetchGoals]);

  const updateGoal = useCallback(async (id, data) => {
    const res = await fetch(`${config.API_URL}/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) { await fetchGoals(); toast.success('Meta atualizada!'); return true; }
    return false;
  }, [fetchGoals]);

  const deleteGoal = useCallback(async (id) => {
    const res = await fetch(`${config.API_URL}/goals/${id}`, { method: 'DELETE' });
    if (res.ok) { await fetchGoals(); toast.success('Meta removida!'); }
  }, [fetchGoals]);

  const checkDueExpenses = (expenses) => {
    const today = new Date();
    const alerts = [];

    expenses.forEach(expense => {
      const dueDate = new Date(expense.nextDue);
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 7 && diffDays >= 0) {
        alerts.push({
          ...expense,
          daysUntilDue: diffDays
        });
      } else if (diffDays < 0) {
        alerts.push({
          ...expense,
          daysUntilDue: diffDays,
          overdue: true
        });
      }
    });

    setDueAlerts(alerts);

    // Enviar notificações browser para despesas vencidas/próximas
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notified = new Set(JSON.parse(sessionStorage.getItem('notifiedExpenses') || '[]'));
        alerts.forEach(alert => {
          const key = `${alert.id}-${alert.nextDue}`;
          if (!notified.has(key)) {
            const title = alert.overdue
              ? `⚠️ Despesa Vencida: ${alert.description}`
              : `🔔 Vence em ${alert.daysUntilDue} dia(s): ${alert.description}`;
            new Notification(title, {
              body: `Valor: R$ ${parseFloat(alert.value).toFixed(2)} • Vencimento: ${alert.nextDue}`,
              icon: '/favicon.ico'
            });
            notified.add(key);
          }
        });
        sessionStorage.setItem('notifiedExpenses', JSON.stringify([...notified]));
      } catch (e) { /* ignora erros de notificação */ }
    }
  };

  // Solicitar permissão para notificações browser ao autenticar
  useEffect(() => {
    if (isAuthenticated && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isAuthenticated]);

  // Buscar taxas de cambio (base: BRL)
  const fetchExchangeRates = React.useCallback(async () => {
    setLoadingRates(true);
    try {
      const res = await fetch(config.API_URL + '/exchange-rates');
      if (res.ok) {
        const data = await res.json();
        setExchangeRates(data.rates || { BRL: 1 });
        setRatesLastUpdate(data.time_last_update || '');
      }
    } catch (e) { console.warn('exchange-rates error:', e.message); }
    finally { setLoadingRates(false); }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchExchangeRates();
  }, [isAuthenticated, fetchExchangeRates]);

  useEffect(() => {
    localStorage.setItem('activeCurrency', activeCurrency);
  }, [activeCurrency]);

  // Converte valor de BRL para moeda ativa
  const convertCurrency = React.useCallback((brlValue) => {
    if (activeCurrency === 'BRL') return brlValue;
    const rate = exchangeRates[activeCurrency];
    return rate ? brlValue * rate : brlValue;
  }, [activeCurrency, exchangeRates]);

  // Formata valor na moeda ativa
  const fmtCurrency = React.useCallback((brlValue) => {
    const curr = CURRENCIES.find(x => x.code === activeCurrency) || CURRENCIES[0];
    const val = convertCurrency(brlValue);
    const decimals = (activeCurrency === 'JPY' || activeCurrency === 'CLP' || activeCurrency === 'PYG') ? 0 : 2;
    return curr.symbol + ' ' + val.toFixed(decimals);
  }, [activeCurrency, convertCurrency]);

  // Agrega todas as notificacoes ativas
  const allNotifications = useMemo(() => {
    const items = [];
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);

    // 1. Despesas recorrentes vencidas / proximas do vencimento
    dueAlerts.forEach(a => items.push({
      id: 'exp-' + a.id + '-' + a.nextDue,
      type: a.overdue ? 'overdue' : 'due-soon',
      priority: a.overdue ? 0 : 1,
      icon: a.overdue ? '🔴' : '🟢',
      title: a.overdue ? 'Despesa Vencida' : ('Vence em ' + a.daysUntilDue + ' dia(s)'),
      body: a.description + ' — R$ ' + parseFloat(a.value).toFixed(2),
      date: a.nextDue,
    }));

    // 2. Orcamentos estourados ou quase (>=80%) no mes atual
    const allCats = [...(categories?.despesa || []), ...(categories?.entrada || [])];
    const monthTrans = transactions.filter(t => t.date.startsWith(currentMonth) && t.type === 'despesa');
    budgets.filter(b => b.period === 'monthly' || b.period === 'mensal').forEach(b => {
      const catIds = allCats.filter(c => c.name.toLowerCase() === b.category.toLowerCase()).map(c => c.id);
      const spent = monthTrans
        .filter(t => catIds.includes(t.category))
        .reduce((s, t) => s + parseFloat(t.value || 0), 0);
      const limit = parseFloat(b.limit_value);
      if (limit > 0) {
        const pct = (spent / limit) * 100;
        if (pct >= 80) {
          items.push({
            id: 'budget-' + b.id + '-' + currentMonth,
            type: pct >= 100 ? 'over-budget' : 'near-budget',
            priority: pct >= 100 ? 0 : 1,
            icon: pct >= 100 ? '🔴' : '🟡',
            title: pct >= 100 ? 'Orcamento Estourado' : 'Orcamento Quase no Limite',
            body: b.category + ': R$ ' + spent.toFixed(2) + ' / R$ ' + limit.toFixed(2) + ' (' + pct.toFixed(0) + '%)',
            date: currentMonth,
          });
        }
      }
    });

    // 3. Metas: prazo vencido, proximo (<=30d) ou 100% alcancada
    goals.forEach(g => {
      const curr = parseFloat(g.current_amount || 0);
      const target = parseFloat(g.target_amount);
      const pct = target > 0 ? (curr / target * 100) : 0;
      if (pct >= 100) {
        items.push({
          id: 'goal-done-' + g.id,
          type: 'goal-achieved',
          priority: 2,
          icon: '🎯',
          title: 'Meta Alcancada!',
          body: g.name + ' — R$ ' + curr.toFixed(2) + ' / R$ ' + target.toFixed(2),
          date: g.deadline || '',
        });
      } else if (g.deadline) {
        const diff = Math.ceil((new Date(g.deadline + 'T00:00:00') - now) / 86400000);
        if (diff < 0) {
          items.push({
            id: 'goal-overdue-' + g.id,
            type: 'goal-overdue',
            priority: 0,
            icon: '🎯',
            title: 'Meta com Prazo Vencido',
            body: g.name + ' — ' + pct.toFixed(0) + '% concluida',
            date: g.deadline,
          });
        } else if (diff <= 30) {
          items.push({
            id: 'goal-dl-' + g.id,
            type: 'goal-deadline',
            priority: 1,
            icon: '🎯',
            title: 'Meta vence em ' + diff + ' dia(s)',
            body: g.name + ' — ' + pct.toFixed(0) + '% concluida',
            date: g.deadline,
          });
        }
      }
    });

    return items.sort((a, b) => a.priority - b.priority);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueAlerts, budgets, goals, transactions, categories]);

  const unreadCount = allNotifications.filter(n => !readNotifIds.has(n.id)).length;

  const markAllRead = () => {
    const ids = allNotifications.map(n => n.id);
    const newSet = new Set([...readNotifIds, ...ids]);
    setReadNotifIds(newSet);
    localStorage.setItem('readNotifIds', JSON.stringify([...newSet]));
  };

  const handleSendEmail = async () => {
    if (!emailInput.trim()) return;
    setSendingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(config.API_URL + '/send-email-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ email: emailInput, notifications: allNotifications }),
      });
      if (res.ok) { toast.success('Resumo enviado por e-mail!'); setEmailModalOpen(false); }
      else { const d = await res.json(); toast.error(d.message || 'Erro ao enviar e-mail'); }
    } catch { toast.error('Erro ao enviar e-mail'); }
    finally { setSendingEmail(false); }
  };

  const isAdmin = currentUser?.email === 'junior395@gmail.com';

  // Se não estiver autenticado, mostrar tela de login
  if (!isAuthenticated) {
    return (
      <Login
        onLogin={handleLogin}
        loadingAuth={loadingAuth}
        setLoadingAuth={setLoadingAuth}
      />
    );
  }

  return (
    <div className={`app${darkMode ? ' dark-mode' : ''}`}>
      <LoadingOverlay
        show={loadingTransactions}
        message="Processando transação..."
      />
      <LoadingOverlay
        show={loadingRecurring}
        message="Processando despesa recorrente..."
      />
      <header className="header">
        <div className="header-top">
          <h1>💰 Gestor Financeiro</h1>
          <div className="header-controls">
            <div className="connectivity-status">
              {apiChecked && (
                <span className={`status-indicator ${isApiAvailable ? 'online' : 'offline'}`}>
                  {isApiAvailable ? '🟢 Online' : '🔴 Offline'}
                </span>
              )}
            </div>
            <div className="user-info">
              <span>👤 {currentUser?.name || currentUser?.username}</span>
              {isAdmin && (
                <button
                  className={activeTab === 'usuarios' ? 'active' : ''}
                  onClick={() => setActiveTab('usuarios')}
                  title="Gerenciar Usuários"
                >
                  👥 Usuários
                </button>
              )}
              <button
                className="logout-btn"
                onClick={handleLogout}
                title="Sair"
              >
                🚪 Sair
              </button>
              <div className="currency-selector-wrap">
                <button
                  className="currency-panel-btn"
                  title="Painel de câmbio"
                  onClick={() => setCurrencyPanelOpen(v => !v)}
                >💱</button>
                <select
                  className="currency-select"
                  value={activeCurrency}
                  onChange={e => setActiveCurrency(e.target.value)}
                  title="Selecionar moeda"
                >
                  {CURRENCIES.map(cur => (
                    <option key={cur.code} value={cur.code}>{cur.flag} {cur.code}</option>
                  ))}
                </select>
              </div>
              <div className="notif-bell-wrap">
                <button
                  className="notif-bell-btn"
                  onClick={() => setNotifOpen(o => !o)}
                  title="Notificacoes"
                >
                  💱
                  {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
              </div>
              <button
                className="darkmode-btn"
                onClick={() => setDarkMode(dm => !dm)}
                title={darkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                style={{ marginLeft: '6px' }}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
        <nav className="nav">
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={activeTab === 'entradas' ? 'active' : ''}
            onClick={() => setActiveTab('entradas')}
          >
            💵 Entradas
          </button>
          <button
            className={activeTab === 'despesas' ? 'active' : ''}
            onClick={() => setActiveTab('despesas')}
          >
            💸 Despesas
          </button>
          <button
            className={activeTab === 'relatorios' ? 'active' : ''}
            onClick={() => setActiveTab('relatorios')}
          >
            📈 Relatórios
          </button>
          <button
            className={activeTab === 'historico' ? 'active' : ''}
            onClick={() => setActiveTab('historico')}
          >
            📋 Histórico
          </button>
          <button
            className={activeTab === 'recorrentes' ? 'active' : ''}
            onClick={() => setActiveTab('recorrentes')}
          >
            🔄 Recorrentes
          </button>
          <button
            className={activeTab === 'categorias' ? 'active' : ''}
            onClick={() => setActiveTab('categorias')}
          >
            🏷️ Categorias
          </button>
          <button
            className={activeTab === 'orcamentos' ? 'active' : ''}
            onClick={() => setActiveTab('orcamentos')}
          >
            🎯 Orçamentos
          </button>
          <button
            className={activeTab === 'contas' ? 'active' : ''}
            onClick={() => setActiveTab('contas')}
          >
            🏦 Contas
          </button>
          <button
            className={activeTab === 'metas' ? 'active' : ''}
            onClick={() => setActiveTab('metas')}
          >
            🏆 Metas
          </button>
          <button
            className={activeTab === 'importar' ? 'active' : ''}
            onClick={() => setActiveTab('importar')}
          >
            📥 Importar
          </button>
        </nav>
      </header>
      <main className="main">
        {loading && <div className="loading">Carregando...</div>}
        <Suspense fallback={<SuspenseLoader message="Carregando aba..." />}>
          {activeTab === 'dashboard' && (
            <Dashboard
              transactions={transactions}
              dueAlerts={dueAlerts}
              budgets={budgets}
              goals={goals}
              categories={categories}
              wallets={wallets}
              fmtCurrency={fmtCurrency}
            />
          )}
          {activeTab === 'entradas' && (
            <LancamentoForm
              type="entrada"
              onAdd={addTransaction}
              onAddBatch={addTransactionBatch}
              title="💵 Lançar Entrada"
              categories={categories}
              isApiAvailable={isApiAvailable}
              wallets={wallets}
            />
          )}
          {activeTab === 'despesas' && (
            <LancamentoForm
              type="despesa"
              onAdd={addTransaction}
              onAddBatch={addTransactionBatch}
              title="💸 Lançar Despesa"
              categories={categories}
              isApiAvailable={isApiAvailable}
              wallets={wallets}
            />
          )}
          {activeTab === 'relatorios' && (
            <Relatorios
              transactions={transactions}
              loadingExport={loadingExport}
              setLoadingExport={setLoadingExport}
              categories={categories}
              fmtCurrency={fmtCurrency}
            />
          )}
          {activeTab === 'historico' && (
            <Historico
              transactions={transactions}
              onDelete={deleteTransaction}
              onUpdate={updateTransaction}
              isApiAvailable={isApiAvailable}
              categories={categories}
              wallets={wallets}
            />
          )}
          {activeTab === 'recorrentes' && (
            <DespesasRecorrentes
              expenses={recurringExpenses}
              onAdd={addRecurringExpense}
              onDelete={deleteRecurringExpense}
              onPay={payRecurringExpense}
              onUpdate={updateRecurringExpense}
            />
          )}
          {activeTab === 'orcamentos' && (
            <Orcamentos
              budgets={budgets}
              transactions={transactions}
              categories={categories}
              onAdd={addBudget}
              onUpdate={updateBudget}
              onDelete={deleteBudget}
            />
          )}
          {activeTab === 'contas' && (
            <Contas
              wallets={wallets}
              onAdd={addWallet}
              onUpdate={updateWallet}
              onDelete={deleteWallet}
              onTransfer={transferBetweenWallets}
              transactions={transactions}
              onUpdateTransaction={updateTransaction}
              onDeleteTransaction={deleteTransaction}
              categories={categories}
            />
          )}
          {activeTab === 'metas' && (
            <Metas
              goals={goals}
              onAdd={addGoal}
              onUpdate={updateGoal}
              onDelete={deleteGoal}
            />
          )}
          {activeTab === 'categorias' && (
            <CategoryManagement
              categories={categories}
              onAddCategory={addCustomCategory}
              onUpdateCategory={updateCustomCategory}
              onDeleteCategory={deleteCustomCategory}
            />
          )}
          {activeTab === 'usuarios' && isAdmin && (
            <GerenciarUsuarios />
          )}
          {activeTab === 'importar' && (
            <ImportarCSV
              categories={categories}
              currentUser={currentUser}
              isApiAvailable={isApiAvailable}
              onImportDone={fetchTransactions}
            />
          )}
        </Suspense>
      </main>

      {/* Painel de taxas e conversor rapido */}
      {currencyPanelOpen && (
        <div className="notif-overlay" onClick={() => setCurrencyPanelOpen(false)}>
          <div className="notif-panel currency-panel" onClick={e => e.stopPropagation()}>
            <div className="notif-panel-header">
              <span>💱 Taxas de Câmbio (base: BRL)</span>
              <button className="notif-close-btn" onClick={() => setCurrencyPanelOpen(false)}>✕</button>
            </div>
            {loadingRates ? (
              <div className="notif-empty">⏳ Atualizando taxas...</div>
            ) : (
              <>
                <div className="rates-grid">
                  {CURRENCIES.filter(x => x.code !== 'BRL').map(cur => (
                    <div key={cur.code} className={'rate-item' + (activeCurrency === cur.code ? ' rate-active' : '')} onClick={() => setActiveCurrency(cur.code)}>
                      <span className="rate-flag">{cur.flag}</span>
                      <span className="rate-code">{cur.code}</span>
                      <span className="rate-val">{exchangeRates[cur.code] ? exchangeRates[cur.code].toFixed(4) : '?'}</span>
                    </div>
                  ))}
                </div>
                {ratesLastUpdate && <div className="rates-updated">🕒 Atualizado: {ratesLastUpdate}</div>}
                <div className="currency-mini-converter">
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>🔄 Conversor Rápido</h4>
                  <CurrencyConverter currencies={CURRENCIES} exchangeRates={exchangeRates} activeCurrency={activeCurrency} />
                </div>
              </>
            )}
            <div className="notif-panel-footer">
              <button className="notif-email-btn" onClick={fetchExchangeRates} disabled={loadingRates}>
                {loadingRates ? '⏳ Atualizando...' : '🔄 Atualizar Taxas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Painel de Notificações */}
      {notifOpen && (
        <div className="notif-overlay" onClick={() => setNotifOpen(false)}>
          <div className="notif-panel" onClick={e => e.stopPropagation()}>
            <div className="notif-panel-header">
              <span>🔔 Notificações {allNotifications.length > 0 && '(' + allNotifications.length + ')'}</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {allNotifications.length > 0 && (
                  <button className="notif-mark-read" onClick={markAllRead}>✅ Lidas</button>
                )}
                <button className="notif-close-btn" onClick={() => setNotifOpen(false)}>✕</button>
              </div>
            </div>
            {allNotifications.length === 0 ? (
              <div className="notif-empty">✅ Nenhuma notificação no momento</div>
            ) : (
              <div className="notif-list">
                {allNotifications.map(n => (
                  <div key={n.id} className={'notif-item notif-type-' + n.type + (readNotifIds.has(n.id) ? ' read' : ' unread')}>
                    <span className="notif-item-icon">{n.icon}</span>
                    <div className="notif-item-content">
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-body">{n.body}</div>
                      {n.date && <div className="notif-item-date">{n.date}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="notif-panel-footer">
              <button
                className="notif-email-btn"
                onClick={() => { setEmailInput(currentUser?.email || ''); setEmailModalOpen(true); }}
              >
                📧 Enviar resumo por e-mail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de e-mail */}
      {emailModalOpen && (
        <div className="modal-overlay" onClick={() => setEmailModalOpen(false)}>
          <div className="modal-content notif-email-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>📧 Enviar Resumo por E-mail</h3>
            <p style={{ color: '#94a3b8', marginBottom: '14px', fontSize: '14px', lineHeight: 1.5 }}>
              Enviaremos um resumo das suas notificacoes ativas para:
            </p>
            <input
              type="email"
              className="input-field"
              placeholder="seu@email.com"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              style={{ marginBottom: '14px', width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="cancel-btn" onClick={() => setEmailModalOpen(false)}>Cancelar</button>
              <button className="submit-btn" onClick={handleSendEmail} disabled={sendingEmail}>
                {sendingEmail ? '⏳ Enviando...' : '📤 Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

// Componentes de Loading
function Spinner({ size = '20px', color = '#007bff' }) {
  return (
    <div
      className="spinner"
      style={{
        width: size,
        height: size,
        borderColor: `${color}33`,
        borderTopColor: color
      }}
    />
  );
}

function CurrencyConverter({ currencies, exchangeRates, activeCurrency }) {
  const [fromCur, setFromCur] = React.useState('BRL');
  const [toCur, setToCur] = React.useState(activeCurrency || 'USD');
  const [amount, setAmount] = React.useState('100');

  React.useEffect(() => { setToCur(activeCurrency || 'USD'); }, [activeCurrency]);

  const result = React.useMemo(() => {
    const val = parseFloat(amount);
    if (!val || isNaN(val) || !exchangeRates) return null;
    const rates = exchangeRates; // rates relative to BRL
    let brlVal = fromCur === 'BRL' ? val : val / (rates[fromCur] || 1);
    let out = toCur === 'BRL' ? brlVal : brlVal * (rates[toCur] || 1);
    return out;
  }, [amount, fromCur, toCur, exchangeRates]);

  const cur = currencies || [];
  const fmt = (v, code) => {
    const c = cur.find(x => x.code === code);
    if (!c) return v.toFixed(2);
    const sym = c.symbol || code;
    if (['JPY', 'CLP', 'PYG'].includes(code)) return sym + ' ' + Math.round(v).toLocaleString('pt-BR');
    return sym + ' ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="mini-converter">
      <div className="mini-conv-row">
        <input
          className="mini-conv-input"
          type="number"
          value={amount}
          min="0"
          onChange={e => setAmount(e.target.value)}
        />
        <select className="mini-conv-select" value={fromCur} onChange={e => setFromCur(e.target.value)}>
          {cur.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
        </select>
        <span className="mini-conv-arrow">→</span>
        <select className="mini-conv-select" value={toCur} onChange={e => setToCur(e.target.value)}>
          {cur.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
        </select>
      </div>
      {result !== null && (
        <div className="mini-conv-result">
          = {fmt(result, toCur)}
        </div>
      )}
    </div>
  );
}

function ButtonSpinner({ loading, children, onClick, className = '', disabled = false, ...props }) {
  return (
    <button
      className={`${className} ${loading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="16px" color="currentColor" />
          <span style={{ marginLeft: '8px' }}>Carregando...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

function LoadingOverlay({ show, message = 'Carregando...' }) {
  if (!show) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <Spinner size="40px" />
        <span>{message}</span>
      </div>
    </div>
  );
}

// Componente de Login otimizado com React.memo
const Login = React.memo(({ onLogin, loadingAuth, setLoadingAuth }) => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  // Recuperação de senha
  const [forgotStep, setForgotStep] = useState(null); // null | 'email' | 'reset'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [demoCode, setDemoCode] = useState('');

  // Otimizar handleSubmit com useCallback para API
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoadingAuth(true);

    try {
      // Fazer login via API
      const response = await fetch(`${config.API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Login bem-sucedido - repassar token para o App
        const user = {
          name: data.user.name,
          email: data.user.email,
          id: data.user.id
        };

        onLogin(user, data.token);
        toast.success('Login realizado com sucesso!');
      } else {
        // Login falhou
        toast.error(data.error || 'Email ou senha incorretos!');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoadingAuth(false);
    }
  }, [credentials, onLogin, setLoadingAuth]);

  // Otimizar handlers de input com useCallback
  const handleEmailChange = useCallback((e) => {
    setCredentials(prev => ({ ...prev, email: e.target.value }));
  }, []);

  const handlePasswordChange = useCallback((e) => {
    setCredentials(prev => ({ ...prev, password: e.target.value }));
  }, []);

  const handleForgotRequest = useCallback(async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const resp = await fetch(`${config.API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await resp.json();
      if (resp.ok) {
        if (data.demo && data.token) {
          setDemoCode(data.token);
          setForgotCode(data.token);
        }
        setForgotStep('reset');
        toast.success(data.demo ? '⚠️ Modo demo: código exibido na tela' : 'Código enviado para o e-mail!');
      } else {
        toast.error(data.error || 'Erro ao solicitar recuperação');
      }
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setForgotLoading(false);
    }
  }, [forgotEmail]);

  const handleResetPassword = useCallback(async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem.'); return; }
    if (newPassword.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres.'); return; }
    setForgotLoading(true);
    try {
      const resp = await fetch(`${config.API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, token: forgotCode, newPassword })
      });
      const data = await resp.json();
      if (resp.ok) {
        toast.success('Senha alterada com sucesso! Faça login.');
        setForgotStep(null);
        setForgotCode('');
        setNewPassword('');
        setConfirmPassword('');
        setDemoCode('');
      } else {
        toast.error(data.error || 'Código inválido ou expirado');
      }
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setForgotLoading(false);
    }
  }, [forgotEmail, forgotCode, newPassword, confirmPassword]);

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>💰 Gestor Financeiro</h1>
        {!forgotStep && (<>
          <h2>🔐 Login</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>👤 Email:</label>
              <input
                type="email"
                value={credentials.email}
                onChange={handleEmailChange}
                placeholder="Digite seu email"
                required
              />
            </div>
            <div className="form-group">
              <label>🔑 Senha:</label>
              <input
                type="password"
                value={credentials.password}
                onChange={handlePasswordChange}
                placeholder="Digite sua senha"
                required
              />
            </div>
            <ButtonSpinner
              type="submit"
              className="login-btn"
              loading={loadingAuth}
            >
              Entrar
            </ButtonSpinner>
          </form>
          <div className="forgot-link-wrap">
            <button
              type="button"
              className="forgot-link"
              onClick={() => { setForgotStep('email'); setForgotEmail(credentials.email || ''); }}
            >
              🔑 Esqueceu a senha?
            </button>
          </div>
        </>)}

        {forgotStep === 'email' && (
          <form onSubmit={handleForgotRequest} className="forgot-form">
            <h2>🔑 Recuperar Senha</h2>
            <p className="forgot-info">Informe seu e-mail para receber o código (válido por 15 min).</p>
            <div className="form-group">
              <label>📧 E-mail cadastrado:</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                required
                autoFocus
              />
            </div>
            <ButtonSpinner type="submit" className="login-btn" loading={forgotLoading}>
              Enviar Código
            </ButtonSpinner>
            <button type="button" className="forgot-back-btn" onClick={() => setForgotStep(null)}>
              ← Voltar ao login
            </button>
          </form>
        )}

        {forgotStep === 'reset' && (
          <form onSubmit={handleResetPassword} className="forgot-form">
            <h2>🔐 Nova Senha</h2>
            {demoCode && (
              <div className="demo-code-box">
                ⚠️ Modo demo — Código: <strong>{demoCode}</strong>
              </div>
            )}
            <div className="form-group">
              <label>🔑 Código recebido:</label>
              <input
                type="text"
                inputMode="numeric"
                value={forgotCode}
                onChange={e => setForgotCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
                style={{ letterSpacing: '6px', fontSize: '1.3rem', textAlign: 'center' }}
              />
            </div>
            <div className="form-group">
              <label>🔒 Nova senha:</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
            </div>
            <div className="form-group">
              <label>🔒 Confirmar nova senha:</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" required />
            </div>
            <ButtonSpinner type="submit" className="login-btn" loading={forgotLoading}>
              Redefinir Senha
            </ButtonSpinner>
            <button type="button" className="forgot-back-btn" onClick={() => setForgotStep('email')}>
              ← Voltar
            </button>
          </form>
        )}

        <div className="login-info">
          <p><strong>Sistema:</strong> Gestor Financeiro</p>
          <p><strong>Status:</strong> Conectado à API</p>
        </div>

        <div className="login-actions">
          <button
            type="button"
            className="clear-data-btn"
            onClick={() => {
              if (window.confirm('⚠️ ATENÇÃO: Isso vai limpar apenas os dados do navegador (não os dados do servidor). Deseja continuar?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
          >
            🧹 Limpar Cache do Navegador
          </button>
        </div>
      </div>
    </div>
  );
});

// Componente para gerenciar usuários (apenas admin)
function GerenciarUsuarios() {
  const [users, setUsers] = useState([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  // Carregar usuários da API
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_URL}/admin/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error('Erro ao carregar usuários');
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro de conexão ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Adicionar novo usuário via API
  const handleAddUser = async (e) => {
    e.preventDefault();

    if (newUser.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres!');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${config.API_URL}/admin/register-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Usuário cadastrado com sucesso!');
        setNewUser({ email: '', password: '', name: '' });
        setIsAddingUser(false);
        loadUsers();
      } else {
        toast.error(data.error || 'Erro ao cadastrar usuário');
      }
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      toast.error('Erro de conexão ao cadastrar usuário');
    } finally {
      setLoading(false);
    }
  };

  // Abrir formulário de edição
  const handleStartEdit = (user) => {
    setEditingUser(user.id);
    setEditForm({ name: user.name, email: user.email, password: '' });
    setIsAddingUser(false);
  };

  // Salvar edição do usuário
  const handleUpdateUser = async (e) => {
    e.preventDefault();

    if (editForm.password && editForm.password.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres!');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${config.API_URL}/admin/users/${editingUser}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Usuário atualizado com sucesso!');
        setEditingUser(null);
        setEditForm({ name: '', email: '', password: '' });
        loadUsers();
      } else {
        toast.error(data.error || 'Erro ao atualizar usuário');
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro de conexão ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  // Remover usuário via API
  const handleRemoveUser = async (userId, userEmail) => {
    if (userEmail === 'junior395@gmail.com') {
      toast.error('Não é possível remover o administrador principal!');
      return;
    }

    if (window.confirm(`Deseja realmente remover o usuário ${userEmail}?`)) {
      try {
        setLoading(true);
        const response = await fetch(`${config.API_URL}/admin/users/${userId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          toast.success('Usuário removido com sucesso!');
          loadUsers();
        } else {
          const data = await response.json();
          toast.error(data.error || 'Erro ao remover usuário');
        }
      } catch (error) {
        console.error('Erro ao remover usuário:', error);
        toast.error('Erro de conexão ao remover usuário');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="usuarios-management">
      <h2>👥 Gerenciar Usuários</h2>

      <div className="users-actions">
        <button
          onClick={() => { setIsAddingUser(!isAddingUser); setEditingUser(null); }}
          className="add-user-btn"
        >
          {isAddingUser ? '❌ Cancelar' : '➕ Adicionar Usuário'}
        </button>
      </div>

      {isAddingUser && (
        <div className="add-user-form">
          <h3>Adicionar Novo Usuário</h3>
          <form onSubmit={handleAddUser}>
            <div className="form-group">
              <label>👤 Email:</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>👨‍💼 Nome:</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>🔑 Senha:</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                minLength="6"
              />
            </div>
            <ButtonSpinner
              type="submit"
              className="submit-btn"
              loading={loading}
            >
              Cadastrar
            </ButtonSpinner>
          </form>
        </div>
      )}

      <div className="users-list">
        <h3>Usuários Cadastrados</h3>
        {loading ? (
          <p>Carregando usuários...</p>
        ) : users.length === 0 ? (
          <p>Nenhum usuário cadastrado</p>
        ) : (
          users.map(user => (
            <div key={user.id} className="user-card">
              {editingUser === user.id ? (
                <form onSubmit={handleUpdateUser} className="edit-user-form">
                  <h4>✏️ Editar Usuário</h4>
                  <div className="form-group">
                    <label>Nome:</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email:</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Nova Senha (deixe em branco para manter):</label>
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      minLength="6"
                      placeholder="Deixe em branco para não alterar"
                    />
                  </div>
                  <div className="edit-form-actions">
                    <ButtonSpinner type="submit" className="submit-btn" loading={loading}>
                      💾 Salvar
                    </ButtonSpinner>
                    <button type="button" onClick={() => setEditingUser(null)} className="cancel-btn">
                      ❌ Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="user-info">
                    <h4>{user.name}</h4>
                    <p>{user.email}</p>
                    <small>Cadastrado: {new Date(user.created_at).toLocaleDateString()}</small>
                  </div>
                  <div className="user-actions">
                    <button
                      onClick={() => handleStartEdit(user)}
                      className="edit-btn"
                    >
                      ✏️ Editar
                    </button>
                    {user.email !== 'junior395@gmail.com' && (
                      <ButtonSpinner
                        onClick={() => handleRemoveUser(user.id, user.email)}
                        className="remove-btn"
                        loading={loading}
                      >
                        🗑️ Remover
                      </ButtonSpinner>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Componente de Gerenciamento de Categorias
const CategoryManagement = React.memo(({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}) => {
  const [activeType, setActiveType] = useState('despesa');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '💰',
    color: '#6b7280'
  });

  // Resetar formulário
  const resetForm = useCallback(() => {
    setCategoryForm({ name: '', icon: '💰', color: '#6b7280' });
    setIsAddingCategory(false);
    setEditingCategory(null);
  }, []);

  // Preparar edição
  const startEdit = useCallback((category) => {
    setCategoryForm({
      name: category.name,
      icon: category.icon,
      color: category.color
    });
    setEditingCategory(category);
    setIsAddingCategory(false);
  }, []);

  // Submeter formulário
  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (editingCategory) {
      // Atualizar categoria existente
      if (onUpdateCategory(activeType, editingCategory.id, categoryForm)) {
        resetForm();
      }
    } else {
      // Adicionar nova categoria
      if (onAddCategory(activeType, categoryForm)) {
        resetForm();
      }
    }
  }, [editingCategory, activeType, categoryForm, onUpdateCategory, onAddCategory, resetForm]);

  // Confirmar exclusão
  const handleDelete = useCallback((category) => {
    if (window.confirm(`Deseja realmente excluir a categoria "${category.name}"?`)) {
      onDeleteCategory(activeType, category.id);
    }
  }, [activeType, onDeleteCategory]);

  return (
    <div className="category-management">
      <h2>🏷️ Gerenciar Categorias</h2>

      <div className="category-type-tabs">
        <button
          className={activeType === 'despesa' ? 'active' : ''}
          onClick={() => setActiveType('despesa')}
        >
          💸 Despesas
        </button>
        <button
          className={activeType === 'entrada' ? 'active' : ''}
          onClick={() => setActiveType('entrada')}
        >
          💵 Receitas
        </button>
      </div>

      <div className="category-actions">
        <button
          className="add-category-btn"
          onClick={() => setIsAddingCategory(true)}
          disabled={isAddingCategory || editingCategory}
        >
          ➕ Nova Categoria
        </button>
      </div>

      {(isAddingCategory || editingCategory) && (
        <form className="category-form" onSubmit={handleSubmit}>
          <h3>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>

          <div className="form-group">
            <label>Nome da Categoria:</label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="Ex: Educação, Investimentos..."
              maxLength={30}
              required
            />
          </div>

          <div className="form-group">
            <label>Ícone:</label>
            <div className="icon-selector">
              {CategoryManager.availableIcons.map(icon => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-option ${categoryForm.icon === icon ? 'selected' : ''}`}
                  onClick={() => setCategoryForm({ ...categoryForm, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Cor:</label>
            <div className="color-selector">
              {CategoryManager.availableColors.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${categoryForm.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCategoryForm({ ...categoryForm, color })}
                />
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="save-btn">
              {editingCategory ? 'Atualizar' : 'Criar'} Categoria
            </button>
            <button type="button" className="cancel-btn" onClick={resetForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="categories-list">
        <h3>Categorias de {activeType === 'entrada' ? 'Receitas' : 'Despesas'}</h3>

        <div className="categories-grid">
          {categories[activeType]?.map(category => (
            <div
              key={category.id}
              className={`category-item ${category.custom ? 'custom' : 'default'}`}
              style={{ borderLeftColor: category.color }}
            >
              <div className="category-info">
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
                {category.custom && <span className="custom-badge">Personalizada</span>}
              </div>

              {category.custom && (
                <div className="category-actions">
                  <button
                    className="edit-btn"
                    onClick={() => startEdit(category)}
                    disabled={isAddingCategory || editingCategory}
                  >
                    ✏️
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(category)}
                    disabled={isAddingCategory || editingCategory}
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Dashboard com resumo financeiro otimizado
const Dashboard = React.memo(({ transactions, dueAlerts, budgets = [], goals = [], categories, wallets = [], fmtCurrency }) => {
  // Fallback para BRL se fmtCurrency não disponível
  const fmt = fmtCurrency || ((v) => 'R$ ' + v.toFixed(2));
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = prevDate.toISOString().slice(0, 7);

  // Dados dos últimos 6 meses para o gráfico de barras
  const last6Months = useMemo(() => {
    const nowD = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(nowD.getFullYear(), nowD.getMonth() - 5 + i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const entradas = transactions
        .filter(t => t.type === 'entrada' && t.date.startsWith(key))
        .reduce((s, t) => s + parseFloat(t.value), 0);
      const despesas = transactions
        .filter(t => t.type === 'despesa' && t.date.startsWith(key))
        .reduce((s, t) => s + parseFloat(t.value), 0);
      return { label, entradas, despesas };
    });
  }, [transactions]);

  // Mapeamento ID→nome para calcular gastos por orçamento
  const categoriasDesp = categories?.despesa || [
    { id: 'alim', name: 'Alimentação' }, { id: 'trans', name: 'Transporte' },
    { id: 'mor', name: 'Moradia' }, { id: 'sau', name: 'Saúde' },
    { id: 'laz', name: 'Lazer' }, { id: 'out-desp', name: 'Outros' }
  ];

  const getCatIds = (name) =>
    categoriasDesp.filter(c => c.name.toLowerCase() === name.toLowerCase()).map(c => c.id);

  const allCatsFlat = useMemo(() =>
    [...(categories?.entrada || []), ...(categories?.despesa || [])],
    [categories]
  );
  const resolveCat = (id) => {
    if (!id || id === 'transferencia') return id === 'transferencia' ? 'Transferência' : id;
    const found = allCatsFlat.find(c => c.id === id);
    return found ? `${found.icon ? found.icon + ' ' : ''}${found.name}` : id;
  };

  // Transações do mês atual
  const monthlyTransactions = useMemo(() =>
    transactions.filter(t => t.date.startsWith(currentMonth)),
    [transactions, currentMonth]
  );

  // Transações do mês anterior
  const prevMonthTransactions = useMemo(() =>
    transactions.filter(t => t.date.startsWith(prevMonth)),
    [transactions, prevMonth]
  );

  const totalEntradas = useMemo(() =>
    monthlyTransactions.filter(t => t.type === 'entrada').reduce((s, t) => s + parseFloat(t.value), 0),
    [monthlyTransactions]
  );
  const totalDespesas = useMemo(() =>
    monthlyTransactions.filter(t => t.type === 'despesa').reduce((s, t) => s + parseFloat(t.value), 0),
    [monthlyTransactions]
  );
  const saldo = useMemo(() => totalEntradas - totalDespesas, [totalEntradas, totalDespesas]);
  const taxaPoupanca = useMemo(() =>
    totalEntradas > 0 ? ((totalEntradas - totalDespesas) / totalEntradas * 100) : 0,
    [totalEntradas, totalDespesas]
  );

  const prevEntradas = useMemo(() =>
    prevMonthTransactions.filter(t => t.type === 'entrada').reduce((s, t) => s + parseFloat(t.value), 0),
    [prevMonthTransactions]
  );
  const prevDespesas = useMemo(() =>
    prevMonthTransactions.filter(t => t.type === 'despesa').reduce((s, t) => s + parseFloat(t.value), 0),
    [prevMonthTransactions]
  );

  // Gastos por categoria no mês (para o gráfico de pizza)
  const pieData = useMemo(() => {
    const map = {};
    monthlyTransactions
      .filter(t => t.type === 'despesa' && t.category !== 'transferencia')
      .forEach(t => {
        const name = resolveCat(t.category);
        map[name] = (map[name] || 0) + parseFloat(t.value);
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyTransactions]);

  const PIE_COLORS = ['#6366f1', '#e74c3c', '#f59e0b', '#2ecc71', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

  const pctChange = (curr, prev) => {
    if (prev === 0) return curr > 0 ? '+100%' : '—';
    const p = ((curr - prev) / prev * 100);
    return (p >= 0 ? '+' : '') + p.toFixed(0) + '%';
  };
  const pctColor = (curr, prev, inverse = false) => {
    if (prev === 0) return '#64748b';
    const up = curr >= prev;
    if (inverse) return up ? '#e74c3c' : '#2ecc71';
    return up ? '#2ecc71' : '#e74c3c';
  };

  // Alertas de metas próximas do prazo (≤30 dias)
  const goalAlerts = useMemo(() => goals.filter(g => {
    if (!g.deadline) return false;
    const deadline = new Date(g.deadline + 'T00:00:00');
    const diff = Math.ceil((deadline - now) / 86400000);
    return diff >= 0 && diff <= 30 && parseFloat(g.current_amount || 0) < parseFloat(g.target_amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [goals]);

  return (
    <div className="dashboard">
      <h2>📊 Dashboard — {now.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })}</h2>

      {/* 4 Cards do mês */}
      <div className="cards cards-4">
        <div className="card entradas">
          <div className="card-label">💵 ENTRADAS</div>
          <div className="card-value">{fmt(totalEntradas)}</div>
          {prevEntradas > 0 || totalEntradas > 0 ? (
            <div className="card-trend" style={{ color: pctColor(totalEntradas, prevEntradas) }}>
              {pctChange(totalEntradas, prevEntradas)} vs mês anterior
            </div>
          ) : null}
        </div>
        <div className="card despesas">
          <div className="card-label">💸 DESPESAS</div>
          <div className="card-value">{fmt(totalDespesas)}</div>
          {prevDespesas > 0 || totalDespesas > 0 ? (
            <div className="card-trend" style={{ color: pctColor(totalDespesas, prevDespesas, true) }}>
              {pctChange(totalDespesas, prevDespesas)} vs mês anterior
            </div>
          ) : null}
        </div>
        <div className={`card saldo ${saldo >= 0 ? 'positive' : 'negative'}`}>
          <div className="card-label">🔥 SALDO</div>
          <div className="card-value">{fmt(saldo)}</div>
          <div className="card-trend" style={{ color: saldo >= 0 ? '#2ecc71' : '#e74c3c' }}>
            {saldo >= 0 ? '✅ Positivo' : '⚠️ Negativo'}
          </div>
        </div>
        <div className={`card poupanca ${taxaPoupanca >= 20 ? 'positive' : taxaPoupanca >= 0 ? '' : 'negative'}`}>
          <div className="card-label">💰 POUPANÇA</div>
          <div className="card-value">{taxaPoupanca.toFixed(1)}%</div>
          <div className="card-trend" style={{ color: taxaPoupanca >= 20 ? '#2ecc71' : taxaPoupanca >= 0 ? '#f59e0b' : '#e74c3c' }}>
            {taxaPoupanca >= 20 ? '🌟 Excelente' : taxaPoupanca >= 10 ? '👍 Bom' : taxaPoupanca >= 0 ? '⚠️ Atenção' : '🔴 Negativo'}
          </div>
        </div>
      </div>

      {/* Gráficos lado a lado */}
      <div className="dashboard-charts-grid">
        {/* Gráfico de barras — últimos 6 meses */}
        <div className="chart-section">
          <h3>📊 Evolução dos Últimos 6 Meses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={last6Months} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => [`R$ ${value.toFixed(2)}`, undefined]} />
              <Legend />
              <Bar dataKey="entradas" name="Entradas" fill="#2ecc71" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#e74c3c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de pizza — gastos por categoria no mês */}
        <div className="chart-section">
          <h3>🥧 Gastos por Categoria — {now.toLocaleDateString('pt-BR', { month: 'long' })}</h3>
          {pieData.length === 0 ? (
            <div className="empty-chart">Sem despesas no mês atual</div>
          ) : (
            <div className="pie-chart-wrapper">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`R$ ${value.toFixed(2)}`, undefined]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieData.map((entry, i) => (
                  <div key={i} className="pie-legend-item">
                    <span className="pie-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="pie-name">{entry.name}</span>
                    <span className="pie-val">R$ {entry.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progresso das Metas */}
      {goals.length > 0 && (
        <div className="dashboard-goals">
          <h3>🏆 Progresso das Metas</h3>
          <div className="goals-grid">
            {goals.slice(0, 6).map(g => {
              const curr = parseFloat(g.current_amount || 0);
              const target = parseFloat(g.target_amount);
              const pct = Math.min((curr / target) * 100, 100);
              const falta = Math.max(target - curr, 0);
              const done = curr >= target;
              return (
                <div key={g.id} className={`dash-goal-card ${done ? 'completed' : ''}`}>
                  <div className="dash-goal-header">
                    <span className="dash-goal-name">{done ? '✅ ' : '🎯 '}{g.name}</span>
                    <span className="dash-goal-pct">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="dash-goal-bar-wrap">
                    <div className="dash-goal-bar" style={{
                      width: `${pct}%`,
                      background: done ? '#2ecc71' : pct >= 75 ? '#6366f1' : pct >= 40 ? '#f59e0b' : '#e74c3c'
                    }} />
                  </div>
                  <div className="dash-goal-amounts">
                    <span>{fmt(curr)}</span>
                    <span style={{ color: '#94a3b8' }}>/ {fmt(target)}</span>
                    {!done && <span className="dash-goal-falta">Falta {fmt(falta)}</span>}
                  </div>
                  {g.deadline && (
                    <div className="dash-goal-deadline">
                      📅 {new Date(g.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alertas de Vencimento de Recorrentes */}
      {dueAlerts.length > 0 && (
        <div className="due-alerts">
          <h3>⚠️ Alertas de Vencimento</h3>
          {dueAlerts.map(alert => (
            <div key={alert.id} className={`alert-item ${alert.overdue ? 'overdue' : 'due-soon'}`}>
              <div className="alert-info">
                <span className="alert-description">{alert.description}</span>
                <span className="alert-value">R$ {parseFloat(alert.value).toFixed(2)}</span>
              </div>
              <div className="alert-date">
                <span className={`alert-status ${alert.overdue ? 'overdue' : 'due-soon'}`}>
                  {alert.overdue ? '🔴 Vencida' : `🟡 Vence em ${alert.daysUntilDue} dia(s)`}
                </span>
                <span className="alert-due-date">{alert.nextDue}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alertas de Metas com prazo próximo */}
      {goalAlerts.length > 0 && (
        <div className="due-alerts" style={{ borderLeftColor: '#8b5cf6' }}>
          <h3>🎯 Metas com Prazo Próximo</h3>
          {goalAlerts.map(g => {
            const curr = parseFloat(g.current_amount || 0);
            const target = parseFloat(g.target_amount);
            const diff = Math.ceil((new Date(g.deadline + 'T00:00:00') - now) / 86400000);
            const falta = target - curr;
            return (
              <div key={g.id} className="alert-item due-soon">
                <div className="alert-info">
                  <span className="alert-description">{g.name}</span>
                  <span className="alert-value">Falta {fmt(falta)}</span>
                </div>
                <div className="alert-date">
                  <span className="alert-status due-soon">🟡 Prazo em {diff} dia(s)</span>
                  <span className="alert-due-date">{new Date(g.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resumo de Orçamentos */}
      {budgets.length > 0 && (
        <div className="dashboard-budgets">
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            📊 Orçamentos do Mês
          </h3>
          <div className="dashboard-budget-grid">
            {budgets.filter(b => b.period === 'monthly' || b.period === 'mensal').map(b => {
              const catIds = getCatIds(b.category);
              const spent = transactions
                .filter(t => {
                  if (t.type !== 'despesa') return false;
                  if (!catIds.includes(t.category)) return false;
                  const d = new Date(t.date + (t.date.includes('T') ? '' : 'T00:00:00'));
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                })
                .reduce((s, t) => s + parseFloat(t.value || 0), 0);
              const limit = parseFloat(b.limit_value);
              const pct = Math.min((spent / limit) * 100, 100);
              const over = spent > limit;
              const catMeta = categoriasDesp.find(c => c.name.toLowerCase() === b.category.toLowerCase());
              return (
                <div key={b.id} className={`dashboard-budget-item ${over ? 'over-budget' : ''}`}>
                  <div className="db-budget-header">
                    <span className="db-budget-name">{catMeta?.icon ? `${catMeta.icon} ` : ''}{b.category}</span>
                    <span className={`db-budget-pct ${over ? 'text-danger' : ''}`}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="budget-bar-wrap">
                    <div className="budget-bar" style={{ width: `${pct}%`, background: over ? '#e74c3c' : pct > 80 ? '#f39c12' : '#2ecc71' }} />
                  </div>
                  <div className="db-budget-amounts">
                    <span className={over ? 'text-danger' : ''}>{fmt(spent)}</span>
                    <span style={{ color: '#94a3b8' }}>/ {fmt(limit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Saldo das contas */}
      {wallets.length > 0 && (
        <div className="dashboard-wallets">
          <h3>🏦 Saldo das Contas</h3>
          <div className="dash-wallets-grid">
            {wallets.map(w => (
              <div key={w.id} className="dash-wallet-card">
                <div className="dash-wallet-name">{w.name}</div>
                <div className={`dash-wallet-balance ${parseFloat(w.balance) >= 0 ? 'positive' : 'negative'}`}>
                  {fmt(parseFloat(w.balance))}
                </div>
                {w.type && <div className="dash-wallet-type">{w.type}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="recent-transactions">
        <h3>📋 Últimas Transações</h3>
        {transactions.length === 0 ? (
          <p className="no-transactions">Nenhuma transação encontrada</p>
        ) : (
          transactions.slice(-5).reverse().map(transaction => (
            <div key={transaction.id} className={`transaction-item ${transaction.type}`}>
              <div className="transaction-info">
                <span className="transaction-icon">
                  {transaction.type === 'entrada' ? '💵' : '💸'}
                </span>
                <div className="transaction-details">
                  <span className="transaction-description">{transaction.description}</span>
                  <span className="transaction-category">🏷️ {resolveCat(transaction.category)}</span>
                </div>
              </div>
              <div className="transaction-amount">
                <span className={`amount ${transaction.type}`}>
                  {transaction.type === 'entrada' ? '+' : '-'}{fmt(parseFloat(transaction.value))}
                </span>
                <span className="transaction-date">📅 {new Date(transaction.date).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

// Componente de Despesas Recorrentes
function DespesasRecorrentes({ expenses, onAdd, onDelete, onPay, onUpdate }) {
  const [form, setForm] = useState({
    description: '', value: '', category: '',
    recurrence: 'monthly', startDate: new Date().toISOString().slice(0, 10)
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);

  const recurrenceOptions = [
    { value: 'monthly', label: 'Mensal' },
    { value: 'bimonthly', label: 'Bimestral' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'semiannual', label: 'Semestral' },
    { value: 'annual', label: 'Anual' },
    { value: 'fifth-business-day', label: 'Quinto Dia Útil' }
  ];
  const categorias = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Outros'];
  const formatRec = (r) => recurrenceOptions.find(o => o.value === r)?.label || r;

  const getDueStatus = (nextDue) => {
    if (!nextDue) return { label: '—', cls: '' };
    const today = new Date();
    const due = new Date(nextDue + 'T00:00:00');
    const diff = Math.ceil((due - today) / 86400000);
    if (diff < 0) return { label: `Vencida há ${Math.abs(diff)}d`, cls: 'overdue' };
    if (diff === 0) return { label: 'Vence hoje!', cls: 'overdue' };
    if (diff <= 7) return { label: `Vence em ${diff}d`, cls: 'due-soon' };
    return { label: `${due.toLocaleDateString('pt-BR')}`, cls: 'ok' };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description || !form.value || !form.category) { toast.error('Preencha todos os campos!'); return; }
    if (parseFloat(form.value) <= 0) { toast.error('Valor deve ser maior que zero!'); return; }
    onAdd({ ...form, value: parseFloat(form.value) });
    setForm({ description: '', value: '', category: '', recurrence: 'monthly', startDate: new Date().toISOString().slice(0, 10) });
    setShowAddForm(false);
  };

  const startEdit = (exp) => {
    setEditingId(exp.id);
    setEditForm({
      description: exp.description,
      category: exp.category,
      value: exp.value,
      frequency: exp.frequency || exp.recurrence,
      next_due_date: exp.next_due_date || exp.nextDue,
      is_active: 1
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const ok = await onUpdate(editingId, editForm);
    if (ok) setEditingId(null);
  };

  return (
    <div className="recurring-expenses">
      <div className="section-header">
        <h2>🔄 Despesas Recorrentes</h2>
        <button className="add-user-btn" onClick={() => setShowAddForm(v => !v)}>
          {showAddForm ? '❌ Cancelar' : '➕ Nova Recorrente'}
        </button>
      </div>

      {showAddForm && (
        <div className="add-user-form">
          <h3>Nova Despesa Recorrente</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Descrição</label>
                <input type="text" placeholder="Ex: Aluguel, Internet..." value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Valor (R$)</label>
                <input type="number" step="0.01" placeholder="0,00" value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Categoria</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                  <option value="">Selecione...</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Recorrência</label>
                <select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })}>
                  {recurrenceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Data de início</label>
                <input type="date" value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })} required />
              </div>
            </div>
            <button type="submit" className="submit-btn">✅ Adicionar</button>
          </form>
        </div>
      )}

      <div className="recurring-list">
        {expenses.length === 0 ? (
          <p className="empty-message">Nenhuma despesa recorrente cadastrada</p>
        ) : (
          expenses.map(exp => {
            const dueKey = exp.next_due_date || exp.nextDue;
            const status = getDueStatus(dueKey);
            return (
              <div key={exp.id} className={`recurring-item ${status.cls}`}>
                {editingId === exp.id ? (
                  <form onSubmit={handleUpdate} className="edit-recurring-form">
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>Descrição</label>
                        <input type="text" value={editForm.description}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Valor (R$)</label>
                        <input type="number" step="0.01" value={editForm.value}
                          onChange={e => setEditForm({ ...editForm, value: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Categoria</label>
                        <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Recorrência</label>
                        <select value={editForm.frequency} onChange={e => setEditForm({ ...editForm, frequency: e.target.value })}>
                          {recurrenceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Próximo Vencimento</label>
                        <input type="date" value={editForm.next_due_date}
                          onChange={e => setEditForm({ ...editForm, next_due_date: e.target.value })} required />
                      </div>
                    </div>
                    <div className="edit-form-actions">
                      <button type="submit" className="submit-btn">💾 Salvar</button>
                      <button type="button" className="cancel-btn" onClick={() => setEditingId(null)}>❌ Cancelar</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="recurring-info">
                      <h4>{exp.description}</h4>
                      <p className="recurring-details">
                        <span className="category-badge">{exp.category}</span>
                        <span className="rec-badge">{formatRec(exp.frequency || exp.recurrence)}</span>
                      </p>
                      <span className={`due-badge ${status.cls}`}>{status.label}</span>
                    </div>
                    <div className="recurring-actions">
                      <span className="recurring-value">R$ {parseFloat(exp.value).toFixed(2)}</span>
                      <button className="pay-btn" onClick={() => onPay(exp)} title="Marcar como pago">✅ Pago</button>
                      <button className="edit-btn" onClick={() => startEdit(exp)} title="Editar">✏️</button>
                      <button className="delete-btn" onClick={() => onDelete(exp.id)} title="Excluir">🗑️</button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


// Componente Orçamentos
function Orcamentos({ budgets, transactions, categories, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState({ category: '', limit_value: '', period: 'monthly' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLimit, setEditLimit] = useState('');

  // Categorias de despesa disponíveis (padrão + customizadas)
  const categoriasDesp = (categories?.despesa || [
    { id: 'alim', name: 'Alimentação' }, { id: 'trans', name: 'Transporte' },
    { id: 'mor', name: 'Moradia' }, { id: 'sau', name: 'Saúde' },
    { id: 'laz', name: 'Lazer' }, { id: 'out-desp', name: 'Outros' }
  ]);
  const periodos = [{ value: 'monthly', label: 'Mensal' }, { value: 'annual', label: 'Anual' }];

  const now = new Date();

  // Retorna os IDs de categoria que correspondem ao nome do orçamento
  const getCatIds = (name) =>
    categoriasDesp.filter(c => c.name.toLowerCase() === name.toLowerCase()).map(c => c.id);

  const getSpent = (catName, period) => {
    const catIds = getCatIds(catName);
    return transactions
      .filter(t => {
        if (t.type !== 'despesa') return false;
        // Transpação armazena category como ID (ex: 'mor'); compara diretamente com os IDs do orçamento
        if (!catIds.includes(t.category)) return false;
        const d = new Date(t.date + (t.date.includes('T') ? '' : 'T00:00:00'));
        if (period === 'monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return d.getFullYear() === now.getFullYear();
      })
      .reduce((s, t) => s + parseFloat(t.value || 0), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.category || !form.limit_value) { toast.error('Preencha todos os campos!'); return; }
    onAdd({ ...form, limit_value: parseFloat(form.limit_value) });
    setForm({ category: '', limit_value: '', period: 'monthly' });
    setShowForm(false);
  };

  return (
    <div className="orcamentos-section">
      <div className="section-header">
        <h2>📊 Orçamentos</h2>
        <button className="add-user-btn" onClick={() => setShowForm(v => !v)}>
          {showForm ? '❌ Cancelar' : '➕ Novo Orçamento'}
        </button>
      </div>

      {showForm && (
        <div className="add-user-form">
          <h3>Novo Orçamento</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Categoria</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                  <option value="">Selecione...</option>
                  {categoriasDesp.map(c => <option key={c.id} value={c.name}>{c.icon ? `${c.icon} ${c.name}` : c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Limite (R$)</label>
                <input type="number" step="0.01" placeholder="0,00" value={form.limit_value}
                  onChange={e => setForm({ ...form, limit_value: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Período</label>
                <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                  {periodos.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="submit-btn">✅ Adicionar</button>
          </form>
        </div>
      )}

      <div className="budget-list">
        {budgets.length === 0 ? (
          <p className="empty-message">Nenhum orçamento cadastrado</p>
        ) : (
          budgets.map(b => {
            const spent = getSpent(b.category, b.period);
            const limit = parseFloat(b.limit_value);
            const pct = Math.min((spent / limit) * 100, 100);
            const overBudget = spent > limit;
            const catMeta = categoriasDesp.find(c => c.name.toLowerCase() === b.category.toLowerCase());
            return (
              <div key={b.id} className={`budget-card ${overBudget ? 'over-budget' : ''}`}>
                <div className="budget-header">
                  <div>
                    <h4>{catMeta?.icon ? `${catMeta.icon} ` : ''}{b.category}</h4>
                    <span className="period-badge">{periodos.find(p => p.value === b.period)?.label}</span>
                  </div>
                  <button className="edit-btn" onClick={() => { setEditingId(b.id); setEditLimit(b.limit_value); }} title="Editar limite">✏️</button>
                  <button className="delete-btn" onClick={() => onDelete(b.id)}>🗑️</button>
                </div>
                {editingId === b.id && (
                  <form onSubmit={async e => { e.preventDefault(); const ok = await onUpdate(b.id, { limit_value: parseFloat(editLimit) }); if (ok) setEditingId(null); }}
                    style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                    <label style={{ fontSize: '13px', color: '#64748b' }}>Novo limite:</label>
                    <input type="number" step="0.01" value={editLimit} onChange={e => setEditLimit(e.target.value)}
                      style={{ width: '110px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <button type="submit" className="submit-btn" style={{ padding: '4px 12px' }}>💾</button>
                    <button type="button" className="cancel-btn" style={{ padding: '4px 10px' }} onClick={() => setEditingId(null)}>✕</button>
                  </form>
                )}
                <div className="budget-amounts">
                  <span className={`spent ${overBudget ? 'text-danger' : ''}`}>Gasto: R$ {spent.toFixed(2)}</span>
                  <span className="limit">Limite: R$ {limit.toFixed(2)}</span>
                  <span className={`remaining ${overBudget ? 'text-danger' : 'text-success'}`}>
                    {overBudget ? `Excedido: R$ ${(spent - limit).toFixed(2)}` : `Restante: R$ ${(limit - spent).toFixed(2)}`}
                  </span>
                </div>
                <div className="budget-bar-wrap">
                  <div className="budget-bar" style={{ width: `${pct}%`, background: overBudget ? '#e74c3c' : pct > 80 ? '#f39c12' : '#2ecc71' }} />
                </div>
                <small style={{ color: overBudget ? '#e74c3c' : '#64748b' }}>{pct.toFixed(0)}% utilizado</small>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Componente Contas (Carteiras)
function Contas({ wallets, onAdd, onUpdate, onDelete, onTransfer, transactions = [], onUpdateTransaction, onDeleteTransaction, categories = { entrada: [], despesa: [] } }) {
  const [form, setForm] = useState({ name: '', type: 'corrente', balance: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editBalance, setEditBalance] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromId: '', toId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const [editingTxId, setEditingTxId] = useState(null);
  const [editingTx, setEditingTx] = useState({});
  const [recalculating, setRecalculating] = useState(null);

  // Saldo calculado pelas transações de cada carteira
  const calcBalanceFromTx = (walletId) => {
    return transactions
      .filter(t => t.wallet_id && parseInt(t.wallet_id) === walletId)
      .reduce((sum, t) => sum + (t.type === 'entrada' ? parseFloat(t.value) : -parseFloat(t.value)), 0);
  };

  const handleRecalculate = async (walletId) => {
    setRecalculating(walletId);
    try {
      const res = await fetch(`${config.API_URL}/wallets/${walletId}/recalculate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onUpdate(walletId, { balance: data.balance });
        toast.success('Saldo recalculado e corrigido!');
      } else {
        toast.error('Erro ao recalcular saldo');
      }
    } catch (e) {
      toast.error('Erro de conexão ao recalcular');
    } finally {
      setRecalculating(null);
    }
  };

  const tipos = [
    { value: 'corrente', label: '🏦 Conta Corrente' },
    { value: 'poupanca', label: '💰 Poupança' },
    { value: 'investimento', label: '📈 Investimento' },
    { value: 'carteira', label: '👛 Carteira' }
  ];

  const totalBalance = wallets.reduce((s, w) => s + parseFloat(w.balance || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Informe o nome da conta!'); return; }
    onAdd({ ...form, balance: parseFloat(form.balance || 0) });
    setForm({ name: '', type: 'corrente', balance: '' });
    setShowForm(false);
  };

  const handleUpdateBalance = (e) => {
    e.preventDefault();
    onUpdate(editingId, { balance: parseFloat(editBalance) });
    setEditingId(null);
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    const fromId = parseInt(transferForm.fromId);
    const toId = parseInt(transferForm.toId);
    if (fromId === toId) { toast.error('Selecione contas diferentes!'); return; }
    onTransfer(fromId, toId, parseFloat(transferForm.amount), transferForm.description, transferForm.date);
    setShowTransfer(false);
    setTransferForm({ fromId: '', toId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleSelectWallet = (walletId) => {
    setSelectedWalletId(prev => prev === walletId ? null : walletId);
    setEditingTxId(null);
  };

  const startEditTx = (tx) => {
    setEditingTxId(tx.id);
    setEditingTx({ description: tx.description, value: tx.value, date: tx.date, category: tx.category || '' });
  };

  const handleSaveTx = async (tx) => {
    if (!editingTx.description || !editingTx.value || !editingTx.date) {
      toast.error('Preencha todos os campos!'); return;
    }
    const updated = { ...tx, description: editingTx.description, value: parseFloat(editingTx.value), date: editingTx.date, category: editingTx.category };
    await onUpdateTransaction(tx.id, updated, tx);
    setEditingTxId(null);
  };

  const walletTransactions = transactions.filter(t => t.wallet_id && parseInt(t.wallet_id) === selectedWalletId);
  const entradas = walletTransactions.filter(t => t.type === 'entrada').sort((a, b) => new Date(b.date) - new Date(a.date));
  const saidas = walletTransactions.filter(t => t.type === 'despesa').sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalEntradas = entradas.reduce((s, t) => s + parseFloat(t.value || 0), 0);
  const totalSaidas = saidas.reduce((s, t) => s + parseFloat(t.value || 0), 0);

  const getCatLabel = (catId, type) => {
    const list = type === 'entrada' ? (categories.entrada || []) : (categories.despesa || []);
    return list.find(c => c.id === catId || c.name === catId)?.name || catId || '';
  };

  const renderTxRow = (tx) => {
    const isEditing = editingTxId === tx.id;
    const catList = tx.type === 'entrada' ? (categories.entrada || []) : (categories.despesa || []);
    return (
      <div key={tx.id} className={`wallet-tx-row ${tx.type}`}>
        {isEditing ? (
          <div className="wallet-tx-edit">
            <input
              type="text"
              placeholder="Descrição"
              value={editingTx.description}
              onChange={e => setEditingTx(p => ({ ...p, description: e.target.value }))}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor"
              value={editingTx.value}
              onChange={e => setEditingTx(p => ({ ...p, value: e.target.value }))}
            />
            <input
              type="date"
              value={editingTx.date}
              onChange={e => setEditingTx(p => ({ ...p, date: e.target.value }))}
            />
            <select value={editingTx.category} onChange={e => setEditingTx(p => ({ ...p, category: e.target.value }))}>
              <option value="">Categoria</option>
              {catList.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <div className="wallet-tx-actions">
              <button className="submit-btn" style={{ padding: '4px 12px' }} onClick={() => handleSaveTx(tx)}>💾 Salvar</button>
              <button className="cancel-btn" style={{ padding: '4px 10px' }} onClick={() => setEditingTxId(null)}>✕</button>
            </div>
          </div>
        ) : (
          <>
            <div className="wallet-tx-info">
              <span className="wallet-tx-desc">{tx.description}</span>
              <span className="wallet-tx-cat">{getCatLabel(tx.category, tx.type)}</span>
              <span className="wallet-tx-date">{tx.date ? new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</span>
            </div>
            <div className="wallet-tx-right">
              <span className={`wallet-tx-value ${tx.type === 'entrada' ? 'text-success' : 'text-danger'}`}>
                {tx.type === 'entrada' ? '+' : '-'} R$ {parseFloat(tx.value || 0).toFixed(2)}
              </span>
              <button className="edit-btn" onClick={() => startEditTx(tx)} title="Editar transação">✏️</button>
              <button className="delete-btn" onClick={() => onDeleteTransaction(tx.id)} title="Excluir transação">🗑️</button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="contas-section">
      <div className="section-header">
        <h2>🏦 Contas e Carteiras</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="add-user-btn" style={{ background: '#8b5cf6' }} onClick={() => { setShowTransfer(v => !v); setShowForm(false); }}>
            {showTransfer ? '❌ Cancelar' : '🔄 Transferir'}
          </button>
          <button className="add-user-btn" onClick={() => { setShowForm(v => !v); setShowTransfer(false); }}>
            {showForm ? '❌ Cancelar' : '➕ Nova Conta'}
          </button>
        </div>
      </div>

      <div className="total-balance-card">
        <span>Saldo Total</span>
        <strong className={totalBalance >= 0 ? 'text-success' : 'text-danger'}>R$ {totalBalance.toFixed(2)}</strong>
      </div>

      {showTransfer && (
        <div className="add-user-form">
          <h3>🔄 Transferir entre Contas</h3>
          <form onSubmit={handleTransfer}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Conta de Origem</label>
                <select value={transferForm.fromId} onChange={e => setTransferForm({ ...transferForm, fromId: e.target.value })} required>
                  <option value="">Selecione a origem</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name} — R$ {parseFloat(w.balance).toFixed(2)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Conta de Destino</label>
                <select value={transferForm.toId} onChange={e => setTransferForm({ ...transferForm, toId: e.target.value })} required>
                  <option value="">Selecione o destino</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name} — R$ {parseFloat(w.balance).toFixed(2)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Valor (R$)</label>
                <input type="number" step="0.01" min="0.01" placeholder="0,00" value={transferForm.amount}
                  onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Data</label>
                <input type="date" value={transferForm.date}
                  onChange={e => setTransferForm({ ...transferForm, date: e.target.value })} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Descrição (opcional)</label>
                <input type="text" placeholder="Ex: Resgate poupança, pagamento..." value={transferForm.description}
                  onChange={e => setTransferForm({ ...transferForm, description: e.target.value })} maxLength={100} />
              </div>
            </div>
            <button type="submit" className="submit-btn" style={{ background: '#8b5cf6' }}>🔄 Confirmar Transferência</button>
          </form>
        </div>
      )}

      {showForm && (
        <div className="add-user-form">
          <h3>Nova Conta</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Nome</label>
                <input type="text" placeholder="Ex: Nubank, Caixa..." value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Saldo Inicial (R$)</label>
                <input type="number" step="0.01" placeholder="0,00" value={form.balance}
                  onChange={e => setForm({ ...form, balance: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="submit-btn">✅ Adicionar</button>
          </form>
        </div>
      )}

      <div className="wallet-list">
        {wallets.length === 0 ? (
          <p className="empty-message">Nenhuma conta cadastrada</p>
        ) : (
          wallets.map(w => (
            <React.Fragment key={w.id}>
              <div
                className={`wallet-card${selectedWalletId === w.id ? ' wallet-card--selected' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelectWallet(w.id)}
              >
                <div className="wallet-info">
                  <span className="wallet-icon">{tipos.find(t => t.value === w.type)?.label?.split(' ')[0] || '💳'}</span>
                  <div>
                    <h4>{w.name}</h4>
                    <small>{tipos.find(t => t.value === w.type)?.label?.split(' ').slice(1).join(' ') || w.type}</small>
                  </div>
                </div>
                <div className="wallet-balance" onClick={e => e.stopPropagation()}>
                  {editingId === w.id ? (
                    <form onSubmit={handleUpdateBalance} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input type="number" step="0.01" value={editBalance}
                        onChange={e => setEditBalance(e.target.value)}
                        style={{ width: '100px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                      <button type="submit" className="submit-btn" style={{ padding: '4px 10px' }}>💾</button>
                      <button type="button" className="cancel-btn" style={{ padding: '4px 10px' }} onClick={() => setEditingId(null)}>✕</button>
                    </form>
                  ) : (
                    (() => {
                      const calcBal = calcBalanceFromTx(w.id);
                      const storedBal = parseFloat(w.balance || 0);
                      const hasDiscrepancy = Math.abs(calcBal - storedBal) > 0.001;
                      return (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span className={`balance-value ${storedBal >= 0 ? 'text-success' : 'text-danger'}`}>
                              R$ {storedBal.toFixed(2)}
                            </span>
                            {hasDiscrepancy && (
                              <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
                                ⚠️ calculado: R$ {calcBal.toFixed(2)}
                              </span>
                            )}
                          </div>
                          {hasDiscrepancy && (
                            <button
                              className="submit-btn"
                              style={{ padding: '4px 10px', fontSize: '12px', background: '#f59e0b' }}
                              onClick={() => handleRecalculate(w.id)}
                              disabled={recalculating === w.id}
                              title="Corrigir saldo baseado nas transações"
                            >
                              {recalculating === w.id ? '...' : '🔧 Corrigir'}
                            </button>
                          )}
                          <button className="edit-btn" onClick={() => { setEditingId(w.id); setEditBalance(w.balance); }} title="Editar saldo">✏️</button>
                          <button className="delete-btn" onClick={() => onDelete(w.id)} title="Excluir">🗑️</button>
                          <span className="wallet-expand-hint" title={selectedWalletId === w.id ? 'Fechar' : 'Ver transações'}>
                            {selectedWalletId === w.id ? '▲' : '▼'}
                          </span>
                        </>
                      );
                    })()
                  )}
                </div>
              </div>

              {selectedWalletId === w.id && (
                <div className="wallet-detail-panel">
                  <div className="wallet-detail-summary">
                    <div className="wallet-detail-stat entrada">
                      <span>💵 Total Entradas</span>
                      <strong className="text-success">+ R$ {totalEntradas.toFixed(2)}</strong>
                      <small>{entradas.length} transação(ões)</small>
                    </div>
                    <div className="wallet-detail-stat saida">
                      <span>💸 Total Saídas</span>
                      <strong className="text-danger">- R$ {totalSaidas.toFixed(2)}</strong>
                      <small>{saidas.length} transação(ões)</small>
                    </div>
                  </div>

                  {walletTransactions.length === 0 ? (
                    <p className="empty-message" style={{ padding: '16px', textAlign: 'center' }}>
                      Nenhuma transação vinculada a esta conta
                    </p>
                  ) : (
                    <div className="wallet-tx-columns">
                      <div className="wallet-tx-group">
                        <h4 className="wallet-tx-group-title entrada">💵 Entradas</h4>
                        {entradas.length === 0
                          ? <p className="wallet-tx-empty">Sem entradas</p>
                          : entradas.map(renderTxRow)}
                      </div>
                      <div className="wallet-tx-group">
                        <h4 className="wallet-tx-group-title saida">💸 Saídas</h4>
                        {saidas.length === 0
                          ? <p className="wallet-tx-empty">Sem saídas</p>
                          : saidas.map(renderTxRow)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}

// Componente Metas
function Metas({ goals, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '0', deadline: '', category: '' });
  const [showForm, setShowForm] = useState(false);
  const [contributionId, setContributionId] = useState(null);
  const [contribution, setContribution] = useState('');

  const categorias = ['Viagem', 'Reserva de Emergência', 'Imóvel', 'Veículo', 'Educação', 'Outros'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.target_amount) { toast.error('Informe o nome e valor alvo!'); return; }
    onAdd({ ...form, target_amount: parseFloat(form.target_amount), current_amount: parseFloat(form.current_amount || 0) });
    setForm({ name: '', target_amount: '', current_amount: '0', deadline: '', category: '' });
    setShowForm(false);
  };

  const handleContribution = (e, goal) => {
    e.preventDefault();
    const newAmt = parseFloat(goal.current_amount || 0) + parseFloat(contribution || 0);
    onUpdate(goal.id, { ...goal, current_amount: newAmt });
    setContributionId(null);
    setContribution('');
  };

  return (
    <div className="metas-section">
      <div className="section-header">
        <h2>🎯 Metas Financeiras</h2>
        <button className="add-user-btn" onClick={() => setShowForm(v => !v)}>
          {showForm ? '❌ Cancelar' : '➕ Nova Meta'}
        </button>
      </div>

      {showForm && (
        <div className="add-user-form">
          <h3>Nova Meta</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Nome da Meta</label>
                <input type="text" placeholder="Ex: Viagem para Europa" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Valor Alvo (R$)</label>
                <input type="number" step="0.01" placeholder="0,00" value={form.target_amount}
                  onChange={e => setForm({ ...form, target_amount: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Valor Atual (R$)</label>
                <input type="number" step="0.01" placeholder="0,00" value={form.current_amount}
                  onChange={e => setForm({ ...form, current_amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Prazo</label>
                <input type="date" value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Categoria</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="">Selecione...</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="submit-btn">✅ Criar Meta</button>
          </form>
        </div>
      )}

      <div className="goals-list">
        {goals.length === 0 ? (
          <p className="empty-message">Nenhuma meta cadastrada</p>
        ) : (
          goals.map(g => {
            const current = parseFloat(g.current_amount || 0);
            const target = parseFloat(g.target_amount);
            const pct = Math.min((current / target) * 100, 100);
            const completed = current >= target;
            return (
              <div key={g.id} className={`goal-card ${completed ? 'completed' : ''}`}>
                <div className="goal-header">
                  <div>
                    <h4>{completed ? '✅ ' : ''}{g.name}</h4>
                    {g.category && <span className="period-badge">{g.category}</span>}
                    {g.deadline && <small> • Prazo: {new Date(g.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}</small>}
                  </div>
                  <button className="delete-btn" onClick={() => onDelete(g.id)}>🗑️</button>
                </div>
                <div className="goal-amounts">
                  <span>R$ {current.toFixed(2)} / R$ {target.toFixed(2)}</span>
                  <span className="pct-badge">{pct.toFixed(0)}%</span>
                </div>
                <div className="goal-bar-wrap">
                  <div className="goal-bar" style={{ width: `${pct}%`, background: completed ? '#2ecc71' : pct >= 75 ? '#27ae60' : pct >= 40 ? '#3498db' : '#e67e22' }} />
                </div>
                {!completed && (
                  <div className="contribution-area">
                    {contributionId === g.id ? (
                      <form onSubmit={e => handleContribution(e, g)} style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <input type="number" step="0.01" placeholder="Valor contribuição" value={contribution}
                          onChange={e => setContribution(e.target.value)}
                          style={{ flex: 1, padding: '5px 10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                        <button type="submit" className="submit-btn" style={{ padding: '5px 12px' }}>✅</button>
                        <button type="button" className="cancel-btn" style={{ padding: '5px 12px' }} onClick={() => setContributionId(null)}>✕</button>
                      </form>
                    ) : (
                      <button className="pay-btn" style={{ marginTop: '8px' }} onClick={() => { setContributionId(g.id); setContribution(''); }}>
                        ➕ Adicionar Contribuição
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Formulário de lançamento otimizado
// Avança a data base de uma parcela em N meses
const addMonths = (dateStr, months) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1 + months, d);
  // Se o dia "transbordou" (ex: 31 fev), usar último dia do mês
  const maxDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(d, maxDay));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const LancamentoForm = React.memo(({ type, onAdd, onAddBatch, title, categories, isApiAvailable, wallets = [] }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    description: '',
    value: '',
    category: '',
    date: today,
    wallet_id: ''
  });
  const [installment, setInstallment] = useState({ enabled: false, count: 2 });

  // Usar categorias dinâmicas
  const availableCategories = useMemo(() =>
    categories?.[type] || [],
    [categories, type]
  );

  const totalValue = parseFloat(form.value) || 0;
  const instCount = Math.max(2, Math.min(48, parseInt(installment.count) || 2));
  const instValue = totalValue > 0 ? totalValue / instCount : 0;

  // Preview das parcelas
  const instPreview = useMemo(() => {
    if (!installment.enabled || totalValue <= 0 || !form.date) return [];
    const base = Math.floor((totalValue / instCount) * 100) / 100;
    const last = Math.round((totalValue - base * (instCount - 1)) * 100) / 100;
    return Array.from({ length: instCount }, (_, i) => ({
      num: i + 1,
      date: addMonths(form.date, i),
      value: i === instCount - 1 ? last : base
    }));
  }, [installment.enabled, totalValue, instCount, form.date]);

  const resetForm = useCallback(() => {
    setForm({ description: '', value: '', category: '', date: today, wallet_id: '' });
    setInstallment({ enabled: false, count: 2 });
  }, [today]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (!isApiAvailable) {
      toast.error('Conexão com servidor necessária para adicionar transações!');
      return;
    }
    if (!form.description || !form.value || !form.category) {
      toast.error('Preencha todos os campos obrigatórios!');
      return;
    }
    if (parseFloat(form.value) <= 0) {
      toast.error('O valor deve ser maior que zero!');
      return;
    }

    if (installment.enabled) {
      // Modo parcelamento
      if (instCount < 2 || instCount > 48) {
        toast.error('Número de parcelas deve ser entre 2 e 48!');
        return;
      }
      const installment_ref = `inst_${Date.now()}`;
      const base = Math.floor((totalValue / instCount) * 100) / 100;
      const last = Math.round((totalValue - base * (instCount - 1)) * 100) / 100;

      const batch = Array.from({ length: instCount }, (_, i) => ({
        type,
        description: `${form.description.trim()} (${i + 1}/${instCount})`,
        category: form.category,
        value: i === instCount - 1 ? last : base,
        date: addMonths(form.date, i),
        installment_ref,
        installment_num: i + 1,
        installment_total: instCount
      }));

      onAddBatch({
        transactions: batch,
        wallet_id: form.wallet_id ? parseInt(form.wallet_id) : null,
        totalValue,
        type
      });
      resetForm();
    } else {
      // Modo simples
      onAdd({
        ...form,
        type,
        value: parseFloat(form.value),
        wallet_id: form.wallet_id ? parseInt(form.wallet_id) : null
      });
      resetForm();
    }
  }, [form, type, onAdd, onAddBatch, isApiAvailable, installment, instCount, totalValue, resetForm]);

  return (
    <div className={`lancamento-form ${!isApiAvailable ? 'disabled' : ''}`}>
      <h2>{title}</h2>

      {!isApiAvailable && (
        <div className="offline-warning">
          <p>⚠️ Conexão com servidor necessária para adicionar transações</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Descrição:</label>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Ex: Salário, Supermercado..."
            disabled={!isApiAvailable}
            required
          />
        </div>

        <div className="form-group">
          <label>{installment.enabled ? `Valor Total (R$):` : 'Valor (R$):'}</label>
          <input
            type="number"
            step="0.01"
            value={form.value}
            onChange={e => setForm({ ...form, value: e.target.value })}
            placeholder="0.00"
            disabled={!isApiAvailable}
            required
          />
        </div>

        <div className="form-group">
          <label>Categoria:</label>
          <select
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            disabled={!isApiAvailable}
            required
          >
            <option value="">Selecione uma categoria</option>
            {availableCategories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{installment.enabled ? 'Data da 1ª Parcela:' : 'Data:'}</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            disabled={!isApiAvailable}
            required
          />
        </div>

        {wallets.length > 0 && (
          <div className="form-group">
            <label>Conta / Carteira: <small style={{ color: '#94a3b8' }}>(opcional)</small></label>
            <select
              value={form.wallet_id}
              onChange={e => setForm({ ...form, wallet_id: e.target.value })}
              disabled={!isApiAvailable}
            >
              <option value="">Sem conta vinculada</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} — R$ {parseFloat(w.balance || 0).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Toggle de parcelamento — só faz sentido para despesas, mas disponível para ambos */}
        <div className="form-group installment-toggle">
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={installment.enabled}
              onChange={e => setInstallment(p => ({ ...p, enabled: e.target.checked }))}
              disabled={!isApiAvailable}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>💳 Parcelar</span>
          </label>
        </div>

        {installment.enabled && (
          <div className="installment-section">
            <div className="form-group">
              <label>Número de Parcelas:</label>
              <input
                type="number"
                min="2"
                max="48"
                value={installment.count}
                onChange={e => setInstallment(p => ({ ...p, count: parseInt(e.target.value) || 2 }))}
                disabled={!isApiAvailable}
              />
            </div>

            {instValue > 0 && (
              <div className="installment-preview">
                <div className="installment-summary">
                  <span>💳 {instCount}x de <strong>R$ {instValue.toFixed(2)}</strong></span>
                  <span className="installment-total">Total: R$ {totalValue.toFixed(2)}</span>
                </div>
                {instPreview.length > 0 && (
                  <details className="installment-details">
                    <summary>Ver cronograma de parcelas</summary>
                    <div className="installment-list">
                      {instPreview.map(p => (
                        <div key={p.num} className="installment-item">
                          <span className="inst-num">{p.num}ª parcela</span>
                          <span className="inst-date">{new Date(p.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          <span className="inst-value">R$ {p.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          className="submit-btn"
          disabled={!isApiAvailable}
        >
          {!isApiAvailable
            ? 'Servidor Offline'
            : installment.enabled
              ? `💳 Lançar ${instCount}x de R$ ${instValue.toFixed(2)}`
              : `Lançar ${type === 'entrada' ? 'Entrada' : 'Despesa'}`
          }
        </button>
      </form>
    </div>
  );
});

// Relatórios mensais
function Relatorios({ transactions, loadingExport, setLoadingExport, categories, fmtCurrency }) {
  const allCatsFlat = useMemo(() =>
    [...(categories?.entrada || []), ...(categories?.despesa || [])],
    [categories]
  );
  const resolveCatName = (id) => {
    if (!id) return id;
    if (id === 'transferencia') return 'Transferência';
    const found = allCatsFlat.find(c => c.id === id);
    return found ? `${found.icon ? found.icon + ' ' : ''}${found.name}` : id;
  };
  // Versão sem emoji para PDFs (jsPDF não suporta unicode emoji)
  const resolveCatNamePdf = (id) => {
    if (!id) return id;
    if (id === 'transferencia') return 'Transferencia';
    const found = allCatsFlat.find(c => c.id === id);
    return found ? found.name : id;
  };
  // Remove emoji/unicode especial para uso em PDFs (evita \u0000 proibido pelo no-control-regex)
  const stripEmojiPdf = (s) => String(s).replace(/[^ -~\u00A0-\u024F]/g, '').trim();
  const [reportMode, setReportMode] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  const fmt = fmtCurrency || ((v) => 'R$ ' + v.toFixed(2));
  const REPORT_COLORS = ['#6366f1', '#e74c3c', '#f59e0b', '#2ecc71', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];

  const monthlyData = transactions.filter(t =>
    t.date.startsWith(selectedMonth)
  );

  const entradas = monthlyData.filter(t => t.type === 'entrada');
  const despesas = monthlyData.filter(t => t.type === 'despesa');

  const totalEntradas = entradas.reduce((sum, t) => sum + parseFloat(t.value), 0);
  const totalDespesas = despesas.reduce((sum, t) => sum + parseFloat(t.value), 0);

  const categoriesData = {};
  despesas.forEach(t => {
    const catKey = resolveCatName(t.category);
    categoriesData[catKey] = (categoriesData[catKey] || 0) + parseFloat(t.value);
  });

  // Dados anuais consolidados
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const annualData = Array.from({ length: 12 }, (_, m) => {
    const key = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
    const ent = transactions.filter(t => t.type === 'entrada' && t.date.startsWith(key))
      .reduce((s, t) => s + parseFloat(t.value), 0);
    const desp = transactions.filter(t => t.type === 'despesa' && t.date.startsWith(key))
      .reduce((s, t) => s + parseFloat(t.value), 0);
    return { mes: monthNames[m], key, entradas: ent, despesas: desp, saldo: ent - desp };
  });
  const annualTotals = annualData.reduce((acc, row) => ({
    entradas: acc.entradas + row.entradas,
    despesas: acc.despesas + row.despesas,
    saldo: acc.saldo + row.saldo
  }), { entradas: 0, despesas: 0, saldo: 0 });

  const reportPieData = Object.entries(categoriesData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  // Função para exportar para Excel
  const exportToExcel = async () => {
    setLoadingExport(true);
    try {
      const workbook = XLSX.utils.book_new();

      // Aba 1: Resumo do Mês
      const resumoData = [
        ['Resumo Financeiro', selectedMonth],
        [''],
        ['Tipo', 'Valor (R$)'],
        ['Entradas', totalEntradas.toFixed(2)],
        ['Despesas', totalDespesas.toFixed(2)],
        ['Saldo', (totalEntradas - totalDespesas).toFixed(2)]
      ];
      const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');

      // Aba 2: Transações Detalhadas
      const transacoesData = [
        ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)']
      ];
      monthlyData.forEach(t => {
        transacoesData.push([
          new Date(t.date).toLocaleDateString('pt-BR'),
          t.description,
          resolveCatName(t.category),
          t.type === 'entrada' ? 'Entrada' : 'Despesa',
          parseFloat(t.value).toFixed(2)
        ]);
      });
      const transacoesSheet = XLSX.utils.aoa_to_sheet(transacoesData);
      XLSX.utils.book_append_sheet(workbook, transacoesSheet, 'Transações');

      // Aba 3: Gastos por Categoria
      const categoriasData = [
        ['Categoria', 'Valor (R$)', 'Percentual (%)']
      ];
      Object.entries(categoriesData).forEach(([category, value]) => {
        categoriasData.push([
          category,
          value.toFixed(2),
          ((value / totalDespesas) * 100).toFixed(1) + '%'
        ]);
      });
      const categoriasSheet = XLSX.utils.aoa_to_sheet(categoriasData);
      XLSX.utils.book_append_sheet(workbook, categoriasSheet, 'Categorias');

      // Salvar arquivo
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `relatorio-financeiro-${selectedMonth}.xlsx`);
      toast.success('Relatório Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar relatório Excel. Tente novamente.');
    } finally {
      setLoadingExport(false);
    }
  };

  // Função para exportar para PDF
  const exportToPDF = async (mode = 'monthly') => {
    setLoadingExport(true);
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      if (mode === 'monthly') {
        if (!monthlyData || monthlyData.length === 0) {
          toast.error('Não há dados para exportar!');
          return;
        }

        // Cabeçalho
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59);
        doc.text('Relatório Financeiro', pageW / 2, 18, { align: 'center' });
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text(`Período: ${selectedMonth}`, pageW / 2, 26, { align: 'center' });

        // Resumo
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('Resumo do Mês', 14, 38);
        autoTable(doc, {
          startY: 42,
          head: [['', 'Valor (R$)']],
          body: [
            ['💵 Entradas', `R$ ${totalEntradas.toFixed(2)}`],
            ['💸 Despesas', `R$ ${totalDespesas.toFixed(2)}`],
            ['💰 Saldo', `R$ ${(totalEntradas - totalDespesas).toFixed(2)}`]
          ],
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241] },
          columnStyles: { 1: { halign: 'right' } },
          margin: { left: 14, right: 14 }
        });

        // Tabela de transações
        doc.text('Transações do Mês', 14, doc.lastAutoTable.finalY + 12);
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 16,
          head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)']],
          body: monthlyData.map(t => [
            new Date(t.date).toLocaleDateString('pt-BR'),
            t.description,
            resolveCatNamePdf(t.category),
            t.type === 'entrada' ? 'Entrada' : 'Despesa',
            `R$ ${parseFloat(t.value).toFixed(2)}`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241] },
          columnStyles: { 4: { halign: 'right' } },
          margin: { left: 14, right: 14 }
        });

        // Gastos por categoria (se existir)
        if (Object.keys(categoriesData).length > 0) {
          const sortedCats = Object.entries(categoriesData).sort((a, b) => b[1] - a[1]);
          doc.text('Gastos por Categoria', 14, doc.lastAutoTable.finalY + 12);
          autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 16,
            head: [['Categoria', 'Valor (R$)', 'Percentual']],
            body: sortedCats.map(([cat, val]) => [
              stripEmojiPdf(cat),
              `R$ ${val.toFixed(2)}`,
              `${totalDespesas > 0 ? ((val / totalDespesas) * 100).toFixed(1) : 0}%`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68] },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
            margin: { left: 14, right: 14 }
          });
        }

        doc.save(`relatorio-financeiro-${selectedMonth}.pdf`);

      } else {
        // Modo anual
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59);
        doc.text('Relatório Anual', pageW / 2, 18, { align: 'center' });
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text(`Ano: ${selectedYear}`, pageW / 2, 26, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text(`Resumo — ${selectedYear}`, 14, 38);
        autoTable(doc, {
          startY: 42,
          head: [['Mês', 'Entradas (R$)', 'Despesas (R$)', 'Saldo (R$)']],
          body: [
            ...annualData.map(r => [
              r.mes,
              `R$ ${r.entradas.toFixed(2)}`,
              `R$ ${r.despesas.toFixed(2)}`,
              `R$ ${r.saldo.toFixed(2)}`
            ]),
            ['Total', `R$ ${annualTotals.entradas.toFixed(2)}`, `R$ ${annualTotals.despesas.toFixed(2)}`, `R$ ${annualTotals.saldo.toFixed(2)}`]
          ],
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
          margin: { left: 14, right: 14 }
        });

        doc.save(`relatorio-anual-${selectedYear}.pdf`);
      }

      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF. Tente novamente.');
    } finally {
      setLoadingExport(false);
    }
  };

  // Função para exportar para CSV
  const exportToCSV = async () => {
    // Validação dos dados antes de exportar
    if (!monthlyData || monthlyData.length === 0) {
      toast.error('Não há dados para exportar!');
      return;
    }

    if (!selectedMonth || !ValidationUtils.isNotEmpty(selectedMonth)) {
      toast.error('Mês selecionado inválido!');
      return;
    }

    setLoadingExport(true);
    try {
      const csvData = [
        ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)']
      ];

      // Validar e sanitizar cada transação antes de exportar
      monthlyData.forEach(t => {
        if (t && ValidationUtils.isValidDate(t.date) && ValidationUtils.isNotEmpty(t.description)) {
          csvData.push([
            new Date(t.date).toLocaleDateString('pt-BR'),
            ValidationUtils.sanitizeText(t.description),
            t.category || 'Outros',
            t.type === 'entrada' ? 'Entrada' : 'Despesa',
            ValidationUtils.isValidPositiveNumber(t.value) ? parseFloat(t.value).toFixed(2) : '0.00'
          ]);
        }
      });

      if (csvData.length <= 1) {
        toast.error('Nenhum dado válido encontrado para exportar!');
        return;
      }

      const csv = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

      // Sanitizar nome do arquivo
      const fileName = `transacoes-${ValidationUtils.sanitizeText(selectedMonth)}.csv`;
      saveAs(blob, fileName);

      toast.success(`Relatório CSV exportado com sucesso! ${csvData.length - 1} transações exportadas.`);
    } catch (error) {
      ErrorHandler.handleApiError(error, 'exportar relatório CSV');
    } finally {
      setLoadingExport(false);
    }
  };

  return (
    <div className="relatorios">
      <h2>📈 Relatórios Financeiros</h2>

      {/* Toggle modo mensal / anual */}
      <div className="report-mode-toggle">
        <button
          className={`mode-btn ${reportMode === 'monthly' ? 'active' : ''}`}
          onClick={() => setReportMode('monthly')}
        >📅 Mensal</button>
        <button
          className={`mode-btn ${reportMode === 'annual' ? 'active' : ''}`}
          onClick={() => setReportMode('annual')}
        >📆 Anual</button>
      </div>

      {reportMode === 'monthly' ? (
        <>
          <div className="month-selector">
            <label>Selecionar Mês:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            />
          </div>

          <div className="export-buttons">
            <ButtonSpinner onClick={exportToExcel} className="export-btn excel" loading={loadingExport}>
              📊 Excel
            </ButtonSpinner>
            <ButtonSpinner onClick={exportToCSV} className="export-btn csv" loading={loadingExport}>
              📄 CSV
            </ButtonSpinner>
            <ButtonSpinner onClick={() => exportToPDF('monthly')} className="export-btn pdf" loading={loadingExport}>
              🖨️ PDF
            </ButtonSpinner>
          </div>

          <div className="report-summary">
            <div className="summary-card">
              <h3>Resumo do Mês</h3>
              <p>💵 Entradas: {fmt(totalEntradas)}</p>
              <p>💸 Despesas: {fmt(totalDespesas)}</p>
              <p className={totalEntradas - totalDespesas >= 0 ? 'positive' : 'negative'}>
                💰 Saldo: {fmt(totalEntradas - totalDespesas)}
              </p>
            </div>
          </div>

          {reportPieData.length > 0 && (
            <div className="report-pie-section">
              <h3>📊 Distribuição de Despesas</h3>
              <div className="report-pie-wrapper">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={reportPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {reportPieData.map((_, i) => (
                        <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [fmt(value), undefined]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="report-pie-legend">
                  {reportPieData.map((entry, i) => (
                    <div key={i} className="report-pie-item">
                      <span className="report-pie-dot" style={{ background: REPORT_COLORS[i % REPORT_COLORS.length] }} />
                      <span className="report-pie-name">{entry.name}</span>
                      <span className="report-pie-val">{fmt(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="categories-report">
            <h3>📊 Gastos por Categoria</h3>
            {Object.keys(categoriesData).length === 0 ? (
              <p className="empty-message">Nenhuma despesa neste mês</p>
            ) : (
              Object.entries(categoriesData)
                .sort((a, b) => b[1] - a[1])
                .map(([category, value]) => {
                  const pct = totalDespesas > 0 ? (value / totalDespesas) * 100 : 0;
                  return (
                    <div key={category} className="cat-report-row">
                      <div className="cat-report-label">
                        <span>{category}</span>
                        <span className="cat-report-value">R$ {value.toFixed(2)} <small>({pct.toFixed(1)}%)</small></span>
                      </div>
                      <div className="cat-report-bar-wrap">
                        <div className="cat-report-bar" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </>
      ) : (
        /* Modo Anual */
        <>
          <div className="month-selector">
            <label>Selecionar Ano:</label>
            <input type="number" min="2020" max="2099" value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              style={{ width: '100px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
          </div>

          <div className="report-summary">
            <div className="summary-card">
              <h3>Resumo Anual — {selectedYear}</h3>
              <p>💵 Entradas: {fmt(annualTotals.entradas)}</p>
              <p>💸 Despesas: {fmt(annualTotals.despesas)}</p>
              <p className={annualTotals.saldo >= 0 ? 'positive' : 'negative'}>
                💰 Saldo: {fmt(annualTotals.saldo)}
              </p>
            </div>
          </div>

          <div className="report-annual-charts">
            <div className="report-chart-card">
              <h3>📈 Entradas vs Despesas por Mês</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={annualData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => [fmt(value), undefined]} />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="#2ecc71" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="#e74c3c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="report-chart-card">
              <h3>💰 Saldo Mensal</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={annualData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : (v <= -1000 ? '-' + (Math.abs(v) / 1000).toFixed(0) + 'k' : v)} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => [fmt(value), undefined]} />
                  <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="export-buttons">
            <ButtonSpinner onClick={() => exportToPDF('annual')} className="export-btn pdf" loading={loadingExport}>
              🖨️ Exportar PDF
            </ButtonSpinner>
          </div>

          <div className="annual-table-wrap">
            <table className="annual-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Entradas</th>
                  <th>Despesas</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {annualData.map(row => (
                  <tr key={row.key}>
                    <td>{row.mes}</td>
                    <td className="text-success">{fmt(row.entradas)}</td>
                    <td className="text-danger">{fmt(row.despesas)}</td>
                    <td className={row.saldo >= 0 ? 'text-success' : 'text-danger'}>{fmt(row.saldo)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700 }}>
                  <td>Total</td>
                  <td className="text-success">{fmt(annualTotals.entradas)}</td>
                  <td className="text-danger">{fmt(annualTotals.despesas)}</td>
                  <td className={annualTotals.saldo >= 0 ? 'text-success' : 'text-danger'}>{fmt(annualTotals.saldo)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// Histórico de transações otimizado
const HISTORICO_PAGE_SIZE = 30;

const Historico = React.memo(({ transactions, onDelete, onUpdate, isApiAvailable, categories, wallets = [] }) => {
  const [filter, setFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(HISTORICO_PAGE_SIZE);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ type: '', description: '', category: '', value: '', date: '', wallet_id: '' });

  // Implementar debounce na busca
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Resetar visibilidade quando qualquer filtro muda
  useEffect(() => {
    setVisibleCount(HISTORICO_PAGE_SIZE);
  }, [filter, monthFilter, debouncedSearchTerm, categoryFilter]);

  // Categorias disponíveis para o tipo selecionado
  const editCategoryOptions = useMemo(() =>
    (categories?.[editForm.type] || []),
    [categories, editForm.type]
  );

  // Todas as categorias únicas presentes nas transações (para o filtro)
  const allCategoryOptions = useMemo(() => {
    const allCats = [...(categories?.entrada || []), ...(categories?.despesa || [])];
    const ids = [...new Set(transactions.map(t => t.category))];
    return ids.map(id => {
      const found = allCats.find(c => c.id === id);
      return { id, name: found ? found.name : id, icon: found?.icon || '' };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions, categories]);

  const getCatLabel = (id) => {
    if (!id) return id;
    if (id === 'transferencia') return 'Transferência';
    const found = allCategoryOptions.find(c => c.id === id);
    return found ? `${found.icon ? found.icon + ' ' : ''}${found.name}` : id;
  };
  // Versão sem emoji para PDFs (jsPDF não suporta unicode emoji)
  const getCatLabelPdf = (id) => {
    if (!id) return id;
    if (id === 'transferencia') return 'Transferencia';
    const found = allCategoryOptions.find(c => c.id === id);
    return found ? found.name : id;
  };

  const startEdit = (transaction) => {
    setEditingId(transaction.id);
    setEditForm({
      type: transaction.type,
      description: transaction.description,
      category: transaction.category,
      value: transaction.value,
      date: transaction.date,
      wallet_id: transaction.wallet_id ? String(transaction.wallet_id) : ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ type: '', description: '', category: '', value: '', date: '', wallet_id: '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editForm.description || !editForm.value || !editForm.category || !editForm.date) {
      toast.error('Preencha todos os campos!');
      return;
    }
    const oldTx = transactions.find(t => t.id === editingId);
    const success = await onUpdate(
      editingId,
      { ...editForm, value: parseFloat(editForm.value), wallet_id: editForm.wallet_id ? parseInt(editForm.wallet_id) : null },
      oldTx
    );
    if (success) cancelEdit();
  };

  // Otimizar filtros com useMemo incluindo busca e validação de usuário
  const filteredTransactions = useMemo(() =>
    transactions.filter(t => {
      const typeMatch = filter === 'all'
        || (filter === 'transferencia' ? t.category === 'transferencia'
          : filter === 'parcelas' ? t.installment_ref != null
            : (t.type === filter && t.category !== 'transferencia'));
      const monthMatch = !monthFilter || t.date.startsWith(monthFilter);
      const searchMatch = !debouncedSearchTerm ||
        t.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const categoryMatch = !categoryFilter || t.category === categoryFilter;
      return typeMatch && monthMatch && searchMatch && categoryMatch;
    }).reverse(),
    [transactions, filter, monthFilter, debouncedSearchTerm, categoryFilter]
  );

  // Função para exportar histórico para Excel
  const exportHistoricoToExcel = () => {
    if (!filteredTransactions.length) {
      toast.error('Não há transações para exportar!');
      return;
    }
    try {
      const workbook = XLSX.utils.book_new();
      const historicoData = [
        ['Histórico de Transações'],
        [''],
        ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)']
      ];
      filteredTransactions.forEach(t => {
        historicoData.push([
          new Date(t.date).toLocaleDateString('pt-BR'),
          t.description,
          getCatLabel(t.category),
          t.type === 'entrada' ? 'Entrada' : 'Despesa',
          parseFloat(t.value).toFixed(2)
        ]);
      });
      const sheet = XLSX.utils.aoa_to_sheet(historicoData);
      XLSX.utils.book_append_sheet(workbook, sheet, 'Histórico');
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filterText = filter === 'all' ? 'todas' : filter;
      const monthText = monthFilter ? `-${monthFilter}` : '';
      saveAs(blob, `historico-${filterText}${monthText}.xlsx`);
      toast.success(`Excel exportado! ${filteredTransactions.length} transações.`);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar Excel. Tente novamente.');
    }
  };

  // Função para exportar histórico para PDF
  const exportHistoricoPDF = () => {
    if (!filteredTransactions.length) {
      toast.error('Não há transações para exportar!');
      return;
    }
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      // Cabeçalho
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text('Histórico de Transações', pageW / 2, 18, { align: 'center' });

      // Subtítulo com filtros aplicados
      const subtitles = [];
      if (monthFilter) subtitles.push(`Mês: ${monthFilter}`);
      if (filter !== 'all') subtitles.push(`Tipo: ${filter}`);
      if (debouncedSearchTerm) subtitles.push(`Busca: "${debouncedSearchTerm}"`);
      if (subtitles.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(subtitles.join('  |  '), pageW / 2, 26, { align: 'center' });
      }

      autoTable(doc, {
        startY: subtitles.length > 0 ? 32 : 26,
        head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)']],
        body: filteredTransactions.map(t => [
          new Date(t.date).toLocaleDateString('pt-BR'),
          t.description,
          getCatLabelPdf(t.category),
          t.type === 'entrada' ? 'Entrada' : 'Despesa',
          `R$ ${parseFloat(t.value).toFixed(2)}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        columnStyles: { 4: { halign: 'right' } },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            data.cell.styles.textColor =
              data.cell.raw === 'Entrada' ? [22, 163, 74] : [220, 38, 38];
          }
        }
      });

      // Rodapé com totais
      const totalEnt = filteredTransactions.filter(t => t.type === 'entrada').reduce((s, t) => s + parseFloat(t.value), 0);
      const totalDesp = filteredTransactions.filter(t => t.type === 'despesa').reduce((s, t) => s + parseFloat(t.value), 0);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        body: [
          ['Entradas', `R$ ${totalEnt.toFixed(2)}`],
          ['Despesas', `R$ ${totalDesp.toFixed(2)}`],
          ['Saldo', `R$ ${(totalEnt - totalDesp).toFixed(2)}`]
        ],
        theme: 'plain',
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
      });

      const filterText = filter === 'all' ? 'todas' : filter;
      const monthText = monthFilter ? `-${monthFilter}` : '';
      doc.save(`historico-${filterText}${monthText}.pdf`);
      toast.success(`PDF exportado! ${filteredTransactions.length} transações.`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF. Tente novamente.');
    }
  };

  return (
    <div className="historico">
      <h2>📋 Histórico de Transações</h2>

      <div className="filters">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Todas</option>
          <option value="entrada">Entradas</option>
          <option value="despesa">Despesas</option>
          <option value="transferencia">🔄 Transferências</option>
          <option value="parcelas">💳 Parcelas</option>
        </select>

        <input
          type="month"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          placeholder="Filtrar por mês"
        />

        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">Todas as categorias</option>
          {allCategoryOptions.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>

        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="🔍 Buscar descrição ou categoria..."
          className="search-input"
        />

        <button onClick={exportHistoricoToExcel} className="export-btn excel">
          📊 Excel
        </button>
        <button onClick={exportHistoricoPDF} className="export-btn pdf">
          🖨️ PDF
        </button>
      </div>

      {/* Resumo de resultados */}
      <div className="historico-summary">
        <span>Exibindo <strong>{Math.min(visibleCount, filteredTransactions.length)}</strong> de <strong>{filteredTransactions.length}</strong> transações</span>
      </div>

      <div className="transactions-list">
        {filteredTransactions.slice(0, visibleCount).map(transaction => (
          <div key={transaction.id} className={`transaction-card ${transaction.type}${transaction.category === 'transferencia' ? ' transfer' : ''}`}>
            {editingId === transaction.id ? (
              <form onSubmit={handleUpdate} className="edit-transaction-form">
                <div className="edit-transaction-grid">
                  <select
                    value={editForm.type}
                    onChange={e => setEditForm({ ...editForm, type: e.target.value, category: '' })}
                    required
                  >
                    <option value="entrada">Entrada</option>
                    <option value="despesa">Despesa</option>
                  </select>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Descrição"
                    required
                  />
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    required
                  >
                    <option value="">Categoria</option>
                    {editCategoryOptions.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.value}
                    onChange={e => setEditForm({ ...editForm, value: e.target.value })}
                    placeholder="Valor"
                    required
                  />
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                    required
                  />
                  {wallets.length > 0 && (
                    <select
                      value={editForm.wallet_id}
                      onChange={e => setEditForm({ ...editForm, wallet_id: e.target.value })}
                    >
                      <option value="">Sem conta vinculada</option>
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="edit-form-actions">
                  <button type="submit" className="submit-btn">💾 Salvar</button>
                  <button type="button" className="cancel-btn" onClick={cancelEdit}>❌ Cancelar</button>
                </div>
              </form>
            ) : (
              <>
                <div className="transaction-info">
                  <h4>
                    {transaction.category === 'transferencia' && <span title="Transferência entre contas" style={{ marginRight: '6px' }}>🔄</span>}
                    {transaction.installment_ref && <span className="installment-badge" title={`Parcela ${transaction.installment_num} de ${transaction.installment_total}`}>💳 {transaction.installment_num}/{transaction.installment_total}</span>}
                    {transaction.description}
                  </h4>
                  <p>
                    {transaction.category === 'transferencia'
                      ? <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Transferência</span>
                      : getCatLabel(transaction.category)}
                    {transaction.wallet_id && wallets.length > 0 && (() => {
                      const w = wallets.find(ww => ww.id === parseInt(transaction.wallet_id));
                      return w ? <span className="tx-wallet-badge"> • 🏦 {w.name}</span> : null;
                    })()}
                  </p>
                  <span className="date">{new Date(transaction.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="transaction-value">
                  <span className={`value ${transaction.type}`}>
                    {transaction.type === 'entrada' ? '+' : '-'}R$ {parseFloat(transaction.value).toFixed(2)}
                  </span>
                  <div className="transaction-btns">
                    {isApiAvailable && (
                      <button
                        onClick={() => startEdit(transaction)}
                        className="edit-btn"
                        title="Editar transação"
                      >
                        ✏️
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!isApiAvailable) {
                          alert('Conexão com servidor necessária para excluir transações.');
                          return;
                        }
                        if (window.confirm(`Deseja realmente excluir "${transaction.description}"?`)) {
                          onDelete(transaction.id);
                        }
                      }}
                      className={`delete-btn ${!isApiAvailable ? 'disabled' : ''}`}
                      disabled={!isApiAvailable}
                      title={!isApiAvailable ? 'Servidor offline' : `Excluir "${transaction.description}"`}
                    >
                      {!isApiAvailable ? '🚫' : '🗑️'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Botão Carregar mais */}
      {visibleCount < filteredTransactions.length && (
        <div className="load-more-container">
          <button
            className="load-more-btn"
            onClick={() => setVisibleCount(v => v + HISTORICO_PAGE_SIZE)}
          >
            ▼ Carregar mais ({filteredTransactions.length - visibleCount} restantes)
          </button>
        </div>
      )}
    </div>
  );
});

// ─── Importar Extrato CSV ──────────────────────────────────────────────────
function ImportarCSV({ categories, currentUser, isApiAvailable, onImportDone }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'map' | 'preview' | 'done'
  const [rawRows, setRawRows] = useState([]); // todos os rows do CSV (sem header)
  const [headers, setHeaders] = useState([]); // nomes das colunas detectados
  const [mapping, setMapping] = useState({ date: '', description: '', value: '', type: '' });
  const [defaultCatDesp, setDefaultCatDesp] = useState('');
  const [defaultCatEnt, setDefaultCatEnt] = useState('');
  const [preview, setPreview] = useState([]);  // transações parseadas
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');

  const catDesp = categories?.despesa || [];
  const catEnt = categories?.entrada || [];

  // Detecta o delimitador mais frequente entre , ; \t |
  const detectDelimiter = (line) => {
    const candidates = [',', ';', '\t', '|'];
    let best = ','; let bestCount = 0;
    candidates.forEach(d => {
      const c = (line.split(d).length - 1);
      if (c > bestCount) { bestCount = c; best = d; }
    });
    return best;
  };

  // Normaliza valor brasileiro ("1.234,56" ou "-1234.56" ou "1234,56") para float
  const parseBRValue = (raw) => {
    if (!raw) return NaN;
    let s = String(raw).trim().replace(/\s/g, '');
    // Remove símbolo de moeda
    s = s.replace(/^[R$\s]+/, '').replace(/^-[R$\s]+/, '-');
    // Se tem vírgula como decimal e ponto como milhar: 1.234,56
    if (/\d+\.\d{3},\d+/.test(s) || (/,\d{1,2}$/.test(s) && s.includes('.'))) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (/,\d+$/.test(s)) {
      // vírgula como decimal, sem ponto milhar
      s = s.replace(',', '.');
    }
    return parseFloat(s);
  };

  // Normaliza data para YYYY-MM-DD
  const parseDate = (raw) => {
    if (!raw) return '';
    const s = String(raw).trim();
    // DD/MM/YYYY ou DD-MM-YYYY
    const dmY = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmY) return `${dmY[3]}-${dmY[2].padStart(2, '0')}-${dmY[1].padStart(2, '0')}`;
    // YYYY-MM-DD ou YYYY/MM/DD
    const Ymd = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (Ymd) return `${Ymd[1]}-${Ymd[2].padStart(2, '0')}-${Ymd[3].padStart(2, '0')}`;
    // MM/DD/YYYY
    const mdY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdY) return `${mdY[3]}-${mdY[1].padStart(2, '0')}-${mdY[2].padStart(2, '0')}`;
    return '';
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      // Remove BOM se existir
      const clean = text.replace(/^\uFEFF/, '');
      const lines = clean.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast.error('Arquivo CSV deve ter ao menos 2 linhas (cabeçalho + dados).'); return; }
      const delim = detectDelimiter(lines[0]);
      const parseLine = (line) => {
        const result = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') { inQ = !inQ; }
          else if (ch === delim && !inQ) { result.push(cur.trim()); cur = ''; }
          else { cur += ch; }
        }
        result.push(cur.trim());
        return result;
      };
      const hdr = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(parseLine).filter(r => r.some(c => c.trim()));
      setHeaders(hdr);
      setRawRows(rows);
      // Auto-detect mapping por nome de coluna
      const lh = hdr.map(h => h.toLowerCase());
      const autoMap = {};
      autoMap.date = String(lh.findIndex(h => /data|date|dt/.test(h)));
      autoMap.description = String(lh.findIndex(h => /descri|hist.rico|memo|narr|title/.test(h)));
      autoMap.value = String(lh.findIndex(h => /valor|value|amount|quantia|cred|deb/.test(h)));
      autoMap.type = String(lh.findIndex(h => /tipo|type/.test(h)));
      // Se não achou coluna de tipo, será detectado pelo sinal do valor
      setMapping({
        date: autoMap.date !== '-1' ? autoMap.date : '',
        description: autoMap.description !== '-1' ? autoMap.description : '',
        value: autoMap.value !== '-1' ? autoMap.value : '',
        type: autoMap.type !== '-1' ? autoMap.type : '',
      });
      // Default categorias
      setDefaultCatDesp(catDesp[catDesp.length - 1]?.id || '');
      setDefaultCatEnt(catEnt[catEnt.length - 1]?.id || '');
      setStep('map');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const buildPreview = () => {
    const di = parseInt(mapping.date);
    const si = parseInt(mapping.description);
    const vi = parseInt(mapping.value);
    const ti = mapping.type !== '' ? parseInt(mapping.type) : -1;
    if (isNaN(di) || isNaN(si) || isNaN(vi)) { toast.error('Selecione as colunas de Data, Descrição e Valor.'); return; }
    const parsed = [];
    const errors = [];
    rawRows.forEach((row, idx) => {
      const rawDate = row[di] || '';
      const rawDesc = row[si] || '';
      const rawVal = row[vi] || '';
      const rawType = ti >= 0 ? row[ti] || '' : '';
      const date = parseDate(rawDate);
      const val = parseBRValue(rawVal);
      if (!date) { errors.push(`Linha ${idx + 2}: data inválida "${rawDate}"`); return; }
      if (isNaN(val)) { errors.push(`Linha ${idx + 2}: valor inválido "${rawVal}"`); return; }
      if (!rawDesc.trim()) { errors.push(`Linha ${idx + 2}: descrição vazia`); return; }
      let type;
      if (rawType) {
        const lt = rawType.toLowerCase();
        type = (lt.includes('entr') || lt.includes('cred') || lt === 'c') ? 'entrada' : 'despesa';
      } else {
        type = val >= 0 ? 'entrada' : 'despesa';
      }
      const category = type === 'entrada' ? defaultCatEnt : defaultCatDesp;
      parsed.push({ type, description: rawDesc.trim(), category, value: Math.abs(val).toFixed(2), date });
    });
    if (errors.length > 0) {
      toast.error(`${errors.length} linha(s) com erro. Ex: ${errors[0]}`);
      if (errors.length === rawRows.length) return;
    }
    if (parsed.length === 0) { toast.error('Nenhuma transação válida encontrada.'); return; }
    setPreview(parsed);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!isApiAvailable) { toast.error('Servidor offline. Não é possível importar.'); return; }
    if (!currentUser?.email) { toast.error('Usuário não autenticado.'); return; }
    setImporting(true);
    try {
      const res = await fetch(`${config.API_URL}/transactions/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: preview, userId: currentUser.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      toast.success(`✅ ${data.count} transação(ões) importada(s) com sucesso!`);
      onImportDone();
      setStep('done');
    } catch (err) {
      toast.error(`Erro na importação: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep('upload'); setRawRows([]); setHeaders([]); setPreview([]);
    setFileName(''); setMapping({ date: '', description: '', value: '', type: '' });
  };

  const colOptions = headers.map((h, i) => ({ label: h || `Coluna ${i + 1}`, value: String(i) }));

  return (
    <div className="importar-csv">
      <h2>📥 Importar Extrato CSV</h2>

      {step === 'upload' && (
        <div className="import-upload-area">
          <div className="import-info">
            <p>Importe transações a partir de um arquivo <strong>CSV</strong> exportado do seu banco.</p>
            <ul>
              <li>Formatos de data suportados: <code>DD/MM/AAAA</code>, <code>AAAA-MM-DD</code></li>
              <li>Formatos de valor: <code>1.234,56</code> ou <code>1234.56</code> (negativo = despesa)</li>
              <li>Delimitadores: vírgula, ponto-e-vírgula ou tabulação</li>
              <li>Máximo de 2.000 transações por importação</li>
            </ul>
          </div>
          <label className="import-file-label">
            <span>📂 Selecionar arquivo CSV</span>
            <input type="file" accept=".csv,.txt" onChange={handleFile} />
          </label>
        </div>
      )}

      {step === 'map' && (
        <div className="import-map">
          <div className="import-map-header">
            <span>📄 <strong>{fileName}</strong> — {rawRows.length} linhas detectadas</span>
            <button className="cancel-btn" onClick={reset}>🔄 Trocar arquivo</button>
          </div>
          <p className="import-map-hint">Selecione qual coluna do CSV corresponde a cada campo:</p>
          <div className="import-map-grid">
            {[
              { key: 'date', label: '📅 Data', required: true },
              { key: 'description', label: '📝 Descrição', required: true },
              { key: 'value', label: '💲 Valor', required: true },
              { key: 'type', label: '↕️ Tipo', required: false },
            ].map(({ key, label, required }) => (
              <div key={key} className="import-map-field">
                <label>{label} {required && <span className="required">*</span>}</label>
                <select value={mapping[key]} onChange={e => setMapping(m => ({ ...m, [key]: e.target.value }))}>
                  <option value="">{key === 'type' ? 'Auto (pelo sinal do valor)' : '— Selecione —'}</option>
                  {colOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
            <div className="import-map-field">
              <label>🏷️ Categoria padrão (Despesas)</label>
              <select value={defaultCatDesp} onChange={e => setDefaultCatDesp(e.target.value)}>
                {catDesp.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="import-map-field">
              <label>🏷️ Categoria padrão (Entradas)</label>
              <select value={defaultCatEnt} onChange={e => setDefaultCatEnt(e.target.value)}>
                {catEnt.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Preview das primeiras 3 linhas do CSV bruto */}
          <div className="import-raw-preview">
            <p><strong>Prévia do arquivo:</strong></p>
            <div className="import-table-wrap">
              <table>
                <thead><tr>{headers.map((h, i) => <th key={i}>{h || `Col ${i + 1}`}</th>)}</tr></thead>
                <tbody>
                  {rawRows.slice(0, 3).map((row, ri) => (
                    <tr key={ri}>{headers.map((_, ci) => <td key={ci}>{row[ci] || ''}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button className="submit-btn" onClick={buildPreview}>🔍 Visualizar Transações</button>
        </div>
      )}

      {step === 'preview' && (
        <div className="import-preview">
          <div className="import-preview-header">
            <span>✅ <strong>{preview.length}</strong> transações prontas para importar</span>
            <button className="cancel-btn" onClick={() => setStep('map')}>← Voltar ao mapeamento</button>
          </div>
          <div className="import-table-wrap">
            <table>
              <thead>
                <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th></tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((t, i) => (
                  <tr key={i} className={t.type}>
                    <td>{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td>{t.description}</td>
                    <td>{t.category}</td>
                    <td><span className={`type-badge ${t.type}`}>{t.type === 'entrada' ? '⬆️ Entrada' : '⬇️ Despesa'}</span></td>
                    <td className={`val ${t.type}`}>{t.type === 'entrada' ? '+' : '-'}R$ {parseFloat(t.value).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 50 && <p className="import-more-hint">…e mais {preview.length - 50} transações não exibidas.</p>}
          <div className="import-actions">
            <button className="submit-btn" onClick={handleImport} disabled={importing}>
              {importing ? '⏳ Importando...' : `📥 Importar ${preview.length} transações`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="import-done">
          <div className="import-done-icon">✅</div>
          <h3>Importação concluída!</h3>
          <p>As transações foram adicionadas ao seu histórico.</p>
          <button className="submit-btn" onClick={reset}>📂 Importar outro arquivo</button>
        </div>
      )}
    </div>
  );
}

export default App;
