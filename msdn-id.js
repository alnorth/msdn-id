var http = require("http");

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

getIDFromMSDN("ms149618", function(canonical) {
    console.log(canonical);
});
