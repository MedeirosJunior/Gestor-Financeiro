import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl,
    TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../config/api';

const fmt = (v) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const today = () => {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
};

export default function DashboardScreen({ navigation }) {
    const { user, authFetch, logout } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const { month, year } = today();
            const res = await authFetch(`/transactions?userId=${encodeURIComponent(user.email)}`);
            const data = await res.json();
            const all = Array.isArray(data) ? data : (data.data || []);
            // Filtra mês atual
            const filtered = all.filter((t) => {
                const [y, m] = t.date.split('-');
                return parseInt(m) === month && parseInt(y) === year;
            });
            setTransactions(filtered);
        } catch (e) {
            console.warn('Erro ao carregar transações:', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [authFetch, user]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = () => { setRefreshing(true); load(); };

    const entradas = transactions.filter(t => t.type === 'entrada').reduce((s, t) => s + parseFloat(t.value), 0);
    const despesas = transactions.filter(t => t.type === 'despesa').reduce((s, t) => s + parseFloat(t.value), 0);
    const saldo = entradas - despesas;

    const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Carregando...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]} 👋</Text>
                    <Text style={styles.period}>{monthName}</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Sair</Text>
                </TouchableOpacity>
            </View>

            {/* Saldo */}
            <View style={[styles.balanceCard, { backgroundColor: saldo >= 0 ? COLORS.primary : COLORS.danger }]}>
                <Text style={styles.balanceLabel}>Saldo do mês</Text>
                <Text style={styles.balanceValue}>{fmt(saldo)}</Text>
                <Text style={styles.balanceHint}>{transactions.length} transações este mês</Text>
            </View>

            {/* Entradas / Despesas */}
            <View style={styles.row}>
                <View style={[styles.summaryCard, { borderLeftColor: COLORS.success }]}>
                    <Text style={styles.summaryIcon}>⬆️</Text>
                    <Text style={styles.summaryLabel}>Entradas</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.success }]}>{fmt(entradas)}</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: COLORS.danger }]}>
                    <Text style={styles.summaryIcon}>⬇️</Text>
                    <Text style={styles.summaryLabel}>Despesas</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.danger }]}>{fmt(despesas)}</Text>
                </View>
            </View>

            {/* Últimas transações */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Últimas transações</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Transações')}>
                        <Text style={styles.seeAll}>Ver todas</Text>
                    </TouchableOpacity>
                </View>

                {recent.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyText}>Nenhuma transação este mês</Text>
                    </View>
                ) : (
                    recent.map((t) => (
                        <TransactionRow key={t.id} transaction={t} />
                    ))
                )}
            </View>
        </ScrollView>
    );
}

function TransactionRow({ transaction: t }) {
    const isEntrada = t.type === 'entrada';
    return (
        <View style={styles.txRow}>
            <View style={[styles.txDot, { backgroundColor: isEntrada ? COLORS.success : COLORS.danger }]} />
            <View style={styles.txInfo}>
                <Text style={styles.txDesc} numberOfLines={1}>{t.description}</Text>
                <Text style={styles.txCat}>{t.category} • {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</Text>
            </View>
            <Text style={[styles.txValue, { color: isEntrada ? COLORS.success : COLORS.danger }]}>
                {isEntrada ? '+' : '-'}{Number(t.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: COLORS.textSecondary },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, paddingTop: 16, backgroundColor: COLORS.surface,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    greeting: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
    period: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, textTransform: 'capitalize' },
    logoutBtn: { padding: 8 },
    logoutText: { color: COLORS.danger, fontSize: 14, fontWeight: '600' },
    balanceCard: {
        margin: 16, borderRadius: 20, padding: 24, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
    },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
    balanceValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginVertical: 6 },
    balanceHint: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
    row: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
    summaryCard: {
        flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
        borderLeftWidth: 4, elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
    },
    summaryIcon: { fontSize: 20, marginBottom: 6 },
    summaryLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 },
    summaryValue: { fontSize: 16, fontWeight: '700' },
    section: {
        margin: 16, backgroundColor: COLORS.surface, borderRadius: 16,
        padding: 16, elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
    seeAll: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
    empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyIcon: { fontSize: 36 },
    emptyText: { color: COLORS.textSecondary, fontSize: 14 },
    txRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    txDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
    txInfo: { flex: 1, marginRight: 8 },
    txDesc: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
    txCat: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    txValue: { fontSize: 14, fontWeight: '700' },
});
