import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Wraps next-themes, which sets the "dark" class on <html>. */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
