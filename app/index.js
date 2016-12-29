var path    = require('path');
var https   = require('./https-server.js');
var config  = require('./config.js');
var secrets = require('./config-secrets.js');
var uid     = require('uid-safe');
var clef    = require('clef');

var stripe   = require('stripe')(secrets.stripePrivateKey);

var db;
var designDocs = require('./design-docs.js');
var database = require('./database.js')('morning-shift-intro', designDocs);

database.whenReady(function () {
    db = database.db;
});

var forceHttps = require('./force-https.js');
var bodyParser = require('body-parser');
var express = require('express');
var session = require('express-session');
var favicon = require('serve-favicon');
var app = express();

var httpsServer = https(app);

clef = clef.initialize({
    appID: config.clefPublicKey,
    appSecret: secrets.clefPrivateKey
});

app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'pug');

app.use(forceHttps(httpsServer));
app.use(favicon(path.join(__dirname, 'public', 'img', 'black-circle.png')));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


var getCookieSettings = function (isSecure) {
    var oneHour = 3600000;
    var oneWeek = 7 * 24 * oneHour;
    var sixWeeks = 6 * oneWeek;
    var cookieSettings = {
        path: '/',
        httpOnly: true,
        secure: secrets.sessionSecret !== "local value for dev",
        maxAge: sixWeeks
    };

    return cookieSettings;
};

// Sessions ...
app.use(session({
  secret: secrets.sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: getCookieSettings()
})); 

// Session state key for Clef
app.use(function (req, res, next) {
    var session = req.session;

    if (session.clefState) {
        return next();
    }

    session.clefState = uid.sync(32); ;
    next();
});

var getHost = function (req) {
    var host = req.get('host');
    if (httpsServer.isRunning) {
        return 'https://' + host;
    }
    else {
        return 'http://' + host;
    }
};

// Routes
app.get('/', function (req, res) {
    res.render('index', {
        host: getHost(req),
        clef: {
            publicKey: config.clefPublicKey,
            state: req.session.clefState
        },
        config: {
            // stripePublicKey: config.stripePublicKey
        }
    });
});

app.get('/clef/redirect', function (req, res) {
    var code = req.query.code;
    var state = req.query.state;

    if (!code || !state) {
        console.log("State and Code query params not provided");
        return res.sendStatus(404);
    }

    if (req.session.clefState !== state) {
        console.log("Invalid state");
        console.log("State: " + req.session.clefState)
        return res.sendStatus(404);
    }

    var clefOptions = {
        code: code
    };

    clef.getLoginInformation(clefOptions, function (err, member) {
        if (err) {
            console.log(err);
            return res.sendStatus(404);
        }

        var memberDoc = {
            _id: member.id.toString(),
            joinDate: Date.now(),
            type: 'member'
        };

        var memberFound = function (body) {
            console.log(body);
            res.redirect('/');
        };

        var nope = function (err) {
            console.log(err);
            res.sendStatus(404);
        };

        db.get(memberDoc._id, function (err, body) {
            if (err && err.statusCode === 404) {
                // New member!
                db.insert(memberDoc, function (err, body) {
                    if (err && err.statusCode === 409) {
                        // Maybe not!
                        db.get(memberDoc._id, function (err, body) {
                            if (err) {
                                return nope(err);
                            }
                            return memberFound(body);
                        });
                    }
                    else if (err) {
                        return nope(err);
                    }
                    else {
                        return memberFound(body);
                    }
                });
            }
            else {
                return memberFound(body);
            }
        });

    });
});

app.post('/api/shift/start', function (req, res) {
    var shift = {
        startDate: Date.now(),
        type: 'shift'
    };

    db.insert(shift, function (err, body) {
        if (err) {
            res.status(500);
            console.log(err);
            return;
        }

        // TODO: Don't use the doc._id
        var data = {
            shiftId: body.id,
            startDate: shift.startDate
        };

        res.status(200);
        res.send(data);
    });
});

app.put('/api/shift/stop', function (req, res) {
    var data = req.body;

    db.get(data.shiftId, function (err, body) {
        if (err || body.type !== 'shift') {
            res.sendStatus(404);
            return;
        }

        var shiftData = body;
        shiftData.stopDate = Date.now();

        db.insert(shiftData, function (err, body) {
            if (err) {
                res.sendStatus(500);
                return;
            }

            res.status(200);
            res.send('Thank you');
        })
    });
});

app.post('/data/subscribe', function (req, res) {
    var customerData = req.body;

    function processAmountEntry (customerAmountEntry) {
        switch (customerAmountEntry) {
            case 30:
                return '30-monthly';
            case 20:
                return '20-monthly';
            case 15:
                return '15-monthly';
            case 10: 
                return '10-monthly';
            case 5:
                return '5-monthly';
            default:
                return '20-monthly';
        }
    };

    function createCustomer (customer, callback) {
        var stripePlan = processAmountEntry(customer.amount);
        var juneThird  = Math.floor(new Date(2016, 5, 3) / 1000);

        var stripeRequest = {
            source: customer.stripeTokenId,
            email: customer.email,
            plan: stripePlan,
            quantity: 1,
            trial_end: juneThird
        };

        stripe.customers.create(stripeRequest, callback);
    }

    function handleCustomer (err, customer) {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }

        function handleDatabaseResponse (err, body) {
            if (err) {
                // We're in the Stripe database but 
                // not in our local CouchDB.
                console.log(err);
                res.status(500);
                res.send()
            }
            res.sendStatus(200);
        }

        var dbRecord = {
            stripeCustomerId: customer.id,
            stripePlan: processAmountEntry(customerData.amount),
            email: customer.email,
            created: Date.now(),
            type: "customer"
        };

        db.insert(dbRecord, handleDatabaseResponse);
    }

    createCustomer(customerData, handleCustomer);
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, function () {
    console.log('morning-shift-intro http on port 3000');
});

httpsServer.listen(4000, function (err) {
    if (err) {
        console.log(err);
    }
    else {
        console.log('morning-shift-intro https on port 4000');
    }
});