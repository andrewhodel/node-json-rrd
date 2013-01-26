node-json-rrd - a pure JS [r]ound [r]obin [d]atabase library for Node.js with JSON i/o

Simple RRD's as JSON objects which you can store in MongoDB, files, anywhere you want.

Example
======

On a linux system you can run example.js which provides a simple example of collecting and displaying
your eth0 interface traffic statistics with a COUNTER update and your free memory using a GAUGE.

Documentation
=============

__update(intervalSeconds, totalSteps, dataType, updateTimeStamp, updateDataPoint, jsonDb);__

returns a JSON object representing the RRD database.

* intervalSeconds - time between updates
* totalSteps - total steps of data
* dataType - GAUGE or COUNTER
<pre>
    GAUGE - things that have no limits, like the value of raw materials
    COUNTER - things that count up, if we get a value that's less than last time it means it reset... stored as a per second rate
</pre>
* updateTimeStamp - unix epoch timestamp of this update
* updateDataPoint - data object for this update
* jsonDb - data from previous updates

<pre>
//24 hours with 5 minute interval
update(5*60, 24*60/5, 'GAUGE', 34, jsonObject);

//30 days with 1 hour interval
update(60*60, 30*24/1, 'GAUGE', 34, jsonObject);

//365 days with 1 day interval
update(24*60*60, 365*24/1, 'GAUGE', 34, jsonObject);
</pre>

JSON Data Format
================

The JSON Object returned by update() contains one data object for each period and will not be longer than totalSteps.

* avgCount - used internally to handle GAUGE averages
* d - the data point for the timestamp (the data you want with GAUGE)
* r - the rate per second for the period if the dataType calculates it (the data you want with COUNTER)

<pre>
{
    'TIMESTAMP': { avgCount: AVERAGECOUNT, d: DATAPOINT, r: RATEPERSEC },
    'TIMESTAMP': { avgCount: AVERAGECOUNT, d: DATAPOINT, r: RATEPERSEC }
}
</pre>

License
=======

The MIT License (MIT) Copyright (c) 2013 Andrew Hodel - andrewhodel@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
