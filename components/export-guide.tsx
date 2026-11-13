import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { ProviderInfo } from "@/lib/providers";

/** Styles `code` and **bold** spans in a guide step. */
function Inline({ text }: { text: string }) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith("`") ? (
      <code
        key={i}
        className="rounded bg-zinc-100 px-1 py-px font-mono text-[0.85em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
      >
        {part.slice(1, -1)}
      </code>
    ) : part.startsWith("**") ? (
      <span key={i} className="font-medium text-zinc-900 dark:text-zinc-100">
        {part.slice(2, -2)}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/**
 * The numbered export steps of each provider, under an h3 per provider.
 *
 * The welcome screen and the "How to export" popover use it.
 */
export function ExportGuide({
  providers,
  idPrefix,
  className,
  headings = true,
}: {
  /** The providers to show, in order; each gives its `guide` steps ({@link ProviderInfo}). */
  providers: readonly ProviderInfo[];
  /** Names each provider's section: `${idPrefix}-chatgpt`. */
  idPrefix: string;
  /** Classes for the wrapper of the sections. */
  className?: string;
  /**
   * Shows each provider's heading; false keeps it for screen readers only
   * (the help's switch already names the provider).
   *
   * @defaultValue true
   */
  headings?: boolean;
}) {
  return (
    <div className={className}>
      {providers.map((p) => (
        <section key={p.key} id={`${idPrefix}-${p.key}`}>
          <h3
            className={cn(
              headings
                ? "flex items-center gap-2 text-sm font-semibold"
                : "sr-only",
              p.text,
            )}
          >
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-sm", p.dot)}
            />
            {p.label}
          </h3>
          <ol
            className={cn(
              "flex flex-col gap-2.5 text-sm text-zinc-600 dark:text-zinc-400",
              headings && "mt-3",
            )}
          >
            {p.guide.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-3 shrink-0 text-right font-medium text-zinc-400 tabular-nums dark:text-zinc-500">
                  {i + 1}
                </span>
                <span>
                  <Inline text={step} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
