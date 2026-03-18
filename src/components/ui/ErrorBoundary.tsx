"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <div className="bg-glass-strong backdrop-blur-md border border-card-border rounded-[12px] p-6 max-w-sm w-full text-center">
            <AlertTriangle className="w-8 h-8 text-accent mx-auto mb-4" />
            <p className="text-text-secondary text-sm">
              {this.state.error?.message || "Something went wrong"}
            </p>
            <button
              onClick={this.handleReload}
              className="mt-4 text-accent text-sm hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <RefreshCcw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  title?: string;
}

export class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Widget error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[color-mix(in_srgb,var(--color-card),transparent_50%)] border border-card-border rounded-[12px] p-4 h-full flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-6 h-6 text-risk-extreme mb-2" />
          <p className="text-text-secondary text-sm mb-2">
            {this.props.title || "Widget"} failed to load
          </p>
          <p className="text-text-muted text-xs">{this.state.error?.message || "Unknown error"}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

interface CouncilErrorBoundaryProps {
  children: ReactNode;
}

export class CouncilErrorBoundary extends Component<CouncilErrorBoundaryProps, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Council error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-glass-strong backdrop-blur-md border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_70%)] rounded-[16px] p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-risk-extreme mx-auto mb-4" />
          <h3 className="text-text-primary font-semibold mb-2">Council Encountered an Error</h3>
          <p className="text-text-secondary text-sm mb-4">
            {this.state.error?.message || "The council session failed"}
          </p>
          <button
            onClick={this.handleReload}
            className="bg-accent text-amoled font-bold py-2 px-6 rounded-full hover:scale-105 transition-all inline-flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Start New Session
          </button>
        </div>
      );
    }

    return this.props.children;
  }

  private handleReload = () => {
    window.location.reload();
  };
}
