var path    = require('path');
var https   = require('./https-server.js');
var config  = require('./config.js');
var secrets = require('./config-secrets.js');
var uid     = require('uid-safe');
var clef    = require('clef');
var fb      = require('fbgraph');
var request = require('request');

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

// Destroy sessions where people already
// signed out via Clef
app.use(function (req, res, next) {
    if (!req.session || req.session.clef == undefined) { 
        return next(); 
    }

    var destroySession = function () {
        req.session.destroy();
        res.redirect('/');
    };

    db.get(req.session.clef.id, function (err, member) {
        if (err) {
            console.log(err);
            return destroySession();
        }

        if (member.loggedOutAt > req.session.clef.loggedInAt) {
            destroySession();
        }
        else {
            next();
        }
    });
});

function getLatestShift(memberId, callback) {
    console.log('getLatestShift: ' + memberId);

    db.get(memberId, function (err, member) {
        console.log('get...');
        if (err) {
            return callback(err);
        }

        db.view('shifts', 'byMemberId', {keys: [memberId]}, function (err, body) {
            console.log('view ...');
            if (err) {
                return callback(err);
            }

            var records = body.rows;
            var mostRecentStartDate = null;
            var latestShift = null;

            for (var index in records) {
                var shift = records[index].value;
                if (!mostRecentStartDate) {
                    mostRecentStartDate = shift.startDate;
                    latestShift = shift;
                }

                if (shift.startDate > mostRecentStartDate) {
                    mostRecentStartDate = shift.startDate;
                    latestShift = shift;
                }
            }

            callback(null, latestShift);
        });

    });
}

// Save member in the session
app.use(function (req, res, next) {
    if (!req.session || req.session.clef == undefined) { 
        return next(); 
    }

    var memberId = req.session.clef.id;

    getLatestShift(memberId, function (err, shift) {
        if (err) {
            console.log(err);
            next();
        }

        req.session.member = {
            id: memberId
        };

        if (shift) {
            req.session.member.shiftStartedAt = shift.startDate;
            req.session.member.shiftId = shift._id;
        }

        next();
    });
});

var isSignedIn = function (req) {
    if (!req.session) {
        return false;
    }

    if (req.session.clef) {
        return true;
    }

    return false;
};

var getHost = function (req) {
    var host = req.get('host');
    if (httpsServer.isRunning) {
        return 'https://' + host;
    }
    else {
        return 'http://' + host;
    }
};

var getMember = function (req) {
    var member = {};
    if (req.session && req.session.member) {
        member = req.session.member;
    }
    return member;
};

// Routes
app.get('/', function (req, res) {
    var vm = {
        host: getHost(req),
        member: {},
        clef: {
            publicKey: config.clefPublicKey,
            state: req.session.clefState
        },
        config: {
            // stripePublicKey: config.stripePublicKey
        },
        facebook: {
            appId: config.facebookAppId
        }
    };

    if (isSignedIn(req)) {
        vm.isSignedIn = true;
        vm.member.shiftStartedAt = getMember(req).shiftStartedAt;
    }

    res.render('index', vm);
});

var render = function (viewPath) {
    return function (req, res) {
        var vm = {
            host: getHost(req),
            clef: {
                publicKey: config.clefPublicKey,
                state: req.session.clefState
            },
            facebook: {
                appId: config.facebookAppId
            }
        };

        if (isSignedIn(req)) {
            vm.isSignedIn = true;
        }

        res.render(viewPath, vm);
    };
};

var auth = function (req, res, next) {
    if (!isSignedIn(req)) {
        return res.send(401);
    }
    next();
};

app.get('/about', render('about'));
app.get('/about/roles', render('about-roles'));

app.get('/actions', render('actions'));

app.get('/facebook', render('facebook'));

app.get('/sad-clef', function (req, res) {
    res.render('sad-clef');
});

