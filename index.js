/**
 * Distributed events library
 *
 */
var uuid = require('node-uuid');

module.exports = function(pubClient, subClient){
  var channels = {};
  var _this = this;
  var _uuid = uuid();

  this.on = function(evt, handler){
    channels[evt] = channels[evt] || [];
    channels[evt].push(handler);
  }

  this.once = function(evt, handler){
    function wrapper() {
      _this.off(evt, wrapper);
      handler.apply(this, arguments);
    }
    wrapper.__handler = handler;
    return _this.on(evt, wrapper);
  }

  this.off = function(evt, handler){
    if(channels[evt]){
      var handlers = channels[evt];
      var index = findHandler(handlers, handler);
      if(index !== -1){
        handlers.splice(index, 1);
      }
      if(handlers.length === 0){
        delete channels[evt];
        subClient.unsubscribe(evt);
      }
    }
  }

  this.emit = function(evt){
    var args = Array.prototype.slice.call(arguments);
    args[0] = _uuid;

    // Emit to other nodes
    pubClient.publish(evt, JSON.stringify(args));

    // Emit to this one
    var handlers = channels[evt];
    if(handlers){
      args.shift();
      fireEvent(handlers, args);
    }
  }

  function findHandler(handlers, handler){
    for(var i=0; i<handlers.length; i++){
      var _handler = handlers[i];
      if( (_handler === handler) || (_handler.__handler == handler)){
        return i;
      }
    }
    return -1;
  }

  function fireEvent(handlers, args){
    var _handlers = [], i, len = handlers.length;

    //
    // Copy the handlers since we could remove listeners when firing
    // events.
    //
    for(i=0; i<len; i++){
      _handlers[i] = handlers[i];
    }
    for(i=0; i < len; i++) {
      _handlers[i].apply(this, args);
    }
  }

  subClient.on('message', function(channel, msg){
    var handlers = channels[channel];
    if(handlers){
      var args;
      try{
        args = JSON.parse(msg);
      }catch(err){
        console.error('Parsing event message', err);
      }

      if(args[0] !== _uuid){
        fireEvent(handlers, args);
      }
    }
  });

  return this;
}
