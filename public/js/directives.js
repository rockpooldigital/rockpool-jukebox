angular.module('jukeboxDirectives', [])
	.directive('player', function(StreamNotification) {
		return { 
			link	: function(scope, element, attrs) {
				var activePlayer = null;
				var map = {
					'YouTube' : 'youtube',
					'SoundCloud' : 'soundcloud',
					'Vimeo' : 'vimeo'
				};

				var megaPlayer = MegaPlayer.create(element);

				var players = {
					local : {
						play: function(item) {
							var type = map[item.openGraph.site_name];
							megaPlayer.play({
								type: type,
								url : item.url
							});
						},
						stop : megaPlayer.stop
					},
					remote : {
						play: function(item) {
							StreamNotification.requestRemotePlay(item);
						},
						stop : StreamNotification.requestRemoteStop
					}
				};

				megaPlayer.bind('finish', function() {
					if (activePlayer === players.local) {
						scope.$apply(function() {
							scope.onFinish();
						});
					}
				});

				megaPlayer.bind('error', function() {
					if (activePlayer === players.local) {
						scope.$apply(function() {
							scope.onError();
						});
					}
				});

				StreamNotification.setOnRemoteItemStopped(function() {
					if (activePlayer === players.remote) {
						scope.onFinish();
					}
				});


				var playVideo = function(item) {
					if (!item) {
						if (activePlayer) { 
							activePlayer.stop(); 
							activePlayer = null;
						}
						return;
					}

					var newPlayer;

					if (item.url.indexOf('spotify:track') === 0) {
						newPlayer = players.remote;
					} else {
						newPlayer = players.local;
					}		

					if (activePlayer && activePlayer !== newPlayer) {
						activePlayer.stop();
					}

					newPlayer.play(item);			

					activePlayer = newPlayer;
				};

				//watch for change in currently playing item.
				scope.$watch('item', function(val, oldVal) {
					playVideo(val);
				});
			},

		//	template: 'monkey',

			scope : {
				item : '=',
				onFinish : '&',
				onError : '&'
			},

			restrict : 'E',
			transclude : true
		}
	})

.directive('fadey', function() {
    return {
        restrict: 'A',
        link: function(scope, elm, attrs) {
            jQuery(elm)
                .css({ opacity: 0 })
                .animate({ opacity: 1 }, parseInt(attrs.fadey));
        }
    };
});
