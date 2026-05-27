// src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f7f4', textAlign: 'center', padding: 20 }}>
          <div style={{ background: '#fff', padding: 40, borderRadius: 16, border: '1px solid #e8e6e0', maxWidth: 500 }}>
            <h1 style={{ color: '#e24b4a', margin: '0 0 10px', fontSize: 24 }}>Oops! Something went wrong.</h1>
            <p style={{ color: '#666', marginBottom: 20 }}>An unexpected error occurred in the application. Our team has been notified.</p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ padding: '10px 24px', background: '#2d9d78', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
            >
              Reload Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre style={{ marginTop: 20, padding: 16, background: '#f5f5f5', borderRadius: 8, fontSize: 12, overflowX: 'auto', textAlign: 'left', color: '#a32d2d' }}>
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
