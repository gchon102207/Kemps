const path = require ("path");

var router = function(app){
    app.get('/', function(req, res) {
        res.status(200).sendFile(path.join(__dirname + "/../client/home.html"));
    })

    app.get('/home', function(req, res) {
        res.status(200).sendFile(path.join(__dirname + "/../client/home.html"));  
    })

    app.get('/signup', function(req, res) {
        res.status(200).sendFile(path.join(__dirname + "/../client/signup.html"));    
    })

    app.get('/profile', function(req, res) {
        res.status(200).sendFile(path.join(__dirname + "/../client/profile.html"));    
    })

    app.get('/lobby', function(req, res) {
        res.status(200).sendFile(path.join(__dirname + "/../client/lobby.html"));    
    })

    app.get('/game', function(req, res) {
        res.status(200).sendFile(path.join(__dirname + "/../client/game.html"));    
    })

    app.get('/assets', function(req, res) {
        res.status(200).sendFile(path.join(__dirname + "/../client/assets"));    
    })
};
module.exports = router; 