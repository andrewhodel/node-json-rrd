var jsonrrd = require('./json-rrd.js');
var fs = require('fs');

// example for node-json-rrd
// shows basic collection and reporting for linux with node-json-rrd

// json-rrd should use a period of 5 minutes or 300 seconds
var intervalSeconds = 8
// collect 288 steps of data, at a 5 minute interval that is exactly 24 hours (5*288/60)
var totalSteps = 288
// collect data every 5 minutes or 300 seconds
var loopSeconds = 4

var gaugeTest = {};
var counterTest = {};

function doUp() {

    fs.readFile('/proc/meminfo', function (err, data) {

        var lines = data.toString().split("\n");
        var update = [];
        for (var i=0; i<lines.length; i++) {
            var now = lines[i].toString().split(/\s+/g);
            if (now[0].indexOf('MemTotal') == 0) {
                update.push(now[1]);
            }
            if (now[0].indexOf('MemFree') == 0) {
                update.push(now[1]);
            }
        }

        gaugeTest = jsonrrd.update(intervalSeconds, totalSteps, 'GAUGE', update, gaugeTest);

    });

    fs.readFile('/proc/net/dev', function (err, data) {

        var lines = data.toString().split("\n");
        var update = [];
        for (var i=0; i<lines.length; i++) {
            var now = lines[i].toString().split(/\s+/g);
            if (now.length>1) {
                if (now[0].indexOf('enp3s0') == 0) {
                    // bytes in
                    update.push(now[1]);
                    // bytes out
                    update.push(now[9]);
                }
            }
        }

        counterTest = jsonrrd.update(intervalSeconds, totalSteps, 'COUNTER', update, counterTest);

    });

}

setInterval(doUp,loopSeconds*1000);

doUp();
