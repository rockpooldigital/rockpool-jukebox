var passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy;

module.exports = function() {
	return {
		auth_facebook:  passport.authenticate('facebook'),
		auth_facebook_callback: passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' }),
		logout:  function(req, res){
		  req.logOut();
		  res.send("Logged out");
		},
	};
}();