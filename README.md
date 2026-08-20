# Backtest App

A web-based backtesting application with Docker Compose stack: React frontend, Node.js Express backend, PostgreSQL database.

## Quick Start

```bash
docker compose up -d --build
```

Frontend: http://localhost:3000  
Backend API: http://localhost:8080

## Without Alpaca API Keys

1. Go to **Upload CSV** page
2. Upload a CSV with columns: `date,time,open,high,low,close,volume`
3. Go to **New Backtest**, enter the ticker you uploaded data for, and run

## With Alpaca API Keys

```bash
ALPACA_API_KEY=your_key ALPACA_API_SECRET=your_secret docker compose up -d
```

## CSV Format

```
date,time,open,high,low,close,volume
2024-01-02,09:30:00,474.20,474.85,474.10,474.60,1234567
```

Times in ET (Eastern Time). 1-minute bars work best with the ORB strategy.

## Strategies

### 3-Minute ORB (Opening Range Breakout)
- Tracks the first 3-minute candle after 9:30 AM ET
- Long signal when price breaks above the ORB high
- Short signal when price breaks below the ORB low
- Stop loss at opposite side of range
- Configurable R:R ratio, cutoff time, position size

## Stack

- Frontend: React + Vite + Recharts + lightweight-charts (TradingView)
- Backend: Node.js + Express + PostgreSQL
- Docker Compose for orchestration
