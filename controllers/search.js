var request = require('request');

function queryYoutube(q, next) {
	var url = 'https://gdata.youtube.com/feeds/api/videos?alt=json'
						+ '&q=' + encodeURIComponent(q)
						+ '&max-results=10'
						+ '&format=5' //only embeddable
						+ '&category=Music' ; 
	
	request(url, function(err, resp, body) {
		//console.log(resp.statusCode);
		if (err) { return next(err) ; }
		if (resp.statusCode !== 200) {
			return next(new Error("Youtube returned status" + resp.statusCode));
		}

		try {
			var data = JSON.parse(body);
			var filtered = (data.feed.entry || []).map(function(e) {
				return { 
					title : e.title['$t'], 
					url : e.link.filter(function(url) {
						return url.type == "text/html"
					})[0].href,
					image : e['media$group']['media$thumbnail'][0].url,
					views : e['yt$statistics'] ? e['yt$statistics'].viewCount : "?"
				};
			});
			return next(null, filtered.slice(0 ,15));
		} catch (e) {
			return next(e);
		}
	});
}

function querySpotify(q, next) {
	var territory ='GB';
	var url = 'http://ws.spotify.com/search/1/track.json?q=' + encodeURIComponent(q);
	request(url, function(err, resp, body) {
		//console.log(resp.statusCode);
		if (err) { return next(err) ; }

		//not sure we need this or whether err would be set for none-ok codes
		if (resp.statusCode !== 200) {
			return next(new Error("Spotify returned status" + resp.statusCode));
		}

		try {
			var data = JSON.parse(body);
			var filtered = data.tracks
			.filter(function(e) {
				return e.album.availability.territories === "worldwide" 
									|| e.album.availability.territories.indexOf(territory) !== -1
			})
			.map(function(e) {
				return { 
					title : e.name, 
					album : e.album.name,
					url : e.href,
					artists : e.artists.map(function(a) { return a.name; }),
					image : '/img/spotify-logo-450-square.jpg',
					views : e.popularity
				};
			})
			.map(function(e)  {
				e.title = e.title + ' - ' + e.artists.join(', ');
				return e;
			})
			.slice(0, 15);
			return next(null, filtered);
		} catch (e) {
			return next(e);
		}
	});
}

module.exports = {
	searchYouTube : function(req, res, next) {
		if (!req.query.q) {
			return res.send(400);
		}

		var f = req.query.q.indexOf('sp ') === 0 
						? function(q, n) {  querySpotify(q.slice(3), n); }
						: queryYoutube;
		f(req.query.q, function(err, data) {
			if (err) return next(err);
			res.send(data);
		})
	}
};