'use strict';

let Trunk = require('./trunk');
let net = require('net');

let server = net.createServer(socket => {

	let trunk = new Trunk(1, 21, 200, socket);

	trunk.vlans[1].on('data', data => {
		console.log('json received:', data.toString());
	});
	trunk.vlans[1].write(new Buffer(JSON.stringify({json: 'from server'})));

	trunk.vlans[21].on('data', data => {
		console.log('binary received:', data);
		trunk.vlans[21].write(new Buffer('0123456789ABCDEF'.split('').map(d => parseInt(d, 16))))
	});

	trunk.vlans[200].on('data', data => {
		console.log('received on VLAN 200 from client:', data.toString());
		trunk.vlans[200].write(new Buffer('++++ VLAN 200 FROM SERVER ++++'));
	});

	trunk.on('vlan33', () => {
		trunk.vlans[33].on('data', data => console.log('33 vlan received:', data.toString()));
		trunk.vlans[33].json({message: 'json from server through VLAN 33'});
	});

	trunk.on('vlan', id => {
		trunk.vlans[id].on('data', data => console.log(`received data from VLAN ${id}:`, data.toString()));
		trunk.vlans[id].json(`send hello from client with thanks for new VLAN ${id}`);
	});

}).listen(32167);