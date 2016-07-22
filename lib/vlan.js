'use strict';

let util = require('util');
let stream = require('stream');

util.inherits(Vlan, stream.Duplex);
function Vlan(options){
	stream.Duplex.call(this, options);
	this.peerPaused = false;
	this.buffer = [];
	this.stoped = false;
	this.id = options.id;
	this.trunk = options.trunk;
	this.trunk.on('end', () => this.push(null));
	this.trunk.on('drain', () => this.readable && this.resume && this.resume());
	this.trunk.on('close', error => this.emit('close', error));
	this.trunk.on('error', error => this.emit('error', error));
};

Vlan.prototype.up = function(){ this.resume(); }
Vlan.prototype.down = function(){ if(!this.id === 0) this.pause(); }

Vlan.prototype._read = function(size){
	if(this.peerPaused){
		this.trunk.mvlan.json({run: 'up', id: this.id});
		this.peerPaused = false;
	}
};

Vlan.prototype.json = function(json){
	this.write(new Buffer(JSON.stringify(json)));
}

Vlan.prototype.write = function(chunk){
	return this._write(chunk);
};

Vlan.prototype._write = function(chunk) {
	if (this.trunk && this.trunk.writable) {
		let header = new Buffer(8);
		header.writeInt32LE(this.id, 0);
		header.writeInt32LE(chunk.length, 4);
		if(typeof chunk === 'string') chunk = new Buffer(header.toString + new Buffer(chunk));
		else if(chunk instanceof Buffer) chunk = Buffer.concat([header, chunk], header.length + chunk.length);
		let write = this.trunk.write(chunk);
		if (!write) this.pause && this.pause();
		return write;
	}
};

module.exports = Vlan;
