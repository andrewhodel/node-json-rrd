var jsonrrd = require('./json-rrd.js');
var fs = require('fs');

// example for node-json-rrd
// shows basic collection and reporting for linux with node-json-rrd

var intervalSeconds = 8
var totalSteps = 7
var loopSeconds = 4

var gaugeTest = {};
var counterTest = {};

function loop() {

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

	console.log('\n MemTotal and MemFree, every '+intervalSeconds+' seconds');
	console.log(gaugeTest);

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

	console.log('\nenp3s0 traffic counter, every '+intervalSeconds+' seconds');
        counterTest = jsonrrd.update(intervalSeconds, totalSteps, 'COUNTER', update, counterTest);

	console.log(counterTest);

    });

}

setInterval(loop,loopSeconds*1000);

loop();
