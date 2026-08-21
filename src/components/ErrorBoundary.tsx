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
          <div className="w-full max-w-2xl bg-zinc-900/60 backdrop-blur-md border border-red-500/20 rounded-2xl p-6 md:p-8 shadow-md space-y-4">
            <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
              Connection Interrupted
            </h2>
            <p className="text-zinc-400 text-sm">
              Oops! Something went wrong while loading this screen.
            </p>
            <div className="bg-black/40 rounded-xl p-4 overflow-x-auto text-sm font-medium text-zinc-300 border border-white/5">
    We encountered a temporary issue. Our connection was interrupted, but you can safely retry or reload the page to continue.
  </div>
            
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
