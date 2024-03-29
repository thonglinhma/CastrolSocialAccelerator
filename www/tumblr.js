var exports = exports || this;
exports.Tumblr = (function(global) {
	var K = function(){};
	
	var Tumblr = function(options) {
		var self;
    
	    if (this instanceof Tumblr) {
	      self = this;
	    } else {
	      self = new K();
	    }
	    
	    if (!options) { options = {}; }
	    
	    self.consumerKey = options.consumerKey;
	    self.consumerSecret = options.consumerSecret;
	    self.accessTokenKey = options.accessTokenKey;
	    self.accessTokenSecret = options.accessTokenSecret;
	    self.authorized = false;
	    self.requestParams;
	    self.listeners = {};
	    self.webView = window.plugins.childBrowser;
	    
		if(self.webView == null)
		{
			self.webView = ChildBrowser.install();
		}
		
	    options.callbackUrl = options.callbackUrl || "https://www.facebook.com/connect/login_success.html/";
	    self.callbackUrl = options.callbackUrl;
	    self.oauthClient = OAuth(options);
	    
	    if (self.accessTokenKey && self.accessTokenSecret) {
	     	self.authorized = true;
	    }
	    
	    return self;
	};
	
	K.prototype = Tumblr.prototype;
	
	Tumblr.prototype.onLocationChange = function(loc) {
		var self = this, oauth = this.oauthClient;
		console.log("TumblrLog: onLocationChange : " + loc);
	    // If user hit "No, thanks" when asked to authorize access
	    if (loc.indexOf(self.callbackUrl+"?denied") >= 0) {
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
	    if (loc.indexOf(self.callbackUrl+"?") >= 0) {
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
            oauth.get('http://www.tumblr.com/oauth/access_token?oauth_verifier='+verifier+'&'+self.requestParams,
                    function(data) {               
                        var accessParams = {};
                        var qvars_tmp = data.text.split('&');
                        for (var i = 0; i < qvars_tmp.length; i++) {
                            var y = qvars_tmp[i].split('=');
                            accessParams[y[0]] = decodeURIComponent(y[1]);
                        }
                        console.log('TumblrLog: ' + accessParams.oauth_token + ' : ' + accessParams.oauth_token_secret);
                        //$('#oauthStatus').html('<span style="color:green;">Success!</span>');
                        //$('#stage-auth').hide();
                        //$('#stage-data').show();
                        oauth.setAccessToken([accessParams.oauth_token, accessParams.oauth_token_secret]);
                        
                        // Save access token/key in localStorage
                        var accessData = {};
                        accessData.accessTokenKey = accessParams.oauth_token;
                        accessData.accessTokenSecret = accessParams.oauth_token_secret;
                        console.log("TumblrLog: Storing token key/secret in localStorage");
                        //localStorage.setItem(localStoreKey, JSON.stringify(accessData));
                        self.authorized = true;
			            self.fireEvent('login', {
			              success: true,
			              error: false,
			              accessTokenKey: accessParams.oauth_token,
			              accessTokenSecret: accessParams.oauth_token_secret
			            });                                        
                        self.webView.close();
                },
                function(data) { 
                    self.authorized = false;
                    console.log("TumblrLog: 1 Error " + data.text); 
		            self.fireEvent('login', {
		              success: false,
		              error: data.text,
		              result: data
		            });
		            self.webView.close();
                }
            );
	    }		
	}
	
	/*
	* Requests the user to authorize via Twitter through a modal WebView.
	*/
	Tumblr.prototype.authorize = function() {
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
		    oauth.get('http://www.tumblr.com/oauth/request_token',
			    function(data) {
				    var token = oauth.parseTokenRequest(data, data.responseHeaders['Content-Type'] || undefined);
				    oauth.setAccessToken([token.oauth_token, token.oauth_token_secret]);
			        self.requestParams = data.text;
			        console.log("TumblrLog: requestParams: " + data.text);
			        self.webView.showWebPage('http://www.tumblr.com/oauth/authorize?'+data.text, 
			                { showLocationBar : false });  
			        self.webView.onLocationChange = function(loc){self.onLocationChange(loc);};	                 
			    },
			    function(data) { 
			        console.log("TumblrLog: 2 Error " + data.text); 
			    }
		    );

		}
	};
	
   /* Make an authenticated TumblrLog API request.
   * 
   * @param {String} path the TumblrLog API path without leading forward slash. For example: `v2/user/info`
   * @param {Object} params  the parameters to send along with the API call
   * @param {String} [httpVerb="GET"] the HTTP verb to use
   * @param {Function} callback
   */
	Tumblr.prototype.request = function(path, params, headers, httpVerb, callback) {
		var self = this, oauth = this.oauthClient, url;
		
		if (path.match(/^https?:\/\/.+/i)) {
		    url = path;
		} else {
		    url = 'http://api.tumblr.com/' + path;
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
	
	Tumblr.prototype.logout = function(callback){
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
	Tumblr.prototype.addEventListener = function(eventName, callback) {
		this.listeners = this.listeners || {};
		this.listeners[eventName] = this.listeners[eventName] || [];
		this.listeners[eventName].push(callback);
	};
  
	/*
	* Fire an event
	*/
	Tumblr.prototype.fireEvent = function(eventName, data) {
		var eventListeners = this.listeners[eventName] || [];
		for (var i = 0; i < eventListeners.length; i++) {
		  eventListeners[i].call(this, data);
		}
	};
  
  return Tumblr;	
	
})(this);