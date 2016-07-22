'use strict';

let Trunk = require('../index');
let net = require('net');

let client = net.createConnection(32167, () => {

  let trunk = new Trunk(1, 21, 33, client);

  trunk.vlans[1].on('data', data => console.log('json received:', data.toString()));
  trunk.vlans[1].json({json: 'from client'});

  trunk.vlans[21].on('data', data => console.log('binary received:', data));
  trunk.vlans[21].write(new Buffer('FEDCBA9876543210'.split('').map(d => parseInt(d, 16))))

  trunk.vlans[33].on('data', data => console.log('33 vlan received:', data.toString()));
  trunk.vlans[33].json({message: 'json from client through VLAN 33'});

  trunk.on('vlan', id => {
    trunk.vlans[id].on('data', data => console.log(`received data from VLAN ${id}:`, data.toString()));
    trunk.vlans[id].json(`send hello from client with thanks for new VLAN ${id}`);
  });

  // create vlan whith maximum id
  trunk.add(0xffffffff);

});