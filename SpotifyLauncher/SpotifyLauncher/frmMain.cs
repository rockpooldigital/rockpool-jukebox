using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Threading;
using WebSocket4Net;
using SocketIOClient;
using System.Text.RegularExpressions;

namespace SpotifyLauncher
{
  public partial class frmMain : Form
  {
    public frmMain()
    {
      InitializeComponent();
    }


    private Client _socket;
    private string _currentId = null;
    private int _counter = 0;
    private void frmMain_Load(object sender, EventArgs e)
    {

    }

    public delegate void UpdateFormDel(Spotify.SpotifyStatus status);

    private void UpdateForm(Spotify.SpotifyStatus status)
    {
      ++_counter;
      if (this.InvokeRequired)
      {
        this.Invoke(new UpdateFormDel(UpdateForm), status);

      }

      lblPlaying.Text = String.Format("Currently Playing: {0} - {1}", status.Artist, status.Track);
      lblPosition.Text = String.Format("{0} / {1}", status.Position, status.Length);

      if (_counter < 4)
      {
        return;
      }


      if (!String.IsNullOrEmpty(_currentId) && !status.TrackID.EndsWith(_currentId))
      {
         Spotify.SpotifyHelpers.StopPlayback();
        _socket.Emit("player:remoteItemStopped", new { stream = txtStreamID.Text.Trim() });
        _currentId = null;
        Console.WriteLine("player:remoteItemStopped");
      }

      
    }

    private void InitSocket()
    {
      _socket = new Client(txtServerUrl.Text.Trim());


      _socket.Message += (s, a) =>
      {

      };
      _socket.On("player:requestRemotePlay", fn =>
        {

          var trackId = new Regex(@"^spotify:track:", RegexOptions.IgnoreCase).Replace(fn.Json.Args[0].item.url.ToString(), "");
          Spotify.SpotifyHelpers.PlaySong(trackId);
          _currentId = trackId;
          Console.WriteLine("player:requestRemotePlay");
          _counter = 0;
          
        });

      _socket.On("player:remoteItemStopped", fn =>
        {

          Console.WriteLine("player:remoteItemStopped");

          if (!String.IsNullOrEmpty(_currentId))
          {
            Spotify.SpotifyHelpers.StopPlayback();
            _currentId = null;
            //this.tmrUpdateStatus.Stop();
          }

        });


    

      Action join = () =>
      {
        
        _socket.Emit("stream:join", new { stream = txtStreamID.Text.Trim() });
      };
      //join();

    //  _socket.On("reconnect", a => join());

      _socket.Opened += (s, e) => join();
      _socket.Connect();
    }




    private void cmdStart_Click(object sender, EventArgs e)
    {

      InitSocket();

      tmrUpdateStatus.Interval = 500;
      tmrUpdateStatus.Start();
    }

    private void tmrUpdateStatus_Tick(object sender, EventArgs e)
    {
      Spotify.SpotifyStatus status = Spotify.SpotifyHelpers.GetStatus();
      UpdateForm(status);
    }

    private void txtStreamID_TextChanged(object sender, EventArgs e)
    {

    }

  }
}
