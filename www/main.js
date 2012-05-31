function checkConnection() {
    var networkState = navigator.network.connection.type;

    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.NONE]     = 'No network connection';

    if (states[networkState] === 'No network connection') {
        alert('No network connection detected. Check settings.');
    } else {
        alert('Connection type: ' + states[networkState]);
    }
}


// If you want to prevent dragging, uncomment this section
/*
function preventBehavior(e) 
{ 
  e.preventDefault(); 
};
document.addEventListener("touchmove", preventBehavior, false);
*/

/* If you are supporting your own protocol, the var invokeString will contain any arguments to the app launch.
see http://iphonedevelopertips.com/cocoa/launching-your-own-application-via-a-custom-url-scheme.html
for more details -jm */
/*
function handleOpenURL(url)
{
	// TODO: do something with the url passed in.
}
*/

function onBodyLoad()
{		
	document.addEventListener("deviceready", onDeviceReady, false);
}

/* When this function is called, Cordova has been initialized and is ready to roll */
/* If you are supporting your own protocol, the var invokeString will contain any arguments to the app launch.
see http://iphonedevelopertips.com/cocoa/launching-your-own-application-via-a-custom-url-scheme.html
for more details -jm */
function onDeviceReady()
{
}

var facebookLocalStoreKey = 'kFacebook';

var tumblr = Tumblr ({
	consumerKey: 'uG60oKZL3NYUBehVoQLTJeUSx8UEANcitK0ImwYXu7sLaZi2J0',
	consumerSecret: 'z27WBgDb9s43P3JVS6fTFIzYefUAkO9cRKpQpnuKyiDya4l8aU',
	callbackUrl: 'http://huntforjoy.cybersoft.com.sg/'
});

var linkedin = Linkedin ({
	consumerKey: 'ui6vccbhw7a8',
	consumerSecret: 'FpJXiVIq3FsdFStp',
	callbackUrl: 'http://huntforjoy.cybersoft.com.sg/'
});

var twitter = Twitter ({
	consumerKey: 'RuqNilzB8cGmIG0DkN607A',
	consumerSecret: 'cCec2ypBCVggj5gAjjId37CbuUlQC4k37HZIfXpsmU',
	callbackUrl: 'http://huntforjoy.cybersoft.com.sg/'
});


var foursquare = Foursquare ({
	clientId: 'B2GCD2L3IQ3JEFGISZQU3D4GOS10LS4ZO2IWNAEC11GBQDZE',
	redirectUri: 'http://huntforjoy.cybersoft.com.sg/'
});

var facebook = Facebook ({
	clientId: '450150838346325',
	redirectUri: 'https://www.facebook.com/connect/login_success.html/'
});

facebook.addEventListener('login', function(data) {
	if (data.success) {
		localStorage.setItem(facebookLocalStoreKey, data.accessToken);
	}
});

/*var flickr = Flickr({
	consumerKey: 'XXXXXXXXXXXXXXXXXXXX',
	consumerSecret: 'XXXXXXXXXXXXXXXXXXXX',
	callbackUrl: 'http://www.example.com/callback/flickr'
});

*/
    

$(document).on("click", "a#twitterOAuth", function() { 

	twitter.authorize();	
});

$(document).on("click", "a#tweet", function() { 
	var path;
	var params = {};
	var headers = {};
	
	if ($('#tweettextarea').val().length === 0) {
		alert('You must enter text before tweeting.');
		return false;
	}
	
	var theTweet = $('#tweettextarea').val();
	
	$('#confirm-tweet').click(function() {
		if (twitter.authorized) {
			params.status = theTweet;
			path = '1/statuses/update.json';
		
			twitter.request(path, params, headers, 'POST', function(e){
				if (e.success) {
					console.log("Twitter status updated successfully!");
				} else {
					console.log("Twitter Status couldn't updated!");
				}
			});
		} 
		if (facebook.authorized) {
			params.message = theTweet;
			path = 'me/feed'
			
			facebook.request(path, params, headers, 'POST', function(e) {  
				if (e.success) {
					console.log("Facebook status updated successfully!");
				} else {
					console.log("Facebook Status couldn't updated!");
				}
			});
		} 
		
		if (linkedin.authorized) {
			path = 'v1/people/~/shares';
			
			var share = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><share>";
			share += "<comment>" + theTweet + "</comment><visibility><code>anyone</code></visibility></share>";
			
			linkedin.request(path, share, headers, 'POST', function(e) {  
				if (e.success) {
					console.log("Linkedin status updated successfully!");
				} else {
					console.log("Linkedin Status couldn't updated!");
				}
			});
		}
	});
	
   $('#cancel-tweet').click(function() {
	    console.log("AppLaudLog: tweet cancelled by user");
	    $.mobile.changePage($('#page-home'), { reverse : true, changeHash: false });
    });
   
   $('#dialog-tweet-text').html('<p>Really tweet ' + $('#tweettextarea').val().length + ' characters?<br>Your status:<br>"' + theTweet + '"');
   $.mobile.changePage($('#page-dialog-tweet'), { role: 'dialog', changeHash: false });
});



$(document).on("click", "a#tumblrOAuth", function() { 	
	tumblr.authorize();
});

$(document).on("click", "a#foursqureOAuth", function() { 	
	foursquare.authorize();
});

$(document).on("click", "a#facebookOAuth", function() { 	
	facebook.authorize();
});

$(document).on("click", "a#mySpaceOAuth", function() { 	
	mySpace.authorize();
});

$(document).on("click", "a#linkedinOAuth", function() { 	
	linkedin.authorize();
});



