'use strict';

var chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    expect = chai.expect,
    recaptcha = require(__dirname + "/../../lib/recaptcha2"),
    reverifier = recaptcha("foo", "bar");

chai.use(chaiAsPromised);

describe("recaptcha", function() {
  it("should return site key in HTML", function() {
    expect(reverifier.html()).to.contain('data-sitekey="foo"');
  });

  it("should return script tag in HTML when instructed", function() {
    expect(reverifier.html(true)).to.contain('<script ');
  });

  it("should return script HTML", function() {
    expect(reverifier.script()).to.contain('<script ');
  });

  it("should reject when response argument missing", function(done) {
    expect(reverifier.verify()).to.eventually.be.rejectedWith('verify-params-incorrect')
      .and.notify(done);
  });

  it("should reject when response argument empty", function(done) {
    expect(reverifier.verify('')).to.eventually.be.rejectedWith('missing-input-response')
      .and.notify(done);
  });

  it("should reject with invalid response when called with bad captcha response", function(done) {
    expect(reverifier.verify('foo')).to.eventually.be.rejectedWith('invalid-recaptcha-response')
      .and.notify(done);
  });

  it("should call error callback when response argument empty", function(done) {
    reverifier.verify("foo", "1.2.3.4", function(err, data) {
      expect(err).to.equal('invalid-recaptcha-response');
      done();
    });
  });

});
