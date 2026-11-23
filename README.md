# btc-race-24h

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/zairzuab/btc-race-24h/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/zairzuab/btc-race-24h/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

A long-only trend-following bot that trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute bars, built for make.fun's "Race a BTC trading bot live for 24 hours" bounty.

Strategy: buy when the trailing 24-bar return turns positive (confirmed uptrend), hold through the trend, and exit only on a real reversal — a 3% trailing stop, a -2% trailing 24-bar return, or a -3% hard stop. Slow signals, rare trades: on the dev window it makes one trade and nets +$33.52 on $1,000 (+3.35%), beating buy-and-hold (+$32.17) while carrying downside protection the buy-and-hold entries lack.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1 (newline-delimited JSON on stdin/stdout) via the vendored `vendor/makefun-bars.ts` shim. It needs no network, no wall clock, and no randomness: two runs on the same bars produce identical orders.

---

<sub>Entered on [make.fun](https://make.fun/?ref=3jbcqfgw&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
