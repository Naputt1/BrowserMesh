import type { NodeHandler } from "../types.js";
import { startHandler } from "./start.js";
import { endHandler } from "./end.js";
import { navigateHandler } from "./navigate.js";
import { clickHandler } from "./click.js";
import { typeHandler } from "./type.js";
import { waitHandler } from "./wait.js";
import { scrollHandler } from "./scroll.js";
import { selectHandler } from "./select.js";
import { extractHandler } from "./extract.js";
import { outputHandler } from "./output.js";
import { loopHandler } from "./loop.js";
import { customHandler } from "./custom.js";
import { fetchHandler } from "./fetch.js";
import { listenHandler } from "./listen.js";
import { stateHandler } from "./state.js";
import { pageHandler } from "./page.js";

export type { NodeHandler } from "../types.js";

export const defaultHandlerRegistry: ReadonlyMap<string, NodeHandler> = new Map([
  ["start", startHandler],
  ["end", endHandler],
  ["navigate", navigateHandler],
  ["click", clickHandler],
  ["type", typeHandler],
  ["wait", waitHandler],
  ["scroll", scrollHandler],
  ["select", selectHandler],
  ["extract", extractHandler],
  ["output", outputHandler],
  ["loop", loopHandler],
  ["custom", customHandler],
  ["fetch", fetchHandler],
  ["listen", listenHandler],
  ["state", stateHandler],
  ["page", pageHandler],
]);
