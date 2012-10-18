angular.module('jukeboxServices', ['ngResource'])
	.factory('Streams', function($resource) {
		return $resource('/data/stream/:streamId', {});
	})
	.factory('StreamItem', function($resource) {
		return $resource('/data/stream/:streamId/item/:id', {});
	})
	.factory('Vote', function($http) {
		return {
			submit : function(itemId, weight, success, fail) {
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
		}
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
	});
	