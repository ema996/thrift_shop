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
    
    } 

})


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

async function checkUserDependingOnToken(req,res,next){
    var token = req.headers.token;

    if(!token){
        return res.status(401).json({message : "Unathorized"});
    }

    try{
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

app.post('/product', checkUserDependingOnToken, async (req,res) => {
    var product_name = req.body.product_name;
    var price = req.body.price;
    var category = req.body.category;
    var imageurl = req.body.imageurl;
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

    if(!imageurl) {
        return res.status(400).json({message : "Please enter image url"});
    }
    

    try {
        var queryResult = await client.query(queryBuilder.createProduct(),[product_name, price, category, imageurl,description,user_id]);
        console.log(queryResult.rows);

        res.status(200).json({product: queryResult.rows});
    }
    catch (err) {
        console.log(err);
        return res.status(500).json('There is an error'); 
    }
    
})


app.get('/products', async (req,res)=> {
    

    try {var result = await client.query(queryBuilder.getProducts());
    

        if(!result) {
            return res.status(500).json('There is an error');
        } 
    
        
        console.log(result.rows);
        return res.json({"Products: " : result.rows}); 
    }

    catch (err){
        console.log(err);
        return res.status(500).json('There is an error'); 
    }
    
        

})

app.get('/product/:id', async (req,res) => {
   
    var product_id = req.params.id;
    console.log(product_id);
    
    try {var result = await client.query(queryBuilder.getProductById(),[product_id]);
    

        if(!result) {
            return res.status(500).json('There is an error');
        } 
    
        
        console.log(result.rows);
        return res.json({"Product: " : result.rows[0]}); 
    }

    catch (err){
        console.log(err);
        return res.status(500).json('There is an error'); 
    }
    
        
    

})


app.get('/productsByUser', checkUserDependingOnToken, async (req,res) => {
   try {
            var user_id = res.locals.user_id;

            var queryResult = await client.query(queryBuilder.getProductsByUserId(),[user_id]);
            console.log(queryResult.rows);

            res.status(200).json({"Products" : queryResult.rows});
   }
    
   catch (err) {
    console.log(err);
    return res.status(500).json('There is an error'); 
   }

})


app.post('/order', checkUserDependingOnToken, async (req,res) => {
    try {
        var product_id = req.body.product_id;
        var user_id = res.locals.user_id;

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


    }

    catch (err) {
        console.log(err);
        res.status(500).json({message: "There is an error"});
    }

    



} )

app.get ('/orders', checkUserDependingOnToken, async (req,res) => {
    
    var user_id = res.locals.user_id;

    try {
        
        var queryResult = await client.query(queryBuilder.getOrders(), [user_id]);
        console.log(queryResult.rows);
        res.status(200).send(queryResult.rows);
    }

    catch (err) {
        console.log(err);
        res.status(500).json({message: "There is an error"})
    }
})



app.listen(80, () => {
   console.log("Listening on port 80");
} )