import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; diagnosticId: string | null; }

function createDiagnosticId(): string {
  try { return crypto.randomUUID(); }
  catch { return `nx-${Date.now().toString(36)}`; }
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = { hasError: false, diagnosticId: null };

  public static getDerivedStateFromError(): State {
    return { hasError: true, diagnosticId: createDiagnosticId() };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[NEXORA:UI_CRASH]", {
      diagnosticId: this.state.diagnosticId,
      errorName: error?.name || "Error",
      componentStack: errorInfo.componentStack || "unavailable",
      path: typeof window !== "undefined" ? window.location.pathname : "unknown",
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nexora:ui-error", {
        detail: { diagnosticId: this.state.diagnosticId, errorName: error?.name || "Error" },
      }));
    }
  }

  private retry = () => this.setState({ hasError: false, diagnosticId: null });

  public override render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-screen" className="min-h-screen bg-[#070514] text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="w-full max-w-2xl bg-zinc-900/60 backdrop-blur-md border border-red-500/20 rounded-2xl p-6 md:p-8 shadow-md space-y-4">
            <h2 className="text-xl font-bold text-red-400" role="alert">NEXORA couldn't load this screen</h2>
            <p className="text-zinc-400 text-sm">Your account and locally stored data have not been deleted. You can retry this screen or reload NEXORA.</p>
            {this.state.diagnosticId && <p className="text-zinc-500 text-xs">Diagnostic reference: {this.state.diagnosticId}</p>}
            <div className="flex flex-wrap gap-3">
              <button id="error-boundary-retry" onClick={this.retry} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white">Try again</button>
              <button id="error-boundary-reset" onClick={() => window.location.reload()} className="px-4 py-2 border border-white/15 hover:bg-white/5 rounded-xl text-xs font-bold text-white">Reload NEXORA</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
