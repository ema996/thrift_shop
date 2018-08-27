require('dotenv').config();
const express = require ('Express');
const app = express();
const pg = require('pg');
const crypto = require('crypto');
const queryBuilder = require ('./queryBuilder');
const generateToken = require('./token');
const AWS = require('aws-sdk');
const fileUpload = require('express-fileupload');
app.use(express.json());
app.use(fileUpload());
var secretKey = 'secretKey';

//Connection with database
const client = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
})


client.connect();
var s3 = new AWS.S3({region: process.env.REGION});

//Endpoint for creating (registering) new user
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
    } 
})

//Endpoint for loging
app.post('/login', async(req,res) => {
    var username = req.body.username;
    var pass = req.body.pass;

    if(!username) {
        return res.status(400).json({message : "Please enter your username"});
    }

    if(!pass) {
        return res.status(400).json({message : "Please enter your pass"});
    }

    try {
        var hash = crypto.createHash('sha256').update(pass).digest('base64');
        var checkUsernameAndPass = await client.query(queryBuilder.checkUsernameAndPass(),[username,hash]);
        console.log(checkUsernameAndPass.rowCount);

        if(checkUsernameAndPass.rowCount == 0) {
            return res.status(404).json({message: "User not found"});
        }

        console.log(checkUsernameAndPass.rows);
        return res.status(200).json({token: checkUsernameAndPass.rows[0].token});
    } catch (err) {
        console.log(err);
        return res.status(500).json('There is an error');
    } 
})

//Middleware function for validating user
async function checkUserDependingOnToken(req,res,next){
    var token = req.headers.token;

    if(!token){
        return res.status(401).json({message : "Unathorized"});
    }

    try {
        var result = await client.query(queryBuilder.findUserByToken(),[token]);
        console.log(result.rows);
        
        if(result.rowCount==0){
            return res.status(401).json({message: "Unathorized"});
        }
        
        var user_id = result.rows[0].user_id;
        res.locals.user_id = user_id;
        return next();

    }
    catch(err){
        console.log(err);
        return res.status(500).json('There is an error');
    } 
}

async function putObjectAsync(params){
    return new Promise(function(resolve,reject){
        s3.putObject(params, function(err,data) {
            if(err){
                console.log('Error uploading data', err);
                reject(err);
            } else{
                console.log('Successfully uploaded data', data);
                resolve(data);
            }
        });
    });
}

//Endpoint for creating new product
app.post('/product', checkUserDependingOnToken, async (req,res) => {
    var sampleFile = req.files.image;
    var product_name = req.body.product_name;
    var price = req.body.price;
    var category = req.body.category;
    var description = req.body.description;
    var user_id = res.locals.user_id;

    if(!product_name) {
        return res.status(400).json({message : "Please enter e product name"});
    }

    if(!price) {
        return res.status(400).json({message : "Please enter a price"});
    }

    if(!category) {
        return res.status(400).json({message : "Please enter a category"});
    }

    if (!req.files){ 
        return res.status(400).send('No files were uploaded.')
    }

    try {
        var myBucket = 'products.images';
      
        var arraySplitImageName = sampleFile.name.split(".");
        var keyName = user_id+'/'+arraySplitImageName[0]+ '_'+ Date.now() +'.' +arraySplitImageName[1];
        var params = {
            Bucket: myBucket,
            Key: keyName,
            Body: sampleFile.data
        };
        console.log(sampleFile.data);
        var result = await putObjectAsync(params);
        var imageUrl = 'https://s3.eu-central-1.amazonaws.com/products.images/'+keyName;
        var queryResult = await client.query(queryBuilder.createProduct(),[product_name, price, category,imageUrl,description,user_id]);
        console.log(queryResult.rows);
        res.status(200).json({product: queryResult.rows});
    }
    catch (err) {
        console.log(err);
        return res.status(500).json('There is an error'); 
    }
    
})

//Endpoint getting all products
app.get('/products', async (req,res)=> {
    try {
        var result = await client.query(queryBuilder.getProducts());
    
        if(!result) {
            return res.status(500).json('There is an error');
        } 
    
        console.log(result.rows);
        return res.json({"Products: " : result.rows}); 
    } catch (err){
        console.log(err);
        return res.status(500).json('There is an error'); 
    }
})

//Endpoint for getting one certain product using its id
app.get('/product/:id', async (req,res) => {
    var product_id = req.params.id;
    console.log(product_id);
    try {
        var result = await client.query(queryBuilder.getProductById(),[product_id]);

        if(!result) {
            return res.status(500).json('There is an error');
        }

        console.log(result.rows);
        return res.json({"Product: " : result.rows[0]}); 
    } catch (err){
        console.log(err);
        return res.status(500).json('There is an error'); 
    }
})

//Endpoint for getting products that a certain user owns
app.get('/productsByUser', checkUserDependingOnToken, async (req,res) => {
   try {
        var user_id = res.locals.user_id;
        var queryResult = await client.query(queryBuilder.getProductsByUserId(),[user_id]);
        console.log(queryResult.rows);
        res.status(200).json({"Products" : queryResult.rows});
   } catch (err) {
        console.log(err);
        return res.status(500).json('There is an error'); 
   }
})

//Endpoint for creating order
app.post('/order', checkUserDependingOnToken, async (req,res) => {
    try {
        var product_id = req.body.product_id;
        console.log(product_id);
        var user_id = res.locals.user_id;
        console.log(user_id);

        if(!product_id) {
            return res.status(400).json({message: "Please choose some item"});
        }

        var balanceQuery = await client.query(queryBuilder.checkBalance(), [user_id]);
        var balance = balanceQuery.rows[0].balance;
        console.log('Balance is '+balance);
        var priceAndOwnerIdQuery = await client.query(queryBuilder.checkingPriceAndOwnerId(), [product_id]);
        
        if(priceAndOwnerIdQuery.rowCount == 0){
            console.log('Sth going wrong');
            return res.status(409).json({message : "Product is not available"});
        }

        console.log(priceAndOwnerIdQuery.rows[0]);
        var price = priceAndOwnerIdQuery.rows[0].price;
        var ownerId = priceAndOwnerIdQuery.rows[0].user_id;
        var orderQuery = await client.query(queryBuilder.createOrder(), [price, user_id, ownerId, product_id]);
        console.log(orderQuery.rows);
        return res.status(200).send(orderQuery.rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({message: "There is an error"});
    }
})

//Endpoint for getting all orders
app.get ('/orders', checkUserDependingOnToken, async (req,res) => {
    var user_id = res.locals.user_id;
    try {
        var queryResult = await client.query(queryBuilder.getOrders(), [user_id]);
        console.log(queryResult.rows);
        res.status(200).send(queryResult.rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({message: "There is an error"})
    }
})

app.listen(80, () => {
   console.log("Listening on port 80");
});