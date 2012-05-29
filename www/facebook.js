var exports = exports || this;
exports.Facebook = (function(global) {
	var K = function(){};
	
	var Facebook = function(options) {
		var self;
    
	    if (this instanceof Facebook) {
	      self = this;
	    } else {
	      self = new K();
	    }
	    
	    if (!options) { options = {}; }
	    
	    self.clientId = options.clientId;
	    self.accessToken = options.accessToken;
	    self.authorizeUrl = 'https://graph.facebook.com/oauth/authorize';
	    self.authorized = false;
	    self.listeners = {};
	    self.webView = window.plugins.childBrowser;
	    
		if(self.webView == null)
		{
			self.webView = ChildBrowser.install();
		}
		
	    options.redirectUri = options.redirectUri || "https://www.facebook.com/connect/login_success.html/";
	    self.redirectUri = options.redirectUri;
	    options.requestTokenUrl = options.requestTokenUrl || 'https://www.facebook.com/dialog/oauth?client_id=' + self.clientId + '&redirect_uri=' + self.redirectUri + '&type=user_agent&display=touch&scope=publish_stream&response_type=token';
	    self.oauthClient = OAuth(options);
		
	    
	    if (self.accessToken) {
	     	self.authorized = true;
	    }
	    
	    return self;
	};
	
	K.prototype = Facebook.prototype;
	
	Facebook.prototype.onLocationChange = function(loc) {
		var self = this, oauth = this.oauthClient;
		
		loc = decodeURIComponent(loc); 
		console.log("FacebookLog: onLocationChange : " + loc);
		
	   // The supplied oauth_callback_url for this session is being loaded
	    if (loc.indexOf(self.redirectUri + "#") >= 0) {
	    	
	    	if (loc.indexOf('#access_token=') !== - 1) {
		        var index, accessToken = '', expiresIn = '';            
		        var params = loc.substr(loc.indexOf('#')+1);
		        params = params.split('&');
		        for (var i = 0; i < params.length; i++) {
		            var y = params[i].split('=');
		            if(y[0] === 'access_token') {
		                accessToken = y[1];
		            } else if (y[0] === 'expires_in') {
			            expiresIn = y[1];
		            }
		        }
		    	oauth.setAccessToken([accessToken]);
	
				self.fireEvent('login', {
					success: true,
					error: false,
					accessToken: oauth.getAccessTokenKey(),
					expiresIn: expiresIn
				});
				console.log('FacebookLog: ' + oauth.getAccessTokenKey());
				// Save access token/key in localStorage
	            console.log("FacebookLog: Storing token key/secret in localStorage");
	            //localStorage.setItem(localStoreKey, oauth.getAccessTokenKey());

				self.authorized = true;	
				self.webView.close();	    	
	    	} else {
				self.fireEvent('login', {
					success: false,
					error: 'Failure to fetch access token, please try again.',
				});			    	
	    	} 
	    } else if (loc.indexOf(self.redirectUri + "?") >= 0) {	    	
	    	if (loc.indexOf('?error_reason=') !== - 1) {
		        var index, error_reason = '', error = '', error_description = '';            
		        var params = loc.substr(loc.indexOf('?')+1);
		        console.log(params);
		        params = params.split('&');
		        for (var i = 0; i < params.length; i++) {
		            var y = params[i].split('=');
		            if(y[0] === 'error_reason') {
		                error_reason = y[1];
		            } else if (y[0] == 'error') {
			            error = y[1];
		            } else if (y[0] === 'error_description') {
			            error_description = y[1];
		            }
		        }
		        console.log("FacebookLog: " + error_reason +  ":" + error +  ":" + error_description);
				self.fireEvent('login', {
					success: false,
					error: 'Failure to fetch access token, please try again.',				
					result: { error: error,  reason: error_reason, description: error_description }
				});			    	
	    	} else {
				self.fireEvent('login', {
					success: false,
					error: 'Failure to fetch access token, please try again.',
				});	
	    	}
			self.webView.close();
    	}	
	}
	
	/*
	* Requests the user to authorize via Twitter through a modal WebView.
	*/
	Facebook.prototype.authorize = function() {
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
	Facebook.prototype.request = function(path, params, headers, httpVerb, callback){
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
			url = 'https://graph.facebook.com/' + path;
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

		}
	};
	
	Facebook.prototype.logout = function(callback){		
		this.oauthClient.setAccessToken('', '');
		this.accessTokenKey = null;
		this.accessTokenSecret = null;
		this.authorized = false;
		
		callback();
	};
  
	/*
	* Add an event listener
	*/
	Facebook.prototype.addEventListener = function(eventName, callback) {
		this.listeners = this.listeners || {};
		this.listeners[eventName] = this.listeners[eventName] || [];
		this.listeners[eventName].push(callback);
	};
  
	/*
	* Fire an event
	*/
	Facebook.prototype.fireEvent = function(eventName, data) {
		var eventListeners = this.listeners[eventName] || [];
		for (var i = 0; i < eventListeners.length; i++) {
		  eventListeners[i].call(this, data);
		}
	};
  
  return Facebook;	
	
})(this);