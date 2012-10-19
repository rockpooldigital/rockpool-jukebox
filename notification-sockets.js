module.exports = function() {
	return {
		setup : function(io) {
			io.sockets.on('connection', function (socket) {
			  socket.on('stream:join', function (data) {
			  	//console.log("joining" + data.stream);
			  	var current = io.sockets.manager.roomClients[socket.id];
			  	for (var grp  in current) {
			  		if (grp) {
			  		//	console.log("leaving " + grp);
			  			socket.leave(grp.substring(1));
			  		}
			  	}

			    socket.join(data.stream);
			    socket.broadcast.to(data.stream).emit('stream:clientJoined');
			  });

			  socket.on('stream:itemAdded', function(data) {
					socket.broadcast.to(data.stream).emit('stream:itemAdded', {
			      stream : data.stream, id : data.id
			    });
			  });

			  socket.on('host:playingItem', function(data) {
			    socket.broadcast.to(data.stream).emit('host:playingItem', {
			      stream : data.stream, id : data.id
			    });
			  });

			  socket.on('stream:itemSkipped', function(data) {
			    socket.broadcast.to(data.stream).emit('stream:itemSkipped', {
			      stream : data.stream, id : data.id
			    });
			  });

			  socket.on('stream:itemVoted', function(data) {
			    socket.broadcast.to(data.stream).emit('stream:itemVoted', {
			      stream : data.stream, id : data.id
			    });
			  });
			});
		}
	}
}();