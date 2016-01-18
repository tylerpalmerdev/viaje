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
      console.log("Promise rejected:", err);
    },
    rejectDef: function(err) {
      console.log("Promise rejected:", err);
      def.reject();
    },
    nowStamp: function() {
      return Date.parse(new Date().toString());
    },
    parseStamp: function(dateObj) {
      return Date.parse(dateObj.toString());
    },
    isDef: function(objToCheck) {
      if (Array.isArray(objToCheck)) {
        for (var i = 0; i < objToCheck.length; i++) {
          if (objToCheck[i] === undefined || objToCheck[i] === null) {
            return false;
          }
        }
        return true;
      } else {
        if (objToCheck === undefined) {
          return false;
        } else {
          return true;
        }
      }
    }
  };
});
