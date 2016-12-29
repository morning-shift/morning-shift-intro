var nano = require('nano');

var designDocsSaver = require('./design-docs-saver.js');

module.exports = function (databaseName, designDocs) {
    var databaseUrl = 'http://localhost:5984';

    // Connect to Couch! 
    var database, nanoMaster;
    var databaseOptions = {};
    databaseOptions.url = databaseUrl;
    var nanoMaster = nano(databaseOptions);
    var database = {}; 
    var isDatabaseReady = false;

    var databaseExists = function (callback) {
        var opts = {
            db: databaseName,
            method: "GET"
        };

        nanoMaster.relax(opts, function (err, body) {
            if (err && err.statusCode === 404) {
                callback(null, false);
            }
            else if (err) {
                callback(err);
            }
            else {
                callback(null, true);
            }
        });
    };

    var createDatabase = function (callback) {
        var opts = {
            db: databaseName,
            method: "PUT"
        };

        nanoMaster.relax(opts, callback);
    };

    var maybeCreateDatabase = function(callback) {
        // Create database!
        databaseExists(function (err, exists) {
            if (err) {
                callback(err);
                return;
            }

            if (exists) {
                callback();
                return;
            }

            createDatabase(callback);
        });
    };

    var whenDatabaseReady = function (callback, timeout) {
        var timeSpent = 0;
        var intervalId = setInterval(function () {
            if (isDatabaseReady) {
                clearInterval(intervalId);
                callback();
            }

            if (timeout && timeSpent > timeout) {
                clearInterval(intervalId);
                callback("Reached timeout before database was ready.")
            }

            timeSpent += 100;
        }, 100);
    };

    var compact = function () {
        nanoMaster.db.compact(databaseName);
    };

    // TODO: Note, this causes the database to be
    // created immediately, which we might not want
    // to necessarily do.
    maybeCreateDatabase(function (err) {
        if (err) {
            if (err.code === 'ECONNREFUSED') {
                console.log("Local-database: Could not connect to CouchDB.");
                console.log("Local-database: Is CouchDB running?");
            }
            else {
                console.log("Local-database: Could not create the database.");
            }
            console.log("Local-database: Here is the error: ");
            console.log(err);
            
            // Kill the server.
            console.log("Local-database: Shutting down this program.");
            throw (err);
        }
        else {
            // database ready.
            database.db = nanoMaster.use(databaseName);
            designDocsSaver.create(database.db, designDocs, function (err) {
                if (err) {
                    console.log("Failed to update design docs. Shutting down.");
                    console.log(err);
                    throw (err);
                }

                isDatabaseReady = true;
            });
        }
    });

    database.whenReady = whenDatabaseReady;
    database.compact = compact;

    return database;
};