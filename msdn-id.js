var fs = require("fs"),
    http = require("http"),
    mongo = require('mongodb'),
    Server = mongo.Server,
    Db = mongo.Db;

function idIsValid(shortId) {
    return /^[a-zA-Z0-9]{8}$/.test(shortId);
}

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

var defaultHeaders = {"Content-Type": "text/plain", "Access-Control-Allow-Origin": "*"};

db.open(function(err, db) {
    if(!err) {

        http.createServer(function (req, res) {
            if(req.url === "/") {
                fs.readFile("index.html", "binary", function(err, file) {
                    res.writeHead(200, {"Content-Type": "text/html"});
                    res.write(file, "binary");
                    res.end();
                });
            } else {
                var shortId = req.url.substring(1);

                if(idIsValid(shortId)) {
                    db.collection("ids", function(err, ids) {
                        if(!err) {
                            getIDWithDB(shortId, ids, function(canonical) {
                                res.writeHead(200, defaultHeaders);
                                res.end(canonical);
                            });
                        } else {
                            console.log("MongoDB error", err);
                        }
                    });
                } else {
                    console.log("Not a valid short id - /^[a-zA-Z0-9]{8}$/ expected")
                }
            }

        }).listen(9615);

    } else {
        console.log("MongoDB error", err);
    }
});
