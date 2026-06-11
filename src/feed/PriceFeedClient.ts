/**
 * One websocket for the whole app. Per-symbol subscriptions are ref-counted:
 * first listener subscribes upstream, last one out unsubscribes. Ticks are
 * buffered and flushed at most every ~150ms, aligned to a frame.
 * No React in here on purpose — the hooks live in useInstrumentPrice.ts.
 */

export interface Tick {
  readonly price: number;
  readonly prevPrice: number; // last price the UI showed, drives flash direction
  readonly ts: number;
}

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting';

type Listener = () => void;

const WS_URL = 'wss://stream.binance.com:9443/stream';
const MAX_BACKOFF_MS = 30_000;
const MIN_FLUSH_INTERVAL_MS = 150;

export class PriceFeedClient {
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = 'connecting';
  private reconnectAttempt = 0;
  private requestId = 0;

  // symbol present here <=> subscribed upstream
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly statusListeners = new Set<Listener>();

  // latest flushed tick per symbol — what components read
  private readonly ticks = new Map<string, Tick>();

  // newest tick per symbol since the last flush
  private readonly buffer = new Map<string, Tick>();
  private flushScheduled = false;
  private lastFlushAt = 0;

  /** Returns an unsubscribe function. */
  subscribe(symbol: string, listener: Listener): () => void {
    let set = this.listeners.get(symbol);
    if (!set) {
      set = new Set();
      this.listeners.set(symbol, set);
      this.send('SUBSCRIBE', symbol);
    }
    set.add(listener);
    this.ensureConnected();

    return () => {
      if (!set.delete(listener)) return; // safe to call twice
      if (set.size === 0) {
        this.listeners.delete(symbol);
        this.ticks.delete(symbol);
        this.send('UNSUBSCRIBE', symbol);
      }
    };
  }

  getTick(symbol: string): Tick | undefined {
    return this.ticks.get(symbol);
  }

  subscribeStatus(listener: Listener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  // --- connection lifecycle ---

  private ensureConnected(): void {
    if (this.socket) return;
    const socket = new WebSocket(WS_URL);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.setStatus('open');
      // fresh connect and resubscribe-after-reconnect
      for (const symbol of this.listeners.keys()) this.send('SUBSCRIBE', symbol);
    };

    socket.onmessage = (event) => this.onMessage(event.data as string);

    socket.onclose = () => {
      this.socket = null;
      if (this.listeners.size === 0) return; // no listeners left, stay closed
      this.setStatus('reconnecting');
      const backoff = Math.min(1000 * 2 ** this.reconnectAttempt, MAX_BACKOFF_MS);
      const jitter = backoff * Math.random() * 0.3;
      this.reconnectAttempt += 1;
      // re-check at fire time: everyone may have unsubscribed while waiting
      setTimeout(() => {
        if (this.listeners.size > 0) this.ensureConnected();
      }, backoff + jitter);
    };

    socket.onerror = () => socket.close();
  }

  private send(method: 'SUBSCRIBE' | 'UNSUBSCRIBE', symbol: string): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return; // onopen will resubscribe
    this.requestId += 1;
    const params = [`${symbol.toLowerCase()}@trade`];
    this.socket.send(JSON.stringify({ method, params, id: this.requestId }));
  }

  // data path: message -> buffer -> throttled flush -> notify

  private onMessage(raw: string): void {
    const message = JSON.parse(raw) as { data?: { s: string; p: string; T: number } };
    if (!message.data?.s) return; // subscription ack, not a trade

    const { s: symbol, p, T: ts } = message.data;
    const price = Number(p);
    // direction is vs the last flushed price (what's on screen), not the raw previous trade
    const prevPrice = this.ticks.get(symbol)?.price ?? price;
    this.buffer.set(symbol, { price, prevPrice, ts });
    this.scheduleFlush();
  }

  // a hot symbol trades 50x/s; nobody can read more than ~5 updates/s
  private scheduleFlush(): void {
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    const wait = Math.max(0, MIN_FLUSH_INTERVAL_MS - (performance.now() - this.lastFlushAt));
    setTimeout(() => requestAnimationFrame(() => this.flush()), wait);
  }

  private flush(): void {
    this.flushScheduled = false;
    this.lastFlushAt = performance.now();
    for (const [symbol, tick] of this.buffer) {
      this.ticks.set(symbol, tick);
      this.listeners.get(symbol)?.forEach((notify) => notify());
    }
    this.buffer.clear();
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach((notify) => notify());
  }
}

// singleton — the whole point is a single connection
export const priceFeed = new PriceFeedClient();
