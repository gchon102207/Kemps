const express = require('express');
const cors = require('cors');
const path = require('path')
const bodyParser = require('body-parser');

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
})

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))
app.use("/client", express.static(path.resolve(__dirname + "/../client/")))

//Page listeners (routers)
var router = require('./router.js')
router(app);

//Service listeners (database)
var services = require('./services.js');
    services(app)
//Make our server
var server; 
var port = 5000;

server = app.listen(port, function(err){
    if (err) throw err;
    console.log("Listening on port: " + port);
})