app.get('/clef/redirect', cleffy('/'));
app.get('/clef/redirect/actions', cleffy('/actions'));

function cleffy (route) {
    return function (req, res) {
        var code = req.query.code;
        var state = req.query.state;

        var sad = function () {
            res.redirect('/sad-clef');
        };

        if (!code || !state) {
            console.log("State and Code query params not provided");
            return sad();
        }

        if (req.session.clefState !== state) {
            console.log("Invalid state");
            console.log("State: " + req.session.clefState)
            return sad();
        }

        var clefOptions = {
            code: code
        };

        clef.getLoginInformation(clefOptions, function (err, member) {
            if (err) {
                console.log(err);
                return sad();
            }

            var memberDoc = {
                _id: member.id.toString(),
                joinDate: Date.now(),
                type: 'member'
            };

            var memberFound = function (body) {
                console.log(body);
                req.session.clef = {
                    id: memberDoc._id,
                    loggedInAt: Date.now()
                };

                startShift(req, function (err, data) {
                    if (err) {
                        console.log(err);
                        return res.sendStatus(500);
                    }

                    res.redirect(route);
                });
            };

            var nope = function (err) {
                console.log(err);
                sad();
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
                    // TODO: if (err) ....
                    return memberFound(body);
                }
            });

        });
    };
}

app.post('/clef/logout', function (req, res) {
    var opts = {
        logoutToken: req.body.logout_token
    };

    clef.getLogoutInformation(opts, function (err, clefId) {
        if (err) {
            console.log(err);
            return res.sendStatus(404);
        }

        db.get(clefId, function (err, member) {
            if (err) {
                console.log(err);
                return res.sendStatus(404);
            }

            member.loggedOutAt = Date.now();

            db.insert(member, function (err, body) {
                if (err) {
                    console.log(err);
                    return res.sendStatus(404);
                }

                res.sendStatus(200);
            });
        });
    });
});

function startShift(req, callback) {
    var shift = {
        startDate: Date.now(),
        type: 'shift'
    };

    if (req.session.shift) {
        db.get(req.session.shift.shiftId, function (err, savedShift) {
            if (err) {
                return callback(err);
            }
            ok(savedShift);
        });
    }
    else {
        ok(shift);
    }

    function ok (shift) {
        var finish = function (err, shift) {
            req.session.shift = shift;
            callback(err, shift);
        };

        var insertShift = function (shift) {
            console.log('insertShift');
            db.insert(shift, function (err, body) {
                finish(err, {
                    shiftId: body && body.id,
                    startDate: shift.startDate
                });
            });
        };

        if (isSignedIn(req)) {
            var memberId = req.session.clef.id;
            shift.memberId = req.session.clef.id;

            getLatestShift(memberId, function (err, latestShift) {
                if (err) {
                    return callback(err);
                }

                if (latestShift) {
                    if (shift.startDate < latestShift.startDate) {
                        // The session shift was already here. Use that.
                        finish(err, {
                            shiftId: shift._id,
                            startDate: shift.startDate
                        });
                    }
                    else {
                        // The db shift is older than the session shift.
                        finish(err, {
                            shiftId: latestShift._id,
                            startDate: latestShift.startDate
                        });
                    }
                }
                else {
                    // Shift not found
                    insertShift(shift);
                }
            });

        } 
        else {
            insertShift(shift);
        }
    }
}

app.get('/api/now', function (req, res) {
    // You know, for syncing clocks
    res.send(Date.now().toString());
});

app.get('/api/shift', function (req, res) {
    if (isSignedIn(req)) {
        res.send({
            id: req.session.member.shiftId,
            startDate: req.session.member.shiftStartedAt
        });
    }
    else {
        res.send(null);
    }
});

app.post('/api/shift/start', function (req, res) {
    startShift(req, function (err, data) {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }

        res.status(200);
        res.send(data);
    });
});

