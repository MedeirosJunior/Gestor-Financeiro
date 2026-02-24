import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../config/api';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function TransactionsScreen() {
    const { user, authFetch } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const load = useCallback(async () => {
        try {
            const res = await authFetch(`/transactions?userId=${encodeURIComponent(user.email)}`);
            const data = await res.json();
            const all = Array.isArray(data) ? data : (data.data || []);
            all.sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(all);
            setFiltered(all);
        } catch (e) {
            console.warn('Erro:', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [authFetch, user]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        let list = transactions;
        if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(t =>
                t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
            );
        }
        setFiltered(list);
    }, [search, typeFilter, transactions]);

    const handleDelete = (id) => {
        Alert.alert('Excluir', 'Deseja excluir esta transação?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await authFetch(`/transactions/${id}?userId=${encodeURIComponent(user.email)}`, { method: 'DELETE' });
                        setTransactions(prev => prev.filter(t => t.id !== id));
                    } catch (e) { Alert.alert('Erro', e.message); }
                }
            },
        ]);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Carregando...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Busca */}
            <View style={styles.searchBox}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="🔍  Buscar por descrição ou categoria..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Filtros */}
            <View style={styles.filterRow}>
                {[['all', 'Todas'], ['entrada', '⬆️ Entradas'], ['despesa', '⬇️ Despesas']].map(([v, l]) => (
                    <TouchableOpacity
                        key={v}
                        style={[styles.filterBtn, typeFilter === v && styles.filterBtnActive]}
                        onPress={() => setTypeFilter(v)}
                    >
                        <Text style={[styles.filterBtnText, typeFilter === v && styles.filterBtnTextActive]}>{l}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.countText}>{filtered.length} transação(ões)</Text>

            <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />}
                renderItem={({ item: t }) => (
                    <TouchableOpacity
                        style={styles.txCard}
                        onLongPress={() => handleDelete(t.id)}
                        activeOpacity={0.85}
                    >
                        <View style={[styles.typeBadge, { backgroundColor: t.type === 'entrada' ? '#ecfdf5' : '#fef2f2' }]}>
                            <Text style={{ fontSize: 18 }}>{t.type === 'entrada' ? '⬆️' : '⬇️'}</Text>
                        </View>
                        <View style={styles.txInfo}>
                            <Text style={styles.txDesc} numberOfLines={1}>{t.description}</Text>
                            <Text style={styles.txMeta}>
                                {t.category} • {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </Text>
                        </View>
                        <Text style={[styles.txValue, { color: t.type === 'entrada' ? COLORS.success : COLORS.danger }]}>
                            {t.type === 'entrada' ? '+' : '-'}{fmt(t.value)}
                        </Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 24 }}
            />
            <Text style={styles.hint}>Mantenha pressionado para excluir</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: COLORS.textSecondary },
    searchBox: { padding: 12, paddingBottom: 0 },
    searchInput: {
        backgroundColor: COLORS.surface, borderRadius: 12, padding: 12,
        fontSize: 14, color: COLORS.textPrimary, borderWidth: 1.5, borderColor: COLORS.border,
    },
    filterRow: { flexDirection: 'row', padding: 12, gap: 8 },
    filterBtn: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
    },
    filterBtnActive: { borderColor: COLORS.primary, backgroundColor: '#eef2ff' },
    filterBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
    filterBtnTextActive: { color: COLORS.primary, fontWeight: '700' },
    countText: { paddingHorizontal: 16, marginBottom: 4, fontSize: 12, color: COLORS.textSecondary },
    txCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
        marginHorizontal: 12, marginBottom: 8, borderRadius: 14, padding: 14,
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4,
    },
    typeBadge: {
        width: 40, height: 40, borderRadius: 20, alignItems: 'center',
        justifyContent: 'center', marginRight: 12,
    },
    txInfo: { flex: 1, marginRight: 8 },
    txDesc: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
    txMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    txValue: { fontSize: 14, fontWeight: '700' },
    empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
    emptyIcon: { fontSize: 40 },
    emptyText: { color: COLORS.textSecondary, fontSize: 15 },
    hint: { textAlign: 'center', fontSize: 11, color: COLORS.textSecondary, padding: 8 },
});
