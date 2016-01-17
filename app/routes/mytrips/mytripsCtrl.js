trvlApp.controller('mytripsCtrl', function($scope, currAuth, dataOps, mytripsOps, constants, util) {
  // -- GET DATA FOR MY TRIPS $SCOPE -- //
  // $scope.userData
  dataOps.getUserData(currAuth.uid, $scope);

  // $scope.currData (last stop, last trip)
  dataOps.getCurrData(currAuth.uid, $scope);

  // $scope.userTrips
  mytripsOps.getAllTripsForUser(currAuth.uid, $scope);

  // -- UI VARIABLES & FUNCTIONS -- //
  $scope.getMapUrl = function(lat, lon) {
    return util.getMapUrl(lat, lon);
  };

  // -- MY TRIPS $SCOPE FUNCTIONS -- //

  // start a new trip (start date of today, first stop chosen in view)
  $scope.startTrip = function(newTripObj, firstStopObj) {
    mytripsOps.startTripForUser(currAuth.uid, newTripObj, firstStopObj)
    .then( // after trip is started:
      function(response) {
        dataOps.getUserData(currAuth.uid, $scope);  // update $scope.userData
        dataOps.getCurrData(currAuth.uid, $scope);  // update $scope.userData
      }
    );
  };

  $scope.addPastTrip = function(oldTripObj) {
    mytripsOps.addCompletedTripForUser(currAuth.uid, oldTripObj);
    $scope.oldTripObj = {}; // reset for ang date input error
  };

  // log to check $scope //
  console.log($scope);

});
