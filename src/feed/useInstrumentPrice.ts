import { useCallback, useSyncExternalStore } from 'react';
import { priceFeed, type ConnectionStatus, type Tick } from './PriceFeedClient';

// useSyncExternalStore: tear-free reads, no effect/cleanup boilerplate (see README)
export function useInstrumentPrice(symbol: string): Tick | undefined {
  const subscribe = useCallback(
    (notify: () => void) => priceFeed.subscribe(symbol, notify),
    [symbol],
  );
  return useSyncExternalStore(subscribe, () => priceFeed.getTick(symbol));
}

export function useConnectionStatus(): ConnectionStatus {
  return useSyncExternalStore(
    (notify) => priceFeed.subscribeStatus(notify),
    () => priceFeed.getStatus(),
  );
}
