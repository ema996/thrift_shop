var secretKey = 'secretKey';
var randomstring = require("randomstring");
const encode = require('nodejs-base64-encode');
var crypto = require('crypto');

function generateToken(username) {
    var generatedRandomString = randomstring.generate(10);
    var timestampNOW = Date.now();
    var tokenString = username + '|' + generatedRandomString+ '|' + timestampNOW+ '|' + secretKey;
    var hashTokenString = crypto.createHash('sha256').update(tokenString).digest('base64');
    var tokenString2 = username + '|' + generatedRandomString+ '|' + timestampNOW+ '|' + hashTokenString;
    var finalToken = encode.encode(tokenString2, 'base64');

    return finalToken;
}

module.exports = {
    generateToken
}