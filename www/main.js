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



var tumblr = Tumblr ({
	consumerKey: 'uG60oKZL3NYUBehVoQLTJeUSx8UEANcitK0ImwYXu7sLaZi2J0',
	consumerSecret: 'z27WBgDb9s43P3JVS6fTFIzYefUAkO9cRKpQpnuKyiDya4l8aU',
	callbackUrl: 'http://huntforjoy.cybersoft.com.sg/'
});

var twitter = Twitter ({
	consumerKey: 'RuqNilzB8cGmIG0DkN607A',
	consumerSecret: 'cCec2ypBCVggj5gAjjId37CbuUlQC4k37HZIfXpsmU',
	callbackUrl: 'http://huntforjoy.cybersoft.com.sg/'
});

/*var flickr = Flickr({
	consumerKey: 'XXXXXXXXXXXXXXXXXXXX',
	consumerSecret: 'XXXXXXXXXXXXXXXXXXXX',
	callbackUrl: 'http://www.example.com/callback/flickr'
});

var linkedin = Linkedin({
	consumerKey: 'XXXXXXXXXXXXXXXXXXXX',
	consumerSecret: 'XXXXXXXXXXXXXXXXXXXX',
});*/
    
    

$(document).on("click", "a#twitterOAuth", function() { 

	twitter.authorize();	
});

$(document).on("click", "a#takePhoto", function() { 
	navigator.camera.getPicture(onSuccess, onFail, { quality: 50,
	    destinationType: Camera.DestinationType.DATA_URL
	 }); 
	
	function onSuccess(imageData) {
			var path;
			var params = {};
			var headers = {};

			if (twitter.authorized) {
				params.status = 'Hello World';

				if (imageData) {
					path = 'https://upload.twitter.com/1/statuses/update_with_media.json';
					params['media[]'] = imageData;
					headers = { 'Content-Type': 'multipart/form-data' };
				} else {
					path = '1/statuses/update.json';
				}

				twitter.request(path, params, headers, 'POST', function(e){
					if (e.success) {
						alert ('Success');
					} else {
						alert ('Error');
					}
				});
			}
			
			
			if (tumblr.authorized) {
				params = {};
				headers = {};

				path = 'v2/blog/' + tumblrBlog.name + '.tumblr.com/post';
				params.tweet = 'off';

				if (imageData) {
					params.type = 'photo';
					params.data = imageData;
					params.caption = captionTextField.value;
					headers = { 'Content-Type': 'multipart/form-data' };
				} else {
					params.type = 'text';
					params.body = captionTextField.value;
				}

				tumblr.request(path, params, headers, 'POST', function(e){
					if (e.success) {
						// success proc...
					} else {
						// error proc...
					}
				});
			}
			
			if (flickr.authorized && imageData) {
				params = {};
				headers = {};

				path = 'services/upload/';
				params.photo = imageData;
				params.description = 'captionTextField.value';
				headers = { 'Content-Type': 'multipart/form-data' };

				flickr.request(path, params, headers, 'POST', function(e){
					if (e.success) {
						// success proc...
					} else {
						// error proc...
					}
				});
			}
	}
	
	function onFail(message) {
	    alert('Failed because: ' + message);
	}
});



$(document).on("click", "a#tumblrOAuth", function() { 	
	tumblr.authorize();
});
