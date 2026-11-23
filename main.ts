// BTC trend rider v2: momentum entry + protective exits, long only.
//
// Lessons from the dev backtest (BTC +3.6% over 24h, avg |1m move| 0.05%):
//   - Short EMAs (8/21) whipsaw to death (-11.5%). Even EMA(20/60) with a 1%
//     trailing stop lost -1.4% on 16 trades: the 1-minute noise is bigger than
//     the round-trip cost, so any fast signal bleeds fees.
//   - The winners just buy the trend and hold: momentum (buy batch 24, hold)
//     made +$34.94 on 1 trade; buy-and-hold +$32.17. So the entry must be a
//     slow, confirmed trend signal, and exits must be rare and only on real
//     reversals, not on noise.
// Strategy:
//   - Entry (flat): at batch >= 24, the trailing 24-bar return is positive
//     (close now > close 24 bars ago) and the cooldown has passed. Buy full
//     equity (capped by max_weight_bps). This is the momentum baseline's
//     entry, which catches the uptrend early.
//   - Exit (holding): the close falls TRAIL_PCT below the highest close since
//     entry (trailing stop), OR the trailing 24-bar return falls below
//     -REV_PCT (trend clearly reversed), OR the position is down STOP_PCT
//     from its cost (hard stop). All three are wide enough that normal
//     1-minute noise and ordinary pullbacks do not trigger them.
//   - Cooldown: after a sell, wait COOLDOWN_BARS bars before re-entering.
//   - One symbol (CBBTC), one position at a time. No wall clock, no
//     randomness, no network: two runs on the same bars give the same orders.

import { BPS, runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const LOOKBACK_BARS = 24;
/** Trailing stop: sell if the close falls this far below the highest close since entry. */
const TRAIL_PCT = 0.03;
/** Trend reversal: sell if the trailing 24-bar return falls below this (as a fraction). */
const REV_PCT = 0.02;
/** Hard stop: sell if the position value falls this far below its cost. */
const STOP_PCT = 0.03;
/** Bars to wait after a sell before a new entry. */
const COOLDOWN_BARS = 30;
const MAX_SLIPPAGE_BPS = 100;

/** Closes by batch seq (null before the first bar). */
const closes: (number | null)[] = [];
/** Highest close since the current entry (reset on buy). */
let peak = 0;
/** Last batch seq on which we sold (for the cooldown). */
let lastSellSeq = -1_000_000;

await runBars({
  onBatch(state: BarsState, batch) {
    const bar = batch.bars.find((b) => b.symbol === 'CBBTC');
    if (bar === undefined) return [];
    closes.push(Number(bar.c));
    if (state.warmingUp) return [];

    const held = state.positions.get('CBBTC');
    const { caps, fees } = state.hello;
    const seq = batch.seq;

    if (held !== undefined) {
      const close = Number(bar.c);
      if (close > peak) peak = close;
      const value = state.value('CBBTC', held.qty);
      const then = closes[seq - LOOKBACK_BARS];
      const ret24 = then !== null && then !== undefined && then > 0 ? close / then - 1 : 0;
      const trailHit = peak > 0 && close < peak * (1 - TRAIL_PCT);
      const revHit = ret24 < -REV_PCT;
      const stopHit = value * 100n <= held.cost * BigInt(Math.round((1 - STOP_PCT) * 100));
      if (trailHit || revHit || stopHit) {
        lastSellSeq = seq;
        peak = 0;
        return [{ side: 'sell', symbol: 'CBBTC', qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }] satisfies SellInput[];
      }
      return [];
    }

    // Flat: enter on a positive trailing 24-bar return, after the cooldown.
    if (seq < LOOKBACK_BARS) return [];
    if (seq - lastSellSeq < COOLDOWN_BARS) return [];
    const now = closes[seq];
    const then = closes[seq - LOOKBACK_BARS];
    if (now === null || now === undefined || then === null || then === undefined || then <= 0) return [];
    if (now <= then) return [];

    const byWeight = (BigInt(caps.max_weight_bps) * state.equity) / BPS;
    let slice = state.equity < byWeight ? state.equity : byWeight;
    if (state.cash < slice) slice = state.cash;
    if (slice === 0n || slice < BigInt(fees.min_notional_quote_units)) return [];
    peak = now;
    return [{ side: 'buy', symbol: 'CBBTC', notional_quote_units: slice, max_slippage_bps: MAX_SLIPPAGE_BPS }] satisfies BuyInput[];
  },
});
