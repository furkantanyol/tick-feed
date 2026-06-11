import { useEffect, useRef } from 'react';
import {
  AreaSeries,
  ColorType,
  createChart,
  LastPriceAnimationMode,
  type UTCTimestamp,
} from 'lightweight-charts';
import { priceFeed } from '../feed/PriceFeedClient';

interface Props {
  symbol: string;
}

// matches the tokens in styles.css — canvas can't read CSS variables
const TEXT = '#5b6970';
const BORDER = 'rgba(154, 178, 192, 0.16)';
const GRID = 'rgba(154, 178, 192, 0.07)';
const UP = '#34d27b';
const UP_FADE = 'rgba(52, 210, 123, 0.2)';

// canvas has no ticking DOM for React to own — subscribe to the feed directly
// and push points imperatively; the component renders once (see its badge)
export function PriceChart({ symbol }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const pointsBadge = useRef<HTMLSpanElement>(null);
  const renders = useRef(0);
  renders.current += 1;

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let points = 0;

    const chart = createChart(element, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: TEXT,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        attributionLogo: false, // credited in the footer instead
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      rightPriceScale: { borderColor: BORDER },
      timeScale: {
        borderColor: BORDER,
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 3,
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: UP,
      topColor: UP_FADE,
      bottomColor: 'transparent',
      lineWidth: 2,
      // glide the last point between updates instead of jumping once a second
      lastPriceAnimation: LastPriceAnimationMode.Continuous,
    });

    const unsubscribe = priceFeed.subscribe(symbol, () => {
      const tick = priceFeed.getTick(symbol);
      if (!tick) return;
      // one point per second; same-second flushes replace it
      series.update({ time: Math.floor(tick.ts / 1000) as UTCTimestamp, value: tick.price });
      // imperative on purpose — React state here would re-render and break the ×1
      points += 1;
      if (pointsBadge.current) pointsBadge.current.textContent = `${points} pts`;
    });

    return () => {
      unsubscribe();
      chart.remove();
    };
  }, [symbol]);

  return (
    <section className="widget">
      <header>
        <h2>{symbol} · live</h2>
        <span className="readouts">
          <span ref={pointsBadge} className="points" title="Points pushed to the canvas">
            0 pts
          </span>
          <span className="renders" title="Times this widget has rendered">
            {renders.current}
          </span>
        </span>
      </header>
      <div ref={container} className="chart" />
    </section>
  );
}
