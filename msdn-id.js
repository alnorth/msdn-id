var fs = require("fs"),
    http = require("http"),
    url = require("url"),
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

function returnCanonical(canonical, req, res) {
    var urlParts = url.parse(req.url, true),
        requestCode = canonical ? 200 : 404;

    if(urlParts.query.callback) {
        res.writeHead(requestCode, {"Content-Type": "text/javascript"});
        res.end(urlParts.query.callback + "(" + JSON.stringify(canonical) + ");");
    } else {
        res.writeHead(requestCode, {"Content-Type": "text/plain", "Access-Control-Allow-Origin": "*"});
        res.end(canonical);
    }
}

var server = new Server("localhost", 27017, {auto_reconnect: true});
var db = new Db("msdn-ids", server);

var port = process.argv[2] || 8000;

db.open(function(err, db) {
    if(!err) {

        http.createServer(function (req, res) {
            if(req.url === "/") {
                fs.readFile(__dirname + "/index.html", "binary", function(err, file) {
                    res.writeHead(200, {"Content-Type": "text/html"});
                    res.write(file, "binary");
                    res.end();
                });
            } else if(req.url === "/favicon.ico") {
                res.writeHead(404);
                res.end();
            } else {
                var shortId = url.parse(req.url, true).pathname.substring(1);

                if(idIsValid(shortId)) {
                    db.collection("ids", function(err, ids) {
                        if(!err) {
                            getIDWithDB(shortId, ids, function(canonical) {
                                returnCanonical(canonical === shortId ? null : canonical, req, res);
                            });
                        } else {
                            returnCanonical(null, req, res);
                            console.log("MongoDB error", err);
                        }
                    });
                } else {
                    returnCanonical(null, req, res);
                    console.log("Not a valid short id - /^[a-zA-Z0-9]{8}$/ expected")
                }
            }

        }).listen(port);

    } else {
        console.log("MongoDB error", err);
    }
});
