import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { JobsScreen } from '@/screens/plumber/JobsScreen';
import { JobDetailScreen } from '@/screens/plumber/JobDetailScreen';
import { EnquiryDetailScreen } from '@/screens/plumber/EnquiryDetailScreen';
import { DashboardScreen } from '@/screens/plumber/DashboardScreen';
import { AccountScreen } from '@/screens/plumber/AccountScreen';
import { EditProfileScreen } from '@/screens/plumber/EditProfileScreen';
import { BankDetailsScreen } from '@/screens/plumber/BankDetailsScreen';
import type { PlumberTabParamList, PlumberStackParamList } from '@/types/navigation';
import { Colors } from '@/constants/colors';

const Tab = createBottomTabNavigator<PlumberTabParamList>();
const Stack = createNativeStackNavigator<PlumberStackParamList>();

function PlumberTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.grey500,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.grey100,
          paddingBottom: 4,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function PlumberTabNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlumberTabs" component={PlumberTabs} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
      <Stack.Screen name="EnquiryDetail" component={EnquiryDetailScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="BankDetails" component={BankDetailsScreen} />
    </Stack.Navigator>
  );
}
