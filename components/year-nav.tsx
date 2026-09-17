import { ChevronLeft, ChevronRight } from "lucide-react";

export interface YearNavProps {
  /** Years present in the loaded data, ascending. */
  years: number[];
  /** Currently displayed year, or null before any data loads. */
  activeYear: number | null;
  /** Called with the year a nav button was clicked for. */
  onSelectYear: (year: number) => void;
  onPrevYear: () => void;
  onNextYear: () => void;
}

/**
 * Year picker used in both book mode (below the form) and tent mode
 * (beside the form): a row of year buttons plus prev/next arrows for
 * stepping through `years` one at a time.
 */
export function YearNav({ years, activeYear, onSelectYear, onPrevYear, onNextYear }: YearNavProps) {
  const activeIndex = activeYear == null ? -1 : years.indexOf(activeYear);

  return (
    <>
      <div className="tent-years">
        {years.map(year => (
          <button
            key={year}
            className={`tent-year-btn${year === activeYear ? " tent-year-active" : ""}`}
            onClick={() => onSelectYear(year)}
            aria-current={year === activeYear ? "true" : undefined}
          >
            {year}
          </button>
        ))}
      </div>
      <div className="tent-arrows">
        <button
          className="tent-arrow-btn"
          disabled={activeIndex <= 0}
          onClick={onPrevYear}
          aria-label="Previous year"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className="tent-arrow-btn"
          disabled={activeIndex === -1 || activeIndex >= years.length - 1}
          onClick={onNextYear}
          aria-label="Next year"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </>
  );
}
