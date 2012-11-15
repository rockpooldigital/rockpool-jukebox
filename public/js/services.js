angular.module('jukeboxServices', ['ngResource'])
	.factory('Streams', function($resource) {
		return $resource('/data/stream/:streamId', {});
	})
	.factory('StreamItem', function($resource) {
		return $resource('/data/stream/:streamId/item/:id', {});
	})
	.factory('Socket', function($rootScope) {
		var socket = io.connect();
		socket.on('connect_failed', function () {
			alert('Failed to connect socket.io');
		});

		var statusEvent ;

		/*var events = ['error','reconnect_failed', 'reconnect', 'reconnecting', 'connect', 'connecting', 'disconnect', 'connect_failed'];

		for (var i = 0; i < events.length; i++) {
			(function(i) {
				socket.on(events[i], function() {
					if (statusEvent) {
						$rootScope.$apply(function(arg) {
							statusEvent(events[i], arg);
						});
					}
				});
			})(i);
		}*/

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
	    },
	    setOnStatus : function(e) {
	    	statusEvent = e;
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
			notifyPlaying :function(itemId, success, fail) {
				$http.post('/data/item/' +  itemId + '/playing')
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
			},
			getNext : function(streamId, success, fail) {
				var url = "/data/stream/" + streamId +"/next";
				var r = $http.get(url);
				if (success) r.success(success);
				if (fail) r.error(fail);
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

		var streamId ;

		Socket.on('reconnect', function() {
			if (streamId) {
				//alert('reconnect');
				Socket.emit('stream:join', {
					stream : streamId,
				});
			}
		});

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
				streamId = stream;
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
	})
.factory('YouTubeSearch', function($http, $rootScope) {
	return function(q, success, fail) {
		var url = 'https://gdata.youtube.com/feeds/api/videos?alt=json-in-script&callback=JSON_CALLBACK'
							+ '&q=' + encodeURIComponent(q)
							+ '&max-results=10'
							+ '&format=5' //only embeddable
							+ '&category=Music' ; 

		console.log(url);
		$http.jsonp(url)
		.success(function(data) {
			if (success) {
				var filtered = data.feed.entry.map(function(e) {
					return { 
						title : e.title['$t'], 
						url : e.link.filter(function(url) {
							return url.type == "text/html"
						})[0].href,
						image : e['media$group']['media$thumbnail'][0].url,
						views : e['yt$statistics'] ? e['yt$statistics'].viewCount : "?"
					};
				});

				success(filtered);
			}
		})
		.error(function() {
			if (fail) {
				//$rootScope.$apply(function() {
				 	fail(data);
				//});
			}
		});
	}
})
.factory('DesktopNotifications', function() {
	

	return {
		request: function() {
			if (!window.webkitNotifications) {
				return;
			}

			if (window.webkitNotifications.checkPermission() !== 0) {
		 		window.webkitNotifications.requestPermission();
		 	}
		},

		showPlaying: function(item) {
			if (!window.webkitNotifications) {
				return;
			}

			if (window.webkitNotifications.checkPermission() === 0) {
				var currentNotifier =  window.webkitNotifications.createNotification(
	        item.image, 'Jukebox now playing', item.title
	      );

	      window.setTimeout(function() {
	      	currentNotifier.cancel();
	      }, 10 * 1000);

	      currentNotifier.show();
    	}
		}
	};
});