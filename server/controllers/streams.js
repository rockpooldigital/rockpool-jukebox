var mongo = require('mongodb');//, Server = mongo.Server, Db = mongo.Db;
var BSON = mongo.BSONPure;
var request = require('request');
var cheerio = require('cheerio');
var entities = require("entities");

function queryMedia(url, next) {
	url = url.replace('/#!', '');
	request(url, function(err, resp, body) {
		if (err) return next(err);

		var data = {},  openGraph = {};

		var $ = cheerio.load(body);

		$('meta').each(function(i, elem) {
			if (typeof(elem.attribs.content) !== "undefined")
			{
				var value = entities.decode(elem.attribs.content);

				if (elem.attribs.property && elem.attribs.property.indexOf("og:") == 0) {
					openGraph[elem.attribs.property.substring(3)] = value;
				}
			}
		});
		
		data.title = openGraph.title || "Unknown";
		data.description = openGraph.description || "";
		data.image = openGraph.image || "";
		data.url = openGraph.url || "";
		data.openGraph = openGraph;
		next(null, data);
	});
};


function processResult(item, user) {
	var result = {
		_id : item._id,
		streamId: item.streamId,
		title: item.title,
		description : item.description,
		url : item.url,
		image: item.image,
		openGraph : item.openGraph,
		created : item.created,
		totalVotes : item.totalVotes,
		currentVote: 0
	};

  if (item.votes && user) {
  	for (var i=0;i<item.votes.length;i++) {
  		if (item.votes[i].userId.equals(user._id)) {
  			result.currentVote = item.votes[i].weight;
  			break;
  		}
  	}
  }

	return result;
};

module.exports = function(db, notifications) {
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

		streamAdd : function(req, res, next) {
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

		itemNewLookup : function(req, res, next) {
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

		itemAdd : function(req, res, next) {
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
					image: data.image,
					openGraph : data.openGraph,
					votes : [],
					created : new Date(),
					played : false,
					totalVotes : 0
				};

				collection.insert(item, function(err, docs) {
					if (err) return next(err);
					var toSend = processResult(docs[0], req.user);
					res.send(toSend);
					notifications.notifyAdd(toSend);
				});		
			});
		},

		itemFindActiveByStream: function(req, res, next) {
			if (!req.params.streamId) {
				res.send(400); return;
			}
			
			db.collection('items')
			.find({ 
				streamId : new BSON.ObjectID(req.params.streamId), 
				played:  false 
			})
			.sort({ totalVotes: -1, created: 1})
			.toArray(function(err, result) {
				if (err) return next(err);
				res.send(result.map(function(i) { return processResult(i, req.user); }));
			});
		},

		itemFindById : function(req, res, next) {
			if (!req.params.id || !req.params.streamId) {
				res.send(400); return;
			}

			db.collection('items')
			.findOne({ 
				streamId : new BSON.ObjectID(req.params.streamId), 
				_id : new BSON.ObjectID(req.params.id) 
			}, function(err, result) {
				if(err) return next(err);
				res.send(processResult(result, req.user));
			});
		},

		itemMarkPlayed : function(req, res, next) {
			if (!req.params.id ) {
				res.send(400); return;
			}
			var items = db.collection('items');
			items.update({ _id : new BSON.ObjectID(req.params.id) },
				{ '$set' : { played: true } },
				function(err, data) {
					if (err) return next(err);
					res.send(200);
			});
		},

		itemMarkPlaying : function(req, res, next) {
			if (!req.params.id ) {
				res.send(400); return;
			}
			db.collection('items')
			.findOne({ 
				_id : new BSON.ObjectID(req.params.id) 
			}, function(err, result) {
				if(err) return next(err);
				notifications.notifyPlay(
						processResult(result, null)
				);
				res.send(200);
			});
		},

		itemGetNext : function(req, res, next) {
			if (!req.params.streamId) {
				res.send(400);return;
			}

			db.collection('items')
			.find({
				streamId : new BSON.ObjectID(req.params.streamId),
				played: false	
			})
			.sort({ 
				totalVotes: -1, 
				created: 1
			})
			.limit(1)
			.toArray(function(err, result) {
				//console.log(err,result);
				if (err) return next(err);
				if (result.length === 0) {
					res.json(null);
				} else {
					res.send(processResult(result[0], req.user));
				}
			});
		},

		submitVote : function(req, res, next) {
			if (!req.user) {
				return res.send(401);
			}

			var weight = parseInt(req.body.weight);

			if (!req.params.id || weight > 1 || weight < -1 || isNaN(weight)) {
				return res.send(400);
			}

			var userId = req.user._id;
			//var weight = req.body.weight > 0 ? 1 : -1;

			function sumVotes(item) {
				if (typeof(item.votes) === "undefined" || item.votes.length === 0) { return 0 ;}
				var sum = 0;
				for (var i=0;i<item.votes.length;i++) {
					sum+= item.votes[i].weight;
				}
				return sum;
			}

			function respond(success, reason, item) {
				res.send({
					success: success,
					reason: reason ? reason : null,
					newCount : item.totalVotes
				});

				if (success) {
					notifications.notifyVote(
						processResult(item, null)
					);
				}
			}

			var items = db.collection('items');

			function loadItemCallback(err, item) {
				if (err) return next(err);
				if (item.votes) {
					var matches = item.votes.filter(function(v) { 
						return v.userId.equals(userId);
					});
					//found an existing vote
					if (matches.length !== 0) {
						var vote = matches[0];
						if (vote.weight === weight) {
							//same vote has already been cast
							return respond(false, "duplicate", item);
						} else {
							//this probably all needs to be done in some sort of transaction or calculated inside mongo
							var currentSum = sumVotes(item);
							currentSum -= vote.weight;
							currentSum += weight;

							//remove existing
							items.findAndModify({ 
									'votes.userId' : userId, 
									'_id' : item._id 
								}, [['_id', 'asc']], { '$set' : { 
										'votes.$.weight' : weight, 
										'votes.$.created' : new Date(),
										'totalVotes' : currentSum
									}
								}, { 'new' : true }, function (err, saved) {
									if (err) return next(err);
									respond(true, null, saved);
								});
							return;
						}
					} 
				}

				//create a new vote instead
				var currentSum = sumVotes(item);
				currentSum += weight;

				//add vote
				items.findAndModify({_id : item._id}, [['_id', 'asc']], { 
						'$push' : { 
							'votes' : { 
								weight: weight , 
								userId: userId, created : new Date()
							}
						},
						'$set' : { 'totalVotes' : currentSum }
					}, { 'new' : true }, function(err, saved) {
						if (err) return next(err);
						respond(true, null, saved);
					}
				);
			}

			items.findOne({ 
				_id : new BSON.ObjectID(req.params.id) 
			}, loadItemCallback);
		}
	};
};