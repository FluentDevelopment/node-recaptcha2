/*!
 * node-recaptcha2
 * Copyright(c) 2015 Timshel Knoll-Miller <timshel@fluentdevelopment.com.au>
 * Based on node-recaptcha, copyright(c) 2010 Michael Hampton <mirhampt+github@gmail.com>
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 */
var http        = require('http'),
    querystring = require('querystring'),
    Promise     = require('bluebird');

/**
 * Constants.
 */
var API_HOST      = 'www.google.com',
    API_END_POINT = '/recaptcha/api/siteverify',
    SCRIPT_SRC    = 'https://www.google.com/recaptcha/api.js',
    SIGNUP_URL    = 'https://www.google.com/recaptcha/admin';


/**
 * This is the main class, the entry point to recaptcha2. To use it, you just need to import recaptcha2:
 *
 * ```js
 * var recaptcha = require('recaptcha2');
 * var verifier = recaptcha('my_site_key');
 * ```
 *
 * @class Recaptcha
 */


/**
* Initialize Recaptcha with given `public_key`, `private_key` and optionally
* `data`.
*
* The `data` argument should have the following keys and values:
*
*   remoteip:  The IP of the client who submitted the form.
*   challenge: The value of `recaptcha_challenge_field` from the Recaptcha
*              form.
*   response:  The value of `recaptcha_response_field` from the Recaptcha
*              form.
*
* @param {String} site_key The Google Recaptcha site key.
* @param {String} secret The Google Recaptcha secret.
*
* @api public
*/
module.exports = function(site_key, secret) {
  return new Recaptcha(site_key, secret);
};

var Recaptcha = function Recaptcha(site_key, secret) {
  this.site_key = secret ? site_key : null;
  this.secret = secret || site_key;
};

/**
 * Verify the Recaptcha response.
 *
 * Example Promise usage:
 *
 *    var recaptcha = require('recaptcha');
 *    var verifier = recaptcha('SITE_KEY', 'SECRET');
 *    verifier.verify(req.body('g-recaptcha-response'), req.ip).then(function() {
 *      // recaptcha validated. Continue onward.
 *    }).catch(function(data) {
 *      // data was invalid, redisplay the form using
 *      // recaptcha.toHTML().
 *    });
 *
 * Example callback usage:
 *
 *     var recaptcha = require('recaptcha');
 *     var verifier = recaptcha('SITE_KEY', 'SECRET');
 *     verifier.verify(req.body('g-recaptcha-response'), req.ip, function(err, data) {
 *         if (!err) {
 *             // data was valid.  Continue onward.
 *         }
 *         else {
 *             // data was invalid, redisplay the form using
 *             // recaptcha.toHTML().
 *         }
 *     });
 *
 * Error codes which may be passed to the Promise's reject() method or as the "value" argument
 * of the callback
 * Local errors:
 * - verify-params-incorrect Indicates that the verify method was called with invalid parameters.
 * - missing-input-response Recaptcha response was empty.
 * - invalid-recaptcha-response Bad response from Recaptcha API.
 * - http-transport-error An error occurred while trying to communicate with the Recaptcha server.
 *
 * @param {String} response Response string from recaptcha verification.
 * @param {String} remoteip IP address of end user.
 * @param {Function} callback Callback function with (err, value).
 *
 * @return {Promise} A promise object which will resolve when the recaptcha response is validated.
 *
 * @api public
 */
Recaptcha.prototype.verify = function(response, remoteip, callback) {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (typeof(response) === 'undefined') {
      return reject('verify-params-incorrect');
    }
    if (response.length === 0) {
      return reject('missing-input-response');
    }

    var qs = querystring.stringify({
      'secret'   : self.secret,
      'remoteip' : remoteip,
      'response' : response
    });

    var req_options = {
      host   : API_HOST,
      path   : API_END_POINT + '?' + qs,
      port   : 80,
      method : 'GET'
    };

    var request = http.request(req_options, function(response) {
      var data = '';

      response.on('error', function(err) {
        reject('http-transport-error');
      });

      response.on('data', function(chunk) {
        data += chunk;
      });

      response.on('end', function() {
        var success;
        var answer = { success: false };

        try {
          answer = JSON.decode(data);
        } catch (e) {
          return reject('invalid-recaptcha-response');
        }

        success = answer.success === true;
        if (success !== 'true') {
          var error_codes = answer['error-codes'];
          error_codes = error_codes.length == 1 ? error_codes[0] : error_codes;
          reject(error_codes);
        } else {
          resolve();
        }
      });
    });

    request.end();

  })
  .asCallback(callback);
};

/**
 * Get HTML script tag to load the Recaptcha client-side script.
 *
 * @return {String} The HTML <script> tag to include the Google Recaptcha API script.
 * @api public
 */
Recaptcha.prototype.script = function() {
  return '<script src="' + SCRIPT_SRC + '" async defer></script>';
};


/**
 * Gets HTML to render the Recaptcha.
 *
 * The optional includeScript argument can specify to also return the <script> tag in the HTML. However,
 * it's best practice to place this in the <head> section of your HTML document, so this defaults to false.
 * Example usage (using handlebars/hbs):
 *
 * var recaptcha = require('recaptcha2');
 * var verifier = recaptcha('SITE_KEY', 'SECRET');
 * var hbs = require('hbs');
 *
 * var data = { recaptcha: verifier };
 * var template = hbs.compile(
 *   "<!DOCTYPE html>\n" +
 *   "<html>\n" +
 *   "  <head>\n" +
 *   "    <title>Recaptcha Test</title>\n"
 *   "    {{recaptcha.script()}\n"
 *   "  </head>\n" +
 *   "  <body>\n" +
 *   "    <form action=\"/verifycaptcha\" method=\"POST\">\n" +
 *   "      {{recaptcha.html()}}\n" +
 *   "      <input type=\"submit\" value=\"Verify Captcha\">\n" +
 *   "    </form>\n" +
 *   "  </body>\n" +
 *   "</html>\n" +
 * );
 * var html = template(data);
 *
 * @param {Boolean} includeScript Whether to include the <script> tag for the Google Recaptcha API script.
 * @return {String} The HTML to render this re
 * @api public
 */
 Recaptcha.prototype.html = function(includeScript) {
  if (!this.site_key || typeof (this.site_key) !== 'string' || this.site_key.length === 0) {
    throw new Error('Invalid site key');
  }

  includeScript = !!includeScript;
  var script = includeScript ? this.script() : '';

  return script + '<div class="g-recaptcha" data-sitekey="' + this.site_key + '"></div>';
};
