import { describe, expect, it } from "bun:test";
import { dismissToast, getToasts, subscribeToasts, toast } from "./toast";

describe("toast", () => {
  it("keeps the newest 3, tells listeners, and dismisses by id", () => {
    let changes = 0;
    const unsubscribe = subscribeToasts(() => changes++);
    for (const n of [1, 2, 3, 4]) toast("success", `loaded ${n}`);
    expect(getToasts().map((t) => t.text)).toEqual([
      "loaded 2",
      "loaded 3",
      "loaded 4",
    ]);

    toast("error", "bad.json: could not parse JSON");
    const error = getToasts().at(-1)!;
    expect(error.kind).toBe("error");
    dismissToast(error.id);
    expect(getToasts().map((t) => t.text)).toEqual(["loaded 3", "loaded 4"]);

    unsubscribe();
    toast("success", "after unsubscribe");
    expect(changes).toBe(6);
  });
});
