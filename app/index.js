var path    = require('path');
var https   = require('./https-server.js');
var config  = require('./config.js');
var secrets = require('./config-secrets.js');

var stripe   = require('stripe')(secrets.stripePrivateKey);

var db;
var database = require('./database.js')('morning-shift-intro');

database.whenReady(function () {
    db = database.db;
});

var forceHttps = require('./force-https.js');
var bodyParser = require('body-parser');
var express = require('express');
var favicon = require('serve-favicon');
var app = express();

var httpsServer = https(app);

app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'pug');

// app.use(forceHttps(httpsServer));
app.use(favicon(path.join(__dirname, 'public', 'img', 'black-circle.png')));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.render('index', {
        config: {
            // stripePublicKey: config.stripePublicKey
        }
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