var project = angular.module('project', ['jukeboxServices', 'jukeboxDirectives']);

var delay = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

function findStreamItemInSet(set, id) {
	for (var j =0; j < set.length; j++) {
		if (id === set[j]._id) {
			return set[j];
		}
	}
	return null;
}

function streamItemSorter(a,b) {
	//temp hack
	if (typeof(a.totalVotes)==="undefined") a.totalVotes = 0;
	if (typeof(b.totalVotes)==="undefined") b.totalVotes = 0;

	if (a.totalVotes != b.totalVotes) return b.totalVotes > a.totalVotes ? 1 : -1;

	return (new Date(a.created) > new Date(b.created)) ? 1 : -1;
}

project.config(function($routeProvider) {
	$routeProvider.
	  when('/', {controller:'ListStreams', templateUrl:'streams.html'})
	  .when('/stream/:streamId', { controller : 'Stream', templateUrl:'stream.html'})
	  .otherwise({redirectTo:'/'});
});

project.controller('ListStreams', function($scope, $location, StreamData) {
	var streams = StreamData.getStreams();
	$scope.streams =streams;
	$scope.addStream = function() {
		StreamData.addStream({ name : $scope.stream.name }, function(saved) {
			$scope.streams.push(saved);
		});
		$scope.stream.name = "";
	}
});

project.controller('Stream', function($scope, $location, $routeParams, Socket, StreamNotification, StreamData, YouTubeSearch) {
	var streamId = $routeParams.streamId;

	Socket.setOnStatus(function (eventName) {
		//console.dir(arg);
		$scope.socketStatus = eventName ; 
	});

	function playItem(item) {
		$scope.hostItem = item; //player (host)
		$scope.nowPlaying = item; // display

		StreamNotification.notifyPlay($scope.stream._id, $scope.hostItem._id);
		//todo save play directly via post.
	};

	function playNext() {
		if ($scope.items.length === 0) {
				//we ran out of stuff, stop this host
				$scope.isHostPlaying = false;
				$scope.hostItem = null;
				$scope.nowPlaying = null;
			} else {
				playItem($scope.items.shift());
			}		
	};

	function sortItems() {
		$scope.items.sort(streamItemSorter)
	}

	$scope.isHostPlaying = false;
	
	$scope.items = [];

	$scope.stream = StreamData.getStream({ streamId : streamId}, function() {
		$scope.items = StreamData.getItems({ streamId : streamId}, function() {
			StreamNotification.notifyJoin($scope.stream._id);	
			sortItems();
		});		
	});
	
	$scope.addItem = function(item, closeResults) {
		item.adding = true;
		StreamData.addItem(streamId, { url : item.url }, function(saved) {
			item.added=  true;
			item.adding = false;
			$scope.items.push(saved);
			sortItems();
			StreamNotification.notifyAdd(streamId, saved._id);
			if (closeResults) {
				$scope.entry.youtubeResults = null;
				$scope.entry.url = "";
			}
		});
	};

	$scope.lookupItem = function() {
		delay(function() {
			if (!$scope.entry.url || $scope.entry.url.length < 4) { 
				return ; 
			}

			if ($scope.entry.url.indexOf('http') === 0) {
				StreamData.lookupItem(streamId, $scope.entry.url, function(data) {
					$scope.entry.youtubeResults=[data];
					//hide spinner
				}, function() { // (error)
					//hide spinner
				});

				$scope.$apply(function() {
					//show spinner
				});
			} else  {
				YouTubeSearch($scope.entry.url, function(result) {
					if (!result) { return; }
					//console.log(result.feed);
					var filtered = result.feed.entry.map(function(e) {
						//console.log(e);
						return { 
							title : e.title['$t'], 
							url : e.link.filter(function(url) {
								return url.type == "text/html"
							})[0].href,
							image : e['media$group']['media$thumbnail'][0].url,
							views : e['yt$statistics'] ? e['yt$statistics'].viewCount : "?"
						};
					});

					$scope.entry.youtubeResults = filtered;
				});
			}
		}, 200);
	};

	$scope.closeSearchResults = function() {
		$scope.entry.youtubeResults = null;
	}

	$scope.startHostPlaying = function() {
		$scope.isHostPlaying = true;
		//if we have a track playing elsewhere, play that
		if ($scope.nowPlaying) {
			//this won't be in the list of items so don't need to remove it
			playItem($scope.nowPlaying);
		} else {
			playNext();
		}
	};

	$scope.stopHostPlaying = function() {
		$scope.hostItem = null;
		$scope.isHostPlaying = false;
	};

	$scope.hostFinishedPlaying = function() {
		StreamData.markPlayed($scope.hostItem._id);
		playNext();
	};

	$scope.skipCurrent = function() {
		StreamData.markPlayed($scope.nowPlaying._id);

		if ($scope.isHostPlaying && $scope.hostItem._id == $scope.nowPlaying._id) {
			playNext();
		}

		StreamNotification.notifySkip(streamId, $scope.nowPlaying._id);
	};

	$scope.submitVote = function(item, weight) {
		//if already voted same then this is a cancel
		if (item.currentVote == weight) { weight = 0; }

		StreamData.submitVote(item._id, weight, function(result) {
			item.totalVotes = result.newCount;
			item.currentVote = weight;

			StreamNotification.notifyVoted(streamId, item._id);
			sortItems();
		}, function(reason) {
			if (reason === "unauthorised") { return alert('You need to be logged in to vote'); }
			alert('Unknown error');
		});
			//alert("you voted for item " + item.title + "with "  + weight);
	};

	//$scope.getCurrentUserVote = function

	StreamNotification.setOnPlay(function(data) {
		//do not care about other streams
		if (data.stream != streamId) { return; }

		//if we are playing then we don't care
		if ($scope.isHostPlaying ) { return; }

		//load item for displaying becaquse we are not a host
		var item = findStreamItemInSet($scope.items, data.id);
				
		if (item !== null) {
			var index = $scope.items.indexOf(item);
			$scope.items.splice(index, 1);
			$scope.nowPlaying = item;
		}		
	});

	StreamNotification.setOnItemAdded(function(data) {
		//do not care about other streams
		if (data.stream != streamId) { return; }
		
		//add to our list if we don't have it
		if (findStreamItemInSet($scope.items, data.id) === null) {
			StreamData.getItem({ streamId : streamId, id : data.id}, function(item) {
				if (item) {
					$scope.items.push(item);
					sortItems();
				}
			});
		}
	});

	StreamNotification.setOnItemSkipped(function(data) {
		//do not care about other streams
		if (data.stream != streamId) { return; }

		//if we are not playing then the display can wait until we get host:playingItem
		if (!$scope.isHostPlaying) { return; }

		//ignore if not playing this track
		if ($scope.hostItem && $scope.hostItem._id !== data.id) { return; }

		playNext();
	});

	StreamNotification.setOnClientJoined(function(data) {
		if ($scope.isHostPlaying && $scope.hostItem) {
			StreamNotification.notifyPlay($scope.stream._id,$scope.hostItem._id);
		}
	});

	StreamNotification.setOnItemVoted(function(data) { 
		//do not care about other streams
		if (data.stream != streamId) { return; }

		var itemInSet = findStreamItemInSet($scope.items, data.id);
		if (itemInSet !== null) {
			StreamData.getItem({ streamId : data.stream, id : data.id}, function(item) {
				if (item) {
					itemInSet.totalVotes =  item.totalVotes;
					itemInSet.currentVote =  item.currentVote;
					sortItems();
				}
			});
		}
	});
});
