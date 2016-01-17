/*
Factory of utility functions with 0 dependencies
*/
trvlApp.factory('util', function() {
  return {
    getMapUrl: function(lat, lon) {
      var mapUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + lat + "," + lon + "&zoom=11&size=145x145&maptype=roadmap&key=AIzaSyBGfrzCswijyHNboZzf6WIKYIrg33FFHiE";
      return mapUrl;
    },
    rejectLog: function(err) {
      console.log('Promise rejected, error message: ', err);
    }
  };
});
