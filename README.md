node-json-rrd - a pure JS [r]ound [r]obin [d]atastore library for Node.js with JSON i/o

Simple RRD's as JSON objects.

Example
======

On a linux system you can run example.js which provides a simple example of collecting and displaying
traffic statistics for an interface with a COUNTER and the free/total memory using a GUAGE.

Documentation
=============

__update(intervalSeconds, totalSteps, dataType, updateDataPoint[], jsonDb);__

returns a JSON object representing the RRD datastore.

* intervalSeconds		time between updates
* totalSteps			total steps of data
* dataType			GUAGE or COUNTER
<pre>
    GUAGE - values that stay within the range of defined integer types, like the value of raw materials.
    COUNTER - values that count and can exceed the maximum of a defined integer type.
</pre>
* updateDataPoint[]		array of data points for the update, you must maintain the same order on following update()'s
* jsonDb			data from previous updates

<pre>
//24 hours with 5 minute interval
update(5*60, 24*60/5, 'GUAGE', [34,100], jsonObject);

//30 days with 1 hour interval
update(60*60, 30*24, 'GUAGE', [34,100], jsonObject);

//365 days with 1 day interval
update(24*60*60, 365*24, 'GUAGE', [34,100], jsonObject);
</pre>

JSON Data Format
================

The JSON Object returned by update() looks like this:

<pre>
{ d: [Array],
  currentStep: 19,
  firstUpdateTs: 1523555609625,
  r: [Array] }
</pre>

d is an array which is the length you specified in totalSteps to update() that contains the data points

firstUpdateTs is a unix epoch timestamp in milliseconds of the first update in the series

r is an array which is the length you specified in totalSteps to update() that contains the rates for the data points

You can calculate the time of each update by adding the multiple of the value of intervalSeconds which you gave to update() for each time slot.

License
=======

Copyright 2018 Andrew Hodel
	andrewhodel@gmail.com

LICENSE MIT

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
