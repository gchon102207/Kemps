const path = require ("path");

var router = function(app){
    app.get('/', function(req, res) {
        res.status(200).sendFile(path.join(__dirname + "/../client/pages/home.html"));
    })

    app.get('/home', function(req, res) {
        res.status(200).sendFile(path.join(__dirname + "/../client/pages/home.html"));  
    })

    app.get('/signup', function(req, res) {
        res.status(200).sendFile(path.join(__dirname + "/../client/pages/signup.html"));    
    })
};
module.exports = router; 