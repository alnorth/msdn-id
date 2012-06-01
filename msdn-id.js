var http = require("http"),
    mongo = require('mongodb'),
    Server = mongo.Server,
    Db = mongo.Db;

function getIDFromMSDN(shortId, callback) {
    http.get({"host": "msdn.microsoft.com", port: 80, path: "/en-us/library/" + shortId}, function(res) {
        var body = "";

        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function (chunk) {
            matches = body.match(/<link rel="canonical" href="http:\/\/msdn\.microsoft\.com\/en-us\/library\/([a-zA-Z0-9.]+)\.aspx" \/>/);
            try {
                callback(matches[1]);
            } catch (err) {
                console.log(err);
                callback(null);
            }
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
        callback(null);
    });
}

function getIDWithDB(shortId, db, callback) {

    getIDFromMSDN(shortId, function(canonical) {
        callback(canonical);
    });
}

var server = new Server("localhost", 27017, {auto_reconnect: true});
var db = new Db("msdn-ids", server);

db.open(function(err, db) {
    if(!err) {

        getIDWithDB("ms149618", db, function(canonical) {
            console.log(canonical);
        });

        db.close();

    } else {
        console.log("MongoDB error", err);
    }
});