app.put('/api/shift/stop', function (req, res) {
    var data = req.body;

    var finish = function (message) {
        req.session.shift = null;
        res.status(200);
        res.send(message || "OK");
    };

    var stopShift = function (callback) {
        db.get(data.shiftId, function (err, body) {
            if (err || body.type !== 'shift') {
                return callback(err);
            }

            var shiftData = body;
            shiftData.stopDate = Date.now();

            db.insert(shiftData, function (err, body) {
                if (err) {
                    return callback(err);
                }
                callback(null, "Thank you");
            });
        });
    };

    if (isSignedIn(req)) {
        var memberId = req.session.clef.id;

        db.view('shifts', 'byMemberId', {keys: [memberId]}, function (err, body) {
            if (err) {
                console.log(err);
                return res.sendStatus(500);
            }

            var records = body.rows;
            var shifts = [];
            for (var index in records) {
                var shift = records[index].value;
                shift.stopDate = Date.now();
                shifts.push(shift);
            }

            db.bulk({ docs: shifts }, function (err, body) {
                if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                }

                finish();
            });
        });
    }
    else {
        stopShift(function (err, message) {
            if (err) {
                console.log(err);
                return res.sendStatus(500);
            }
            finish(message);
        })
    }
});

app.post('/api/action', function (req, res) {
    var data = req.body;

    var memberId = null;
    if (isSignedIn(req)) {
        memberId = getMember(req).id;
    }

    var action = {
        memberId: memberId,

        author: data.author,
        cause: data.cause,
        org: data.org,
        action: data.action,
        // contact: data.contact,
        anything: data.anything,

        type: "action",
        schema: "1.0.0",
        submitDate: Date.now()
    };

    for (var prop in action) {
        if (action[prop] && action[prop].trim) {
            action[prop] = action[prop].trim();
        }
    }

    db.insert(action, function (err, body) {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }

        if (secrets.slackUrl) {
            var slack = secrets.slackUrl;
            var text = 'New action entered by ' + (action.author || '(anonymous)') + ':\n';

            if (action.cause) {
                text += 'Cause: ' + action.cause + '\n';
            }

            if (action.org) {
                text += 'Organization: ' + action.org + '\n';
            }

            if (action.action) {
                text += 'Action: ' + action.action + '\n';
            }

            if (action.contact) {
                // Note: Contact info is only saved in Slack,
                // as the data in Couch is essentially public.
                text += 'Contact: ' + data.contact + '\n';
            }

            text += 'Entry: ' + action.anything; 
            sendSlackMessage(slack, formatForSlack(text));
        }


        res.sendStatus(200);
    });
});

function sendSlackMessage(slackUrl, text) {
    if (!text) {
        return;
    }

    // Fire and forget
    var options = {
        url: slackUrl,
        json: {
            mkdwn: false,
            text: text
        }
    };

    request.post(options, function (err) {
       if (err) {
        console.log(err);
       } 
    });
}

function formatForSlack(text) {
    // This is standard Slack encoding
    text = text.split('&').join('&amp;');
    text = text.split('<').join('&lt;');
    text = text.split('>').join('&gt;');
    return text;
}

app.get('/api/actions', auth, function (req, res) {
    // {keys: [memberId]}
    db.view('actions', 'bySubmitDate', function (err, body) {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }

        var val = [];

        var records = body.rows;
        var actions = [];
        for (var index in records) {
            var action = records[index].value;
            val.push({
                author: action.author,
                cause: action.cause,
                action: action.action,
                org: action.org,
    // TODO: Needs permissions: ... contact: action.contact ? "yes"
                anything: action.anything,
                submitDate: action.submitDate
            })
        }

        res.send(val);
    });
});


