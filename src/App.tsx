import { PriceChart } from './components/PriceChart';
import { Watchlist } from './components/Watchlist';
import { useConnectionStatus } from './feed/useInstrumentPrice';

function StatusLamp() {
  const status = useConnectionStatus();
  return (
    <span className={`status ${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

export default function App() {
  return (
    <main>
      <header className="app-header">
        <div>
          <span className="overline">live trades · binance ws</span>
          <h1>tick-feed</h1>
        </div>
        <StatusLamp />
      </header>
      <p className="lede">
        Live prices over one shared WebSocket. The render counters show who actually re-renders:
        only rows whose symbol ticked. The chart paints to canvas and renders once.
      </p>
      <div className="dashboard">
        <PriceChart symbol="BTCUSDT" />
        <Watchlist />
      </div>
      <footer>
        Data from Binance&apos;s public trade stream · chart by{' '}
        <a href="https://www.tradingview.com/">TradingView Lightweight Charts</a>
      </footer>
    </main>
  );
}
