import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ChatbotScreen } from '@/screens/customer/ChatbotScreen';
import { EnquiriesScreen } from '@/screens/customer/EnquiriesScreen';
import { NewEnquiryScreen } from '@/screens/customer/NewEnquiryScreen';
import { EnquiryDetailScreen } from '@/screens/customer/EnquiryDetailScreen';
import { AccountScreen } from '@/screens/customer/AccountScreen';
import { EditProfileScreen } from '@/screens/customer/EditProfileScreen';
import type { CustomerTabParamList, CustomerStackParamList } from '@/types/navigation';
import { Colors } from '@/constants/colors';

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createNativeStackNavigator<CustomerStackParamList>();

function CustomerTabs() {
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
        name="Chatbot"
        component={ChatbotScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Enquiries"
        component={EnquiriesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
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

export function CustomerTabNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen name="NewEnquiry" component={NewEnquiryScreen} />
      <Stack.Screen name="EnquiryDetail" component={EnquiryDetailScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
}
