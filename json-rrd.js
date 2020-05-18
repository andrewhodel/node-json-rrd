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

function round_to_precision(n, precision) {

	var to_round_precision = 10;
	for (var p=0; p<precision-1; p++) {
		to_round_precision *= to_round_precision;
	}

	return Math.round(n * to_round_precision) / to_round_precision;

}

exports.update = function (intervalSeconds, totalSteps, dataType, updateDataPoint, jsonDb, precision=2) {

	if (typeof(updateDataPoint) == 'undefined') {
		return jsonDb;
	}

	if (typeof(jsonDb) === 'undefined' || typeof(jsonDb.firstUpdateTs) === 'undefined') {
		jsonDb = {d:[], currentStep: 0, firstUpdateTs: null};
	}

	for (var e=0; e<updateDataPoint.length; e++) {
		// set all the points in the updateDataPoint object to be of data type Number
		updateDataPoint[e] = parseFloat(updateDataPoint[e]);

		// round the number to the precision specified
		updateDataPoint[e] = round_to_precision(updateDataPoint[e], precision);

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
	dBug(util.inspect(jsonDb, {depth: 3}));

	// store updateDataPoint array as lastUpdateDataPoint
	jsonDb.lastUpdateDataPoint = updateDataPoint;

	// if the updateTimeStamp is farther away than firstUpdateTs+(totalSteps*intervalSeconds*1000)
	// then it is an entirely new chart
	if (updateTimeStamp >= jsonDb.firstUpdateTs+(totalSteps*2*intervalSeconds*1000)) {
		// set firstUpdateTs to null so this will be considered the first update
		dBug(ccBlue+'### THIS UPDATE IS SO MUCH NEWER THAN THE EXISTING DATA THAT IT REPLACES IT ###'+ccReset);
		jsonDb.firstUpdateTs = null;

		// reset all the data
		if (dataType == 'COUNTER') {
			// counter types need a rate calculation
			jsonDb.r = [];
		}

		jsonDb.d = [];
		jsonDb.currentStep = 0;
		for (var c=0; c<totalSteps; c++) {
			var o = [];
			for (var d=0; d<updateDataPoint.length; d++) {
				// need to replace undefined data points with null regardless
				if (typeof(updateDataPoint[d]) == 'undefined') {
					updateDataPoint[d] = null;
				}

				o.push(null);
			}
			jsonDb.d.push(o);
			if (dataType == 'COUNTER') {
				jsonDb.r.push(JSON.parse(JSON.stringify(o)));
			}
		}

	}

	// first we need to see if this is the first update or not
	if (jsonDb.firstUpdateTs == null) {
		// this is the first update
		dBug(ccBlue+'### INSERTING FIRST UPDATE ###'+ccReset);

		// create the array of data points
		jsonDb.d[0] = [];
		// insert the data for each data point
		for (var e=0; e<updateDataPoint.length; e++) {
			jsonDb.d[0].push(updateDataPoint[e]);
		}

		// set the firstUpdateTs
		jsonDb.firstUpdateTs = updateTimeStamp;

	} else {

		// this is not the first update
		dBug(ccBlue+'### PROCESSING '+dataType+' UPDATE ###'+ccReset);

		// this timestamp
		dBug('updateTimeStamp: '+updateTimeStamp);

		// get the time steps for each position, based on firstUpdateTs
		var timeSteps = [];
		var currentTimeSlot = 0;
		for (var c=0; c<totalSteps; c++) {
			timeSteps.push(jsonDb.firstUpdateTs+(intervalSeconds*1000*c));

			if (updateTimeStamp >= jsonDb.firstUpdateTs+(intervalSeconds*1000*c)) {
				currentTimeSlot = c;
			}
		}

		// now check if this update is in the current time slot
		if (updateTimeStamp > timeSteps[jsonDb.currentStep+1]) {
			// this update is in a completely new time slot
			dBug(ccBlue+'##### NEW STEP ##### this update is in a new step'+ccReset);

			// set the currentStep to the currentTimeSlot
			jsonDb.currentStep = currentTimeSlot;

			// shift the data set
			if (jsonDb.currentStep >= totalSteps-1) {

				// calculate how much to shift by
				var shift = 1;
				if (updateTimeStamp >= jsonDb.firstUpdateTs+(totalSteps*intervalSeconds*1000)) {
					// this update needs to shift by more than 1 but obviously not more than the entire data set length
					// because if that were true, the data would have already been reset
					var time_diff = updateTimeStamp - (jsonDb.firstUpdateTs+(totalSteps*intervalSeconds*1000));
					// shift by the number of steps beyond the last considering the original firstUpdateTs
					shift = Math.ceil((time_diff/1000)/intervalSeconds)-1;
				}

				if (shift > 0) {

					// shift the data set
					dBug(ccRed+'shifting data set by: ' + shift + ccReset);

					// remove the first _shift_ entries
					jsonDb.d.splice(0, shift);
					// add empty entries to the end _shift_ times
					for (var e=0; e<shift; e++) {
						var n = [];
						for (var ee=0; ee<updateDataPoint.length; ee++) {
							n.push(null);
						}
						jsonDb.d.push(n);
					}

					if (dataType == 'COUNTER') {
						// remove the first _shift_ entries
						jsonDb.r.splice(0, shift);
						// add empty entries to the end _shift_ times
						for (var e=0; e<shift; e++) {
							var n = [];
							for (var ee=0; ee<updateDataPoint.length; ee++) {
								n.push(null);
							}
							jsonDb.r.push([]);
						}
					}

					// add intervalSeconds to firstUpdateTs
					jsonDb.firstUpdateTs = jsonDb.firstUpdateTs+(intervalSeconds*1000*shift);

					jsonDb.currentStep -= shift;
					dBug(ccRed+'changed currentStep: ' + jsonDb.currentStep + ccReset);

				}
			}

			if (jsonDb.currentStep+1 == totalSteps) {
				// this is needed after a shift of more than 1 but less than totalSteps
				// in case there is an update which is beyond the last when calculated against a new firstUpdateTs that may be milliseconds beyond the previous firstUpdateTs
				jsonDb.currentStep--;
			}

			dBug(ccBlue+'inserting data at: ' + jsonDb.currentStep + ccReset);

			// handle different dataType
			switch (dataType) {
				case 'GAUGE':

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
							dBug(ccBlue+'overflow'+ccReset);

							// the 32 bit limit is 2,147,483,647 so we should check if we were within 10% of that either way on the last update
							if (jsonDb.d[jsonDb.currentStep][e]<(2147483647*.1)-2147483647) {
								// this was so close to the limit that we are going to make 32bit adjustments

								// for this calculation we just need to add the remainder of subtracting the last data point from the 32 bit limit to the updateDataPoint
								updateDataPoint[e] += 2147483647-jsonDb.d[jsonDb.currentStep-1][e];
								updateDataPoint[e] = round_to_precision(updateDataPoint[e], precision);

								// the 64 bit limit is 9,223,372,036,854,775,807 so we should check if we were within 1% of that
							} else if (jsonDb.d[jsonDb.currentStep][e]<(9223372036854775807*.01)-9223372036854775807) {
								// this was so close to the limit that we are going to make 64bit adjustments

								// for this calculation we just need to add the remainder of subtracting the last data point from the 64 bit limit to the updateDataPoint
								updateDataPoint[e] += 9223372036854775807-jsonDb.d[jsonDb.currentStep-1][e];
								updateDataPoint[e] = round_to_precision(updateDataPoint[e], precision);

							}
						}


						if (jsonDb.d[jsonDb.currentStep-1][e] != null) {
							// for a counter, we need to divide the difference of this step and the previous step by
							// the difference in seconds between the updates
							var rate = updateDataPoint[e]-jsonDb.d[jsonDb.currentStep-1][e];
							dBug('calculating the rate for '+rate+' units over '+intervalSeconds+' seconds');
							rate = rate/intervalSeconds;
							dBug('inserting data with rate '+rate+ ' at time slot '+jsonDb.currentStep);
							jsonDb.r[jsonDb.currentStep][e] = round_to_precision(rate, precision);
						}

						// insert the data
						jsonDb.d[jsonDb.currentStep][e] = updateDataPoint[e];

					}

					break;
				default:
					dBug('unsupported dataType '+dataType);
			}

		} else {

			// being here means that this update is in the same step group as the previous
			dBug('##### SAME STEP ##### this update is in the same step as the previous');

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
							avg = avg/(jsonDb.currentAvgCount);

							dBug('updating data point with avg '+avg);
							jsonDb.d[jsonDb.currentStep][e] = round_to_precision(avg, precision);

						} else {
							// we need to average the previous update with this one
							dBug('averaging with previous update');

							// we need to add the previous update data point to this one then divide by 2 for the average
							var avg = (updateDataPoint[e]+jsonDb.d[jsonDb.currentStep][e])/2;
							// set the avgCount to 2
							jsonDb.currentAvgCount = 2;
							// and insert it
							dBug('updating data point with avg '+avg);
							jsonDb.d[jsonDb.currentStep][e] = round_to_precision(avg, precision);

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
