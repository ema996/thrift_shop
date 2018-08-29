// Insert new user in the database.
function createUser () {
    return `INSERT INTO T_USER (first_name, last_name, username, pass, balance,token)
            VALUES ($1, $2, $3, $4, $5, $6)`;
}

// TODO: Write comments for each function.
function checkIfUserExist() {
    return `SELECT * FROM T_USER WHERE username=$1`;
}

function checkUsernameAndPass() {
    return `SELECT token FROM T_USER WHERE username=$1 AND pass=$2`;
}

function findUserByToken () {
    return `SELECT user_id FROM T_USER WHERE token = $1`;
}

function createProduct(){ 
    return `INSERT INTO T_PRODUCT (product_name, price, category, imageurl,description,user_id,available)
    VALUES ($1, $2, $3, $4, $5, $6, true) returning *` };


function getProducts (){
    return `SELECT product_name, user_id,price, category, imageurl
    FROM T_PRODUCT` ;
}

function getProductById() {
    return `SELECT * FROM T_PRODUCT WHERE product_id = $1`;
}


function getProductsByUserId(){
    return `SELECT * FROM T_PRODUCT WHERE user_id = $1`;
}


function checkingPriceAndOwnerId(){
return `SELECT price, user_id 
        FROM T_PRODUCT
        WHERE product_id = $1 AND available=true`
}

function checkBalance() {
    return `SELECT balance
            FROM T_USER 
            WHERE user_id = $1 `
}

function createOrder() {
    return `WITH sub_balance AS (
        UPDATE T_USER
         SET balance = balance - $1
         WHERE user_id = $2
      ), add_balance AS (
         UPDATE T_USER
         SET balance = balance + $1
         WHERE user_id = $3
      ), not_available AS (
          UPDATE T_PRODUCT
          SET available = false
          WHERE product_id = $4
      )
        INSERT INTO T_ORDER (user_id, product_id)
        VALUES ($2,$4)
        returning *;
    `
}

function getOrders () {
    return `
        SELECT * 
        FROM T_ORDER
        WHERE user_id = $1
    `
}

function checkOldPassword(){
    return `
        SELECT pass FROM T_USER WHERE user_id=$1
    `
} 


function setNewPassword() {
    return `
        UPDATE T_USER 
        SET pass = $1 
        WHERE user_id = $2;
  `
}


 module.exports = {  
    createUser,
    checkIfUserExist,
    checkUsernameAndPass,
    findUserByToken,
    createProduct,
    getProducts,
    getProductById,
    getProductsByUserId,
    checkingPriceAndOwnerId,
    checkBalance,
    createOrder,
    getOrders,
    checkOldPassword,
    setNewPassword
}