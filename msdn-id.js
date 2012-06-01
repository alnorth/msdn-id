var http = require("http"),
    mongo = require('mongodb'),
    Server = mongo.Server,
    Db = mongo.Db;

function getIDFromMSDN(shortId, callback) {
    http.get({"host": "msdn.microsoft.com", port: 80, path: "/en-us/library/" + shortId}, function(res) {
        if(res.statusCode == 200) {
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
        } else {
            callback(null);
        }
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
        callback(null);
    });
}

function getIDWithDB(shortId, ids, callback) {
    ids.findOne({"short_id": shortId}, function(err, item) {
        if(item) {
            callback(item.canonical);
        } else {
            getIDFromMSDN(shortId, function(canonical) {
                if(canonical) {
                    ids.insert({"short_id": shortId, "canonical": canonical});
                }
                callback(canonical);
            });
        }
    });
}

var server = new Server("localhost", 27017, {auto_reconnect: true});
var db = new Db("msdn-ids", server);

db.open(function(err, db) {
    if(!err) {

        db.collection("ids", function(err, ids) {
            if(!err) {
                getIDWithDB("8hftfeyw", ids, function(canonical) {
                    console.log(canonical);
                    db.close();
                });
            } else {
                console.log("MongoDB error", err);
            }
        });

    } else {
        console.log("MongoDB error", err);
    }
});
