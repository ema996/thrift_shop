var express = require ('Express');
var app = express();
var pg = require('pg');

const client = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    database: 'thrift_shop',
    password: 'admin',
    port: 5432,
  })

  
async function funkcija () {
    
     await client.connect()
try {
    var result = await client.query('SELECT * FROM T_USER');
    console.log(result.rows[0]);
} catch (err) {
console.log('There is an error');
} finally {
await client.end();
} }

funkcija();



app.listen(80, () => {
   console.log("Listening on port 80");
} )