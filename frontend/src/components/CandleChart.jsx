import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'

export default function CandleChart({ candles, trades }) {
  const containerRef = useRef()
  const chartRef = useRef()

  useEffect(() => {
    if (!containerRef.current || !candles.length) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: '#1a1d29' },
        textColor: '#94a3b8'
      },
      grid: {
        vertLines: { color: '#2d3148' },
        horzLines: { color: '#2d3148' }
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false }
    })
    chartRef.current = chart

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e'
    })

    // Convert candles to chart format
    const chartData = candles
      .map(c => {
        const t = new Date(c.timestamp)
        const time = Math.floor(t.getTime() / 1000)
        return { time, open: c.open, high: c.high, low: c.low, close: c.close }
      })
      .filter((c, i, arr) => i === 0 || c.time !== arr[i-1].time)
      .sort((a, b) => a.time - b.time)

    candleSeries.setData(chartData)

    // Add trade markers
    if (trades?.length) {
      const markers = []
      for (const t of trades) {
        if (t.entryTime) {
          markers.push({
            time: Math.floor(new Date(t.entryTime).getTime() / 1000),
            position: t.direction === 'long' ? 'belowBar' : 'aboveBar',
            color: t.direction === 'long' ? '#10b981' : '#f43f5e',
            shape: t.direction === 'long' ? 'arrowUp' : 'arrowDown',
            text: `${t.direction === 'long' ? 'L' : 'S'} @${t.entryPrice?.toFixed(2)}`
          })
        }
        if (t.exitTime) {
          markers.push({
            time: Math.floor(new Date(t.exitTime).getTime() / 1000),
            position: t.direction === 'long' ? 'aboveBar' : 'belowBar',
            color: t.pnl >= 0 ? '#10b981' : '#f43f5e',
            shape: 'circle',
            text: `X @${t.exitPrice?.toFixed(2)}`
          })
        }
      }
      markers.sort((a, b) => a.time - b.time)
      candleSeries.setMarkers(markers)
    }

    chart.timeScale().fitContent()

    const handleResize = () => {
      chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [candles, trades])

  return <div ref={containerRef} style={{ height: 320 }} />
}
