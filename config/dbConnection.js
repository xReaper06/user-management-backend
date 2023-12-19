const { DB_HOST,DB_USERNAME,DB_PASSWORD,DB_NAME } = process.env;

var mysql = require('mysql2/promise')

var conn = mysql.createPool({
    host:DB_HOST ,
    user : DB_USERNAME  ,
    password:DB_PASSWORD,
    database:DB_NAME,
    waitForConnections: true,
    connectionLimit: 10, // Adjust this limit as needed
    queueLimit: 0,
});

module.exports=conn;