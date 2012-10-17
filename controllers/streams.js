var mongo = require('mongodb');//, Server = mongo.Server, Db = mongo.Db;
var BSON = mongo.BSONPure;
var request = require('request');
var cheerio = require('cheerio');
var entities = require("entities");

var queryMedia = function(url, next) {
	request(url, function(err, resp, body) {
		if (err) return next(err);

		var data = {
			title: "",
			description: "",
			url : "",
			image : ""
		},  openGraph = {};

		var $ = cheerio.load(body);

		$('meta').each(function(i, elem) {
			if (typeof(elem.attribs.content) !== "undefined")
			{
				var value = entities.decode(elem.attribs.content);

				if (elem.attribs.property && elem.attribs.property.indexOf("og:") == 0) {
					openGraph[elem.attribs.property.substring(3)] = value;
				}

				switch (elem.attribs.property) {
					case "og:title": data.title = value; break;
					case "og:description": data.description = value; break;
					case "og:image": data.image = value; break;
					case "og:url": data.url = value; break;
					//case "og:type": data.type = value; break;
					//case "og:site_name": data.site_name = value; break;
				}
			}
		});
	
		data.openGraph = openGraph;
		next(null, data);
	});
};

module.exports = function(db) {
	return {
		stream : function(req,res,next){
			res.send(req.params.name);
		},

		streams: function(req, res, next) {
			var collection = db.collection('streams');

			if (req.params.id) {
				collection.findOne({ _id : new BSON.ObjectID(req.params.id) }, function(err, result) {
					if (err) return next(err);
					res.send(result);
				});
			} else {
				collection.find().toArray(function(err, result) {
			 		if (err) return next(err);
					//res.render('streams', { streams : result});
					res.send(result);
				});
			}
		},

		stream_add : function(req, res, next) {
			var collection = db.collection('streams');
			if (!req.body.name)
			{
				res.send(400); 
				return;
			}

			var item = {
				name: req.body.name,
				created : new Date()
			};

			collection.insert(item, function(err, docs) {
				if (err) return next(err);
				res.send(docs[0]);
			});		
		},

		item_new_lookup : function(req, res, next) {
			var url = req.query.url;
			if (!url) {
				res.send(400);
				return;
			}
			
			queryMedia(url, function(err, data) {
				if (err) return next(err);

				if ([ 'YouTube', 'SoundCloud', 'Vimeo' ].indexOf(data.openGraph.site_name) == -1) {
					res.send(400);
				} else {
					res.send(data);
				}
			});
		},

		item_add : function(req, res, next) {
			console.log(req.body, req.params);

			if (!req.body.url || !req.params.streamId)
			{
				res.send(400); 
				return;
			}

			var collection = db.collection('items');

			queryMedia(req.body.url, function(err, data) {
				if (err) return next(err);

				var item = {
					streamId: new BSON.ObjectID(req.params.streamId),
					title: data.title,
					description : data.description,
					url : data.url,
					//type: req.body.type,
					image: data.image,
					//site: req.body.site_name,
					openGraph : data.openGraph,
					votes : [],
					created : new Date()
				};

				collection.insert(item, function(err, docs) {
					if (err) return next(err);
					res.send(docs[0]);
				});		
			});
		},

		item_get_active: function(req, res, next) {
			if (!req.params.streamId) {
				res.send(400); return;
			}
			
			db.collection('items')
			.find({ streamId : new BSON.ObjectID(req.params.streamId) })
			.toArray(function(err, result) {
				if (err) return next(err);
				res.send(result);
			});
		}
	};
};