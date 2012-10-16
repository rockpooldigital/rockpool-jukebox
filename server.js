var express = require('express');
var mongo = require('mongodb'), Server = mongo.Server, Db = mongo.Db;

var server = new Server('localhost', 27017, {auto_reconnect: true});
var db = new Db('jukebox', server, { safe : true});
var MemoryStore = require('connect').session.MemoryStore;
var passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy;

var config = require('./config');

//var FACEBOOK_APP_ID = '372872592790204', FACEBOOK_APP_SECRET = '391221d701fb8ba952a112aab208a923';

var BSON = mongo.BSONPure; 

passport.use(new FacebookStrategy({
    clientID: config.FACEBOOK_APP_ID,
    clientSecret: config.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:8081/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
  	var users = db.collection('users');
  	users.findOne({ facebook_id : profile.id }, function(err,user) {
  		if (!user) {
  			console.log("not found");
  			users.insert({
  				facebook_id: profile.id,
  				name: profile.displayName
  			}, function(err, result) {
  				if (err) { return done(err); }
  				done(null, result[0]._id);
  			});
  		} else {
			console.log("user found");  
			users.update(
				{ _id: user._id},
				{ $set:{name : profile.displayName} },
				function(err,result) {
					if (err) { return done(err);}
					else { return done(null, user._id);}
				}
			);			
  		}
  	});
  }
));

passport.serializeUser(function(id, done) {
	console.log(id);
  done(null, id);
});

passport.deserializeUser(function(id, done) {
	console.log("ds for " + id);
	var users = db.collection('users');
	users.findOne({ _id: new BSON.ObjectID(id) }, function(err, user){
		if(err) {
			console.log("err");
			done(err);
		}	else {
			console.log("r is " + user);
			done(null, user);
		}
	})
});


var app = express();
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({ secret:'keyboard cat', store: new MemoryStore({ reapInterval:  60000 * 10 })}));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.use(express.static(__dirname + '/public'));


var auth_controller = require('./controllers/authentication.js');
var streams_controller = require('./controllers/streams.js')(db);

app.get('/auth/facebook', auth_controller.auth_facebook);
app.get('/auth/facebook/callback', auth_controller.auth_facebook_callback);
app.get('/logout', auth_controller.logout);

app.get('/data/stream/:id', streams_controller.streams);
app.get('/data/stream', streams_controller.streams);

app.post('/data/stream/:streamId/item', streams_controller.item_add);
app.get('/data/stream/:streamId/queryMedia', streams_controller.item_new_lookup);
app.get('/data/stream/:streamId/item', streams_controller.item_get_active);

app.get('/', function(req, res){
	res.render('app.html');
});

app.listen(8081);
console.log("listening on port 8081");