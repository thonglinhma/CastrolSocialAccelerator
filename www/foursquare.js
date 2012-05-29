var exports = exports || this;
exports.Foursquare = (function(global) {
	var K = function(){};
	
	var Foursquare = function(options) {
		var self;
    
	    if (this instanceof Foursquare) {
	      self = this;
	    } else {
	      self = new K();
	    }
	    
	    if (!options) { options = {}; }
	    
	    self.clientId = options.clientId;
	    self.accessToken = options.accessToken;
	    self.authorizeUrl = 'https://foursquare.com/oauth2/authorize';
	    self.authorized = false;
	    self.listeners = {};
	    self.webView = window.plugins.childBrowser;
	    
		if(self.webView == null)
		{
			self.webView = ChildBrowser.install();
		}
		
	    options.redirectUri = options.redirectUri || "https://www.facebook.com/connect/login_success.html/";
	    self.redirectUri = options.redirectUri;
	    options.requestTokenUrl = options.requestTokenUrl || 'https://foursquare.com/oauth2/authenticate?client_id=' + self.clientId + '&response_type=token&redirect_uri=' + self.redirectUri;
	    self.oauthClient = OAuth(options);
		
	    
	    if (self.accessToken) {
	     	self.authorized = true;
	    }
	    
	    return self;
	};
	
	K.prototype = Foursquare.prototype;
	
	Foursquare.prototype.onLocationChange = function(loc) {
		var self = this, oauth = this.oauthClient;
		console.log("FoursquareLog: onLocationChange : " + loc);
	    
	   // The supplied oauth_callback_url for this session is being loaded
	    if (loc.indexOf(self.redirectUri) >= 0) {
	    	if (loc.indexOf('access_token=') !== - 1) {
		    	oauth.setAccessToken([ loc.split('access_token=')[1] ]);
	
				self.fireEvent('login', {
					success: true,
					error: false,
					accessToken: oauth.getAccessTokenKey()
				});
				console.log('FoursquareLog: ' + oauth.getAccessTokenKey());
				// Save access token/key in localStorage
	            console.log("FoursquareLog: Storing token key/secret in localStorage");
	            //localStorage.setItem(localStoreKey, oauth.getAccessTokenKey());

				self.authorized = true;	
				self.webView.close();	    	
	    	} else if (loc.indexOf('error=') !== -1) {
				self.fireEvent('login', {
					success: false,
					error: 'Failure to fetch access token, please try again.',
					result: { error: loc.split('#error=')[1] }
				});	
				self.webView.close();	    	
	    	}
	    } 	
	}
	
	/*
	* Requests the user to authorize via Twitter through a modal WebView.
	*/
	Foursquare.prototype.authorize = function() {
		var self = this, oauth = this.oauthClient;
		
		if (this.authorized) {
		  // TODO: verify access tokens are still valid?
		  
		  // We're putting this fireEvent call inside setTimeout to allow
		  // a user to add an event listener below the call to authorize.
		  // Not totally sure if the timeout should be greater than 1. It
		  // seems to do the trick on iOS/Android.
		  setTimeout(function() {
		    self.fireEvent('login', {
		      success: true,
		      error: false,
		      accessToken: self.accessToken
		    });
		  }, 1);
		} else {
			this.oauthClient.setAccessToken('', '');
			self.webView.showWebPage(this.oauthClient.requestTokenUrl, 
			                { showLocationBar : false });  
			self.webView.onLocationChange = function(loc){self.onLocationChange(loc);};	  
		}
	};
	
   /* Make an authenticated Foursquare API request.
   * 
   * @param {String} path the Foursquare API path without leading forward slash. For example: `1/statuses/home_timeline.json`
   * @param {Object} params  the parameters to send along with the API call
   * @param {String} [httpVerb="GET"] the HTTP verb to use
   * @param {Function} callback
   */
	Foursquare.prototype.request = function(path, params, headers, httpVerb, callback){
		var self = this, oauth = this.oauthClient, url;

		var dateString = function(){
        	var d = new Date();
    		var curr_date = d.getDate();
    		var curr_month = d.getMonth();
    		curr_month++;
    		if(curr_month < 10){
        		curr_month = '0' + curr_month;
        	}
        	var curr_year = d.getFullYear();
        	return curr_year+curr_month+curr_date;
    	}
    	
		if (path.match(/^https?:\/\/.+/i)) {
			url = path;
		} else {
			url = 'https://api.foursquare.com/' + path;
		}

		url = url + '?v=' + dateString();

		if(this.oauthClient.getAccessTokenKey() !==''){
			url = url + '&oauth_token=' + this.oauthClient.getAccessTokenKey();

			oauth.request({
				method: httpVerb,
				url: url,
				data: params,
				headers: headers,
				success: function(data){
					callback.call(self, {
						success: true,
						error: false,
						result: data
					});
				},
				error: function(data){
					callback.call(self, {
						success: false,
						error: 'Request failed',
						result: data
					});
				}
			});

		}else{		
			url = url + '&client_id=' + this.oauthClient.getAccessConsumerKey() + '&client_secret=' + this.oauthClient.getAccessConsumerSecret();

			for(p in params){
				url = url + '&' + p + '=' +params[p]
			}

			var xhr = Titanium.Network.createHTTPClient();
			xhr.onload = function(data)
			{
				callback.call(self, {
					success: true,
					error: false,
					result: {
						text: xhr.responseText
					}
				});
			};

			xhr.onerror = function(data)
			{
				callback.call(self, {
					success: false,
					error: 'Request failed',
					result: data
				});
			};

			xhr.open(httpVerb, url);
			xhr.send();
		}
	};
	
	Foursquare.prototype.logout = function(callback){		
		this.oauthClient.setAccessToken('', '');
		this.accessTokenKey = null;
		this.accessTokenSecret = null;
		this.authorized = false;
		
		callback();
	};
  
	/*
	* Add an event listener
	*/
	Foursquare.prototype.addEventListener = function(eventName, callback) {
		this.listeners = this.listeners || {};
		this.listeners[eventName] = this.listeners[eventName] || [];
		this.listeners[eventName].push(callback);
	};
  
	/*
	* Fire an event
	*/
	Foursquare.prototype.fireEvent = function(eventName, data) {
		var eventListeners = this.listeners[eventName] || [];
		for (var i = 0; i < eventListeners.length; i++) {
		  eventListeners[i].call(this, data);
		}
	};
  
  return Foursquare;	
	
})(this);