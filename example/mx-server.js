'use strict';

let Trunk = require('../index');
let net = require('net');

// create something, wich give your a stream
let server = net.createServer(socket => {

  // create new Trunk instance, using vlans numbers and give him this stream
  let trunk = new Trunk(1, 21, 200, socket);

  // listen on data on different vlans...
  trunk.vlans[1].on('data', data => {
    console.log('binary received:', data);
  });
  // ...and write what you want to same listener on other side
  trunk.vlans[1].write(new Buffer('0123456789ABCDEF'.split('').map(d => parseInt(d, 16))))

  trunk.vlans[21].on('data', data => {
    console.log('json received on vlan 21:', data.toString());
    // ... even using syntax shugar for json data
    trunk.vlans[21].json({json: 'from server'});
  });

  // if vlan added on one side, be sure - it will be present and on other side to ...
	trunk.vlans[200].on('data', data => {
		console.log('received on VLAN 200 from client:', data.toString());
		trunk.vlans[200].write(new Buffer('++++ VLAN 200 FROM SERVER ++++'));
	});

  // ... but your need to catch it by listen missing vlan event ...
  trunk.on('vlan33', () => {
    trunk.vlans[33].on('data', data => console.log('33 vlan received:', data.toString()));
    trunk.vlans[33].json({message: 'json from server through VLAN 33'});
  });

  // ... or your can listen on event "vlan" for cathch new added vlan id
  trunk.on('vlan', id => {
    trunk.vlans[id].on('data', data => console.log(`received data from VLAN ${id}:`, data.toString()));
    trunk.vlans[id].json(`send hello from client with thanks for new VLAN ${id}`);
  });

}).listen(32167);