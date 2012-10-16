angular.module('jukeboxServices', ['ngResource'])
	.factory('Streams', function($resource) {
		return $resource('/data/stream/:streamId', {});
	})
	.factory('StreamItem', function($resource) {
		return $resource('/data/stream/:streamId/item', {});
	});
	