var designDocs = [];
var membersDesignDoc = {
    url: '_design/members',
    body: 
    {
        version: "1.0.1",
        language: "javascript",
        views: {
            byClefId: {
                map: function (doc) {
                    if (doc.type === "member") {
                        emit(doc.clefId, doc);
                    }
                }
            }
        }
    }
};
designDocs.push(membersDesignDoc);

module.exports = designDocs;