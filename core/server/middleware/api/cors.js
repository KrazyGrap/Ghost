var cors = require('cors'),
    _ = require('lodash'),
    url = require('url'),
    os = require('os'),
    utils = require('../../utils'),
    config = require('../../config'),
    whitelist = [],
    ENABLE_CORS = {origin: true, maxAge: 86400},
    DISABLE_CORS = {origin: false};

/**
 * Gather a list of local ipv4 addresses
 * @return {Array<String>}
 */
function getIPs() {
    var ifaces = os.networkInterfaces(),
        ips = [
            'localhost'
        ];

    Object.keys(ifaces).forEach(function (ifname) {
        ifaces[ifname].forEach(function (iface) {
            // only support IPv4
            if (iface.family !== 'IPv4') {
                return;
            }

            ips.push(iface.address);
        });
    });

    return ips;
}

function getUrls() {
    var urls = [url.parse(utils.url.urlFor('home', true)).hostname];

    if (config.get('urlSSL')) {
        urls.push(url.parse(config.get('urlSSL')).hostname);
    }

    return urls;
}

function getWhitelist() {
    // This needs doing just one time after init
    if (_.isEmpty(whitelist)) {
        // origins that always match: localhost, local IPs, etc.
        whitelist = whitelist.concat(getIPs());
        // Trusted urls from config.js
        whitelist = whitelist.concat(getUrls());
    }

    return whitelist;
}

/**
 * Checks the origin and enables/disables CORS headers in the response.
 * @param  {Object}   req express request object.
 * @param  {Function} cb  callback that configures CORS.
 * @return {null}
 */
function handleCORS(req, cb) {
    var origin = req.get('origin'),
        trustedDomains = req.client && req.client.trustedDomains;

    // Request must have an Origin header
    if (!origin) {
        return cb(null, DISABLE_CORS);
    }

    // Origin matches a client_trusted_domain
    if (_.some(trustedDomains, {trusted_domain: origin})) {
        return cb(null, ENABLE_CORS);
    }

    // Origin matches whitelist
    if (getWhitelist().indexOf(url.parse(origin).hostname) > -1) {
        return cb(null, ENABLE_CORS);
    }

    return cb(null, DISABLE_CORS);
}

module.exports = cors(handleCORS);
