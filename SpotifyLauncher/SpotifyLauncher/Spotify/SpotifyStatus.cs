using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace SpotifyLauncher.Spotify
{
  public class SpotifyStatus
  {
        public bool Success { get; set; }
        public double Position { get; set; }
        public int Length { get; set; }
        public string Artist { get; set; }
        public string Track { get; set; }
        public string Album { get; set; }
        public string TrackID { get; set; }
        public string Artwork { get; set; }
        public bool Playing { get; set; }

        public SpotifyStatus()
        {
            Success = false;
        }

  }
}
