trvlApp.controller('tripCtrl', function($scope, $stateParams, currAuth, dataOps, tripOps, util) {
  // $SCOPE VARIABLES
  $scope.currTripId = $stateParams.tripId; // trip id of current page, from url
  $scope.showForm = false; // default: don't show form to add new stop
  dataOps.getUserData(currAuth.uid, $scope); // $scope.userData
  dataOps.getCurrData(currAuth.uid, $scope); // $scope.currData
  tripOps.getTripStopsData($stateParams.tripId, $scope); // $scope.allStops
  tripOps.getTripData(currAuth.uid, $stateParams.tripId, $scope); // $scope.tripData
  $scope.currTripStats = {   // placeholder. want to build stats svc later
    countries: 2,
    stops: 5,
    distance: "1,545 mi"
  };
  /*
  assigning blank objects to these $scope variables now assists in validation of form completeness when a new stop is added to a trip. See tripOps service for more details.
  */
  $scope.newStopObj = {};
  $scope.pastStopObj = {};

  // $SCOPE FUNCTIONS
  $scope.toggleForm = function() {
    $scope.showForm = !$scope.showForm;
  };

  // For stop maps. Later: move this to stop map custom directive
  $scope.getMapUrl = function(lat, lon) {
    return util.getMapUrl(lat, lon);
  };

  // add past, completed stop. Will be used for active & completed trips.
  $scope.addPastStopToTrip = function(stopObj) {
    tripOps.addPastStopToTrip($scope.currTripId, stopObj, $scope);
    $scope.newStopObj = {}; // clear the stop obj due to ang date error
    $scope.pastStopObj = {}; // ""
  };

  // add new, current trip. for active trips only.
  $scope.addCurrentStopToTrip = function(stopObj) {
    // determine last stop id & pass into tripOps function call
    tripOps.addCurrentStopToTrip($scope.currTripId, stopObj, $scope.currData.lastStopId)
    .then(
      function(response) {
        dataOps.getCurrData(currAuth.uid, $scope); // update currData on page
      }
    );
    $scope.newStopObj = {}; // clear the stop obj due to ang date error
  };

  // will only be available if current trip is active
  $scope.endCurrentTrip = function() {
    tripOps.endTripForUser(currAuth.uid, $scope.currTripId, $scope.currData.lastStopId)
    .then(
      function(response) {
        console.log('trip ended. Response:', response);
        dataOps.getCurrData(currAuth.uid, $scope); // update currData on page
      },
      util.rejectLog
    );
  };

  console.log($scope); // for monitoring/ debugging

}); // END
