import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, COLORS } from '../config/api';

export default function AddTransactionScreen({ navigation }) {
    const { user, authFetch } = useAuth();
    const [type, setType] = useState('despesa');
    const [description, setDescription] = useState('');
    const [value, setValue] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    const cats = CATEGORIES[type] || [];

    const handleSave = async () => {
        if (!description.trim()) { Alert.alert('Atenção', 'Informe uma descrição.'); return; }
        const numVal = parseFloat(value.replace(',', '.'));
        if (!numVal || numVal <= 0) { Alert.alert('Atenção', 'Informe um valor válido.'); return; }
        if (!category) { Alert.alert('Atenção', 'Selecione uma categoria.'); return; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { Alert.alert('Atenção', 'Data inválida. Use o formato AAAA-MM-DD.'); return; }

        setLoading(true);
        try {
            const res = await authFetch('/transactions', {
                method: 'POST',
                body: JSON.stringify({
                    type, description: description.trim(),
                    value: numVal, category, date,
                    userId: user.email,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
            Alert.alert('Sucesso', `${type === 'entrada' ? 'Receita' : 'Despesa'} adicionada!`, [
                {
                    text: 'OK', onPress: () => {
                        setDescription(''); setValue(''); setCategory('');
                        setDate(new Date().toISOString().split('T')[0]);
                        navigation.navigate('Dashboard');
                    }
                },
            ]);
        } catch (e) {
            Alert.alert('Erro', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

                {/* Tipo: Entrada / Despesa */}
                <View style={styles.typeRow}>
                    <TouchableOpacity
                        style={[styles.typeBtn, type === 'entrada' && styles.typeBtnActiveEntrada]}
                        onPress={() => { setType('entrada'); setCategory(''); }}
                    >
                        <Text style={[styles.typeBtnText, type === 'entrada' && styles.typeBtnTextActive]}>⬆️ Entrada</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.typeBtn, type === 'despesa' && styles.typeBtnActiveDespesa]}
                        onPress={() => { setType('despesa'); setCategory(''); }}
                    >
                        <Text style={[styles.typeBtnText, type === 'despesa' && styles.typeBtnTextActive]}>⬇️ Despesa</Text>
                    </TouchableOpacity>
                </View>

                {/* Campos */}
                <View style={styles.card}>
                    <Text style={styles.label}>Descrição</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: Supermercado"
                        placeholderTextColor={COLORS.textSecondary}
                        value={description}
                        onChangeText={setDescription}
                        maxLength={100}
                    />

                    <Text style={styles.label}>Valor (R$)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0,00"
                        placeholderTextColor={COLORS.textSecondary}
                        value={value}
                        onChangeText={setValue}
                        keyboardType="decimal-pad"
                    />

                    <Text style={styles.label}>Data (AAAA-MM-DD)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="2026-02-24"
                        placeholderTextColor={COLORS.textSecondary}
                        value={date}
                        onChangeText={setDate}
                        maxLength={10}
                    />

                    <Text style={styles.label}>Categoria</Text>
                    <View style={styles.catGrid}>
                        {cats.map((c) => (
                            <TouchableOpacity
                                key={c.id}
                                style={[styles.catBtn, category === c.id && styles.catBtnActive]}
                                onPress={() => setCategory(c.id)}
                            >
                                <Text style={styles.catIcon}>{c.icon}</Text>
                                <Text style={[styles.catLabel, category === c.id && styles.catLabelActive]}>
                                    {c.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Botão salvar */}
                <TouchableOpacity
                    style={[
                        styles.saveBtn,
                        { backgroundColor: type === 'entrada' ? COLORS.success : COLORS.danger },
                        loading && styles.btnDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.saveBtnText}>
                            {type === 'entrada' ? '💰 Adicionar Receita' : '💸 Adicionar Despesa'}
                        </Text>
                    }
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: COLORS.background },
    container: { padding: 16, paddingBottom: 32 },
    typeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    typeBtn: {
        flex: 1, padding: 12, borderRadius: 12, borderWidth: 2,
        borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surface,
    },
    typeBtnActiveEntrada: { borderColor: COLORS.success, backgroundColor: '#ecfdf5' },
    typeBtnActiveDespesa: { borderColor: COLORS.danger, backgroundColor: '#fef2f2' },
    typeBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
    typeBtnTextActive: { color: COLORS.textPrimary },
    card: {
        backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 8, marginBottom: 20,
    },
    label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
    input: {
        borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
        padding: 12, fontSize: 15, color: COLORS.textPrimary,
        backgroundColor: COLORS.background, marginBottom: 16,
    },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    catBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.background,
    },
    catBtnActive: { borderColor: COLORS.primary, backgroundColor: '#eef2ff' },
    catIcon: { fontSize: 16 },
    catLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
    catLabelActive: { color: COLORS.primary, fontWeight: '700' },
    saveBtn: { borderRadius: 14, padding: 16, alignItems: 'center', elevation: 3 },
    btnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
