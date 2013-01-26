var jsonrrd = require('./json-rrd.js');
var fs = require('fs');
var lazy = require('lazy');

// example for node-json-rrd
// shows basic collection and reporting for linux with node-json-rrd

// json-rrd should use a period of 5 minutes or 300 seconds
var intervalSeconds = 300
// collect 288 steps of data, at a 5 minute interval that is exactly 24 hours (5*288/60)
var totalSteps = 288
// collect data every 5 minutes or 300 seconds
var loopSeconds = 300

var gaugeTest = {};
var counterTest = {};

function doUp() {
    var f = new lazy(fs.createReadStream('/proc/meminfo'))
        .lines
        .forEach(function(line) {
            var now = line.toString().split(/\s+/g);
            if (now[0].indexOf('MemFree') == 0) {
                gaugeTest = jsonrrd.update(intervalSeconds, totalSteps, 'GAUGE', now[1], gaugeTest);
                console.log('### DATA FOR FREEMEM ###');
                console.log(gaugeTest);
            }
        }
    );
    var t = new lazy(fs.createReadStream('/proc/net/dev'))
        .lines
        .forEach(function(line) {
            var now = line.toString().split(/\s+/g);
            if (now[1].indexOf('eth0') == 0) {
                counterTest = jsonrrd.update(intervalSeconds, totalSteps, 'COUNTER', now[2], counterTest);
                console.log('### DATA FOR INTERFACE ###');
                console.log(counterTest);
            }
        }
    );
}

setInterval(doUp,loopSeconds*1000);

doUp();
