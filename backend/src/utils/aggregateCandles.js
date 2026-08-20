/**
 * Aggregate 1-min candles into a larger timeframe.
 * @param {Array} candles - sorted array of 1-min candle objects
 * @param {string} timeframe - '1Min','3Min','5Min','15Min','30Min','1Hour'
 * @returns {Array} aggregated candles
 */
function aggregateCandles(candles, timeframe) {
  if (!candles || candles.length === 0) return [];

  const minuteMap = {
    '1Min': 1,
    '3Min': 3,
    '5Min': 5,
    '15Min': 15,
    '30Min': 30,
    '1Hour': 60
  };

  const intervalMin = minuteMap[timeframe];
  if (!intervalMin || intervalMin === 1) return candles; // No aggregation needed

  const groups = new Map();

  for (const candle of candles) {
    const ts = new Date(candle.timestamp);
    // Align to the start of the interval
    const totalMinutes = ts.getUTCHours() * 60 + ts.getUTCMinutes();
    const alignedMinutes = Math.floor(totalMinutes / intervalMin) * intervalMin;
    const alignedHours = Math.floor(alignedMinutes / 60);
    const alignedMins = alignedMinutes % 60;

    const key = new Date(ts);
    key.setUTCHours(alignedHours, alignedMins, 0, 0);
    const keyStr = key.toISOString();

    if (!groups.has(keyStr)) {
      groups.set(keyStr, {
        ticker: candle.ticker,
        timeframe,
        timestamp: keyStr,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume || 0
      });
    } else {
      const g = groups.get(keyStr);
      g.high = Math.max(g.high, candle.high);
      g.low = Math.min(g.low, candle.low);
      g.close = candle.close;
      g.volume += (candle.volume || 0);
    }
  }

  return Array.from(groups.values());
}

module.exports = { aggregateCandles };
