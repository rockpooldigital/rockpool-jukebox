module.exports = function() {
	return {
		create : function(io) {
			return setup(io);
		}
	}
}();

function setup(io) {
	io.sockets.on('connection', function (socket) {
		//console.log('connect');
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

	  socket.on('host:playingItem', function(data) {
	  	//console.log('received play notf');
	    socket.broadcast.to(data.stream).emit('host:playingItem', {
	      stream : data.stream, id : data.id
	    });
	  });

	  socket.on('stream:itemSkipped', function(data) {
	    socket.broadcast.to(data.stream).emit('stream:itemSkipped', {
	      stream : data.stream, id : data.id
	    });
	  });
	});

	return {
		notifyVote : function(item) {
			//console.log('notifying', item);
			io.sockets.in(item.stream).emit('stream:itemVoted', {
			      stream : item.streamId, 
			      id : item._id, 
			      totalVotes : item.totalVotes,
			      currentVote : item.currentVote
			});
		},

		notifyAdd : function(item) {
			io.sockets.in(item.stream).emit('stream:itemAdded', {
			      stream : item.streamId, 
			      id : item._id, 
			      item : item
			});
		}
	}
}