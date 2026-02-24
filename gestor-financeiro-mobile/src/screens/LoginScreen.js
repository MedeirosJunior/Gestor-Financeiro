import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../config/api';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Atenção', 'Preencha e-mail e senha.');
            return;
        }
        setLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            Alert.alert('Erro', err.message || 'Não foi possível fazer login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>💰</Text>
                    <Text style={styles.title}>Gestor Financeiro</Text>
                    <Text style={styles.subtitle}>Controle suas finanças com facilidade</Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Entrar na conta</Text>

                    <Text style={styles.label}>E-mail</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="seu@email.com"
                        placeholderTextColor={COLORS.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <Text style={styles.label}>Senha</Text>
                    <View style={styles.passContainer}>
                        <TextInput
                            style={[styles.input, styles.passInput]}
                            placeholder="••••••••"
                            placeholderTextColor={COLORS.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPass}
                        />
                        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(v => !v)}>
                            <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.btn, loading && styles.btnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.btnText}>Entrar</Text>
                        }
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>Gestor Financeiro • {new Date().getFullYear()}</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: COLORS.primary },
    container: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: COLORS.primary,
    },
    header: { alignItems: 'center', marginBottom: 32 },
    logo: { fontSize: 56, marginBottom: 8 },
    title: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
    card: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 20,
        textAlign: 'center',
    },
    label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
    input: {
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: COLORS.textPrimary,
        backgroundColor: COLORS.background,
        marginBottom: 16,
    },
    passContainer: { position: 'relative' },
    passInput: { paddingRight: 48, marginBottom: 24 },
    eyeBtn: { position: 'absolute', right: 12, top: 12 },
    eyeIcon: { fontSize: 18 },
    btn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    footer: {
        marginTop: 24,
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
});
