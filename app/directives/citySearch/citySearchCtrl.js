trvlApp.controller('citySearchCtrl', function($scope, constants) {
  $scope.test = 'Two way directive pass';

  // set bounds of search to the whole world
  var bounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(-90, -180),
    new google.maps.LatLng(90, 180)
  );

  // get place search input element (only one on page at a time, because ID)
  var input = document.getElementById('place-search-input');

  // create options object
  var options = {
    bounds: bounds,
    types: ['(cities)']
  };

  // new autocomplete object that will actually initialize autocomplete
  var autocomplete = new google.maps.places.Autocomplete(input, options);

  // function to log place data
  var getPlaceDetails = function() {
    // raw place data from autocomplete, returned after city selected
    var rawPlaceData = autocomplete.getPlace();

    $scope.cityData = {}; // create city data object

    // add to cityData object from raw place data
    $scope.cityData.geo = getAddressComponents(rawPlaceData.address_components);
    $scope.cityData.placeString = rawPlaceData.formatted_address;
    $scope.cityData.placeId = rawPlaceData.place_id;
    $scope.cityData.geo.lat = rawPlaceData.geometry.location.lat();
    $scope.cityData.geo.lng = rawPlaceData.geometry.location.lng();
    $scope.cityData.iconUrl = rawPlaceData.icon;
    $scope.cityData.mapUrl = rawPlaceData.url;
    $scope.$apply(); // update scope
    console.log('Place data pulled from google API');
  };

  // function to get correct address components from address array
  var getAddressComponents = function(addCompArr) {
    var finalComps = {};
    var len = addCompArr.length;
    // for all address components in array
    finalComps.city = addCompArr[0].long_name; // always first
    finalComps.region = addCompArr[len - 2].long_name; // always second to last
    finalComps.country = addCompArr[len - 1].long_name; // always last

    return finalComps;
  };

  // when new place is selected, log results obj of place
  autocomplete.addListener('place_changed', getPlaceDetails);

});
