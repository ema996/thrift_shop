var express = require ('Express');
var app = express();
var pg = require('pg');
var crypto = require('crypto');
const queryBuilder = require ('./queryBuilder');
const generateToken = require('./token');

app.use(express.json());

var secretKey = 'secretKey';
const client = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    database: 'thrift_shop',
    password: 'admin',
    port: 5432,
  })
  client.connect();

 


app.post('/signup', async (req,res) => {

    var first_name = req.body.first_name;
    var last_name = req.body.last_name;
    var username = req.body.username;
    var pass = req.body.pass;
    var balance = req.body.balance;

    if(!first_name) {
        return res.status(400).json({ message : "Please enter your first_name"});
    }

    if(!last_name) {
        return res.status(400).json ({message : "Please enter your last_name"});
    }

    if(!username) {
        return res.status(400).json({message : "Please enter your username"});
    }

    if(!pass) {
        return res.status(400).json({message : "Please enter your pass"});
    }

    if(!balance) {
        return res.status(400).json({message :"Please enter your balance"});
    }

   
    try {
        var checkUser = await client.query(queryBuilder.checkIfUserExist(),[username]);
        console.log(checkUser.rowCount);

        if(checkUser.rowCount > 0) {
           return res.status(409).json({message: "User already exist."});
        }

        var hash = crypto.createHash('sha256').update(pass).digest('base64');
        var token = generateToken.generateToken ();

        var result = await client.query(queryBuilder.createUser(), [first_name, last_name, username,hash, balance,token]);
            console.log(result.rows);
            return res.status(200).json('Everything is OK');
    } catch (err) {
        console.log(err);
        return res.status(500).json('There is an error');
    
    } finally {
         await client.end();
    }

})


app.listen(80, () => {
   console.log("Listening on port 80");
} )