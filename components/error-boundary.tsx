"use client";

import React from "react";

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  reset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8 text-center">
          <div className="max-w-sm space-y-4">
            <p className="text-sm font-medium">Something went wrong.</p>
            <p className="text-xs text-muted-foreground">{this.state.message}</p>
            <button
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={this.reset}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
