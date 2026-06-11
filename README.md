# tick-feed

**Live demo: [tick-feed.vercel.app](https://tick-feed.vercel.app)**

A small demo of how a trading dashboard moves live prices around the frontend:
one WebSocket, ref-counted per-symbol subscriptions, frame-batched updates.

```
Binance WS (single connection)
      │
PriceFeedClient          plain TypeScript, no React imports
      │  keep newest tick per symbol,
      │  flush every ~150ms, aligned to rAF
      ▼
notify listeners of changed symbols only
      │
      ├─ useInstrumentPrice(symbol) → <InstrumentRow/>   renders only when its symbol ticks
      └─ direct subscription       → <PriceChart/>       canvas, renders once
```

## Run

```bash
pnpm install
pnpm dev
```

Binance's public stream, no API key needed.

## What to look at

Every panel and row has a render counter. When BTC ticks, the BTC row updates
and the chart extends — nothing else moves. The chart counts canvas points
next to its React render count, which stays at ×1.

The chart and the BTC row share one upstream subscription; the last consumer
to leave unsubscribes. The ref-counting is in `PriceFeedClient.subscribe`.

Hot symbols trade dozens of times between two paints. The buffer keeps only
the newest tick per symbol and flushes every ~150ms — nobody can read more
than ~5 price changes a second.

## Decisions

- `useSyncExternalStore` over `useEffect` + `useState` — the primitive React
  ships for external stores: tear-free reads, no cleanup boilerplate.
- No React in the feed client. The integration is a 20-line hook, so the
  client is testable without rendering anything.
- The chart skips the hook. No ticking DOM for React to own, so it subscribes
  to the feed directly and pushes points with `series.update()`.
- Reconnect with exponential backoff + jitter, resubscribe on open.
- The price flash restarts a CSS animation in place — keying the row by
  timestamp remounts DOM every tick, which is where ticking tables get janky.
- No state library. Ticks are ephemeral server state.

## Skipped on purpose

Snapshot resync after reconnect, staleness indicators, pausing on
`visibilitychange`, closing the idle socket, virtualization (matters past
~100 rows, not at 6).

---

Chart rendered with [TradingView Lightweight Charts](https://www.tradingview.com/).
