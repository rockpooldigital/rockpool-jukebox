var mongo = require('mongodb');
var BSON = mongo.BSONPure;
var request = require('request');
var cheerio = require('cheerio');
var entities = require("entities");
var config = require('./config');

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

config.URL = "http://wordpress.rockpool.local:8046";

var items = db.collection("item");
var streams = db.collection("streams");

function getJson(url, done) {
	request(url, function(err, resp, body) {
		if (err) return done(err);
		if (resp.statusCode != 200) {
			return done(new Error("Returned status code" + resp.statusCode));
		}
console.log(data);
		var data = JSON.parse(body);
		done(null, data);
	});
}

function populateStream(stream, done) {
	console.log("==============");
	console.log("processing stream " + stream.name);
	var baseUrl = config.URL + "/data/stream/" + stream._id + "/item";

	getJson(baseUrl + "/count?played=false", function(err, count) {
		if (err) return done(err);
		console.log(count + " items unplayed");
		if (count > 4) {
			console.log("skipping");
			return done();
		}

		var url = baseUrl + "/oldest";
		console.log(url);
		getJson(url, function(err, itemOldest) {
			console.log("r," , itemOldest);
			if (!itemOldest) {
				console.log("no items at all");
				return done();
			}
			var then = new Date(itemOldest.created).getTime();
			var yesterday = new Date(new Date().getTime() - 1000 * 60 * 60 * 24).getTime();

			var age = Math.floor(
					(Math.random() * (yesterday - then)) + then
			);

			console.log(new Date(age));
			getJson(baseUrl + "/historic?played=true&age=" + age, function(err, set) {
				if (err) return done(err);
				console.log(set);
				done();
			});
			
		});
	});
}


streams.find().toArray(function(err, streams) {
	if (err) {
		console.log(err);
		return;
	}

	var next;

	next = function(err) {
		if (err) {
			console.log("ERROR: " + err);
			process.exit(code=1);
		}

		var stream = streams.pop();
		if (!stream) {
			console.log("Done");
			process.exit(code=0);
		}

		populateStream(stream, next);
	}

	next();
	
	
});

