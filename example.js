var jsonrrd = require('./json-rrd.js');
var fs = require('fs');

// example for node-json-rrd
// shows basic collection and reporting for linux with node-json-rrd

var intervalSeconds = 8;
var totalSteps = 40;
var loopSeconds = 4;

if (fs.existsSync('./gaugeTest.db')) {
	var gaugeTest = JSON.parse(fs.readFileSync('./gaugeTest.db'));
} else {
	var gaugeTest = {};
}

if (fs.existsSync('./counterTest.db')) {
	var counterTest = JSON.parse(fs.readFileSync('./counterTest.db'));
} else {
	var counterTest = {};
}

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

	fs.writeFileSync('./gaugeTest.db', JSON.stringify(gaugeTest));

	console.log('\n MemTotal and MemFree, every '+intervalSeconds+' seconds');
	console.log(gaugeTest);
	console.log('\n\n');

    });

    fs.readFile('/proc/net/dev', function (err, data) {

        var lines = data.toString().split("\n");
        var update = [];
	var ifname = '';
        for (var i=0; i<lines.length; i++) {
            var now = lines[i].toString().split(/\s+/g);
            if (now.length>1) {
                if (now[0].indexOf('enp') == 0 || now[0].indexOf('eth') == 0 || now[0].indexOf('wlan') == 0) {
                    // bytes in
                    update.push(now[1]);
                    // bytes out
                    update.push(now[9]);
		    ifname = now[0];
		    break;
                }
            }
        }

        counterTest = jsonrrd.update(intervalSeconds, totalSteps, 'COUNTER', update, counterTest);

	fs.writeFileSync('./counterTest.db', JSON.stringify(counterTest));

	console.log('\n' + ifname + ' traffic counter, every '+intervalSeconds+' seconds');
	console.log(counterTest);
	console.log('\n\n');

    });

}

setInterval(loop,loopSeconds*1000);

loop();
