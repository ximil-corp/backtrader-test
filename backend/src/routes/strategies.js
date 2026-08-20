const router = require('express').Router();

const STRATEGIES = [
  {
    id: 'orb3',
    name: '3-Minute ORB',
    description: 'Opening Range Breakout using first 3-minute candle. Break above high = long, break below low = short.',
    params: [
      { key: 'orbMinutes', label: 'ORB Period (minutes)', type: 'number', default: 3 },
      { key: 'rrRatio', label: 'Risk:Reward Ratio', type: 'number', default: 2 },
      { key: 'cutoffTime', label: 'Cutoff Time (ET, HH:MM)', type: 'text', default: '10:30' },
      { key: 'positionSize', label: 'Position Size ($)', type: 'number', default: 1000 }
    ]
  }
];

router.get('/', (req, res) => {
  res.json(STRATEGIES);
});

module.exports = router;
