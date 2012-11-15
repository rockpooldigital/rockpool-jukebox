var  config = require('./config'),
	express = require('express'),
	mongo = require('mongodb');
var server = new  mongo.Server(
	config.DB_HOST || 'localhost', 
	config.DB_PORT || 27017, 
	{ auto_reconnect: true }
);
var db = new mongo.Db(
	config.DB_NAME || 'jukebox', 
	server, 
	{ safe : true}
);
var MemoryStore = require('connect').session.MemoryStore
	,passport = require('passport')
  ,FacebookStrategy = require('passport-facebook').Strategy
	,BSON = mongo.BSONPure; 

db.open(function(err, db) {
	if (err) { console.log(err); return; }
	db.ensureIndex('items', {
		streamId : 1,
		played : 0
	}, {
		unique:false,
		safe : true,
	}, function(err, result) {
		console.log(err|| result);
	});
});

function facebookCallback(accessToken, refreshToken, profile, done) {
	var users = db.collection('users');
	users.findOne({ facebook_id : profile.id }, function(err,user) {
		if (!user) {
			users.insert({
				facebook_id: profile.id,
				name: profile.displayName
			}, function(err, result) {
				if (err) { return done(err); }
				done(null, result[0]._id);
			});
		} else {
			users.update({ _id: user._id},
				{ $set:{name : profile.displayName} },
				function(err,result) {
					if (err) { return done(err);}
					done(null, user._id);
				}
			);			
		}
	});
}

passport.use(new FacebookStrategy({
    clientID: config.FACEBOOK_APP_ID,
    clientSecret: config.FACEBOOK_APP_SECRET
  },
  facebookCallback
));

passport.serializeUser(function(id, done) {
  done(null, id);
});

passport.deserializeUser(function(id, done) {
	var users = db.collection('users');
	users.findOne({ _id: new BSON.ObjectID(id) }, function(err, user){
		if(err) return done(err);
		done(null, user);
	})
});

var app = express()
	,server = require('http').createServer(app)
	,io = require('socket.io').listen(server);

app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(
	express.session({ 
		secret:'keyboard cat', 
		store: new MemoryStore({ reapInterval:  60000 * 10 })
	})
);
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/server/views');
app.set('view engine', 'html');
app.use(express.static(__dirname + '/public'));

io.set('log level', 1); 
//console.log(io);
var notifications = require('./server/notification-sockets').create(io);
//sockets.setup();

var auth_controller = require('./server/controllers/authentication.js').createAuthController(config);
var streamsCtrl = require('./server/controllers/streams.js')(db, notifications);

app.get('/auth/facebook', auth_controller.authFacebook);
app.get('/auth/facebook/callback', auth_controller.authFacebookCallback);
app.get('/logout', auth_controller.logout);


app.get('/data/stream/:streamId/item/count', streamsCtrl.itemCount);
app.get('/data/stream/:streamId/item/historic', streamsCtrl.itemFindHistoric);
app.post('/data/stream/:streamId/item', streamsCtrl.itemAdd);
app.get('/data/stream/:streamId/queryMedia', streamsCtrl.itemNewLookup);
app.get('/data/stream/:streamId/next', streamsCtrl.itemGetNext);
app.get('/data/stream/:streamId/item/:id', streamsCtrl.itemFindById);
app.get('/data/stream/:streamId/item', streamsCtrl.itemFindActiveByStream);
app.get('/data/stream/:id', streamsCtrl.streams);
app.get('/data/stream', streamsCtrl.streams);
app.post('/data/stream', streamsCtrl.streamAdd);
app.post('/data/item/:id/vote', streamsCtrl.submitVote);
app.post('/data/item/:id/played', streamsCtrl.itemMarkPlayed);
app.post('/data/item/:id/playing', streamsCtrl.itemMarkPlaying);

app.get('/', function(req, res) {
	res.render('app.html', { user : req.user });
});

server.listen(config.PORT);
console.log("listening on port " + config.PORT);