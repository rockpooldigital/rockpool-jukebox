function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

var youtubeFactory = function() {
	return {
		create : function(elementId, args, success) {
			var setup = function() {
				var player = new YT.Player(elementId, args);
				if (success) { success(player); }
			};

			if (typeof(YT) === "undefined" || typeof(YT.Player) === "undefined") {
				window.onYouTubeIframeAPIReady = setup;

		    var tag = document.createElement('script');
		    tag.src = "//www.youtube.com/iframe_api";
		    var firstScriptTag = document.getElementsByTagName('script')[0];
		    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
			}
			else 
			{	//assume for now that it is already loaded and ok. this is a bit crap.
				setup();
			}
		}
	};
}();

var createYoutubeWrapper = function(container) {
	var youtubePlayer = null, notificationEventHandler;
	
	return {
		hide : function() { 
			$(container).hide(); 
		},
		show : function() { $(container).show(); },
		stop : function() { youtubePlayer.stopVideo(); },
		play : function(item, notifier) {
			notificationEventHandler = notifier;
			var task = function(player) {
				var match = /\?v=([^&]+)/i.exec(item.url);
				player.stopVideo();
				player.cueVideoById(match[1]);
				player.playVideo();
			};

			if (youtubePlayer === null) {
				var wrapper = $('<div />');
				container.append(wrapper);
				youtubeFactory.create(wrapper.get(0),  {
					width: 320,
					height: 200,
					playerVars: {
	          start: 0,
	          controls: '0'
	        },
					events: {
          'onReady': function(evt) {  
	          	youtubePlayer = evt.target;
	          	youtubePlayer.addEventListener("onStateChange", function(e) {
	          		if (e.data == 0) { //ended
	          			if (notificationEventHandler) {
	          				notificationEventHandler({
	          					status : 'finished'
	          				});
	          			}
	          		}
	          	});
	          	task(evt.target);
	          	console.log(youtubePlayer);
	         	}
	       	}
      	});
			} else {
				task(youtubePlayer);
			}
		}
	};
};

var createSoundCloudWrapper = function(container) {
	var widget;
	return {
		hide : function() { $(container).hide(); },
		show : function() { $(container).show(); },
		stop : function() {  if (widget) { widget.pause(); }},
		play: function(item, notifier) { 
			console.log('play SoundCloud', item); 
			container.empty();
			SC.oEmbed(item.url, { auto_play: true }, function(oEmbed) {
			  console.log( oEmbed);
				container.html(oEmbed.html);
				widget = SC.Widget(container.find('iframe').get(0));
				widget.bind(SC.Widget.Events.FINISH , function() {
					if(notifier) { 
						notifier({ status : 'finished' }); 
					}
				});
				console.log(widget);
			});
		}
	};
};

var createVimeoWrapper = function(container) {
	var videoApi = null, id = makeid();
	return {
		hide : function() { $(container).hide(); },
		show : function() { $(container).show(); },
		stop : function() { 
			if (!videoApi) {  return; }
				videoApi.api('unload');
		}, 
		play: function(item, notifier) { 
			var match = /vimeo.com\/(\d+)/i.exec(item.url);
			var videoId = match[1];
			var iframe = $('<iframe/>')
					.attr({ 
						id : id, 
						width:540,
						height:304,
						frameborder: '0',
						src: 'http://player.vimeo.com/video/'+ videoId +'?api=1&player_id=' + id
					});

			container.empty();
			container.append(iframe);

			Froogaloop(iframe[0]).addEvent('ready', function(player_id) {
				videoApi = Froogaloop(player_id);
        videoApi.addEvent('finish', function() {
        	if(notifier) { 
						notifier({ status : 'finished' }); 
					}
        });
        videoApi.api('play');
			});
		}
	};
};

angular.module('jukeboxDirectives', [])
	.directive('player', function() {
		return { 
			link	: function(scope, element, attrs) {
				var players = { 
				  youtube : null,
				  flowplayer : null
				}, activePlayer=null;

				var getPlayer = function(type) {
					if (players[type]) {
						return players[type];
					}
					else {
						var id = makeid();
						var elem = $('<div id="' + type +  id + '"></div>');
						$(element).append(elem);

						if (type === "youtube") {
							players[type] = createYoutubeWrapper(elem);
						} else if (type === "soundcloud") {
							players[type] = createSoundCloudWrapper(elem);
						} else if (type === "vimeo") {
							players[type] = createVimeoWrapper(elem);
						} else {
							alert("bad type");
						}

						return players[type];
					}
				};

				var playVideo = function(item) {
					if (!item) return;
					var player = null;

					var map = {
						'YouTube' : 'youtube',
						'SoundCloud' : 'soundcloud',
						'Vimeo' : 'vimeo'
					};

					var notifier = function(message) {
						console.log("FINISHED");
					};

					var type = map[item.openGraph.site_name];
					if (typeof(type) !== "undefined") {
						player = getPlayer(type);
					}

					if (player) {
						if (player !== activePlayer) {
						  if (activePlayer) {
								activePlayer.stop();
								activePlayer.hide();
							}
							player.show();
						}
						activePlayer = player;
						player.play(item, notifier);
					} else {
						alert('Unsupported item type');
					}	
				};

				//watch for change in currently playing item.
				scope.$watch(attrs.player, function(val, oldVal) {
					playVideo(val);
				});
			},

			template: ''
		}
	});

