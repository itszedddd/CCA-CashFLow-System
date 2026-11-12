import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
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

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6 font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white font-cinzel mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-400 mb-4">
              {this.state.error?.message || 'An unexpected error occurred while rendering the page.'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Page
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('cca_cf_token');
                  localStorage.removeItem('cca_cf_user');
                  window.location.href = '/login';
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                Sign In Again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
