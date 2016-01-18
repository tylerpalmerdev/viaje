trvlApp.controller('mytripsCtrl', function($scope, currAuth, dataOps, mytripsOps, constants, util) {
  // -- $SCOPE VARIABLES -- //
  dataOps.getUserData(currAuth.uid, $scope); // $scope.userData
  dataOps.getCurrData(currAuth.uid, $scope); // $scope.currData
  mytripsOps.getAllTripsForUser(currAuth.uid, $scope); // $scope.userTrips
  // set these as empty objects to help validate forms in mytripsOps
  $scope.newTrip = {};
  $scope.firstStopObj = {};
  $scope.oldTripObj = {};

  // -- $SCOPE FUNCTIONS -- //
  $scope.getMapUrl = function(lat, lon) {
    return util.getMapUrl(lat, lon);
  };

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

  // add a trip from the past, start/end dates in past
  $scope.addPastTrip = function(oldTripObj) {
    mytripsOps.addCompletedTripForUser(currAuth.uid, oldTripObj);
    $scope.oldTripObj = {}; // reset for ang date input error
  };

  // log to check $scope
  console.log($scope);

});
