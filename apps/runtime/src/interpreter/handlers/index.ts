import type { NodeHandler } from "../types";
import { navigateHandler } from "./navigate";
import { clickHandler } from "./click";
import { typeHandler } from "./type";
import { waitHandler } from "./wait";
import { scrollHandler } from "./scroll";
import { extractHandler } from "./extract";
import { loopHandler } from "./loop";
import { customHandler } from "./custom";

export type { NodeHandler } from "../types";

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
