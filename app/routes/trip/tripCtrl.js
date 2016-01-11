trvlApp.controller('tripCtrl', function($scope, $stateParams, currAuth, opsSvc) {

  $scope.test = 'Mytrips ctrl connected!';

  // update user data whenever view reloads. Alternative: 3-way data bind?
  opsSvc.updateUserData(currAuth, $scope);
  opsSvc.updateTripData(currAuth, $scope);

  // since you are on a trip detail page, url has tripId param
  $scope.currTripId = $stateParams.tripId; // make ID available on scope

  $scope.addStopToTrip = function(tripId, stopObj) {
    console.log(tripId, stopObj);
    // opsSvc.addStopToTrip(tripId, stopObj);
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


});
