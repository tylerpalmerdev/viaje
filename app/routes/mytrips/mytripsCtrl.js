trvlApp.controller('mytripsCtrl', function($scope, currAuth, opsSvc, constants) {
  $scope.test = 'Mytrips ctrl connected!';

  // update user data whenever view reloads. Alternative: 3-way data bind?
  opsSvc.getUserData(currAuth.uid)
  .then(
    function(response) {
      $scope.userData = response;
    }
  );

  opsSvc.getAllTripsForUser(currAuth.uid)
  .then(
    function(response) {
      $scope.userTrips = response;
    }
  );

  opsSvc.updateTripData(currAuth, $scope);

  $scope.startTrip = function(newTripObj, firstStopObj) {
    opsSvc.startTripForUser(currAuth.uid, newTripObj, firstStopObj)
    .then( // after trip is started:
      function(response) {
        opsSvc.updateUserData(currAuth, $scope);  // update $scope.userData
        opsSvc.updateTripData(currAuth, $scope); // update $scope.tripData
      }
    );
  };

  $scope.endCurrentTrip = function() {
    opsSvc.endTripForUser(currAuth.uid) //, $scope.tripData.latestTrip.$id)
    .then(
      function(response) {
        console.log('trip ended ', response);
        opsSvc.updateUserData(currAuth, $scope);  // update $scope.userData
        opsSvc.updateTripData(currAuth, $scope); // update $scope.tripData
      }
    );
  };

  $scope.addPastTrip = function(oldTripObj) {
    opsSvc.addCompletedTripForUser(currAuth.uid, oldTripObj);
    $scope.oldTripObj = {}; // reset for ang date input error
  };

});
