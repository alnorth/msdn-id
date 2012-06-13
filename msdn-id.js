var fs = require("fs"),
    http = require("http"),
    url = require("url"),
    mongo = require("mongodb"),
    $ = require("jquery"),
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
                matches = body.match(/<link rel="canonical" href="http:\/\/msdn\.microsoft\.com\/en-us\/library\/([a-zA-Z0-9.]+)(?:_[a-z]+)?(?:\(v=vs\.\d+\))?\.aspx" \/>/);
                try {
                    if(matches) {
                        var canonical = matches[1],
                            parentId;
                        if(canonical === shortId) {
                            // This page only has a short ID to identify it. We will recurse up the tree to see if a page further up has a canonical ID.
                            var parentPath = $(body).find(".nav_div_currentroot:last").children("a").attr("href");
                            if(parentPath) {
                                var parentMatches = parentPath.match(/^\/en-us\/library\/([a-zA-Z0-9.]+)(?:_[a-z]+)?(?:\(v=vs\.\d+\))?/);
                                if(parentMatches) {
                                    parentId = parentMatches[1];
                                }
                            }
                        }
                        callback(canonical, parentId);
                    } else {
                        console.log("No canonical URL found for " + shortId);
                        callback(null, null);
                    }
                } catch (err) {
                    console.log(err);
                    callback(null, null);
                }
            });
        } else {
            callback(null, null);
        }
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
        callback(null, null);
    });
}

function getIDWithDB(shortId, ids, callback) {
    ids.findOne({"short_id": shortId}, function(err, item) {
        if(item) {
            callback(item.canonical);
        } else {
            getIDFromMSDN(shortId, function(canonical, parentShortId) {
                if(canonical) {
                    ids.insert({"short_id": shortId, "canonical": canonical});
                }
                if(canonical === shortId && parentShortId) {
                    // Go up the tree in search of a canonical ID.
                    getIDWithDB(parentShortId, ids, callback);
                } else {
                    callback(canonical);
                }
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
                                returnCanonical(idIsValid(canonical) ? null : canonical, req, res);
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
