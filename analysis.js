const {
    publicClient
} = require('./constants.js');

module.exports = {
    getTrendPercentModifiers: getTrendPercentModifiers,
    sellSignal: sellSignal
};

function getTrendPercentModifiers(productId, numberOfIndicators = 10) {

    //needs more nuanced trend prediction, like values for the previous candles
    //right now it is just true/false. also should weight more heavily on the most recent candles


    return publicClient.getProductHistoricRates(productId)
    .then(data => {
        // data = [ time, low, high, open, close, volume ]

        const trendIntervals = [
            { interval: 1, name: 'min', maxWeight: 0 }, //one minute,
            { interval: 5, name: 'fivemins', maxWeight: 0 }, //five minute
            { interval: 10, name: 'tenmins', maxWeight: 0 }, //ten minutes
            { interval: 30, name: 'halfhour', maxWeight: 0 }, //thirty minutes
            { interval: 60, name: 'hour', maxWeight: 0 } //sixty minutes
        ];
        const minuteIndicatorsData = getAverages(data);
        const percentModifiers = trendIntervals.map(getTrends).map(getModifierPercentage);
        const [min, fivemins, tenmins, halfhour, hour] = percentModifiers;
        return {
            min: min,
            fivemins: fivemins,
            tenmins: tenmins,
            halfhour: halfhour,
            hour: hour,
            blend: blendTrendPercentModifiers({
                min: min,
                fivemins: fivemins,
                tenmins: tenmins,
                halfhour: halfhour,
                hour: hour
            })
        };


        function getTrends({ interval }) {
            const slicedMinuteIndicators = minuteIndicatorsData.slice(-(numberOfIndicators * interval))
            return slicedMinuteIndicators.map((res, i, array) => {
                if (interval > 1) {
                    const isMultiple = (i === 0) || !((i + 1) % interval);
                    if (i === 1 || i === array.length - 1) return;
                    if (isMultiple)
                        return { result: upwardTrend(minuteIndicatorsData, i, interval) };
                }
                else return { result: upwardTrend(minuteIndicatorsData, i, interval) };

            })
                .filter((is) => is)
                .map(getWeight(interval));
        }

        function getModifierPercentage(data, i) {
            var modifier = 0;
            data.forEach(res => {
                if (res.result) modifier += res.weight;
                else modifier -= res.weight;
            });
            return (modifier / trendIntervals[i].maxWeight) * 100;
        }

        function upwardTrend(data, i, interval) {
            return data[i].average > data[i + interval].average;
        }

        function getWeight(interval) {
            return (data, iterator, array, wm = 1) => {
                let weight = Math.log(numberOfIndicators - iterator) * 10;
                let unitWeight = getWeightModifier(data, iterator, array, wm = 1, interval) * weight;
                const tIIndex = trendIntervals.findIndex((tI) => tI.interval === interval);
                array[iterator].weight = unitWeight
                trendIntervals[tIIndex].maxWeight += unitWeight;
                return array[iterator];
            }
        }

        /* if the last x number of candles have has a positive upward trend,
        then increase the weight of those results */
        function getWeightModifier(data, iterator, array, wm = 1, interval) {

            let weightModifier = wm;
            let wmIterator = iterator;
            let nextResult;

            {
                array[wmIterator + interval] ?
                    nextResult = array[wmIterator + interval].result :
                    nextResult = upwardTrend(minuteIndicatorsData, wmIterator, interval);
            }

            if (data.result === nextResult) {
                weightModifier += .1;
                wmIterator++;
                getWeightModifier(data, wmIterator, array, weightModifier, interval);
            }

            return weightModifier;
        }

    })
    .catch(err => console.error(err));

}

function sellSignal(productId){
    return publicClient.getProductHistoricRates(productId).then(data => {

        const now  = data[0][4];
        const highs = data.map(d => d[2]).sort().slice(-200); 
        const lows = data.map(d => d[1]).sort().slice(-200);
        
        
        const isHigh = highs.filter((high, i) => now >= high);

        const sellSignalStrength = isHigh.length / 200;

        return sellSignalStrength;
    })
    .catch(err => console.error(err));

}

function blendTrendPercentModifiers(modifiers) {
    // const finalPercentModifier = (minPercentModifier / 2) + fiveMinPercentModifier;
    // modifiers = { min: min, fivemins: fivemins, tenmins: tenmins }
    const result = (
        modifiers.min +
        modifiers.fivemins +
        modifiers.tenmins +
        modifiers.halfhour +
        modifiers.hour
    ) / 5;
    return result;
}

function getAverages(data) {
    data.forEach((d, i) => {
        data[i].average = (d[1] + d[2] + d[3] + d[4]) / 4;
        // data[i].topAverage = (data[i].average + d[2]) / 2;
        // data[i].bottomAverage = (data[i].average + d[1]) / 2;
    });
    return data;
}