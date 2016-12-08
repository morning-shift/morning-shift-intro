// Basic https server with hard-coded paths.
//
var https = require('https');
var fs    = require('fs');

var httpsServer = undefined;

module.exports = function (app) {

    var sslKeyPath    = '/home/ubuntu/ssl/morningshift.key';
    var sslCertPath   = '/home/ubuntu/ssl/morningshift.cert';
    var sslCaPath     = '/home/ubuntu/ssl/GandiStandardSSLCA2.pem';
    var sslCaPathRoot = '/home/ubuntu/ssl/USERTrust.pem';

    try {
        var options = {
            key: fs.readFileSync(sslKeyPath),
            cert: fs.readFileSync(sslCertPath),
            ca: [
                fs.readFileSync(sslCaPath),
                fs.readFileSync(sslCaPathRoot)
            ]
        };  

        httpsServer = https.createServer(options, app);
    }
    catch (err) {
        console.log(err);
        return {
            listen: function () {
                // no op.
                console.log("No https server configured.");
            }
        }
    }
    return httpsServer;
};
