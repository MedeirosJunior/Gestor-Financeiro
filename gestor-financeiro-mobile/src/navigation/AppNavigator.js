import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../config/api';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ReportsScreen from '../screens/ReportsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ICONS = {
    Dashboard: '🏠',
    Lançar: '➕',
    Transações: '📋',
    Relatórios: '📊',
};

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: () => <Text style={{ fontSize: 20 }}>{ICONS[route.name]}</Text>,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarStyle: {
                    backgroundColor: COLORS.surface,
                    borderTopColor: COLORS.border,
                    paddingBottom: 4,
                    height: 60,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                headerStyle: { backgroundColor: COLORS.surface },
                headerTitleStyle: { color: COLORS.textPrimary, fontWeight: '700' },
                headerShadowVisible: false,
            })}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Início' }} />
            <Tab.Screen name="Lançar" component={AddTransactionScreen} options={{ title: 'Lançar' }} />
            <Tab.Screen name="Transações" component={TransactionsScreen} options={{ title: 'Transações' }} />
            <Tab.Screen name="Relatórios" component={ReportsScreen} options={{ title: 'Relatórios' }} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { user, loading } = useAuth();

    if (loading) return null;

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user ? (
                    <Stack.Screen name="Main" component={MainTabs} />
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
