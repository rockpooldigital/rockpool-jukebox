using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using JariZ;

namespace SpotifyLauncher.Spotify
{
  public static class SpotifyHelpers
  {

    public static void StopPlayback()
    {
       SpotifyAPI api = new SpotifyAPI(SpotifyAPI.GetOAuth(), "andrew.spotilocal.com");

      Responses.CFID cfid = api.CFID;
     
      if (cfid.error == null)
      {
        Responses.Status status = api.Pause;
      }
    }

    public static SpotifyStatus PlaySong(string trackId)
    {

      SpotifyStatus status = new SpotifyStatus();

      SpotifyAPI api = new SpotifyAPI(SpotifyAPI.GetOAuth(), "andrew.spotilocal.com");

      Responses.CFID cfid = api.CFID;

      if (cfid.error == null)
      {
        string spotifyUri = String.Format("spotify:track:{0}", trackId);

        api.URI = spotifyUri;
        Responses.Status currentStatus = api.Play;

        if (currentStatus.track.track_resource.uri == spotifyUri)
        {
          status = MapModel(currentStatus, status);
        }

      }

      return status;
    }

    public static SpotifyStatus GetStatus()
    {
      SpotifyStatus status = new SpotifyStatus();

      SpotifyAPI api = new SpotifyAPI(SpotifyAPI.GetOAuth(), "andrew.spotilocal.com");

      Responses.CFID cfid = api.CFID;

      if (cfid.error == null)
      {

        Responses.Status currentStatus = api.Status;

        if (currentStatus.track != null)
        {
          status = MapModel(currentStatus, status);
          status.Artwork = api.getArt(currentStatus.track.album_resource.uri);
        }

      }

      return status;
    }

    private static SpotifyStatus MapModel(Responses.Status currentStatus, SpotifyStatus status)
    {
      status.Length = currentStatus.track.length;
      status.Album = currentStatus.track.album_resource.name;
      status.Artist = currentStatus.track.artist_resource.name;
      status.Track = currentStatus.track.track_resource.name;
      status.TrackID = currentStatus.track.track_resource.uri;
      status.Position = currentStatus.playing_position;
      status.Playing = currentStatus.playing;

      status.Success = true;

      return status;
    }

  }
}
