angular.module('jukeboxDirectives', [])
	.directive('player', function() {
		return { 
			link	: function(scope, element, attrs) {

				var megaPlayer = MegaPlayer.create(element);
				megaPlayer.bind('finish', function() {
					alert('finished');
				});

				var playVideo = function(item) {
					if (!item) return;
					var player = null;

					var map = {
						'YouTube' : 'youtube',
						'SoundCloud' : 'soundcloud',
						'Vimeo' : 'vimeo'
					};

					var type = map[item.openGraph.site_name];

					megaPlayer.play({
						type: type,
						url : item.url
					});					
				};

				//watch for change in currently playing item.
				scope.$watch('item', function(val, oldVal) {
					playVideo(val);
				});
			},

			template: 'monkey',

			scope : {
				item : '=',
				onFinish : '&',
			},

			restrict : 'E'
		}
	});

