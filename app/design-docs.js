var designDocs = [];
var membersDesignDoc = {
    url: '_design/members',
    body: 
    {
        version: "1.0.2",
        language: "javascript",
        views: {
            byClefId: {
                map: function (doc) {
                    if (doc.type === "member") {
                        emit(doc._id, doc);
                    }
                }
            }
        }
    }
};
designDocs.push(membersDesignDoc);


var shiftsDesignDoc = {
    url: '_design/shifts',
    body: 
    {
        version: "1.0.1",
        language: "javascript",
        views: {
            byMemberId: {
                map: function (doc) {
                    if (doc.type === "shift" && !doc.stopDate) {
                        emit(doc.memberId, doc);
                    }
                }
            }
        }
    }
};
designDocs.push(shiftsDesignDoc);


var actionsDesignDoc = {
    url: '_design/actions',
    body: 
    {
        version: "1.0.0",
        language: "javascript",
        views: {
            bySubmitDate: {
                map: function (doc) {
                    if (doc.type === "action") {
                        emit(doc.submitDate, doc);
                    }
                }
            },
            byMemberId: {
                map: function (doc) {
                    if (doc.type === "action") {
                        emit(doc.memberId, doc);
                    }
                }
            }
        }
    }
};
designDocs.push(actionsDesignDoc);


var facebookDesignDoc = {
    url: '_design/facebook',
    body: 
    {
        version: "1.0.1",
        language: "javascript",
        views: {
            tokensByUserId: {
                map: function (doc) {
                    if (doc.type === "facebook") {
                        emit([doc.userId, doc.timestamp], doc);
                    }
                }
            }
        }
    }
};
designDocs.push(facebookDesignDoc);


module.exports = designDocs;