app.post('/api/incoming/twilio', function (req, res) {
    if (!secrets || !secrets.twilio || !secrets.twilio.slackUrl) {
        res.sendStatus(404);
        return;
    }

    var msg = req.body;
    var slackUrl = secrets.twilio.slackUrl;

    if (msg.AccountSid !== secrets.twilio.accountSid) {
        res.sendStatus(404);
        return;
    }

    if (msg.FromCountry !== 'US') {
        res.sendStatus(403);
        return;
    }

    var text = "From: " + msg.From + '\n';
    text += "Entry: " + formatForSlack(msg.Body);

    sendSlackMessage(slackUrl, text);

    var ack = "Ok!";
    var reply = "<Response><Message>" + ack + "</Message></Response>";

    res.status(200).send(reply);
});

app.get('/api/incoming/facebook', function (req, res) {
    res.send(req.query['hub.challenge']);
    console.log('Facebook GET');
    console.log(req.query);
});

app.post('/api/incoming/facebook', function (req, res) {
    res.sendStatus(200);
    console.log('Facebook POST');
    if (req.body.object !== 'user') {
        return;
    }

    var entry = req.body.entry;

    for (var index in entry) {
        var item = entry[index];
        var userId = item.id;

        if (!item.changed_fields || item.changed_fields.indexOf('statuses') < 0) {
            // We only care about status updates.
            continue;
        }
        console.log(item);

        var viewOptions = {
            startKey: [userId, {}],
            endKey: [userId],
            descending: true
        };

        db.view('facebook', 'tokensByUserId', viewOptions, function (err, body) {
            if (err) {
                console.log(err);
                return;
            }

            if (body.rows.length < 1) {
                return;
            }

            var newestIndex = 0;
            var facebookUserInfo = body.rows[newestIndex].value;
            
            var minDate = new Date(0);
            facebookUserInfo.processedUpToDate = new Date(facebookUserInfo.processedUpToDate || facebookUserInfo.timestamp);

            var token = facebookUserInfo.token;

            fb.setVersion('2.8');
            fb.setAppSecret(secrets.fb.privateKey);

            fb.get(userId + "/posts?access_token=" + token, function (err, response) {
                if (err) {
                    console.log(err);
                    return;
                }
                var posts = response.data;
                var maxDate = minDate;
                var postCount = 0;

                for (var index in posts) {
                    var post = posts[index];
                    var postDate = new Date(post.created_time);

                    if (facebookUserInfo.processedUpToDate < postDate) {
                        processFacebookPost(post, userId, token);
                        postCount++;
                    }

                    if (postDate > maxDate) {
                        maxDate = postDate;
                    }
                }

                if (maxDate > facebookUserInfo.processedUpToDate) {
                    facebookUserInfo.processedUpToDate = maxDate;
                    db.insert(facebookUserInfo, function (err, body) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                    });
                }

                console.log("Processed posts: " + postCount);

            });
        });
    }
});

function processFacebookPost(post, userId, token) {
    var validTags = {
        '#morningshift': true,
        '#fridayfund': true
    };

    var message = post && post.message;
    if (message) {
        var words = message.split(" ");
        for (var index in words) {
            var word = words[index].toLowerCase();
            if (validTags[word]) {
                sendToSlack(post, userId, token);
                return;
            }
        }
    }

    function sendToSlack(post, userId, token) {
        var message = "From: ";

        fb.get(userId + "?access_token=" + token, function (err, response) {
            message += "<https://www.facebook.com/" + userId + "|" + response.name + ">\n";
            message += "Post: " + formatForSlack(post.message);
            sendSlackMessage(secrets.fb.slackUrl, message);
        });
    }

}

app.get('/api/oauth/facebook', function (req, res) {
    console.log("Facebook Oauth");
    console.log(req.query);
    res.send(200);
});

app.post('/api/oauth/facebook/token', function (req, res) {
    var body = req.body;

    var token = {
        userId: body.userID,
        token: body.accessToken,
        tokenDuration: 'short',
        timestamp: Date.now(),
        type: 'facebook'
    };

    db.insert(token, function (err) {
        if (err) {
            return res.send(500);
        }
        res.sendStatus(200);
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