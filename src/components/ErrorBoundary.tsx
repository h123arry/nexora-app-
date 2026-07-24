import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-screen" className="min-h-screen bg-[#070514] text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="w-full max-w-2xl bg-zinc-900/60 backdrop-blur-md border border-red-500/20 rounded-2xl p-6 md:p-8 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
              ⚠️ Nexora Core Run-time Exception
            </h2>
            <p className="text-zinc-400 text-sm">
              The application failed to render because of a fatal script execution or mounting error.
            </p>
            <div className="bg-black/40 rounded-xl p-4 overflow-x-auto text-xs font-mono text-zinc-300 border border-white/5">
              <span className="text-red-400 font-bold">{this.state.error?.name}:</span> {this.state.error?.message}
            </div>
            {this.state.error?.stack && (
              <pre className="bg-black/60 rounded-xl p-4 overflow-auto text-[10px] font-mono text-zinc-500 max-h-48 border border-white/5">
                {this.state.error.stack}
              </pre>
            )}
            <button
              id="error-boundary-reset"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 transition-colors rounded-xl text-xs font-bold text-white cursor-pointer"
            >
              Reset Session Storage & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
