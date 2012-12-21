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

	return (new Date(a.lastRequested) > new Date(b.lastRequested)) ? 1 : -1;
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

project.controller('Stream', function($scope, $location, $routeParams, Socket, StreamNotification, StreamData, ItemSearch, DesktopNotifications) {
	var streamId = $routeParams.streamId;

	Socket.setOnStatus(function (eventName) {
		//console.dir(arg);
		$scope.socketStatus = eventName ; 
	});

	function playNext() {
		$scope.hostItem = null;

		StreamData.getNext(streamId, function(item) {
			if (item) {
				$scope.hostItem = item; //player (host)
				StreamData.notifyPlaying(item._id)
			}
		}, function(r) {
			alert('Error fetching next item');
		});
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
			//wait for notification instead
			//$scope.items.push(saved);
			//sortItems();
			if (closeResults || $scope.entry.youtubeResults.length <= 1) {
				$scope.entry.youtubeResults = null;
				$scope.entry.url = "";
			}
		}, function(err,a,b) {
			if (err.data === "Duplicate") {
				alert('This item is already queued');
			} else {
				alert('Unknown Error');
			}
			
			item.adding = false;
		});
	};

	$scope.lookupItem = function() {
		delay(function() {
			if (!$scope.entry.url || $scope.entry.url.length < 4) { 
				return ; 
			}

			function searchYouTube(q) {
				ItemSearch(q, function(result) {
					if (!result) { return; }
					//console.log(result.feed);
					
					$scope.entry.youtubeResults = result;
				});
			}

			if ($scope.entry.url.indexOf('http') === 0) {
				//route all youtube urls through api so we can filter non-embeddable and non-music
				var re = /youtube\.com.*v=([^&]+)/i;
				var res = re.exec($scope.entry.url);
				if (res && res.length === 2) {
					return searchYouTube(res[1]);
				}

				//fall back to opengraph
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
				searchYouTube($scope.entry.url);
			}
		}, 200);
	};

	$scope.closeSearchResults = function() {
		$scope.entry.youtubeResults = null;
		$scope.entry.url = "";
	}

	$scope.startHostPlaying = function() {
		$scope.isHostPlaying = true;
		//if we have a track playing elsewhere, play that
		if ($scope.nowPlaying) {
			//this won't be in the list of items so don't need to remove it
			alert('Host already running elsewhere');
		} else {
			playNext();
		}
	};

	$scope.stopHostPlaying = function() {
		$scope.hostItem = null;
		$scope.isHostPlaying = false;
	};

	$scope.hostErrorCount = 0;

	$scope.hostFinishedPlaying = function() {
		StreamData.markPlayed($scope.hostItem._id, function() {
			playNext();
		});

		$scope.hostErrorCount = 0;
	};

	$scope.hostPlaybackError = function() {
		++$scope.hostErrorCount;
		StreamData.markPlayed($scope.nowPlaying._id, function() {
			StreamData.flagItem($scope.hostItem._id, "error", function() {
				if ($scope.hostErrorCount < 3) {
					playNext();
				} else {
					alert('Too many errors have occured');
				}
			}, function() {
				alert('Error flagging item')
			});
		});
	};

	$scope.skipCurrent = function() {
		if ($scope.nowPlaying) {
			StreamData.markPlayed($scope.nowPlaying._id);
			StreamNotification.notifySkip(streamId, $scope.nowPlaying._id);
		}
	};

	$scope.submitVote = function(item, weight) {
		//if already voted same then this is a cancel
		if (item.currentVote == weight) { weight = 0; }

		StreamData.submitVote(item._id, weight, function(result) {
			item.totalVotes = result.newCount;
			item.currentVote = weight;
			sortItems();
		}, function(reason) {
			if (reason === "unauthorised") { return alert('You need to be logged in to vote'); }
			alert('Unknown error');
		});
	};

	$scope.flagItem = function(item) {
		StreamData.flagItem(item._id, "user", function() {
			alert("Item flagged. It will not be removed until somebody looks at the flagged list.");
		}, function() {
			alert('Error submitting flag!');
		});
	};

	$scope.enableNotifications = function() {
		DesktopNotifications.request(); 
	}

	StreamNotification.setOnPlay(function(data) {
		//load item for displaying
		var item = findStreamItemInSet($scope.items, data.id);
				
		if (item !== null) {
			var index = $scope.items.indexOf(item);
			$scope.items.splice(index, 1);
			$scope.nowPlaying = item;

			DesktopNotifications.showPlaying(item);
		}		
	});

	StreamNotification.setOnItemAdded(function(data) {
		//add to our list if we don't have it
		if (findStreamItemInSet($scope.items, data.id) === null) {
			$scope.items.push(data.item);
			sortItems();

			if ($scope.isHostPlaying && !$scope.hostItem) {
				playNext();
			}
		}
	});

	StreamNotification.setOnItemRemoved(function(data) {
		//remove from our list if we have it
		for (var i =0; i < $scope.items.length; i++) {
			if ($scope.items[i]._id === data.id) {
				$scope.items.splice(i, 1);
				return;
			}
		}
	});

	StreamNotification.setOnItemSkipped(function(data) {
		//if we are not playing then the display can wait until we get host:playingItem
		if (!$scope.isHostPlaying) { return; }

		//ignore if not playing this track
		if ($scope.hostItem && $scope.hostItem._id !== data.id) { return; }

		playNext();
	});

	StreamNotification.setOnClientJoined(function(data) {
		if ($scope.isHostPlaying && $scope.hostItem) {
			StreamData.notifyPlaying($scope.hostItem._id);
		}
	});

	StreamNotification.setOnItemVoted(function(data) { 
		//todo: if you are logged in on two browsers and you vote on one, the other will not 
		//update the thumb thing

		var itemInSet = findStreamItemInSet($scope.items, data.id);
		if (itemInSet !== null) {
			itemInSet.totalVotes =  data.totalVotes;
			//itemInSet.currentVote =  data.currentVote;
			sortItems();
		}
	});
});
