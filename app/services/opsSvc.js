trvlApp.service('opsSvc', function(constants, $q, userSvc, tripSvc, stopSvc) {
  /*
  uses other services to pull data about the current user
  doesn't CHANGE any data, only retrieves, then inserts into each view's controller so userData can be accessed in each $scope
  one big promise chain because of all the async operations
  doesn't pull any data from firebase directly, uses other services
  */

  /* SECTION 1 - $SCOPE DATA OPS */

  // userData: pull current user data from userSvc, as it is in DB (mytrips & trip)
  this.getUserData = function(uid, scopeObj) {
    userSvc.getUserRefObj(uid)
    .then(
      function(response) {
        scopeObj.userData = response;
      }
    );
  };
  // currData: get active (trip.isActive = true) OR last trip ID for user and last stop Id for trip. Last based on end date.

  this.getCurrData = function(uid, scopeObj) {

    var currData = {}; // last tripId, last stopId, tripIsActive =  t/f
    tripSvc.getTripsForUser(uid) //"-K7qmc3o65fsEgmAkzHw"
    .then(
      function(response) {
        var userTrips = response; // fb array
        var latestEnd = 0; // set as 0 to compare
        for (var i = 0; i < userTrips.length; i++) {
          var trip = userTrips[i];
          var endTimestamp = trip.endTimestamp; // convert to number to compare
          if (trip.isActive === true) { // if active trip is found, set data and return:
            currData.tripIsActive = true;
            currData.lastTripId = trip.$id;
            break; // break out of for loop if active trip found
          }
          else { // if active trip not found:
            currData.tripIsActive = false;
            // console.log(endTimestamp);
            if (!endTimestamp) {
              // console.log("trip has undefined end date and is not set to 'isActive'");
            } else if (endTimestamp > latestEnd) {
              latestEnd = endTimestamp;
              currData.lastTripName = trip.name;
              currData.lastTripId = trip.$id; // set latest trip equal to trip id
            }
          }
        }
        return stopSvc.getStopsForTrip(currData.lastTripId);
      },
      constants.rejectLog // log for promise reject
    )
    .then(
      function(response) {
        var tripStops = response; // arr
        var latest = 0; // for comparison
        for (var k = 0; k < tripStops.length; k++) {
          var stop = tripStops[k];
          var departStamp = stop.departTimestamp;
          var arriveStamp = stop.arriveTimestamp;
          if (!departStamp && !arriveStamp) {
            console.log("a stop on the user's latest trip has no start or end date.");
          } else if (!departStamp && arriveStamp > latest) { // if no depart but arrived later
            // console.log(arriveStamp);
            latest = arriveStamp;
            currData.lastStop = stop.stopData.placeString;
            currData.lastStopData = stop.stopData;
            currData.lastStopId = stop.$id;
          } else if (departStamp && departStamp > latest) { // if depart stamp is present && later
            // console.log(departStamp);
            latest = departStamp;
            currData.lastStop = stop.stopData.placeString;
            currData.lastStopId = stop.$id;
          }
        }
        scopeObj.currData = currData; // once all done, final step, set scopeObj.currData to result
      },
      constants.rejectLog // log for promise reject
    );
  };

  // REFACTOR TO BE PART OF FUNCTION FACTORY W/ AUTH & PROMISE FUNCTIONS
  this.getMapUrl = function(lat, lon) {
    var mapUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + lat + "," + lon + "&zoom=11&size=145x145&maptype=roadmap&key=AIzaSyBGfrzCswijyHNboZzf6WIKYIrg33FFHiE";
    return mapUrl;
  };

  /* SECTION 2 - MYTRIPS VIEW OPS */

  // userTrips: pull all trips for a user (mytrips)
  this.getAllTripsForUser = function(uid) {
    return tripSvc.getTripsForUser(uid);
  };

  // add trip for user, based on new start trip.
  // long promise chain, with each step dependent on something that the previous generates, mainly IDs from new records
  this.startTripForUser = function(uid, tripObj, firstStopObj) {

    var def = $q.defer(); // create deferrer
    tripObj.isActive = true; // set trip as active
    tripSvc.addNewTrip(uid, tripObj) // add trip, returns promise
    .then(
      function(response) {
        var tripId = response.key(); // grab id key of newly added trip
        console.log("Trip obj added to /trips/ with id of ", tripId);
        return stopSvc.addStop(tripId, firstStopObj); // add stop to stops/:tripId arr, returns promise
      },
      constants.rejectLog
    )
    .then(
      function(response) { // when resolved
        var stopId = response.key();
        console.log("Stop obj added to /stops/ with id of ", stopId);
        return userSvc.changeUserOnTrip(uid, true); // set userObj.onTrip = true;
      },
      constants.rejectLog
    )
    .then(
      function(response) {
        console.log(response);
        def.resolve(response); // resolve promise,
      },
      constants.rejectLog
    );

    return def.promise; // return deferrer promise
  };

  this.addCompletedTripForUser = function(uid, tripObj) {
    tripObj.isActive = false;
    tripSvc.addNewTrip(uid, tripObj)
    .then(
      function(response) {
        console.log(response);
      }
    );
  };



  /* SECTION 3 - TRIP DETAIL VIEW OPS */

  // allStops: pull all stops for a trip (trip)
  this.getTripStopsData = function(tripId) {
    return stopSvc.getStopsForTrip(tripId);
  };

  //
  this.getTripData = function(uid, tripId) {
    return tripSvc.getTripObj(uid, tripId);
  };

  // will do everything to end a trip, should only be used if trip.isActive = true
  this.endTripForUser = function(uid, tripId) {
    var def = $q.defer();
    var currTimestamp = Date.parse(new Date().toString()); // for setting end timestamps
    userSvc.changeUserOnTrip(uid, false) // set userObj.onTrip = false;
    .then(
      function(response) {
        console.log("changed user.onTrip to false");
        return tripSvc.isTripActive(uid, tripId, false); // set trip.isActive to false
      }
    )
    .then(
      function(response) {
        console.log("set trip to inactive.");
        return tripSvc.setTripEndDate(uid, tripId, currTimestamp); // set trip end date to right now
      }
    )
    .then(
      function(response) {
        console.log("set trip end date to ", currTimestamp);
        def.resolve(response); // resolve promise with response from setting trip end date
      }
    );
    return def.promise;
  };

  this.addStopToTrip = function(tripId, stopObj) {
    // if they exist, parse dates into numerical timestamp to store in fb and parse in angular
    if (stopObj.arriveTimestamp) {
      stopObj.arriveTimestamp = Date.parse(stopObj.arriveTimestamp);
    } else if (!stopObj.arriveTimestamp) { // if no arrive stamp, set to now
      stopObj.arriveTimestamp = Date.parse(new Date().toString());
    }

    if (stopObj.departTimestamp) { // parse depart date of object if it exists
      stopObj.departTimestamp = Date.parse(stopObj.departTimestamp);
    }

    console.log(tripId, stopObj);
    // return stopSvc.addStop(stopObj); // return promise to ctrl
  };


});
