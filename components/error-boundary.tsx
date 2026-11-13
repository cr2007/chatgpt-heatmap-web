import React from "react";

/** State of {@link ErrorBoundary}. */
interface State {
  /** A child threw, so the error screen shows. */
  hasError: boolean;
  /** The message of the caught error, shown on the error screen. */
  message: string;
}

/**
 * Catches a render error in `children` and shows an error screen in place
 * of a blank page.
 *
 * "Try again" renders `children` again.
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, message: "" };

  /**
   * Switches to the error screen after a render error.
   *
   * @param error - The error that a child threw.
   * @returns The state that shows the error screen with its message.
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  /** Clears the error, so `children` render again. */
  reset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          id="error-screen"
          className="flex min-h-dvh items-center justify-center p-8 text-center"
        >
          <div className="max-w-sm space-y-4">
            <p className="text-sm font-medium">Something went wrong.</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {this.state.message}
            </p>
            <button
              className="rounded text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent dark:text-zinc-400 dark:hover:text-zinc-50"
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
