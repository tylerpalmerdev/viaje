trvlApp.controller('mytripsCtrl', function($scope, currAuth, opsSvc, constants) {
  $scope.test = 'Mytrips ctrl connected!';

  // update user data whenever view reloads. Alternative: 3-way data bind?
  opsSvc.updateUserData(currAuth, $scope);
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

  $scope.addPastTrip = function(pastTripObj, startDate, endDate, firstStop) {
    //opsSvc.addPastTripForUser
  };

});
