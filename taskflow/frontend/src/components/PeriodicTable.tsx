import { useRef, useState } from 'react';
import { categoryClasses, ELEMENTS, type Element } from '../lib/elements';
import { ElementPopover } from './ElementPopover';

interface PeriodicTableProps {
  selected?: Element | null;
  onSelect: (element: Element) => void;
  onView3d?: (element: Element) => void;
}

export function PeriodicTable({ selected, onSelect, onView3d }: PeriodicTableProps) {
  const [popover, setPopover] = useState<{ element: Element; rect: DOMRect } | null>(null);
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  return (
    <>
      <div className="grid grid-cols-9 gap-1" aria-label="Periodic table of elements" data-testid="periodic-table">
        {ELEMENTS.map((el) => {
          const isSelected = selected?.n === el.n;
          return (
            <button
              key={el.n}
              ref={(node) => { if (node) cellRefs.current.set(el.sym, node); }}
              type="button"
              title={`${el.name} (${el.mass})`}
              aria-label={`${el.name}, atomic number ${el.n}`}
              aria-pressed={isSelected}
              onClick={() => {
                onSelect(el);
                const node = cellRefs.current.get(el.sym);
                if (node) setPopover({ element: el, rect: node.getBoundingClientRect() });
              }}
              data-element={el.sym}
              className={`flex min-w-0 flex-col items-center rounded-md border px-0.5 py-1 text-center transition-all duration-150 hover:scale-105 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${categoryClasses(el.cat)} ${
                isSelected ? 'scale-110 ring-2 ring-primary shadow-md' : ''
              }`}
            >
              <span className="text-[9px] font-medium opacity-70">{el.n}</span>
              <span className="text-xs font-bold leading-tight sm:text-sm">{el.sym}</span>
              <span className="hidden text-[8px] leading-tight opacity-70 md:inline">{el.mass}</span>
            </button>
          );
        })}
      </div>
      {popover ? (
        <ElementPopover
          element={popover.element}
          anchor={popover.rect}
          onClose={() => setPopover(null)}
          onView3d={onView3d ? (el) => { setPopover(null); return onView3d(el); } : undefined}
        />
      ) : null}
    </>
  );
}
