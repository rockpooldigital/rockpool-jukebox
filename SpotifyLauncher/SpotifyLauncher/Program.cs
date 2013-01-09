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
    static readonly object _sync = new object();
    static Regex _reTrack = new Regex(@"^spotify:track:", RegexOptions.IgnoreCase);

    static void Main(string[] args)
    {
      if (args.Length != 2)
      {
        Console.WriteLine("Please specify a stream id and base url");
        Console.WriteLine(@"e.g. SpotifyLauncher.exe 5089133484bdc27d64000001 ""http://wordpress.rockpool.local:8046""");
        return;
      }

      string streamId = args[0];
      string url = args[1];

      var socket = new Client(url);

      socket.On("player:requestRemotePlay", fn =>
      {
        Console.WriteLine("player:requestRemotePlay");
        if (fn.Json.Args.Length == 0
            || fn.Json.Args[0].item == null
            || fn.Json.Args[0].item.url == null)
        {
          return;
        }

        string urlParam = fn.Json.Args[0].item.url.ToString();
        var trackId = _reTrack.Replace(urlParam, "");

        lock (_sync)
        {
          Spotify.SpotifyHelpers.PlaySong(trackId);
          _currentId = trackId;
          _counter = 0;
          _timer.Start();
        }
      });

      socket.On("player:requestRemoteStop", fn =>
      {
        Console.WriteLine("player:requestRemoteStop");
        lock (_sync)
        {
          if (!String.IsNullOrEmpty(_currentId))
          {
            Spotify.SpotifyHelpers.StopPlayback();
            _currentId = null;
            _timer.Stop();
          }
        }
      });

      socket.Opened += (s, e) => socket.Emit("stream:join", new { stream = streamId });
      socket.Connect();

      _timer = new System.Timers.Timer(200);
      _timer.Elapsed += (s, e) =>
      {
        if (_counter++ < 4)
        {
          return;
        }

        if (_currentId != null)
        {
          lock (_sync)
          {
            if (_currentId != null)
            {
              var status = Spotify.SpotifyHelpers.GetStatus();
             // Console.WriteLine("{0},{1},{2}", status.Track, status.TrackID, _currentId);

              if (String.IsNullOrEmpty(status.TrackID) || !status.TrackID.EndsWith(_currentId))
              {
                //Console.WriteLine("stop detected");
                _timer.Stop();
                Spotify.SpotifyHelpers.StopPlayback();
                socket.Emit("player:remoteItemStopped", new { stream = streamId });
                _currentId = null;
                Console.WriteLine("player:remoteItemStopped");
              }
            }
          }
        }
      };

      while (Console.ReadKey().KeyChar != 'q') ;
    }
  }
}
