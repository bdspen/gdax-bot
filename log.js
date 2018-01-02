const {
    authedClient,
    publicClient,
    bchAmt,
    btcAmt,
    btcInterval,
    ethAmt,
    ethInterval,
    ltcAmt,
    ltcInterval,
    bchInterval,
    fiatCurrency,
    sandboxMode,
  } = require('./constants.js');
  const analysis = require('./analysis');
  const schedule = require('node-schedule');
  
  // Place a market buy order for the interval investment amount
  const buy = (coinSymbol, amt) => {
    const productId = `${coinSymbol}-${fiatCurrency}`;
  
    analysis.getTrendPercentModifiers(productId, 6)
    .then(({blend: modifier}) => {
  
        amt = getBuyAmount(modifier, amt);
        
        const buyParams = {
            type: 'market',
            funds: amt,
            size: null,
            product_id: productId,
        };
    
        console.log(`buying with: ${JSON.stringify(buyParams)} time: ${new Date().toLocaleTimeString()}`)
    });
  };
  
  function getBuyAmount(modifier, amt){
    amt = parseInt(amt);
    if (modifier < 0) amt -= (amt * Math.abs(modifier)/100);
    else amt += (amt * Math.abs(modifier)/100);
    return amt.toFixed(2)
  }
  
//   function getSellAmount(modifier, amt){
//     amt = parseInt(amt);
//     if (modifier < 0) amt -= (amt * Math.abs(modifier)/100);
//     else amt += (amt * Math.abs(modifier)/100);
//     return amt.toFixed(2)
//   }
  
  // Convert text based intervals to raw intervals
  const rawInterval = interval =>
    interval === 'min' ? '0-59/1 * * * *'
    : interval === 'fivemins' ? '0-59/5 * * * *'
    : interval === 'tenmins' ? '0-59/10 * * * *'
    : interval === 'halfhour' ? '0-59/30 * * * *'
    : interval === 'hour' ? '0 0-23/1 * * *'
    : interval === 'twohour' ? '0 0-23/2 * * *'
    : interval === 'sixhours' ? '0 0-23/6 * * *'
    : interval === 'twelvehours' ? '0 0-23/12 * * *'
    : interval === 'day' ? '0 0 1-31/1 * *'
    : console.log('Scheduling failed: Invalid investment interval (check your .env file to make sure the investment intervals are correct)')
  
  
  // Schedule buys and tack on a randomized, artificial delay lasting up to 1 minute
  const coinOn = (coinSymbol, amt, interval) => {
    schedule.scheduleJob(rawInterval(interval), () => {
        const randomDelay = Math.floor(Math.random() * 60) + 1;
        setTimeout(() => {
            buy(coinSymbol, amt);
        }, randomDelay * 1000);
    });
  };
  
  // Turn coins on if their interval investment amounts meet the GDAX trade rules minimum
  const botOn = () => {
    console.log('starting bot');
    if (btcAmt >= 1.00) {
        coinOn('BTC', btcAmt, btcInterval);
    }
    if (ethAmt >= 1.00) {
        coinOn('ETH', ethAmt, ethInterval);
    }
    if (ltcAmt >= 1.00) {
        coinOn('LTC', ltcAmt, ltcInterval);
    }
    if (bchAmt >= 1.00) {
        coinOn('BCH', bchAmt, bchInterval);
    }
  };
  
  // Export
  module.exports = botOn();
  