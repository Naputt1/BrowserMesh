import { useState, useEffect, useRef, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

export type ContextMenuItem = {
  label?: string;
  onClick?: () => void;
  separator?: boolean;
  danger?: boolean;
  color?: string;
  disabled?: boolean;
  icon?: ReactNode;
  children?: ContextMenuItem[];
};

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handleOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handleOutside);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="fixed z-[9999]" style={{ left: x, top: y }}>
      <MenuList items={items} onClose={onClose} />
    </div>
  );
}

function MenuList({ items, onClose }: { items: ContextMenuItem[]; onClose: () => void }) {
  return (
    <div className="min-w-[160px] rounded-lg border border-border bg-popover py-1 shadow-lg">
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="my-1 border-t border-border" />;
        }
        return <MenuItem key={i} item={item} onClose={onClose} />;
      })}
    </div>
  );
}

function MenuItem({ item, onClose }: { item: ContextMenuItem; onClose: () => void }) {
  const [showChildren, setShowChildren] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => {
        if (hasChildren) setShowChildren(true);
      }}
      onMouseLeave={(e) => {
        const related = e.relatedTarget as Node | null;
        if (wrapperRef.current && !wrapperRef.current.contains(related)) {
          setShowChildren(false);
        }
      }}
    >
      <button
        disabled={item.disabled}
        className={cn(
          "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left",
          item.danger
            ? "text-destructive hover:bg-destructive/10"
            : "text-popover-foreground hover:bg-accent hover:text-accent-foreground",
          item.disabled && "opacity-50 cursor-not-allowed",
        )}
        onClick={() => {
          if (!hasChildren) {
            item.onClick?.();
            onClose();
          }
        }}
      >
        {item.color && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
        )}
        {item.icon}
        <span className="flex-1">{item.label}</span>
        {hasChildren && <ChevronRight className="text-muted-foreground ml-2" size={14} />}
      </button>
      {hasChildren && showChildren && (
        <div className="absolute left-full top-0 ml-0.5">
          <MenuList items={item.children!} onClose={onClose} />
        </div>
      )}
    </div>
  );
}
