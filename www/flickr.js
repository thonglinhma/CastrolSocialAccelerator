var exports = exports || this;
exports.Flickr = (function(global) {
	var K = function(){};
	
	var Flickr = function(options) {
		var self;
    
	    if (this instanceof Flickr) {
	      self = this;
	    } else {
	      self = new K();
	    }
	    
	    if (!options) { options = {}; }
	    
	    self.consumerKey = options.consumerKey;
	    self.consumerSecret = options.consumerSecret;
	    self.accessTokenKey = options.accessTokenKey;
	    self.accessTokenSecret = options.accessTokenSecret;
	    self.authorizeUrl = 'http://m.flickr.com/services/oauth/authorize';
	    self.authorized = false;
	    self.requestParams;
	    self.listeners = {};
	    self.webView = window.plugins.childBrowser;
	    
		if(self.webView == null)
		{
			self.webView = ChildBrowser.install();
		}
		
		options.requestTokenUrl = options.requestTokenUrl || 'http://www.flickr.com/services/oauth/request_token';
	    options.callbackUrl = options.callbackUrl || "https://www.facebook.com/connect/login_success.html/";
	    self.callbackUrl = options.callbackUrl;
	    self.oauthClient = OAuth(options);
	    
	    if (self.accessTokenKey && self.accessTokenSecret) {
	     	self.authorized = true;
	    }
	    
	    return self;
	};
	
	K.prototype = Flickr.prototype;
	
	Flickr.prototype.onLocationChange = function(loc) {
		var self = this, oauth = this.oauthClient;
		console.log("FlickrLog: onLocationChange : " + loc);
		
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
	        
            // Exchange request token for access token
    		oauth.setVerifier(verifier.oauth_verifier);
			oauth.accessTokenUrl = 'http://www.flickr.com/services/oauth/access_token';

			oauth.fetchAccessToken(function(data){
				var token = oauth.parseTokenRequest(data, data.responseHeaders['Content-Type'] || undefined);
				oauth.setAccessToken([ token.oauth_token, token.oauth_token_secret ]);
				console.log('FlickrLog: ' + token.oauth_token + ' : ' + token.oauth_token_secret);
                // Save access token/key in localStorage
                var accessData = {};
                accessData.accessTokenKey = token.oauth_token;
                accessData.accessTokenSecret = token.oauth_token_secret;
                console.log("FlickrLog: Storing token key/secret in localStorage");
                //localStorage.setItem(localStoreKey, JSON.stringify(accessData));
				self.fireEvent('login', {
					success: true,
					error: false,
					accessTokenKey: oauth.getAccessTokenKey(),
					accessTokenSecret: oauth.getAccessTokenSecret()
				});
				self.authorized = true;
				self.webView.close();
			}, function(data){
				self.fireEvent('login', {
					success: false,
					error: 'Failure to fetch access token, please try again.',
					result: data
				});
				self.webView.close();
			});
	    }		
	}
	
	/*
	* Requests the user to authorize via FlickrLog through a modal WebView.
	*/
	Flickr.prototype.authorize = function() {
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
				this.oauthClient.fetchRequestToken(function(requestParams){
				console.log("FlickrLog: requestParams: " + data.text);
				var authorizeUrl = self.authorizeUrl + requestParams;		       
		        self.webView.showWebPage(authorizeUrl, 
		                { showLocationBar : false });    
		        self.webView.onLocationChange = function(loc){self.onLocationChange(loc);};	  
			}, function(data) {
				self.fireEvent('login', {
					success: false,
					error: 'Failure to fetch access token, please try again.',
					result: data
				});
			});
		}
	};
	
   /* Make an authenticated Flickr API request.
   * 
   * @param {String} path the Flickr API path without leading forward slash. For example: `services/upload/`
   * @param {Object} params  the parameters to send along with the API call
   * @param {String} [httpVerb="GET"] the HTTP verb to use
   * @param {Function} callback
   */
	Flickr.prototype.request = function(path, params, headers, httpVerb, callback) {
		var self = this, oauth = this.oauthClient, url;
		
		if (path.match(/^https?:\/\/.+/i)) {
		    url = path;
		} else {
		    url = 'http://api.flickr.com/' + path;
		}
		
		oauth.request({
		  method: httpVerb,
		  url: url,
		  data: params,
		  headers: headers,
		  success: function(data) {
		    callback.call(self, {
		      success: true,
		      error: false,
		      result: data
		    });
		  },
		  error: function(data) { 
		    callback.call(self, {
		      success: false,
		      error: "Request failed",
		      result: data
		    });
		  }
		});
	};
	
	Flickr.prototype.logout = function(callback){
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
	Flickr.prototype.addEventListener = function(eventName, callback) {
		this.listeners = this.listeners || {};
		this.listeners[eventName] = this.listeners[eventName] || [];
		this.listeners[eventName].push(callback);
	};
  
	/*
	* Fire an event
	*/
	Flickr.prototype.fireEvent = function(eventName, data) {
		var eventListeners = this.listeners[eventName] || [];
		for (var i = 0; i < eventListeners.length; i++) {
		  eventListeners[i].call(this, data);
		}
	};
  
  return Flickr;	
	
})(this);