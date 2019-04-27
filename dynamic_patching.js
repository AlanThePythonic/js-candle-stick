/**
 * Merge a candle stick
 * @param {*} array Matching from here
 * @param {*} volume Manually set volume
 * @param {*} last_time Manually set last time
 * @param {*} base Manually set base of pair
 * @param {*} quote Manully set quote of pair
 * @param {*} previous_stick Use the result of the previous stick
 * @param {*} connected set "True" to be connecting each stick
 */
function merge (
  array,
  volume = undefined,
  last_time = undefined,
  base = undefined,
  quote = undefined,
  previous_stick = undefined,
  connected = undefined
) {
  var length = array.length
  var time
  if (last_time != undefined) {
    time = last_time
  } else {
    time = Math.min.apply(
      Math,
      array
        .map(function (element) {
          return element.time
        })
        .filter(function (element) {
          return element != 0
        })
    )
  }
  var open = array[0].open == 0 ? previous_stick.close : array[0].open
  if (connected == true) {
    open = previous_stick.close
  }
  var close = array[length - 1].close
  close = close == 0 ? previous_stick.close : close
  if (volume == undefined) {
    volume = array
      .map(function (element) {
        return element.volumeto
      })
      .reduce(function (prev, current) {
        return prev + current
      }, 0)
  }
  var high
  var low
  if (length > 1) {
    high = Math.max.apply(
      Math,
      array
        .map(function (element) {
          return element.high
        })
        .filter(function (element) {
          return element != 0
        })
    )
    low = Math.min.apply(
      Math,
      array
        .map(function (element) {
          return element.low
        })
        .filter(function (element) {
          return element != 0
        })
    )
  } else {
    high = array[0].high
    low = array[0].low
  }
  if (high == 0) {
    high = previous_stick.high
  }
  if (low == 0) {
    low = previous_stick.low
  }
  var result
  if (base != undefined && quote != undefined) {
    quote = quote.toUpperCase()
    base = base.toUpperCase()
    result = {
      time: time,
      open: open,
      close: close,
      volumeto: volume,
      high: high,
      low: low,
      fromSymbol: quote,
      toSymbol: base,
      symbol: base + quote
    }
  } else {
    result = {
      time: time,
      open: open,
      close: close,
      volumeto: volume,
      high: high,
      low: low
    }
  }
  if (previous_stick != undefined) {
    if (previous_stick.close == 0) {
      result.change = 0
      result.change_percentage = 0
    } else {
      result.change_percentage = ((result.close - previous_stick.close) / previous_stick.close) * 100
      result.change = result.close - previous_stick.close
    }
  }
  return result
}

/**
 * Format converter
 * @param {*} array
 */
function convert_format (array) {
  return array.map(function (elmt) {
    if (elmt.price == undefined) {
      return {
        open: elmt.close,
        high: elmt.close,
        low: elmt.close,
        close: elmt.close,
        time: elmt.time,
        volumeto: elmt.volumeto
      }
    } else {
      return {
        open: elmt.price,
        high: elmt.price,
        low: elmt.price,
        close: elmt.price,
        time: elmt.time,
        volumeto: elmt.qty
      }
    }
  })
}

/**
 * Slice the trade for generating the candle sticks
 * @param {*} arry
 * @param {*} previous
 */
function dynamic_planning (arry, previous) {

  let minute = []
  let buffer = []
  let last_time = previous.time
  
  // align to the timestamp mod 60
  if (last_time % 60 != 0) {
    let tmp = new Date(last_time * 1000)
    tmp.setSeconds(0)
    last_time = tmp / 1000
  }

  // Filter the trades which are little than last time
  arry = arry.filter(elemt => {
    return elemt.time > last_time
  })

  // Make sure there is at least a trade
  if (arry.length > 0) {
    let start_from = last_time
    let i = 0
    while (i < arry.length) {
      if (arry[i].time - start_from < 60) {
        buffer.push(arry[i])
        if (i >= arry.length - 1) {
          minute.push(merge(convert_format(buffer), undefined, start_from))
        }
        i++
      } else {
        if (buffer.length != 0) {
          minute.push(merge(convert_format(buffer), undefined, start_from))
          buffer = []
        } else {
          if (minute.length > 0) {
            minute.push(merge([minute[minute.length - 1]], 0, start_from))
          } else {
            buffer.push(previous)
          }
        }
        start_from += 60
      }
    }

    // Merge with the previous candle stick
    if (minute.length > 0) {
      minute[0] = merge([previous, minute[0]])
    }
  }
  return minute
}

// Minutes array for storing the result
var minutes = []

// Simulating the trade data from DB
var trades = [
  { time: 30, price: 0.5, qty: 0.5 },
  { time: 59, price: 2, qty: 0.7 },
  { time: 61, price: 36, qty: 1.3 },
  { time: 65, price: 41, qty: 2.2 },
  { time: 83, price: 43, qty: 3.7 },
  { time: 83, price: 49, qty: 3.5 },
  { time: 83, price: 50, qty: 3.6 },
  { time: 111, price: 53, qty: 4 },
  { time: 134, price: 64, qty: 5 },
  { time: 170, price: 69, qty: 5 },
  { time: 211, price: 78, qty: 6 },
  { time: 431, price: 83, qty: 7 },
  { time: 478, price: 89, qty: 7.8 },
  { time: 511, price: 92, qty: 8 },
  { time: 746, price: 100, qty: 9 }
]

// Simulate the last data from histo_minute
var last_minute = {
  open: 5,
  close: 10,
  volumeto: 20,
  high: 20,
  low: 5,
  time: 60
}
console.log('Trade data :')
console.log(trades)
console.log('Last minute of candle stick :')
console.log(JSON.stringify(last_minute))
console.log('Start to process the dynamic planning')

// Start to process the dynamic planning
var result = dynamic_planning(trades, last_minute)
last_minute = result[result.length - 1]
console.log(result)

// Simulate to patch the new trades
console.log('Simulate to patch the new trades')
console.log('Set last minute ' + JSON.stringify(last_minute))
trades = [
  { time: 750, price: 120, qty: 10 },
  { time: 751, price: 130, qty: 11 },
  { time: 751, price: 130, qty: 11 },
  { time: 900, price: 400, qty: 20 }
]
result = dynamic_planning(trades, last_minute)
last_minute = result[result.length - 1]
console.log(result)

// Simulate to patch the new trades
console.log('Simulate to patch the new trades')
console.log('Set last minute ' + JSON.stringify(last_minute))
trades = [
  { time: 950, price: 550, qty: 30 }
]
result = dynamic_planning(trades, last_minute)
last_minute = result[result.length - 1]
console.log(result)

// Simulate to patch the new trades
console.log('Simulate to patch the new trades')
console.log('Set last minute ' + JSON.stringify(last_minute))
trades = [
  { time: 951, price: 550, qty: 40 }, 
  { time: 951, price: 550, qty: 40 }, 
  { time: 1300, price: 600, qty: 50 }
]
result = dynamic_planning(trades, last_minute)
console.log(result)
