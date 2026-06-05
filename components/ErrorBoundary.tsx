import React from 'react';
import { ScrollView, Text } from 'react-native';

// Catches render-time crashes so a failure shows the actual error on screen
// instead of a blank white view (release builds hide the red box). Temporary
// diagnostic aid; safe to keep as a safety net.
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
          <Text selectable style={{ fontSize: 18, fontWeight: '800', color: '#c00', marginBottom: 12 }}>
            App crashed on launch
          </Text>
          <Text selectable style={{ fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 }}>
            {e.name}: {e.message}
          </Text>
          <Text selectable style={{ fontSize: 12, color: '#444', fontFamily: 'Courier' }}>
            {e.stack ?? '(no stack)'}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}
