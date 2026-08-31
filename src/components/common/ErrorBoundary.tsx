import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('QuietFlow ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="error-boundary-fallback"
          className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-sand-50/80 min-h-[300px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 mb-4 shadow-sm">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight">
            {this.props.fallbackTitle || 'Unable to render this view'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed">
            QuietFlow encountered an unexpected rendering error. Your note files and vault data are completely safe.
          </p>

          {this.state.error && (
            <div className="mt-4 p-3 rounded-xl bg-slate-900 text-slate-200 text-left font-mono text-[11px] max-w-lg w-full overflow-x-auto select-text shadow-inner">
              <p className="text-rose-400 font-semibold">{this.state.error.name}: {this.state.error.message}</p>
              {this.state.error.stack && (
                <pre className="mt-2 text-[10px] text-slate-400 opacity-80 whitespace-pre-wrap">
                  {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
                </pre>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-5">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition-all shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Render</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
