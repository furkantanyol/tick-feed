import { useRef, useState } from 'react';
import { InstrumentRow } from './InstrumentRow';

const ALL_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'];
const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT'];

// re-renders only when the symbol list changes, never on price ticks
export function Watchlist() {
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);
  const renders = useRef(0);
  renders.current += 1;

  const addable = ALL_SYMBOLS.filter((s) => !symbols.includes(s));
  const add = (symbol: string) => setSymbols((current) => [...current, symbol]);
  const remove = (symbol: string) => setSymbols((current) => current.filter((s) => s !== symbol));

  return (
    <section className="widget">
      <header>
        <h2>Watchlist</h2>
        <span className="renders" title="Times this widget has rendered">
          {renders.current}
        </span>
      </header>
      <table>
        <thead>
          <tr>
            <th scope="col">Symbol</th>
            <th scope="col" className="num">Price (USDT)</th>
            <th scope="col" className="num">Renders</th>
            <th scope="col" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {symbols.map((symbol) => (
            <InstrumentRow key={symbol} symbol={symbol} onRemove={remove} />
          ))}
        </tbody>
      </table>
      {addable.length > 0 && (
        <select
          name="add-instrument"
          value=""
          onChange={(e) => add(e.target.value)}
          aria-label="Add instrument"
        >
          <option value="" disabled>
            + Add instrument
          </option>
          {addable.map((symbol) => (
            <option key={symbol} value={symbol}>
              {symbol}
            </option>
          ))}
        </select>
      )}
    </section>
  );
}
