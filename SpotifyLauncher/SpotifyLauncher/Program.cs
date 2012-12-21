using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using JariZ;
using SocketIOClient;
using System.Text.RegularExpressions;
using System.Timers;

namespace SpotifyLauncher
{
  class Program
  {

    static string _currentId = null;
    static int _counter = 0;
    static Timer _timer;

    static void Main(string[] args)
    {

      //frmMain frm = new frmMain();
      //frm.ShowDialog();

      if (args.Length != 2)
      {
        Console.WriteLine("PLease specify a stream id and url");
        return;
      }

      string streamId = args[0];
      string url = args[1];

      var socket = new Client(url);

      socket.On("player:requestRemotePlay", fn =>
      {
        var trackId = new Regex(@"^spotify:track:", RegexOptions.IgnoreCase).Replace(fn.Json.Args[0].item.url.ToString(), "");
        Spotify.SpotifyHelpers.PlaySong(trackId);
        _currentId = trackId;
        Console.WriteLine("player:requestRemotePlay");
        _counter = 0;
        _timer.Start();
      });

      socket.On("player:requestRemoteStop", fn =>
      {
        Console.WriteLine("player:requestRemoteStop");

        if (!String.IsNullOrEmpty(_currentId))
        {
          Spotify.SpotifyHelpers.StopPlayback();
          _currentId = null;
          _timer.Stop();
        }

      });

      Action join = () =>
      {
        socket.Emit("stream:join", new { stream = streamId });
      };

      socket.Opened += (s, e) => join();
      socket.Connect();

      _timer = new System.Timers.Timer(500);
      _timer.Elapsed += (s, e) =>
      {
        if (_counter++ < 4)
        {
          return;
        }

        if (_currentId != null)
        {
          var status = Spotify.SpotifyHelpers.GetStatus();

          if (!String.IsNullOrEmpty(_currentId) && !status.TrackID.EndsWith(_currentId))
          {
            _timer.Stop();
            Spotify.SpotifyHelpers.StopPlayback();
            socket.Emit("player:remoteItemStopped", new { stream = streamId });
            _currentId = null;
            Console.WriteLine("player:remoteItemStopped");
          }

        }
      };

      while (Console.ReadKey().KeyChar != 'q') ;
    }
  }
}
