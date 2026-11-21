import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type IconName = 
  | 'home' 
  | 'classes' 
  | 'routine' 
  | 'attendance' 
  | 'scores' 
  | 'settings' 
  | 'profile' 
  | 'logout' 
  | 'moon' 
  | 'sun' 
  | 'bell' 
  | 'check' 
  | 'alert' 
  | 'chevronRight'
  | 'google'
  | 'plus';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, color = '#2563eb' }) => {
  // Universal icon symbols matching VidyaOS design system
  const icons: Record<IconName, string> = {
    home: '🏠',
    classes: '📚',
    routine: '⏱️',
    attendance: '🛡️',
    scores: '📊',
    settings: '⚙️',
    profile: '👤',
    logout: '🚪',
    moon: '🌙',
    sun: '☀️',
    bell: '🔔',
    check: '✓',
    alert: '⚠️',
    chevronRight: '›',
    google: 'G',
    plus: '+'
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={{ fontSize: size * 0.85, color, textAlign: 'center' }}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Icon;
