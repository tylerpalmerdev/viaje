trvlApp.controller('mytripsCtrl', function($scope, currAuth, opsSvc, constants) {
  // -- GET DATA FOR MY TRIPS $SCOPE -- //
  // $scope.userData
  opsSvc.getUserData(currAuth.uid, $scope);

  // $scope.currData (last stop, last trip)
  opsSvc.getCurrData(currAuth.uid, $scope);

  // $scope.userTrips
  opsSvc.getAllTripsForUser(currAuth.uid)
  .then(
    function(response) {
      $scope.userTrips = response;
    }
  );

  // -- UI VARIABLES & FUNCTIONS -- //


  // -- MY TRIPS $SCOPE FUNCTIONS -- //

  // start a new trip (start date of today, first stop chosen in view)
  $scope.startTrip = function(newTripObj, firstStopObj) {
    opsSvc.startTripForUser(currAuth.uid, newTripObj, firstStopObj)
    .then( // after trip is started:
      function(response) {
        opsSvc.getUserData(currAuth.uid, $scope);  // update $scope.userData
      }
    );
  };

  $scope.addPastTrip = function(oldTripObj) {
    opsSvc.addCompletedTripForUser(currAuth.uid, oldTripObj);
    $scope.oldTripObj = {}; // reset for ang date input error
  };

  // log to check $scope //
  console.log($scope);

});
