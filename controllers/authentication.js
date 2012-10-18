var passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy;

module.exports = function() {
	return {
		auth_facebook:  function(req, res, next) {
			var returnUrl = '/';
			if (req.query.returnUrl && req.query.returnUrl.indexOf('#/') === 0) {
				returnUrl = req.query.returnUrl;
			}

			var url =  'http://localhost:8046/auth/facebook/callback?returnUrl=' + encodeURIComponent(returnUrl);

			return passport.authenticate('facebook', {
			  callbackURL: url
			})(req, res, next);
		},
		auth_facebook_callback: function(req, res, next) {
			var returnUrl = '/';

			if (req.query.returnUrl && req.query.returnUrl.indexOf('#/') === 0) {
				returnUrl = req.query.returnUrl;
			}

			var url =  'http://localhost:8046/auth/facebook/callback?returnUrl=' + encodeURIComponent(returnUrl);

			return passport.authenticate('facebook', { 
				successRedirect: returnUrl, 
				failureRedirect: '/?authFailed=1', 
				callbackURL: url
			})(req, res, next);
		},
		logout:  function(req, res){
		  req.logOut();
		  res.redirect("/");
		},
	};
}();