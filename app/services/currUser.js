trvlApp.service('currUserSvc', function(userSvc, $q) {

  this.getCurrUserData = function(uid) {
    var def = $q.defer();
    var userData = {};
    userSvc.getUserRefObj(uid)
    .then(
      function(response) {
        userData.name = response.name;
        userData.uid = response.$id;
        userData.onTrip = true; // will become response.onTrip
        userData.currTripId = '123ab'; // will become response.currTripId
        userData.currLoc = 'Havana, Cuba'; // will become response.currLoc
        def.resolve(userData);
      }
    );
    /*
    // could also run another async function above, return the promise..
    .then(
      function(response) {
        userSvc.currTripId = response.tripId;
        def.resolve(userData) // instead of above
      }
    )
    */
    return def.promise;
  };

});
