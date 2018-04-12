node-json-rrd - a pure JS [r]ound [r]obin [d]atabase library for Node.js with JSON i/o

Simple RRD's as JSON objects.

Example
======

On a linux system you can run example.js which provides a simple example of collecting and displaying
your enp3s0 interface traffic statistics with a COUNTER and your free/total memory using a GAUGE.

Documentation
=============

__update(intervalSeconds, totalSteps, dataType, updateTimeStamp, updateDataPoint[], jsonDb);__

returns a JSON object representing the RRD database.

* intervalSeconds - time between updates
* totalSteps - total steps of data
* dataType - GAUGE or COUNTER
<pre>
    GAUGE - things that have no limits, like the value of raw materials
    COUNTER - things that count up, if we get a value that's less than last time it means it reset... stored as a per second rate
</pre>
* updateTimeStamp - seconds since unix epoch, not milliseconds
* updateDataPoint[] - array of data points for the update, you must maintain the same order on following update()'s
* jsonDb - data from previous updates

<pre>
//24 hours with 5 minute interval
update(5*60, 24*60/5, 'GAUGE', [34,100], jsonObject);

//30 days with 1 hour interval
update(60*60, 30*24/1, 'GAUGE', [34,100], jsonObject);

//365 days with 1 day interval
update(24*60*60, 365*24/1, 'GAUGE', [34,100], jsonObject);
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

LICENSE

This program, design, source code, document or sequence of bits is licensed and the terms issued below must be followed.  By using or reading or including this content you are automatically a licensee granted permission by the licensor (Andrew Hodel) under the following terms.

Usage - You may use this content under the following conditions:

	1. Every inclusion of this content within another program, design, source code, document or sequence of bits requires the licensee to notify the licensor via email to the email address andrewhodel@gmail.com.  The message must clearly explain the intended usage, information on the direction of the project to which it is to be included, and the Given Birth Name of the person who is writing the email and using the content as well as the the Company name (if applicable).

	2. This content may only be used in ways which are not commercial and have no commercial outlets.  This means that the content should never be sold or bartered and should never be included with other content which is sold or bartered.  In the case of automated services or products generated from the use of this content, you may use the content to provide services which generate profits; however those services must publish fully their costs and expenses in relation to their income in all forms of currency and or barter in order to use this content to generate profit generating content.  Anyone who is a trade partner in a relation using content generated from this content may notify the Licensor of this agreement of an infrigement of this clause and the Licensor then has a legal right against the Licensee to prosecute in order to demand his payment as well as the publication and the required trade information.

	3. If you wish to use this content in a commercial manner or in a product which may have commercial outlets, you must contact the author to arrange a proper license and proper payment before it's usage.  You may not read the content if your intention is commerce.

	4. You may not use this content and/or the knowledge of this content in any manner of Barter without providing proper compensation to the Owner/Licensor.  This would require written notification to the Licensor with a letter of intention of Barter explaining the terms at which your gain is coming from my work.  From this point equal compensation can be arranged.  A U.S. Postal Mailing Address can be obtained by request via email.

	5. Any offenses against this license agreement will be prosecuted to the fullest extent of national and international law.
