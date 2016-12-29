var guard = require('@holmwell/errors').guard;

module.exports = function () {

	var saveDesignDocs = function (database, designDocs, callback) {
		var isReady = {};

		var maybeReady = function (designDoc) {
			var areAllDocsReady = true;

			isReady[designDoc.url] = true;
			designDocs.forEach(function (doc) {
				if (!isReady[doc.url]) {
					areAllDocsReady = false;
				}
			});

			if (areAllDocsReady) {
				callback();
			}
		};

		var saveDoc = function (doc) {
			database.insert(doc.body, doc.url, function (err, body) {
				if (err && err.statusCode === 409) {
					// document conflict (always happens if doc exists)
					database.get(doc.url, guard(callback, function (body) {
						doc.body._id = body._id;
						doc.body._rev = body._rev;
						saveDoc(doc);
					}));
				}
				else if (err) {
					callback(err);
				}
				else {
					maybeReady(doc);
				}
			});
		};

		// Save our design doc if it doesn't exist or if
		// the version in the database is different from
		// the one we have in the code.
		designDocs.forEach(function (doc) {
			database.get(doc.url, function (err, body) {
				if (err && err.statusCode === 404) {
					saveDoc(doc);
				}
				else if (err) {
					callback(err);
				}
				else {
					if (body.version === doc.body.version) {
						// Up to date.
						maybeReady(doc);
					}
					else {
						saveDoc(doc);
					}
				}
			});
		});
	};

	return {
		saveToDatabase: saveDesignDocs,
		create: saveDesignDocs
	};
}();