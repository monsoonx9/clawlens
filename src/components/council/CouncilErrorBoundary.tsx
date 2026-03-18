"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CouncilErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Council Error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-risk-extreme/20 rounded-full">
                <AlertTriangle className="w-6 h-6 text-risk-extreme" />
              </div>
              <div>
                <h2 className="text-text-primary text-lg font-semibold">Something went wrong</h2>
                <p className="text-text-muted text-sm">The Council encountered an error</p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-card border border-card-border rounded-lg p-3 mb-4">
                <p className="text-text-secondary text-xs font-mono">{this.state.error.message}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 bg-accent text-bg font-semibold px-4 py-2.5 rounded-full hover:bg-accent/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 bg-card border border-card-border text-text-primary px-4 py-2.5 rounded-full hover:bg-card/80 transition-colors"
              >
                <Home className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
