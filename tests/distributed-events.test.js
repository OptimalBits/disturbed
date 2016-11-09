
var redis = require('redis');
var Promise = require('bluebird');
var expect = require('chai').expect;

Promise.promisifyAll(redis);

describe('Disturbed', function () {
  var disturbed;
  var pubClient, subClient;

  beforeEach(function () {
    disturbed = require('../index.js');
    return Promise.join(
      pubClient = redis.createClient(),
      subClient = redis.createClient()
    );
  });

  afterEach(function () {
    return Promise.join(
      pubClient.quitAsync(),
      subClient.quitAsync()
    );
  });

  it('should emit to a local listener', function (done) {
    var eventEmitter = new disturbed(pubClient, subClient)
    var counter = 0;

    eventEmitter.on('test', function (a, b, c) {
      counter++;
      expect(a).equal(1);
      expect(b).equal(2);
      expect(c).equal(3);
      expect(counter).equal(1);
      done();
    });

    eventEmitter.distEmit('test', 1, 2, 3);
  });

  it('should emit to a remote and local listener', function (done) {
    var eventEmitter1 = new disturbed(pubClient, subClient)
    var eventEmitter2 = new disturbed(pubClient, subClient)
    var counter1 = 0;
    var counter2 = 0;

    Promise.join(
      eventEmitter1.on('test', function (a, b, c) {
        counter1++;
        expect(a).equal(1);
        expect(b).equal(2);
        expect(c).equal(3);
        expect(counter1).equal(1);
      }),
      eventEmitter2.on('test', function (a, b, c) {
        counter2++;
        expect(a).equal(1);
        expect(b).equal(2);
        expect(c).equal(3);
        expect(counter2).equal(1);
        if (counter1 == 1) {
          done();
        }
      })
    ).then(function () {
      eventEmitter1.distEmit('test', 1, 2, 3);
    });
  });
  it('should stop listen to events', function (done) {
    var eventEmitter1 = new disturbed(pubClient, subClient)
    var eventEmitter2 = new disturbed(pubClient, subClient)
    var counter1 = 0;
    var counter2 = 0;

    var listener = function (a, b, c) {
      expect(true).equal(false);
    }

    eventEmitter1.on('test', listener);
    eventEmitter2.on('test', listener);

    eventEmitter1.off('test', listener);
    eventEmitter2.off('test', listener);

    eventEmitter1.distEmit('test', 1, 2, 3);

    done();
  })

})