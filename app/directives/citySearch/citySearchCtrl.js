trvlApp.controller('citySearchCtrl', function($scope, constants) {
  $scope.test = 'City Search CTRL connected';

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
    // componentRestrictions: {country: 'fr'}
  };

  // autocomplete object that will actually initialize autocomplete
  var autocomplete = new google.maps.places.Autocomplete(input, options);

  // function to log place data
  var logPlaceDetails = function() {
    var rawPlaceData = autocomplete.getPlace();

    $scope.placeData = {};

    $scope.placeData.geo = getAddressComponents(rawPlaceData.address_components);
    $scope.placeData.placeString = rawPlaceData.formatted_address;
    $scope.placeData.placeId = rawPlaceData.place_id;
    $scope.placeData.geo.lat = rawPlaceData.geometry.location.lat();
    $scope.placeData.geo.lng = rawPlaceData.geometry.location.lng();
    $scope.placeData.iconUrl = rawPlaceData.icon;
    $scope.placeData.mapUrl = rawPlaceData.url;

    // console.log($scope.placeData);
    console.log($scope.placeData);
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
  autocomplete.addListener('place_changed', logPlaceDetails);

});
