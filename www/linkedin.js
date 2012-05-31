var exports = exports || this;
exports.Linkedin = (function(global) {
	var K = function(){};
	
	var Linkedin = function(options) {
		var self;
    
	    if (this instanceof Linkedin) {
	      self = this;
	    } else {
	      self = new K();
	    }
	    
	    if (!options) { options = {}; }
	    
	    self.consumerKey = options.consumerKey;
	    self.consumerSecret = options.consumerSecret;
	    self.accessTokenKey = options.accessTokenKey;
	    self.accessTokenSecret = options.accessTokenSecret;
	    self.authorizeUrl = 'https://www.linkedin.com/uas/oauth/authorize';
	    self.authorized = false;
	    self.requestParams;
	    self.listeners = {};
	    self.webView = window.plugins.childBrowser;
	    
		if(self.webView == null)
		{
			self.webView = ChildBrowser.install();
		}
		
		options.requestTokenUrl = options.requestTokenUrl || 'https://api.linkedin.com/uas/oauth/requestToken';
	    options.callbackUrl = options.callbackUrl || "https://www.facebook.com/connect/login_success.html/";
	    self.callbackUrl = options.callbackUrl;
	    self.oauthClient = OAuth(options);
	    
	    if (self.accessTokenKey && self.accessTokenSecret) {
	     	self.authorized = true;
	    }
	    
	    return self;
	};
	
	K.prototype = Linkedin.prototype;
	
	Linkedin.prototype.onLocationChange = function(loc) {
		var self = this, oauth = this.oauthClient;
		console.log("LinkedinLog: onLocationChange : " + loc);
		
	    // If user hit "No, thanks" when asked to authorize access
	    if (loc.indexOf(self.callbackUrl + "?denied") >= 0) {
	        //$('#oauthStatus').html('<span style="color:red;">User declined access</span>');
	        self.webView.close();
	        return;
	    }
	
	    // Same as above, but user went to app's homepage instead
	    // of back to app. Don't close the browser in this case.
	    if (loc === self.callbackUrl) {
	        //$('#oauthStatus').html('<span style="color:red;">User declined access</span>');
	        self.webView.close();
	        return;
	    }
	    
	   // The supplied oauth_callback_url for this session is being loaded
	    if (loc.indexOf(self.callbackUrl + "?") >= 0) {
	        var index, verifier = '';            
	        var params = loc.substr(loc.indexOf('?') + 1);
	        
	        params = params.split('&');
	        for (var i = 0; i < params.length; i++) {
	            var y = params[i].split('=');
	            if(y[0] === 'oauth_verifier') {
	                verifier = y[1];
	            }
	        }
	        oauth.accessTokenUrl = 'https://api.linkedin.com/uas/oauth/accessToken?oauth_verifier=' + verifier;
	        // Exchange request token for access token
			oauth.fetchAccessToken(
				function(data){
					self.fireEvent('login', {
						success: true,
						error: false,
						accessTokenKey: oauth.getAccessTokenKey(),
						accessTokenSecret: oauth.getAccessTokenSecret()
					});
					console.log('LinkedinLog: ' + oauth.getAccessTokenKey() + ' : ' +oauth.getAccessTokenSecret());
					oauth.setAccessToken([oauth.getAccessTokenKey(), oauth.getAccessTokenSecret()]);
                    // Save access token/key in localStorage
                    var accessData = {};
                    accessData.accessTokenKey = oauth.getAccessTokenKey();
                    accessData.accessTokenSecret = oauth.getAccessTokenSecret();
                    console.log("LinkedinLog: Storing token key/secret in localStorage");
                    //localStorage.setItem(localStoreKey, JSON.stringify(accessData));
					self.authorized = true;
					self.webView.close();
				}, function(data) {
					self.fireEvent('login', {
						success: false,
						error: "Failure to fetch access token, please try again.",
						result: data
					});
					self.webView.close();
				}
			);
	    }		
	}
	
	/*
	* Requests the user to authorize via Linkedin through a modal WebView.
	*/
	Linkedin.prototype.authorize = function() {
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
		      accessTokenKey: self.accessTokenKey,
		      accessTokenSecret: self.accessTokenSecret
		    });
		  }, 1);
		} else {
			this.oauthClient.fetchRequestToken(
				function(requestParams){
					var authorizeUrl = self.authorizeUrl + requestParams;
					//self.webView.url = authorizeUrl;
			        self.webView.showWebPage(authorizeUrl, 
			                { showLocationBar : false });   
			        self.webView.onLocationChange = function(loc){self.onLocationChange(loc);};	   
				},
				function(data){
					self.fireEvent('login', {
						success: false,
						error: 'Failure to fetch access token, please try again.',
						result: data
					});
					console.log("LinkedinLog: 2 Error " + data.text); 
				}
			);
		}
	};
	
   /* Make an authenticated Linkedin API request.
   * 
   * @param {String} path the Linkedin API path without leading forward slash. For example: `1/statuses/home_timeline.json`
   * @param {Object} params  the parameters to send along with the API call
   * @param {String} [httpVerb="GET"] the HTTP verb to use
   * @param {Function} callback
   */
	Linkedin.prototype.request = function(path, params, headers, httpVerb, callback) {
		var self = this, oauth = this.oauthClient, url;

		if (path.match(/^https?:\/\/.+/i)) {
			url = path;
		} else {
			url = 'https://api.linkedin.com/' + path;
		}

		params.access_token = this.accessTokenKey;

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
			failure: function(data){
				callback.call(self, {
					success: false,
					error: 'Request failed',
					result: data
				});
			}
		});
	};
	
	Linkedin.prototype.logout = function(callback){
		var self = this;
		
		this.oauthClient.setAccessToken('', '');
		this.accessTokenKey = null;
		this.accessTokenSecret = null;
		this.authorized = false;
		
		callback();
	};
  
	/*
	* Add an event listener
	*/
	Linkedin.prototype.addEventListener = function(eventName, callback) {
		this.listeners = this.listeners || {};
		this.listeners[eventName] = this.listeners[eventName] || [];
		this.listeners[eventName].push(callback);
	};
  
	/*
	* Fire an event
	*/
	Linkedin.prototype.fireEvent = function(eventName, data) {
		var eventListeners = this.listeners[eventName] || [];
		for (var i = 0; i < eventListeners.length; i++) {
		  eventListeners[i].call(this, data);
		}
	};
  
  return Linkedin;	
	
})(this);