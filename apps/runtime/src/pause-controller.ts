export class PauseController {
  private _paused = false;
  private resumePromise: Promise<void> | null = null;
  private resumeResolve: (() => void) | null = null;

  get isPaused(): boolean {
    return this._paused;
  }

  pause(): void {
    this._paused = true;
  }

  resume(): void {
    if (!this._paused) return;
    this._paused = false;
    if (this.resumeResolve) {
      this.resumeResolve();
      this.resumeResolve = null;
      this.resumePromise = null;
    }
  }

  async waitIfPaused(): Promise<void> {
    if (!this._paused) return;
    if (!this.resumePromise) {
      this.resumePromise = new Promise<void>((resolve) => {
        this.resumeResolve = resolve;
      });
    }
    return this.resumePromise;
  }
}
