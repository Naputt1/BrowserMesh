import type { DebugNodeHandler } from '../types';
import { startHandler } from './start';
import { endHandler } from './end';
import { navigateHandler } from './navigate';
import { clickHandler } from './click';
import { typeHandler } from './type';
import { waitHandler } from './wait';
import { scrollHandler } from './scroll';
import { selectHandler } from './select';
import { extractHandler } from './extract';
import { outputHandler } from './output';
import { loopHandler } from './loop';
import { customHandler } from './custom';
import { fetchHandler } from './fetch';
import { listenHandler } from './listen';
import { pageHandler } from './page';
import { stateHandler } from './state';
import { ifHandler } from './if';
import { switchHandler } from './switch';
import { andHandler } from './and';
import { orHandler } from './or';
import { notHandler } from './not';
import { breakHandler } from './break';
import { continueHandler } from './continue';
import { compareHandler } from './compare';

export const debugHandlerRegistry: ReadonlyMap<string, DebugNodeHandler> = new Map([
  ['start', startHandler],
  ['end', endHandler],
  ['navigate', navigateHandler],
  ['click', clickHandler],
  ['type', typeHandler],
  ['wait', waitHandler],
  ['scroll', scrollHandler],
  ['select', selectHandler],
  ['extract', extractHandler],
  ['output', outputHandler],
  ['loop', loopHandler],
  ['custom', customHandler],
  ['fetch', fetchHandler],
  ['listen', listenHandler],
  ['page', pageHandler],
  ['state', stateHandler],
  ['if', ifHandler],
  ['switch', switchHandler],
  ['and', andHandler],
  ['or', orHandler],
  ['not', notHandler],
  ['break', breakHandler],
  ['continue', continueHandler],
  ['compare', compareHandler],
]);

export { registerCustomHandler, clearCustomHandlers } from './custom';
