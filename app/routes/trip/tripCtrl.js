trvlApp.controller('tripCtrl', function($scope, $stateParams, currAuth, opsSvc) {
  // for UI
  $scope.currTripStats = {
    countries: 2,
    stops: 5,
    distance: "1,545 mi"
  };
  $scope.showForm = false; // hide new stop form by default
  $scope.toggleForm = function() {
    $scope.showForm = !$scope.showForm;
  };
  // THE MAP IMG + THIS SHOULD BE A CUSTOM DIRECTIVE
  $scope.getMapUrl = function(lat, lon) {
    var mapUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + lat + "," + lon + "&zoom=11&size=145x145&maptype=roadmap&key=AIzaSyBGfrzCswijyHNboZzf6WIKYIrg33FFHiE";
    return mapUrl;
  };

  // update user data whenever view reloads. Alternative: 3-way data bind?
  opsSvc.updateUserData(currAuth, $scope);
  opsSvc.updateTripData(currAuth, $scope);

  // since you are on a trip detail page, url has tripId param
  $scope.currTripId = $stateParams.tripId;
  $scope.allStops = opsSvc.getTripStopsData($stateParams.tripId);

  $scope.addStopToTrip = function(tripId, stopObj) {
    opsSvc.addStopToTrip(tripId, stopObj);
    // clear dates after clicking due to angular ng-model/ date input error
    stopObj.departTimestamp = undefined;
    stopObj.arriveTimestamp = undefined;
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
