import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>အက်ပ် ဖွင့်မရပါ</p>
          <p style={{ fontSize: 14, color: '#5a6b75', marginBottom: 16 }}>{this.state.message}</p>
          <button
            type="button"
            className="action-btn"
            style={{ maxWidth: 200, margin: '0 auto' }}
            onClick={() => window.location.reload()}
          >
            ပြန်ဖွင့်မည်
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}