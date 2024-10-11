/*

Copyright 2016 Andrew Hodel
	andrewhodel@gmail.com

LICENSE MIT

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

var util = require('util');

function dBug(s) {
	// uncomment out for debug
	//console.log(s);
}

exports.update = function (intervalSeconds, totalSteps, dataType, updateDataPoint, jsonDb) {

	// 24 hours with 5 minute interval
	// update(5*60, 24*60/5, 'GUAGE', [34], jsonObject);

	// 30 days with 1 hour interval
	// update(60*60, 30*24/1, 'GUAGE', [34], jsonObject);

	// 365 days with 1 day interval
	// update(24*60*60, 365*24/1, 'GUAGE', [34], jsonObject);

	if (isNaN(intervalSeconds) === true) {
		throw new Error('intervalSeconds must be a number.');
	}

	if (typeof(totalSteps) !== 'number') {
		throw new Error('totalSteps must be a number.');
	}

	if (typeof(dataType) !== 'string') {
		throw new Error('dataType must be a string of "GUAGE" or "COUNTER".');
	}

	if (typeof(updateDataPoint) === 'object' && updateDataPoint.length > 0) {
		// updateDataPoint is valid
	} else {
		console.log(updateDataPoint);
		throw new Error('updateDataPoint must be an array of numbers.');
	}

	if (typeof(jsonDb) === 'undefined' || typeof(jsonDb.firstUpdateTs) === 'undefined') {
		jsonDb = {d:[], firstUpdateTs: null};
	}

	var updateTimeStamp = Date.now();

	// intervalSeconds - time between updates
	// totalSteps - total steps of data
	// dataType - GUAGE or COUNTER
	//  GUAGE - values that stay within the range of defined integer types, like the value of raw materials.
	//  COUNTER - values that count and can exceed the maximum of a defined integer type.
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

	// if the updateTimeStamp is later than firstUpdateTs+(totalSteps*intervalSeconds*1000)
	// then it is an entirely new chart
	if (updateTimeStamp >= jsonDb.firstUpdateTs+(totalSteps*2*intervalSeconds*1000)) {
		// set firstUpdateTs to null so this will be considered the first update
		dBug(ccBlue+'### THIS UPDATE IS SO MUCH NEWER THAN THE EXISTING DATA THAT IT REPLACES IT ###'+ccReset);
		jsonDb.firstUpdateTs = null;

		// reset all the data
		if (dataType === 'COUNTER') {
			// counter types need a rate calculation
			jsonDb.r = [];
		}

		jsonDb.d = [];
		for (var c=0; c<totalSteps; c++) {
			var o = [];
			for (var d=0; d<updateDataPoint.length; d++) {
				// need to replace undefined data points with null regardless
				if (typeof(updateDataPoint[d]) === 'undefined') {
					updateDataPoint[d] = null;
				}

				o.push(null);
			}
			jsonDb.d.push(o);
			if (dataType === 'COUNTER') {
				// this must be done to not have references that result d in r
				jsonDb.r.push(JSON.parse(JSON.stringify(o)));
			}
		}

	}

	// first, check if this is the first update or not
	if (jsonDb.firstUpdateTs === null) {
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
		var currentStep = 0;
		for (var c=0; c<totalSteps; c++) {
			timeSteps.push(jsonDb.firstUpdateTs+(intervalSeconds*1000*c));

			if (updateTimeStamp >= jsonDb.firstUpdateTs+(intervalSeconds*1000*c)) {
				currentStep = c;
			}
		}

		// now check if this update is in the current time slot
		if (updateTimeStamp >= timeSteps[currentStep] && currentStep !== 0) {
			// this update is in a new time slot
			// and it is not the first time slot (multiple updates can happen in the first time slot)
			dBug(ccBlue+'##### NEW STEP ##### this update is in a new step'+ccReset);

			// shift the data set
			if (currentStep === totalSteps - 1) {
				// shift the data set

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

					if (dataType === 'COUNTER') {
						// remove the first _shift_ entries
						jsonDb.r.splice(0, shift);
						// add empty entries to the end _shift_ times
						for (var e=0; e<shift; e++) {
							var n = [];
							for (var ee=0; ee<updateDataPoint.length; ee++) {
								n.push(null);
							}
							jsonDb.r.push(n);
						}
					}

					// add intervalSeconds to firstUpdateTs
					jsonDb.firstUpdateTs = jsonDb.firstUpdateTs+(intervalSeconds*1000*shift);

					currentStep -= shift - 1;
					dBug(ccRed+'changed currentStep: ' + currentStep + ccReset);

				}
			}

			dBug(ccBlue+'inserting data at: ' + currentStep + ccReset);

			// handle different dataType
			switch (dataType) {
				case 'GUAGE':

					// insert the data for each data point
					for (var e=0; e<updateDataPoint.length; e++) {
						jsonDb.d[currentStep][e] = updateDataPoint[e];
					}

					// set the avgCount to 1
					jsonDb.currentAvgCount = 1;

					break;
				case 'COUNTER':

					// for each data point
					for (var e=0; e<updateDataPoint.length; e++) {

						// check for overflow, overflow happens when a counter resets
						// known by this update value being less than the previous
						if (jsonDb.d[currentStep-1][e] > updateDataPoint[e]) {

							// the counter has overflowed, check if this happened near 32 or 64 bit limit
							dBug(ccBlue+'overflow'+ccReset);

							if (jsonDb.d[currentStep-1][e] < 2147483647 && jsonDb.d[currentStep-1][e] > 2147483647 * .7) {

								// the 32 bit limit is 2,147,483,647
								// the last update was between 70% and 100% of the 32 bit uint limit

								// for this calculation, add the remainder of subtracting the last data point from the 32 bit limit to the updateDataPoint
								updateDataPoint[e] += 2147483647-jsonDb.d[currentStep-1][e];

							} else if (jsonDb.d[currentStep-1][e] < 9223372036854775807 && jsonDb.d[currentStep-1][e] > 9223372036854775807 * .7) {

								// the 64 bit limit is 9,223,372,036,854,775,807
								// the last update was between 70% and 100% of the 64 bit uint limit

								// for this calculation, add the remainder of subtracting the last data point from the 64 bit limit to the updateDataPoint
								updateDataPoint[e] += 9223372036854775807-jsonDb.d[currentStep-1][e];

							}
						}


						if (jsonDb.d[currentStep-1][e] != null) {
							// for a counter, divide the difference of this step and the previous step by
							// the difference in seconds between the updates
							var rate = updateDataPoint[e]-jsonDb.d[currentStep-1][e];
							dBug('calculating the rate for '+rate+' units over '+intervalSeconds+' seconds');
							rate = rate/intervalSeconds;
							dBug('inserting data with rate '+rate+ ' at time slot '+currentStep);
							jsonDb.r[currentStep][e] = rate;
						}

						// insert the data
						jsonDb.d[currentStep][e] = updateDataPoint[e];

					}

					break;
				default:
					dBug('unsupported dataType: ' + dataType);
			}

		} else {

			// this update is in the same step group as the previous
			dBug('##### SAME STEP ##### this update is in the same step as the previous');

			// handle different dataType
			switch (dataType) {

				case 'GUAGE':
					// this update needs to be averaged with the last

					// do this for each data point
					for (var e=0; e<updateDataPoint.length; e++) {

						if (jsonDb.currentAvgCount > 1) {
							// average with a previous update that was itself an average
							dBug('averaging with a previous update that was itself an average');

							// that means multiply the avgCount of the previous update by the data point of the previous update
							if (currentStep === 0) {
								// this is the first update
								// average with currentStep not the previous step
								var avg = jsonDb.currentAvgCount*jsonDb.d[currentStep][e];
							} else {
								var avg = jsonDb.currentAvgCount*jsonDb.d[currentStep-1][e];
							}
							// add this updateDataPoint
							avg += updateDataPoint[e];
							// increment the avg count
							jsonDb.currentAvgCount++;
							// then divide by the avgCount
							avg = avg/(jsonDb.currentAvgCount);

							dBug('updating data point with avg '+avg);
							jsonDb.d[currentStep][e] = avg;

						} else {
							// average the previous update with this one
							dBug('averaging with previous update');

							// add the previous update data point to this one then divide by 2 for the average
							var avg = (updateDataPoint[e]+jsonDb.d[currentStep][e])/2;
							// set the avgCount to 2
							jsonDb.currentAvgCount = 2;
							// and insert it
							dBug('updating data point with avg '+avg);
							jsonDb.d[currentStep][e] = avg;

						}

					}

					break;
				case 'COUNTER':
					// increase the counter on the last update to this one for each data point
					// this actually means to modify, not increase because it would be an increased value
					for (var e=0; e<updateDataPoint.length; e++) {
						jsonDb.d[currentStep][e] = updateDataPoint[e];
					}

					break;
				default:
					dBug('unsupported dataType: ' + dataType);

			}
		}

	}

	// return the object
	return jsonDb;

};
