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

	  socket.on('stream:itemSkipped', function(data) {
	    socket.broadcast.to(data.stream).emit('stream:itemSkipped', {
	      stream : data.stream, id : data.id
	    });
	  });

	  socket.on('player:requestRemotePlay', function(data) {
	  	console.log("spot play");
	  	socket.broadcast.to(data.stream).emit('player:requestRemotePlay', {
	      stream : data.stream, item : data.item
	    });
	  });

	  socket.on('player:requestRemoteStop', function(data) {
	  	console.log("spot stop");
	  	socket.broadcast.to(data.stream).emit('player:requestRemotePlay');
	  });

	  socket.on('player:remoteItemStopped', function(data) {
	  	socket.broadcast.to(data.stream).emit('player:remoteItemStopped');
	  });
	});

	return {
		notifyVote : function(item) {
			//console.log('notifying', item);
			io.sockets.in(item.streamId).emit('stream:itemVoted', {
			      stream : item.streamId, 
			      id : item._id, 
			      totalVotes : item.totalVotes
			});
		},

		notifyAdd : function(item) {
			io.sockets.in(item.streamId).emit('stream:itemAdded', {
			      stream : item.streamId, 
			      id : item._id, 
			      item : item
			});
		},

		notifyPlay: function(item) {
			io.sockets.in(item.streamId).emit('host:playingItem', {
			      stream : item.streamId, 
			      id : item._id//, 
			    //  item : item
			});
		},

		notifyRemove :function(item) {
			io.sockets.in(item.streamId).emit('stream:itemRemoved', {
			      stream : item.streamId, 
			      id : item._id//, 
			    //  item : item
			});
		}
	}
}