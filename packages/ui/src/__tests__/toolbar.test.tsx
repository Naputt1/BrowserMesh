import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../toolbar.js';

describe('Toolbar', () => {
  it('renders without crashing with no props', () => {
    const { container } = render(<Toolbar />);
    expect(container.textContent).toBe('');
  });

  it('renders undo/redo buttons when callbacks provided', () => {
    render(<Toolbar onUndo={() => {}} onRedo={() => {}} />);
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeTruthy();
    expect(screen.getByTitle('Redo (Ctrl+Shift+Z)')).toBeTruthy();
  });

  it('disables undo/redo when not available', () => {
    render(<Toolbar onUndo={() => {}} onRedo={() => {}} canUndo={false} canRedo={false} />);
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toHaveProperty('disabled', true);
    expect(screen.getByTitle('Redo (Ctrl+Shift+Z)')).toHaveProperty('disabled', true);
  });

  it('enables undo/redo when available', () => {
    render(<Toolbar onUndo={() => {}} onRedo={() => {}} canUndo={true} canRedo={true} />);
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toHaveProperty('disabled', false);
    expect(screen.getByTitle('Redo (Ctrl+Shift+Z)')).toHaveProperty('disabled', false);
  });

  it('renders settings button when callback provided', () => {
    render(<Toolbar onToggleSettings={() => {}} />);
    expect(screen.getByTitle('Global settings')).toBeTruthy();
  });

  it('renders zoom buttons when callbacks provided', () => {
    render(<Toolbar onZoomIn={() => {}} onZoomOut={() => {}} onFitView={() => {}} />);
    expect(screen.getByTitle('Zoom in')).toBeTruthy();
    expect(screen.getByTitle('Zoom out')).toBeTruthy();
    expect(screen.getByTitle('Fit to screen')).toBeTruthy();
  });

  it('renders export/import buttons when callbacks provided', () => {
    render(<Toolbar onExport={() => {}} onImport={() => {}} />);
    expect(screen.getByTitle('Export JSON')).toBeTruthy();
    expect(screen.getByTitle('Import JSON')).toBeTruthy();
  });

  it('calls onUndo when undo button clicked', () => {
    const onUndo = vi.fn();
    render(<Toolbar onUndo={onUndo} canUndo={true} />);
    fireEvent.click(screen.getByTitle('Undo (Ctrl+Z)'));
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('calls onRedo when redo button clicked', () => {
    const onRedo = vi.fn();
    render(<Toolbar onRedo={onRedo} canRedo={true} />);
    fireEvent.click(screen.getByTitle('Redo (Ctrl+Shift+Z)'));
    expect(onRedo).toHaveBeenCalledOnce();
  });

  it('calls onExport when export button clicked', () => {
    const onExport = vi.fn();
    render(<Toolbar onExport={onExport} />);
    fireEvent.click(screen.getByTitle('Export JSON'));
    expect(onExport).toHaveBeenCalledOnce();
  });

  it('calls onImport when import button clicked', () => {
    const onImport = vi.fn();
    render(<Toolbar onImport={onImport} />);
    fireEvent.click(screen.getByTitle('Import JSON'));
    expect(onImport).toHaveBeenCalledOnce();
  });
});
