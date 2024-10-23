$('#data-submit').click(function() {
    var username = $('#username').val();
    var password = $('#password').val();
    
    var jsonString = {
       username:username,
       password:password
    };
    
     $.ajax({
         url: gameURL + "/home",
         type: "post", 
         data: jsonString,
         success: function(response){
            var data = JSON.parse(response)
            if(data.msg === "SUCCESS"){
                alert("Data saved!")
            } else {
                console.log(data.msg)
            }
         },
         error: function(err){
            console.log(err);
         }
     });

     return false
});
    
