const MongoClient = require("mongodb").MongoClient;
const ObjectId = require('mongodb').ObjectId;
const DBNAME = 'kemps';
const dbURL = process.env.DB_URI || "mongodb://127.0.0.1"

const client = new MongoClient(dbURL);

var services = function(app){
    app.post('/signup', async function(req,res){
        var data = {
            email: req.body.email,
            username: req.body.username,
            password: req.body.password,
            confirmPassword: req.body.confirmPassword

        };

        try{
            //Create a connection to the database server
            const conn = await client.connect();

            //Create a database object
            const db = conn.db(DBNAME);

            //Create a connection (table) object
            const coll = db.collection('accounts')
            await coll.insertOne (data);
            await conn.close();
            return res.status(200).send(JSON.stringify({msg: "SUCCESS"}))
        } catch(err){
            await client.close();
            return res.status(201).send(JSON.stringify({msg: "Error: "+ err}))
        }
    });
};

module.exports = services;