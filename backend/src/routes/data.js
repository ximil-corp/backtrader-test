const router = require('express').Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { storeCSVData } = require('../market-data');

const upload = multer({ storage: multer.memoryStorage() });

// Determine ET offset for a given date (EST=-5, EDT=-4)
function etOffset(dateStr) {
  // Create date in ET and check if DST is active
  const d = new Date(dateStr + 'T12:00:00Z');
  const jan = new Date(d.getFullYear(), 0, 1);
  const jul = new Date(d.getFullYear(), 6, 1);
  const stdOff = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  // For US Eastern: DST runs second Sunday of March to first Sunday of November
  const month = d.getUTCMonth(); // 0-indexed
  if (month > 2 && month < 10) return '-04:00'; // Apr-Oct = EDT
  if (month === 2) {
    // March: DST starts second Sunday
    const day = d.getUTCDate();
    const dow = d.getUTCDay();
    const secondSun = 14 - ((new Date(d.getUTCFullYear(), 2, 1).getUTCDay()) % 7);
    if (day >= secondSun) return '-04:00';
    return '-05:00';
  }
  if (month === 10) {
    // November: DST ends first Sunday
    const day = d.getUTCDate();
    const firstSun = 7 - ((new Date(d.getUTCFullYear(), 10, 1).getUTCDay()) % 7);
    if (day < firstSun) return '-04:00';
    return '-05:00';
  }
  return '-05:00'; // Nov-Feb = EST
}

function detectActualTimeframe(rows) {
  if (rows.length < 2) return '1Min';
  const t1 = new Date(rows[0].timestamp).getTime();
  const t2 = new Date(rows[1].timestamp).getTime();
  const diffMin = Math.round((t2 - t1) / 60000);
  if (diffMin <= 1) return '1Min';
  if (diffMin <= 3) return '3Min';
  if (diffMin <= 5) return '5Min';
  if (diffMin <= 15) return '15Min';
  if (diffMin <= 60) return '1Hour';
  return '1Day';
}

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { ticker } = req.body;
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });

    const content = req.file.buffer.toString('utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

    const rows = records.map(r => {
      let timestamp;
      if (r.date && r.time) {
        // Treat bare date+time as Eastern Time
        const offset = etOffset(r.date);
        timestamp = new Date(`${r.date}T${r.time}${offset}`).toISOString();
      } else if (r.timestamp) {
        // If ISO with timezone, use as-is; otherwise assume ET
        const ts = r.timestamp;
        if (ts.includes('Z') || ts.includes('+') || /\d{2}:\d{2}:\d{2}-\d{2}/.test(ts)) {
          timestamp = new Date(ts).toISOString();
        } else {
          const datepart = ts.split('T')[0] || ts.split(' ')[0];
          const offset = etOffset(datepart);
          timestamp = new Date(ts.replace(' ', 'T') + offset).toISOString();
        }
      } else {
        throw new Error('CSV must have date+time columns or a timestamp column');
      }
      return {
        timestamp,
        open: parseFloat(r.open || r.Open),
        high: parseFloat(r.high || r.High),
        low: parseFloat(r.low || r.Low),
        close: parseFloat(r.close || r.Close),
        volume: parseInt(r.volume || r.Volume || 0)
      };
    });

    const actualTimeframe = detectActualTimeframe(rows);
    const storeTimeframe = '1Min';
    let warning = null;
    if (actualTimeframe !== '1Min') {
      warning = `Data appears to be ${actualTimeframe} candles. For best results, upload actual 1-min data.`;
      console.warn(`[upload] ${ticker}: ${warning}`);
    }

    await storeCSVData(ticker.toUpperCase(), storeTimeframe, rows);

    res.json({
      message: `Imported ${rows.length} bars for ${ticker.toUpperCase()} (stored as ${storeTimeframe})`,
      count: rows.length,
      timeframe: storeTimeframe,
      detectedTimeframe: actualTimeframe,
      warning
    });
  } catch (err) {
    console.error('CSV upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
