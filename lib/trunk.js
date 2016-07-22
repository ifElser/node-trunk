'use strict';

let EE = require('events').EventEmitter;
let util = require('util');
let stream = require('stream');
let Vlan = require('./vlan');

util.inherits(Trunk, EE);
function Trunk(){
	EE.call(this);
	this.vlans = {};
	this.last = 0;
	this.connected = false;
	Array.prototype.forEach.call(arguments, arg => {
		if(!isNaN(arg) && Number(arg) !== 0) this.vlans[arg] = null;
		else if(arg instanceof stream.Duplex) this.trunk(arg);
	});
};

Trunk.prototype.del = function(id){
	if(id !== 0 && this.vlans[id]) delete this.vlans[id];
	this.emit('remove', id);
};

Trunk.prototype.add = function(id){
	if(id >= this.last) this.last = id + 1;
	id = Number(isNaN(id) ? this.last : id);
	if(this.vlans[id] instanceof Vlan) return;
	this.vlans[id] = new Vlan({id: id, trunk: this.trunk});
	this.vlans[id].on('close', error => this.mvlan.json({run: 'del', id: id, err: error}));
	this.vlans[id].on('error', error => this.mvlan.json({run: 'del', id: id, err: error.message}));
	if(id !== 0) this.mvlan.json({run: 'add', id: id});
	this.emit('vlan', id);
	this.emit('vlan' + id);
	return this.vlans[id];
};

Trunk.prototype.trunk = function(trunk){

	this.trunk = trunk;

	let isChunk = false,
		chunkSize = 0,
		chunkId = 0,
		buffer = new Buffer(0);

	trunk.on('data', data => {
		let chunk;
		if(data.length) while(true) if(isChunk){
			if(data.length >= chunkSize - buffer.length){
				chunk = Buffer.concat([buffer, data.slice(0, chunkSize - buffer.length)], chunkSize);
				if(!this.vlans[chunkId].push(chunk)) {
					this.mvlan.json({run:'down', id: chunkId});
					this.vlans[chunkId].peerPaused = true;
				}
				data = data.slice(chunkSize - buffer.length);
				buffer = new Buffer(0)
				isChunk = false;
				continue;
			} else {
				buffer = Buffer.concat([buffer, data], buffer.length + data.length);
				break;
			};
		} else {
			if(data.length >= 8 - buffer.length){
				chunkId = data.readInt32LE(0);
				chunkSize = data.readInt32LE(4);
				data = data.slice(8);
				buffer = new Buffer(0);
				isChunk = true;
				continue;
			} else {
				buffer = Buffer.concat([buffer, data], buffer.length + data.length);
				break;
			};
		}
	});

	this.mvlan = this.add(0);

	this.mvlan.on('data', data => {
		data = JSON.parse(data.toString());
		({
			up   : data => {this.vlans[data.id] && this.vlans[data.id].up()},
			down : data => {this.vlans[data.id] && this.vlans[data.id].down()},
			add  : data => {this.add(data.id)},
			del  : data => {this.del(data.id)},
			hi   : data => {data.ids.forEach(id => this.add(id))}
		}[data.run] || (d => d))(data);
	});

	this.trunk.mvlan = this.mvlan;

	Object.keys(this.vlans).forEach(id => this.add(id));
	if(!this.connected){
		this.mvlan.json({run: 'hi', ids: Object.keys(this.vlans)});
		this.connected = true;
	}

}

module.exports = Trunk;
