import type { NodeHandler } from "../types.js";
import { navigateHandler } from "./navigate.js";
import { clickHandler } from "./click.js";
import { typeHandler } from "./type.js";
import { waitHandler } from "./wait.js";
import { scrollHandler } from "./scroll.js";
import { extractHandler } from "./extract.js";
import { loopHandler } from "./loop.js";
import { customHandler } from "./custom.js";

export type { NodeHandler } from "../types.js";

export const defaultHandlerRegistry: ReadonlyMap<string, NodeHandler> = new Map([
  ["navigate", navigateHandler],
  ["click", clickHandler],
  ["type", typeHandler],
  ["wait", waitHandler],
  ["scroll", scrollHandler],
  ["extract", extractHandler],
  ["loop", loopHandler],
  ["custom", customHandler],
]);
