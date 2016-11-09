/**
 * Distributed events library
 */
var uuid = require('node-uuid');
var util = require('util');
var EventEmitter = require('events');

var Emitter = function(pubClient, subClient){
  var _this = this;
  EventEmitter.call(this);

  this.uuid = uuid();
  this.pubClient = pubClient;
  this.subClient = subClient;

  subClient.on('message', function(channel, msg){

    var count = _this.listenerCount(channel);
    if(count){
      var args;
      try{
        args = JSON.parse(msg);
      }catch(err){
        console.error('Parsing event message', err);
      }

      if(args[0] !== _this.uuid){
        args[0] = channel;
        _this.emit.apply(_this, args);
      }
    }
  });
}

util.inherits(Emitter, EventEmitter);

Emitter.prototype.on = function(){
  var _this = this;
  var args = Array.prototype.slice.call(arguments);
  EventEmitter.prototype.on.apply(this, args);

  return new Promise(function(resolve, reject){
    _this.subClient.subscribe(args[0], function(err){
      if(err){
        reject(err);
      }else{
        resolve();
      }
    });
  })
}

Emitter.prototype.distEmit = function(evt){
  var _this = this;
  var args = Array.prototype.slice.call(arguments);
  this.emit.apply(this, args);

  args[0] = this.uuid;

  // Emit to other nodes
  return new Promise(function(resolve, reject){
    _this.pubClient.publish(evt, JSON.stringify(args), function(err){
      if(err){
        reject(err);
      }else{
        resolve();
      }
    });
  });
}

Emitter.prototype.off = Emitter.prototype.removeListener = function(evt){
  var _this = this;
  var args = Array.prototype.slice.call(arguments);
  EventEmitter.prototype.removeListener.apply(this, args);

  if(!_this.listenerCount(evt)){
    _this.subClient.unsubscribe(evt);
  }
}

module.exports = Emitter;

