var path    = require('path');
var https   = require('./https-server.js');
var config  = require('./config.js');
var secrets = require('./config-secrets.js');

var stripe = require('stripe');

var bodyParser = require('body-parser');
var express = require('express');
var app = express();


app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.render('index', {
        config: {
            stripePublicKey: config.stripePublicKey
        }
    });
});

app.post('/data/subscribe', function (req, res) {
    console.log(req.body);
    res.sendStatus(200);
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, function () {
    console.log('philmanijak.com http on port 3000');
});

https(app).listen(4000, function (err) {
    if (err) {
        console.log(err);
    }
    else {
        console.log('philmanijak.com https on port 4000');
    }
});