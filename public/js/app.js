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
	if (a.totalVotes != b.totalVotes) return b.totalVotes - a.totalVotes;
	return new Date(a.created) - new Date(b.created);
}

project.config(function($routeProvider) {
$routeProvider.
  when('/', {controller:'ListStreams', templateUrl:'streams.html'})
  .when('/stream/:streamId', { controller : 'Stream', templateUrl:'stream.html'})
  .otherwise({redirectTo:'/'});
});

project.controller('ListStreams', function($scope, $location, Streams){
	var streams = Streams.query();
	$scope.streams =streams;
	$scope.addStream = function() {
		var stream = new Streams({ name : $scope.stream.name });
		$scope.stream.name = "";
		stream.$save(function(saved) {
			$scope.streams.push(saved);
		});
	}
});

project.controller('Stream', function($scope, $location, $routeParams, $http, Streams, StreamItem, Socket, Vote) {
	var playItem = function(item) {
		$scope.hostItem = item; //player (host)
		$scope.nowPlaying = item; // display

		Socket.emit('host:playingItem', {
			stream : $scope.stream._id,
			id : $scope.hostItem._id
		});

		//todo save play directly via post.
	};

	var playNext = function() {
		if ($scope.items.length === 0) {
				//we ran out of stuff, stop this host
				$scope.isHostPlaying = false;
				$scope.hostItem = null;
				$scope.nowPlaying = null;
			} else {
				playItem($scope.items.shift());
			}		
	};

	$scope.isHostPlaying = false;
	$scope.stream = Streams.get({ streamId : $routeParams.streamId});
	$scope.items = StreamItem.query({ streamId : $routeParams.streamId});

	//should we leave the other rooms here
	Socket.emit('stream:join', { 
		stream : $routeParams.streamId
	});

	$scope.addItem = function() {
		var item = new StreamItem({ url : $scope.newItemLookup.url });
		$scope.newItemLookup = null;
		$scope.entry.url = "";
		
		item.$save({streamId: $scope.stream._id}, function(saved) {
			$scope.items.push(saved);
			Socket.emit('stream:itemAdded', {
				id : saved._id,
				stream : $scope.stream._id
			});
		});
	};

	$scope.lookupItem = function() {
		console.log('fire', $scope.entry.url);

		if (!$scope.entry.url) { return ; }

		$scope.newItemLoading = true;
		$scope.newItemLookup = null;

			console.log('fire');
			var url = "/data/stream/" + $scope.stream._id +"/queryMedia?url="
					+ encodeURIComponent($scope.entry.url);
			$http.get(url)
				.success(function(data, status, header, config) {
					console.log(data);
					$scope.newItemLookup = data;
					$scope.newItemLoading = false;
				})
				.error(function() {
					$scope.newItemLoading = false;
				});
		//}, 200);
	};


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
		playNext();
	};

	$scope.skipCurrent = function() {
		if ($scope.isHostPlaying) {
			playNext();
		}

		Socket.emit('stream:itemSkipped',{
			id : $scope.nowPlaying._id,
			stream: $scope.stream._id
		});
	};

	$scope.submitVote = function(item, weight) {
		//if already voted same then this is a cancel
		if (item.currentVote == weight) { weight = 0; }

		Vote.submit(item._id, weight, function(result) {
			item.totalVotes = result.newCount;
			item.currentVote = weight;
			$scope.items.sort(streamItemSorter);
		}, function(reason) {
			if (reason === "unauthorised") { return alert('You need to be logged in to vote'); }
			alert('Unknown error');
		});
			//alert("you voted for item " + item.title + "with "  + weight);
	};

	//$scope.getCurrentUserVote = function

	Socket.on('host:playingItem', function(data) {
		//do not care about other streams
		if (data.stream != $scope.stream._id) { return; }

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

	Socket.on('stream:itemAdded', function(data) {
		//do not care about other streams
		if (data.stream != $scope.stream._id) { return; }
		
		//add to our list if we don't have it
		if (findStreamItemInSet($scope.items, data.id) === null) {
			StreamItem.get({ streamId : data.stream, id : data.id}, function(item) {
				if (item) {
					$scope.items.push(item);
					$scope.items.sort(streamItemSorter);
				}
			});
		}
	});

	Socket.on('stream:itemSkipped', function(data) {
		//do not care about other streams
		if (data.stream != $scope.stream._id) { return; }

		//if we are not playing then the display can wait until we get host:playingItem
		if (!$scope.isHostPlaying) { return; }

		//ignore if not playing this track
		if ($scope.hostItem && $scope.hostItem._id !== data.id) { return; }

		playNext();
	});

	Socket.on('stream:clientJoined', function(data) {
		if ($scope.isHostPlaying && $scope.hostItem) {
			Socket.emit('host:playingItem', {
				stream : $scope.stream._id,
				id : $scope.hostItem._id
			});
		}
	});
});
