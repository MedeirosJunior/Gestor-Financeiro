import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../config/api';

const { width } = Dimensions.get('window');
const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function ReportsScreen() {
    const { user, authFetch } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear] = useState(now.getFullYear());

    const load = useCallback(async () => {
        try {
            const res = await authFetch(`/transactions?userId=${encodeURIComponent(user.email)}`);
            const data = await res.json();
            setTransactions(Array.isArray(data) ? data : (data.data || []));
        } catch (e) {
            console.warn('Erro:', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [authFetch, user]);

    useEffect(() => { load(); }, [load]);

    // Filtra pelo mês/ano selecionado
    const monthTx = transactions.filter(t => {
        const [y, m] = t.date.split('-');
        return parseInt(m) - 1 === selectedMonth && parseInt(y) === selectedYear;
    });

    const entradas = monthTx.filter(t => t.type === 'entrada').reduce((s, t) => s + parseFloat(t.value), 0);
    const despesas = monthTx.filter(t => t.type === 'despesa').reduce((s, t) => s + parseFloat(t.value), 0);
    const saldo = entradas - despesas;

    // Agrupamento por categoria (despesas)
    const byCategory = {};
    monthTx.filter(t => t.type === 'despesa').forEach(t => {
        byCategory[t.category] = (byCategory[t.category] || 0) + parseFloat(t.value);
    });
    const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    // Dados para gráfico dos últimos 6 meses
    const last6 = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(selectedYear, selectedMonth - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const txs = transactions.filter(t => {
            const [ty, tm] = t.date.split('-');
            return parseInt(tm) - 1 === m && parseInt(ty) === y;
        });
        const total = txs.filter(t => t.type === 'despesa').reduce((s, t) => s + parseFloat(t.value), 0);
        last6.push({ label: MONTHS[m], value: Math.round(total) });
    }

    const chartData = {
        labels: last6.map(d => d.label),
        datasets: [{ data: last6.map(d => d.value || 0) }],
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />}
        >
            {/* Seletor de mês */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                {MONTHS.map((m, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.monthBtn, selectedMonth === i && styles.monthBtnActive]}
                        onPress={() => setSelectedMonth(i)}
                    >
                        <Text style={[styles.monthBtnText, selectedMonth === i && styles.monthBtnTextActive]}>{m}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Resumo */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderTopColor: COLORS.success }]}>
                    <Text style={styles.summaryLabel}>Entradas</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.success }]}>{fmt(entradas)}</Text>
                </View>
                <View style={[styles.summaryCard, { borderTopColor: COLORS.danger }]}>
                    <Text style={styles.summaryLabel}>Despesas</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.danger }]}>{fmt(despesas)}</Text>
                </View>
                <View style={[styles.summaryCard, { borderTopColor: saldo >= 0 ? COLORS.primary : COLORS.danger }]}>
                    <Text style={styles.summaryLabel}>Saldo</Text>
                    <Text style={[styles.summaryValue, { color: saldo >= 0 ? COLORS.primary : COLORS.danger }]}>{fmt(saldo)}</Text>
                </View>
            </View>

            {/* Gráfico de barras — despesas dos últimos 6 meses */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📊 Despesas — últimos 6 meses</Text>
                <BarChart
                    data={chartData}
                    width={width - 56}
                    height={200}
                    yAxisLabel="R$ "
                    chartConfig={{
                        backgroundColor: COLORS.surface,
                        backgroundGradientFrom: COLORS.surface,
                        backgroundGradientTo: COLORS.surface,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                        labelColor: () => COLORS.textSecondary,
                        propsForBackgroundLines: { stroke: COLORS.border },
                    }}
                    style={{ borderRadius: 12 }}
                    showValuesOnTopOfBars
                    fromZero
                />
            </View>

            {/* Despesas por categoria */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>💸 Despesas por categoria — {MONTHS[selectedMonth]}/{selectedYear}</Text>
                {catEntries.length === 0 ? (
                    <Text style={styles.emptyText}>Sem despesas neste mês</Text>
                ) : (
                    catEntries.map(([cat, val]) => {
                        const pct = despesas > 0 ? (val / despesas) * 100 : 0;
                        return (
                            <View key={cat} style={styles.catRow}>
                                <View style={styles.catNameRow}>
                                    <Text style={styles.catName}>{cat}</Text>
                                    <Text style={styles.catVal}>{fmt(val)}</Text>
                                </View>
                                <View style={styles.barBg}>
                                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                                </View>
                                <Text style={styles.catPct}>{pct.toFixed(1)}%</Text>
                            </View>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    monthScroll: { paddingVertical: 12, paddingHorizontal: 12 },
    monthBtn: {
        paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
        borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
    },
    monthBtnActive: { borderColor: COLORS.primary, backgroundColor: '#eef2ff' },
    monthBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
    monthBtnTextActive: { color: COLORS.primary, fontWeight: '700' },
    summaryRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
    summaryCard: {
        flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 12,
        borderTopWidth: 3, elevation: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    },
    summaryLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
    summaryValue: { fontSize: 13, fontWeight: '700' },
    card: {
        margin: 12, marginTop: 4, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 8,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
    emptyText: { color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 20 },
    catRow: { marginBottom: 14 },
    catNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    catName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
    catVal: { fontSize: 13, fontWeight: '700', color: COLORS.danger },
    barBg: { height: 8, backgroundColor: COLORS.border, borderRadius: 4 },
    barFill: { height: 8, backgroundColor: COLORS.danger, borderRadius: 4 },
    catPct: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3, textAlign: 'right' },
});
