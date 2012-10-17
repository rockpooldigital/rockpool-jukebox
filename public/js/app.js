var project = angular.module('project', ['jukeboxServices', 'jukeboxDirectives']);

var delay = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

project.config(function($routeProvider) {
$routeProvider.
  when('/', {controller:'ListStreams', templateUrl:'listStreams.html'})
  .when('/stream/:streamId', { controller : 'Stream', templateUrl:'stream.html'})
  .otherwise({redirectTo:'/'});
});

project.controller('ListStreams', function($scope, $location, Streams){
	var streams = Streams.query();
	$scope.streams =streams;
});

project.controller('Stream', function($scope, $location, $routeParams, $http, Streams, StreamItem) {
	$scope.isHostPlaying = false;

	var stream = Streams.get({ streamId : $routeParams.streamId}, function() {
			$scope.stream = stream;
	});

	$scope.items = StreamItem.query({ streamId : $routeParams.streamId}, function(docs) {
		//console.log(docs);
	});

	$scope.addItem = function() {
		var item = new StreamItem({ url : $scope.newItemLookup.url });
		$scope.newItemLookup = null;
		$scope.entry.url = "";
		
		item.$save({streamId: $scope.stream._id}, function(saved) {
			$scope.items.push(saved);
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

	$scope.startPlaying = function() {
		if ($scope.items.length > 0) {
			$scope.current = $scope.items.shift();
			$scope.isHostPlaying = true;
		}
	};

	$scope.stopPlaying = function() {
		$scope.current = null;
		$scope.isHostPlaying = false;
	};

	$scope.finishedPlaying = function() {
		if ($scope.items.length > 0) {
			$scope.current = $scope.items.shift();
		}
	};

	$scope.skipCurrent = function() {
		if ($scope.items.length > 0) {
			$scope.current = $scope.items.shift();
		}
	};
});
/*
project.controller('ListStreamsCtrl', function ListStreamsCtrl($scope, $location) {
	var self = this;
	alert('tom');
});*/