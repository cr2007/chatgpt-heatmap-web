import { useState, useSyncExternalStore } from "react";
import { getFileDrag, subscribeFileDrag } from "@/lib/file-drag";
import { DropZone } from "@/components/drop-zone";

/** How long (ms) the overlay stays after a drop, for the collapse into the drop point. */
const HOLD = 260;

/**
 * Once an export is loaded, files dragged anywhere over the page show one
 * full-window drop target, so a second export needs no hunting for a zone.
 */
export function PageDrop({
  progress,
  uploads,
  onFiles,
}: {
  progress: number | null;
  uploads: number;
  onFiles: (files: FileList) => Promise<unknown>;
}) {
  const drag = useSyncExternalStore(subscribeFileDrag, getFileDrag);
  const [holding, setHolding] = useState(false);
  if (!drag.active && !holding) return null;
  return (
    <div
      id="page-drop"
      className="fixed inset-0 z-40 animate-fade-in bg-zinc-50/75 p-4 backdrop-blur-sm sm:p-8 dark:bg-zinc-950/75"
    >
      <DropZone
        inputId="page-drop-file"
        progress={progress}
        uploads={uploads}
        onFiles={(files) => {
          setHolding(true);
          setTimeout(() => setHolding(false), HOLD);
          return onFiles(files);
        }}
      />
    </div>
  );
}
