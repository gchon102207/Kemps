$('#register').click(function() {
    var email = $('#email').val();
    var username= $('#username').val();
    var password = $('#password').val();

    var jsonString = {
        email:email,
        username:username,
        password:password,
        confirmPassword:confirmPassword
    };
    
        $.ajax({
        url: gameURL + "/signup",
        type: "post", 
        data: jsonString,
        success: function(response){
            var test1 = "";
            alert(response);
        },
        error: function(err){
            var test2 = "";
            alert(err);
        }
    });
     return false
});
    