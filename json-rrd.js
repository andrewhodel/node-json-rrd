/*

Copyright 2016 Andrew Hodel
	andrewhodel@gmail.com

LICENSE MIT

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

var util = require('util');

// 24 hours with 5 minute interval
// update(5*60, 24*60/5, 'GAUGE', 34, jsonObject);

// 30 days with 1 hour interval
// update(60*60, 30*24/1, 'GAUGE', 34, jsonObject);

// 365 days with 1 day interval
// update(24*60*60, 365*24/1, 'GAUGE', 34, jsonObject);

function dBug(s) {
	// uncomment out for debug
	//console.log(s);
}

exports.update = function (intervalSeconds, totalSteps, dataType, updateDataPoint, jsonDb) {

	if (typeof(jsonDb) === 'undefined' || typeof(jsonDb.firstUpdateTs) === 'undefined') {
		jsonDb = {d:[], currentStep: 0, firstUpdateTs: -1};
	}

	// generate the steps if needed
	if (jsonDb.d.length == 0) {
		if (dataType == 'COUNTER') {
			// counter types need a rate calculation
			jsonDb.r = [];
		}
		for (var c=0; c<totalSteps; c++) {
			var o = [];
			for (var d=0; d<updateDataPoint.length; d++) {
				o.push(-1);
			}
			jsonDb.d.push(o);
			if (dataType == 'COUNTER') {
				jsonDb.r.push(JSON.parse(JSON.stringify(o)));
			}
		}
	}

	for (var e=0; e<updateDataPoint.length; e++) {
		updateDataPoint[e] = parseFloat(updateDataPoint[e]);
	}

	updateTimeStamp = Math.round(Date.now());

	// intervalSeconds - time between updates
	// totalSteps - total steps of data
	// dataType - GAUGE or COUNTER
	//  GAUGE - things that have no limits, like the value of raw materials
	//  COUNTER - things that count up, if we get a value that's less than last time it means it reset... stored as a per second rate
	// updateTimeStamp - unix epoch timestamp of this update
	// updateDataPoint - data object for this update
	// jsonDb - data from previous updates
	//
	// returns json object with update added

	// color codes
	var ccRed = '\033[31m';
	var ccBlue = '\033[34m';
	var ccReset = '\033[0m';

	dBug('\n'+ccRed+'### GOT NEW '+dataType+' UPDATE ###'+ccReset);
	dBug('intervalSeconds: '+intervalSeconds);
	dBug('totalSteps: '+totalSteps);
	dBug('updateTimeStamp: '+updateTimeStamp);
	dBug('updateDataPoint: ');
	dBug(updateDataPoint);
	dBug('jsonDb: ');
	dBug(util.inspect(jsonDb, {depth: 0}));
	if (totalSteps > 5) {
		for (var c=0; c<5; c++) {
			dBug('data '+jsonDb.d[c]);
			if (dataType == 'COUNTER') {
				dBug('rate '+jsonDb.r[c]);
			}
		}
	} else {
		dBug(jsonDb.d);
		if (dataType == 'COUNTER') {
			dBug(jsonDb.r);
		}
	}

	// first we need to see if this is the first update or not
	if (jsonDb.firstUpdateTs == -1) {
		// this is the first update
		dBug(ccBlue+'### INSERTING FIRST UPDATE ###'+ccReset);

		// create the array of data points
		jsonDb.d[0] = [];
		// insert the data for each data point
		for (var e=0; e<updateDataPoint.length; e++) {
			jsonDb.d[0].push(updateDataPoint[e]);
		}

		// set the firstUpdateTs
		jsonDb.firstUpdateTs = Date.now();

	} else {

		// this is not the first update
		dBug(ccBlue+'### PROCESSING '+dataType+' UPDATE ###'+ccReset);

		// this timestamp
		dBug('updateTimeStamp: '+updateTimeStamp);

		// get the time steps for each position, based on firstUpdateTs
		var timeSteps = [];
		for (var c=0; c<totalSteps; c++) {
			timeSteps.push(jsonDb.firstUpdateTs+(intervalSeconds*1000*c));
			if (c > jsonDb.currentStep+1) {
				// no need to know more than the current timeStep
				continue;
			}
		}

		// now check if this update is in the current time slot
		if (updateTimeStamp > timeSteps[jsonDb.currentStep+1]) {
			// this update is in a completely new time slot
			dBug('this update is in a new step');

			// increment what time slot we are in
			jsonDb.currentStep++;

			// handle different dataType
			switch (dataType) {
				case 'GAUGE':

					dBug('inserting data');
					// insert the data for each data point
					for (var e=0; e<updateDataPoint.length; e++) {
						jsonDb.d[jsonDb.currentStep][e] = updateDataPoint[e];
					}

					// set the avgCount to 1
					jsonDb.currentAvgCount = 1;

					break;
				case 'COUNTER':

					// for each data point
					for (var e=0; e<updateDataPoint.length; e++) {

						// we need to check for overflow, overflow happens when a counter resets so we check the last values to see if they were close to the limit if the previous update
						// is 3 times the size or larger, meaning if the current update is 33% or smaller it's probably an overflow
						if (jsonDb.d[jsonDb.currentStep-1][e] > updateDataPoint[e]*3) {

							// oh no, the counter has overflown so we need to check if this happened near 32 or 64 bit limit
							dBug(ccBlue+'overflow');

							// the 32 bit limit is 2,147,483,647 so we should check if we were within 10% of that either way on the last update
							if (jsonDb.d[jsonDb.currentStep][e]<(2147483647*.1)-2147483647) {
								// this was so close to the limit that we are going to make 32bit adjustments

								// for this calculation we just need to add the remainder of subtracting the last data point from the 32 bit limit to the updateDataPoint
								updateDataPoint[e] += 2147483647-jsonDb.d[jsonDb.currentStep-1][e];

								// the 64 bit limit is 9,223,372,036,854,775,807 so we should check if we were within 1% of that
							} else if (jsonDb.d[jsonDb.currentStep][e]<(9223372036854775807*.01)-9223372036854775807) {
								// this was so close to the limit that we are going to make 64bit adjustments

								// for this calculation we just need to add the remainder of subtracting the last data point from the 64 bit limit to the updateDataPoint
								updateDataPoint[e] += 9223372036854775807-jsonDb.d[jsonDb.currentStep-1][e];

							}
						}


						if (jsonDb.d[jsonDb.currentStep-1][e] > -1) {
							// for a counter, we need to divide the difference of this step and the previous step by
							// the difference in seconds between the updates
							var rate = updateDataPoint[e]-jsonDb.d[jsonDb.currentStep-1][e];
							dBug('calculating the rate for '+rate+' units over '+intervalSeconds+' seconds');
							rate = rate/intervalSeconds;
							dBug('inserting data with rate '+rate+ ' at time slot '+jsonDb.currentStep);
							jsonDb.r[jsonDb.currentStep][e] = rate;
						}

						// insert the data
						jsonDb.d[jsonDb.currentStep][e] = updateDataPoint[e];

					}

					break;
				default:
					dBug('unsupported dataType '+dataType);
			}

			// check if the updated slot was the last available

			if (jsonDb.currentStep == totalSteps-1) {
				dBug(ccRed+'last data point, shifting data set');
				// shift the data set back one by removing the first data point
				jsonDb.d.splice(0, 1);
				jsonDb.d.push([]);
				for (var e=0; e<updateDataPoint.length; e++) {
					jsonDb.d[jsonDb.d.length-1].push(-1);
				}
				if (dataType == 'COUNTER') {
					jsonDb.r.splice(0, 1);
					jsonDb.r.push([]);
					for (var e=0; e<updateDataPoint.length; e++) {
						jsonDb.r[jsonDb.r.length-1].push(-1);
					}
				}

				// add intervalSeconds to firstUpdateTs
				jsonDb.firstUpdateTs = jsonDb.firstUpdateTs+(intervalSeconds*1000);

				jsonDb.currentStep--;
			}

		} else {

			// being here means that this update is in the same step group as the previous
			dBug('this update is in the same step as the previous');

			// handle different dataType
			switch (dataType) {

				case 'GAUGE':
					// this update needs to be averaged with the last

					// we need to do this for each data point
					for (var e=0; e<updateDataPoint.length; e++) {

						if (jsonDb.currentAvgCount > 1) {
							// we are averaging with a previous update that was itself an average
							dBug('we are averaging with a previous update that was itself an average');

							// that means we have to multiply the avgCount of the previous update by the data point of the previous update
							if (jsonDb.currentStep == 0) {
								// this is the first update, we need to average with currentStep not the previous step
								var avg = jsonDb.currentAvgCount*jsonDb.d[jsonDb.currentStep][e];
							} else {
								var avg = jsonDb.currentAvgCount*jsonDb.d[jsonDb.currentStep-1][e];
							}
							// add this updateDataPoint
							avg += updateDataPoint[e];
							// increment the avg count
							jsonDb.currentAvgCount++;
							// then divide by the avgCount
							avg = avg/(jsonDb.currentAvgCount+1);

							dBug('updating data point with avg '+avg);
							jsonDb.d[jsonDb.currentStep][e] = avg;

						} else {
							// we need to average the previous update with this one
							dBug('averaging with previous update');

							// we need to add the previous update data point to this one then divide by 2 for the average
							var avg = (updateDataPoint[e]+jsonDb.d[jsonDb.currentStep][e])/2;
							// set the avgCount to 2
							jsonDb.currentAvgCount = 2;
							// and insert it
							dBug('updating data point with avg '+avg);
							jsonDb.d[jsonDb.currentStep][e] = avg;

						}

					}

					break;
				case 'COUNTER':
					// increase the counter on the last update to this one for each data point
					// this actually means to modify, not increase because it would be an increased value
					for (var e=0; e<updateDataPoint.length; e++) {
						jsonDb.d[jsonDb.currentStep][e] = updateDataPoint[e];
					}

					break;
				default:
					dBug('unsupported dataType '+dataType);

			}
		}

	}

	// return the object
	return jsonDb;

};

exports.graph = function (intervalSeconds, totalSteps, dataType, jsonDb, graphType) {

	// intervalSeconds - time between updates
	// totalSteps - total steps of data
	// dataType - GAUGE or COUNTER
	// jsonDb - data from previous updates
	// graphType - SVG
	//  SVG - string response of SVG code
	//
	// returns graph of graphType

	// if you figured each column of pixels took 1 byte which is extremely conservative
	// then each data point at 1 pixel per data point would take at least 100 bytes to show
	// for a 100px high chart

	// if you were to just send the data and graph it in the browser, then you could almost
	// have a uint_128 for the same bandwidth cost and have much finer detail in the data
	// and you would remain with more detail even with a uint_16 considering the cost
	// and unknown protocol requirements of expecting each rgb color value to be your makeshift array

};
