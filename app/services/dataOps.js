trvlApp.service('dataOps', function(util, userSvc, tripSvc, stopSvc) {
  /*
  Used to retrieve userData and currData for $scope in each route
  */
  // userData: pull current user data from userSvc, as it is in DB (mytrips & trip)
  this.getUserData = function(uid, scopeObj) {
    userSvc.getUserRefObj(uid)
    .then(
      function(response) {
        scopeObj.userData = response;
      }
    );
  };

  // currData: get active (trip.isActive = true) OR last trip ID for user and last stop Id for trip. "Last" based on most recent end date.
  this.getCurrData = function(uid, scopeObj) {
    var currData = {}; // last tripId/name, last stopId/name, tripIsActive (t/f)
    tripSvc.getTripsForUser(uid) // get all trips for user
    .then( // when loaded:
      function(response) { // response is firebase array
        var latestEnd = 0; // to see which trip is latest, set as 0 to compare
        for (var i = 0; i < response.length; i++) {
          var trip = response[i];
          var endTimestamp = trip.endTimestamp; // in ms timestamp format
          if (trip.isActive === true) { // if active trip is found
            currData.tripIsActive = true; // set data
            currData.lastTripId = trip.$id; // ""
            currData.lastTripName = trip.name; // ""
            break; // break out of for loop since active trip was found
          } else if (!endTimestamp) { // if trip is inactive but has no end date
            console.log("trip id", trip.$id, "has undefined end date and is not set to 'isActive. Please address.'");
            continue; // continue because trip has corrupt end date data
          } else if (endTimestamp > latestEnd) {
            latestEnd = endTimestamp;
            currData.tripIsActive = false;
            currData.lastTripName = trip.name;
            currData.lastTripId = trip.$id; // set latest trip equal to trip id
          }
        }
        // after last trip is established, get data about last stop on last trip
        return stopSvc.getStopsForTrip(currData.lastTripId);
      },
      util.rejectLog // log for promise reject
    )
    .then( // once loaded:
      function(response) { // response is arr of all stops for trip
        var latestDepart = 0; // for comparison
        for (var k = 0; k < response.length; k++) { // for all stops in trip:
          var stop = response[k];
          var departStamp = stop.departTimestamp;
          var arriveStamp = stop.arriveTimestamp;
          if (!(util.isDef(departStamp) || util.isDef(arriveStamp))) {
            console.log("Stop", stop.$id, "has no start or end date. Plese address.");
            continue; // skip this stop, it has no start or end data
          } else if (!departStamp && arriveStamp > latestDepart) { // if no depart but arrived later
            latestDepart = arriveStamp;
            currData.lastStop = stop.stopData.placeString;
            currData.lastStopData = stop.stopData;
            currData.lastStopId = stop.$id;
          } else if (departStamp && departStamp > latestDepart) { // if depart stamp is present && later
            latestDepart = departStamp;
            currData.lastStop = stop.stopData.placeString;
            currData.lastStopId = stop.$id;
          }
        }
        // once all done, final step, set scopeObj.currData to result.
        // this allows the function to be applied to a ctrl's $scope in one line.
        scopeObj.currData = currData;
      },
      util.rejectLog // log for promise reject
    );
  };

}); //END
