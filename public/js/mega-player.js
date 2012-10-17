var YouTubeFactory = function() {
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

MegaPlayer = function($) {
	var makeId = function () {
	    var text = "";
	    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	    for( var i=0; i < 5; i++ )
	        text += possible.charAt(Math.floor(Math.random() * possible.length));
	    return text;
	}

	var createYoutubeWrapper = function(container, options) {
		var youtubePlayer = null, notificationEventHandler;
		
		return {
			hide : function() { 
				$(container).hide(); 
			},
			show : function() { $(container).show(); },
			stop : function() { youtubePlayer.stopVideo(); },
			play : function(url, notifier) {
				notificationEventHandler = notifier;
				var task = function(player) {
					var match = /\?v=([^&]+)/i.exec(url);
					player.stopVideo();
					player.cueVideoById(match[1]);
					player.playVideo();
				};

				if (youtubePlayer === null) {
					var wrapper = $('<div />');
					container.append(wrapper);
					YouTubeFactory.create(wrapper.get(0),  {
						width: options.width,
						height: options.height,
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

	var createSoundCloudWrapper = function(container, options) {
		var widget;
		return {
			hide : function() { $(container).hide(); },
			show : function() { $(container).show(); },
			stop : function() {  if (widget) { widget.pause(); }},
			play: function(url, notifier) { 
				console.log('play SoundCloud', url); 
				container.empty();
				container.attr({
					width: options.width, 
					height: options.height 
				});
				SC.oEmbed(url, { 
						auto_play: true,
						width: options.width, 
						height: options.height 
					},
					function(oEmbed) {
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

	var createVimeoWrapper = function(container, options) {
		var videoApi = null, id = makeId();
		return {
			hide : function() { $(container).hide(); },
			show : function() { $(container).show(); },
			stop : function() { 
				if (!videoApi) {  return; }
					videoApi.api('unload');
			}, 
			play: function(url, notifier) { 
				var match = /vimeo.com\/(\d+)/i.exec(url);
				var videoId = match[1];
				var iframe = $('<iframe/>')
						.attr({ 
							id : id, 
							width: options.width,
							height: options.height,
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

	return {
		create : function(element, opts) {
			opts = opts || {};
			opts.width = opts.width || 540;
			opts.height = opts.height || 304;

			var self = this, players = { 
			  youtube : null,
			  flowplayer : null
			}, activePlayer=null, eventListeners = {
				'finish' : []
			}, factories = {
				youtube : createYoutubeWrapper,
				soundcloud : createSoundCloudWrapper,
				vimeo : createVimeoWrapper
			};

			var fireEvent = function(eventName, arg) {
				for (var i = 0; i < eventListeners[eventName].length; i++) {
					eventListeners[eventName][i].call(this, arg);
				}
			};

			var getPlayer = function(type) {
				if (players[type]) {
					return players[type];
				} else {
					if (typeof(factories[type]) === "undefined") {
						throw new Error("unsupported type");
					}

					var elem = $('<div id="' + type +  makeId() + '"></div>');
					$(element).append(elem);

					players[type] = factories[type].call(this, elem, opts);

					return players[type];
				}
			};

			var kill = function() {
				if (activePlayer) {
								activePlayer.stop();
								activePlayer.hide();
							}
				activePlayer = null;
			}

			return {
				play : function(item) {
					var type = item.type;

					var player = getPlayer(type);

					if (player) {
						if (player !== activePlayer) {
						  kill();
							player.show();
						}
						activePlayer = player;
						player.play(item.url, function() { 
							fireEvent("finish");
						});
					} else {
						alert('Unsupported item type');
					}	
				},
				stop : function() {
					kill();
				},
				bind : function(eventName, callback) {
					if (typeof(eventListeners[eventName]) === 'undefined') {
						throw new Error("Unknown event " + eventName);
					}

					eventListeners[eventName].push(callback);
				}
			};
		}
	};
}(jQuery);