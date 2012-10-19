angular.module('jukeboxServices', ['ngResource'])
	.factory('Streams', function($resource) {
		return $resource('/data/stream/:streamId', {});
	})
	.factory('StreamItem', function($resource) {
		return $resource('/data/stream/:streamId/item/:id', {});
	})
	.factory('Socket', function($rootScope) {
		var socket = io.connect();
		return {
	 		on: function (eventName, callback) {
	      socket.on(eventName, function () {  
	        var args = arguments;
	        $rootScope.$apply(function () {
	          callback.apply(socket, args);
	        });
	      });
	    },
	    emit: function (eventName, data, callback) {
	      socket.emit(eventName, data, function () {
	        var args = arguments;
	        $rootScope.$apply(function () {
	          if (callback) {
	            callback.apply(socket, args);
	          }
	        });
	      })
	    }
		};
	})
	.factory('StreamData', function($http, Streams, StreamItem) {
		return {
			getStreams: Streams.query,
			addStream : function(stream, success, fail) {
				var stream = new Streams(stream);
				stream.$save(success, fail);
			},
			getStream : Streams.get,
			getItems : StreamItem.query,
			getItem : StreamItem.get,
			lookupItem : function(streamId, url, success, fail) {
				var url = "/data/stream/" + streamId +"/queryMedia?url="
					+ encodeURIComponent(url);
				var r = $http.get(url);
				if (success) r.success(success);
				if (fail) r.error(fail);
			},
			addItem : function(streamId, item, success, fail)  {
				var item = new StreamItem(item);
				item.$save({streamId: streamId}, success, fail);
			},
			markPlayed: function(itemId, success, fail) {
				$http.post('/data/item/' +  itemId + '/played')
					.success(function() { if(success) success(); })
					.error(function() { if(fail) fail(); })
			},
			submitVote : function(itemId, weight, success, fail) {
				$http.post("/data/item/" + itemId + "/vote", { weight : weight })
				.success(function(data) {
					if (!data.success) { return fail(data.reason); }
					success(data);
				})
				.error(function(status, code) {
					if (code == 401) {
						return fail("unauthorised");
					};

					fail();
				});
			}
		};
	})
	.factory('StreamNotification', function(Socket) {
		var onPlay, onItemAdded, onItemSkipped, onClientJoined, onItemVoted;

		Socket.on('host:playingItem', function(data) { if (onPlay) onPlay(data); });
		Socket.on('stream:itemAdded', function(data) { if (onItemAdded) onItemAdded(data); });
		Socket.on('stream:itemSkipped', function(data) { if (onItemSkipped) onItemSkipped(data); });
		Socket.on('stream:clientJoined', function(data) { if (onClientJoined) onClientJoined(data); });
		Socket.on('stream:itemVoted', function(data) { if (onItemVoted) onItemVoted(data); });

		return {
			setOnPlay : function(f) { onPlay = f},
			setOnItemAdded : function(f) { onItemAdded = f},
			setOnItemSkipped : function(f) { onItemSkipped = f},
			setOnClientJoined : function(f) { onClientJoined = f},
			setOnItemVoted : function(f) { onItemVoted = f},

			notifyPlay : function(stream, id) {
				Socket.emit('host:playingItem', {
					stream : stream,
					id : id
				});
			},

			notifyJoin : function(stream) {
				Socket.emit('stream:join', {
					stream : stream,
				});
			},

			notifyAdd : function(stream, id) {
				Socket.emit('stream:itemAdded', {
					stream : stream,
					id : id
				});
			},

			notifySkip : function(stream, id) {
				Socket.emit('stream:itemSkipped', {
					stream : stream,
					id : id
				});
			},

			notifyVoted : function(stream, id ){
					Socket.emit('stream:itemVoted', {
					id : id,
					stream :stream
				});
			}
		};
	});
	