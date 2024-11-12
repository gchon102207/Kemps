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
        };

        try{
            //Create a connection to the database server
            const conn = await client.connect();

            //Create a database object
            const db = conn.db(DBNAME);

            //Create a connection (table) object
            const coll = db.collection('accounts')
            const existingUser = await coll.findOne({ email: data.email });
            if (existingUser) {
                await conn.close();
                return res.status(400).json({ msg: "Email already in use!" });
            }
            await coll.insertOne (data);
            await conn.close();
            return res.status(200).json({redirectUrl: "/profile"});
        } catch(err){
            await client.close();
            return res.status(201).send(JSON.stringify({msg: "Error: "+ err}))
        }
    });

    app.post('/login', async function(req, res) {
        const { email, password } = req.body;
    
        try {
            const conn = await client.connect();
            const db = conn.db(DBNAME);
            const coll = db.collection('accounts');
    
            // Find user by email
            const user = await coll.findOne({ email: email });
            if (!user) {
                await conn.close();
                return res.status(400).json({ msg: "Invalid email or password" });
            }
    
            if (user.password !== password) {
                await conn.close();
                return res.status(400).json({ msg: "Invalid email or password" });
            }
    
            // Successful login response with username and redirect URL
            await conn.close();
            return res.status(200).json({ 
                msg: "Login successful", 
                username: user.username, 
                redirectUrl: "/profile" 
            });
        } catch (err) {
            await client.close();
            return res.status(500).json({ msg: "Server error: " + err });
        }
    });
};

module.exports = services;