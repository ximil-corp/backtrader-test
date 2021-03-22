from __future__ import (absolute_import, division, print_function,
                        unicode_literals)

from datetime import datetime  # For datetime objects
import os.path  # To manage paths
import sys  # To find out the script name (in argv[0])
from strategies import *
from helpers import *
import pandas as pd

# Import the backtrader platform
import backtrader as bt

if __name__ == '__main__':
    cerebro = bt.Cerebro(stdstats=False)
cerebro.broker.set_coc(True)

spy = bt.feeds.YahooFinanceData(dataname='SPY',
                                 fromdate=datetime(2019,2,28),
                                 todate=datetime(2021,2,28),
                                 plot=False)
cerebro.adddata(spy)  # add S&P 500 Index
# Set our desired cash start
cerebro.broker.setcash(800.0)
# get SP500 tickers list
tickers = pd.read_csv('./data/constituents_csv.csv')['Symbol'].tolist()

for ticker in tickers:
    df = bt.feeds.YahooFinanceData(dataname=f"{ticker}",
                                 fromdate=datetime(2019,2,28),
                                 todate=datetime(2021,2,28),
                                 plot=False)
    cerebro.adddata(df)

cerebro.addobserver(bt.observers.Value)
cerebro.addanalyzer(bt.analyzers.SharpeRatio, riskfreerate=1.5)
cerebro.addanalyzer(bt.analyzers.Returns)
cerebro.addanalyzer(bt.analyzers.DrawDown)
cerebro.addstrategy(MomentumStrategy)
results = cerebro.run()
cerebro.plot(iplot=False)[0][0]
saveplots(cerebro, file_path = 'images/savefig-momentum.png')
# Print out the final result
print('Final Portfolio Value: %.2f' % cerebro.broker.getvalue())
print(f"Sharpe: {results[0].analyzers.sharperatio.get_analysis()['sharperatio']:.3f}")
print(f"Norm. Annual Return: {results[0].analyzers.returns.get_analysis()['rnorm100']:.2f}%")
print(f"Max Drawdown: {results[0].analyzers.drawdown.get_analysis()['max']['drawdown']:.2f}%")