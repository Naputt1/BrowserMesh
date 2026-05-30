import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

let logFile: string | null = null;

function writeToFile(level: string, args: unknown[]): void {
  if (!logFile) return;
  const timestamp = new Date().toISOString();
  const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  const line = `[${timestamp}] [${level}] ${message}\n`;
  try {
    appendFileSync(logFile, line, 'utf-8');
  } catch {
    // fail silently if file write fails
  }
}

export function initLogFile(filePath: string): void {
  logFile = filePath;
  appendFileSync(logFile, `--- Log started at ${new Date().toISOString()} ---\n`, 'utf-8');

  console.log = (...args: unknown[]) => {
    writeToFile('LOG', args);
    originalConsoleLog(...args);
  };

  console.error = (...args: unknown[]) => {
    writeToFile('ERROR', args);
    originalConsoleError(...args);
  };

  console.warn = (...args: unknown[]) => {
    writeToFile('WARN', args);
    originalConsoleWarn(...args);
  };

  console.info = (...args: unknown[]) => {
    writeToFile('INFO', args);
    originalConsoleInfo(...args);
  };
}

export function closeLogFile(): void {
  if (logFile) {
    appendFileSync(logFile, `--- Log ended at ${new Date().toISOString()} ---\n`, 'utf-8');
  }
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.info = originalConsoleInfo;
  logFile = null;
}
