import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';  // Use Ionicons for icons

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#878485',  // Ensure white for active icons
        tabBarInactiveTintColor: 'white', // Set inactive icons to white too
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: '#000', // Updated bottom tab color
          },
          default: {
            backgroundColor: '#000', // Updated bottom tab color
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={28} color={color} />  // Use Ionicons with white color
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <Ionicons name="eye" size={28} color={color} />  // Ensure 'eye' icon with white color
          ),
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: 'SOS',
          tabBarIcon: ({ color }) => (
            <Ionicons name="alert-circle" size={28} color={color} />  // 'alert-circle' icon with white
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => (
            <Ionicons name="document-text" size={28} color={color} />  // 'document-text' icon with white
          ),
        }}
      />
      <Tabs.Screen
        name="saferoutes"
        options={{
          title: 'Routes',
          tabBarIcon: ({ color }) => (
            <Ionicons name="map" size={28} color={color} />  // 'map' icon with white color
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={28} color={color} />  // 'person' icon with white color
          ),
        }}
      />
    </Tabs>
  );
}