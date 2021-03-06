var fs = require('fs');
module.exports = function () {

    var stripeKeyPath  = '/home/ubuntu/stripe/private.key';
    var clefKeyPath    = '/home/ubuntu/config/clef/app.key';
    var sessionKeyPath = '/home/ubuntu/config/session/key';
    var slackUrlPath   = '/home/ubuntu/config/slackUrl';

    try {
        var fileReadOptions = {
            encoding: 'utf-8'
        };

        var values = {
            stripePrivateKey: "", // fs.readFileSync(stripeKeyPath, fileReadOptions).trim(),
            clefPrivateKey: fs.readFileSync(clefKeyPath, fileReadOptions).trim(),
            sessionSecret: fs.readFileSync(sessionKeyPath, fileReadOptions).trim(),
            slackUrl: fs.readFileSync(slackUrlPath, fileReadOptions).trim()
        };  
    }
    catch (err) {
        console.log(err);
        return {
            stripePrivateKey: "",
            sessionSecret: "local value for dev",
            clefPrivateKey: "",
            slackUrl: ""
        }
    }

    return values;
}();