import { memo, useEffect, useRef } from 'react';
import { useInstrumentPrice } from '../feed/useInstrumentPrice';
import type { Tick } from '../feed/PriceFeedClient';

interface Props {
  symbol: string;
  onRemove: (symbol: string) => void;
}

type Direction = 'up' | 'down' | 'flat';

const ARROWS: Record<Direction, string> = { up: '▲', down: '▼', flat: '·' };

const centsFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// sub-dollar instruments need significant digits, two decimals is just "0.09"
const subDollarFormat = new Intl.NumberFormat('en-US', {
  minimumSignificantDigits: 4,
  maximumSignificantDigits: 4,
});

function formatPrice(price: number): string {
  return (price < 1 ? subDollarFormat : centsFormat).format(price);
}

function tickDirection(tick: Tick | undefined): Direction {
  if (!tick || tick.price === tick.prevPrice) return 'flat';
  return tick.price > tick.prevPrice ? 'up' : 'down';
}

// one row = one subscription; memoized, so a tick re-renders only its own rows
export const InstrumentRow = memo(function InstrumentRow({ symbol, onRemove }: Props) {
  const tick = useInstrumentPrice(symbol);
  const priceCell = useRef<HTMLTableCellElement>(null);
  const renders = useRef(0);
  renders.current += 1;

  const direction = tickDirection(tick);

  // restart the css animation in place — key={ts} tricks remount the DOM every tick
  useEffect(() => {
    const cell = priceCell.current;
    if (!cell || direction === 'flat') return;
    cell.classList.remove('flash-up', 'flash-down');
    void cell.offsetWidth; // style flush so the same animation can restart
    cell.classList.add(direction === 'up' ? 'flash-up' : 'flash-down');
  }, [tick?.ts, direction]);

  return (
    <tr>
      <td className="symbol">{symbol}</td>
      <td ref={priceCell} className={`price num ${direction}`}>
        <span aria-hidden="true">{ARROWS[direction]} </span>
        {tick ? formatPrice(tick.price) : '—'}
      </td>
      <td className="renders num" title="Times this row has rendered">
        {renders.current}
      </td>
      <td>
        <button className="remove" onClick={() => onRemove(symbol)} aria-label={`Remove ${symbol}`}>
          ×
        </button>
      </td>
    </tr>
  );
});
