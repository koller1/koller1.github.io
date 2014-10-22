var map;
var geocoder = new google.maps.Geocoder();
var markers = [];
var infoWindow = new google.maps.InfoWindow();

function initialize() {
	var mapOptions = {
		center: { lat: 0, lng: 0 },
		zoom: 2
	};
	
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
}

/*
 * findBounds() via searchBtn button
 * 	Finds bounds of location through Google Geocoder
 * 		Will call findEarthquakes() if bounds are found
 *  	Immediately returns if no geocoder results
 */
function findBounds() {
	var address = document.getElementById("address").value;
	if (address == '') return;
	
	geocoder.geocode({ 'address': address }, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			var n = results[0].geometry.viewport.getNorthEast().lat();
			var s = results[0].geometry.viewport.getSouthWest().lat();
			var e = results[0].geometry.viewport.getNorthEast().lng();
			var w = results[0].geometry.viewport.getSouthWest().lng();
			
			var bounds = new google.maps.LatLngBounds(results[0].geometry.viewport.getSouthWest(), results[0].geometry.viewport.getNorthEast());
			map.fitBounds(bounds);
			findEarthquakes(n, s, e, w);
		}
		else if (status == google.maps.GeocoderStatus.ZERO_RESULTS) {
			alert("No results found.");
		}
	});
}

/*
 * findEarthquakes()
 * Params: 
 *	north/south/east/west: Bounding box to search for earthquakes
 * Will call GeoNames API for all earthquakes in bounding rect and plot
 * 		them on the Google Map
 */
function findEarthquakes(north, south, east, west) {
	var xmlhttp = new XMLHttpRequest();
	var url = "http://api.geonames.org/earthquakesJSON?north=" + north + "&south=" + south + "&east=" + east + "&west=" + west + "&username=quaker476&maxRows=25";
	
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
			var jsonResponse = JSON.parse(xmlhttp.responseText);
			mapEarthquakes(jsonResponse.earthquakes);
		}
	}
	
	xmlhttp.open("GET", url, true);
	xmlhttp.send();
	
	function mapEarthquakes(quakes) {
		//Clear Map
		for (var i = 0; i < markers.length; i++) {
			markers[i].setMap(null);
		}
		markers = []; //Reset markers
		
		//Plot new earthquakes
		for(var i = 0; i < quakes.length; i++) {
			var quake = quakes[i];
			var latLng = new google.maps.LatLng(quake.lat, quake.lng);
			var marker = new google.maps.Marker({
				position: latLng,
				map: map,
				title: quake.eqid
			});
			
			marker.contentString = '<div id="infoWindowContent">' +
				'<div id="infoWindowContent">' +
				'<p><b>EQID: </b>' + quake.eqid + '</p>' +
				'<p><b>Magnitude: </b>' + quake.magnitude + '</p>' +
				'<p><b>Depth: </b>' + quake.depth + '</p>' +
				'<p><b>Date: </b>' + quake.datetime + '</p>' +
				'<p><b>Latitude: </b>' + quake.lat + '</p>' +
				'<p><b>Longitude: </b>' + quake.lng + '</p>' +
				'</div>'+
				'</div>';
			
			google.maps.event.addListener(marker, 'click', function() {
				infoWindow.setContent(this.contentString);
				infoWindow.open(map, this);
			});
			
			markers.push(marker);
			marker.setMap(map);
		}
	}
}

/*
 * findTopTen()
 * Params:
 *	minMag: Min magnitude to reduce recent results
 * Will call GeoNames API for recent earthquakes > minMag and sorted by date 
 * 		If less than 10 earthquakes are found in last year, use recursion to
 *		re-call API with (minMag - 0.5) magnitude threshold to increase results
 */
function findTopTen(minMag) {
	var xmlhttp = new XMLHttpRequest();
	var today = new Date(); //Forces date sort
	var formattedDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
	var url = 'http://api.geonames.org/earthquakesJSON?north=90&south=-90&east=180&west=-180&username=quaker476&maxRows=300&date=' + formattedDate + '&minMagnitude=' + minMag;

	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
			var jsonResponse = JSON.parse(xmlhttp.responseText);
			parseEarthquakes(jsonResponse.earthquakes);
		}
	}

	xmlhttp.open("GET", url, true);
	xmlhttp.send();

	function parseEarthquakes(quakes) {
		var lastYear = (today.getFullYear() - 1) + '-' + (today.getMonth() + 1) + '-' + today.getDate();

		//Find range of earthquakes from last year
		var i;
		for (i = 0; i < quakes.length && quakes[i].datetime > lastYear; i++);
		
		//Too few earthquakes (minMag is too high)
		if (i < 10) {
			findTopTen(minMag - 0.5);
		}
		
		//Create list
		else {
			var topTenList = document.getElementById('top-ten-list');
			var lastYearQuakes = quakes.slice(0, i);
		
			lastYearQuakes.sort(function(a, b) {
				return (a.magnitude < b.magnitude) ? 1 :
						((a.magnitude > b.magnitude) ? -1 : 0);
			});
			var topTenQuakes = lastYearQuakes.slice(0, 10);
			
			var list = "<ol>";
			for (var i = 0; i < topTenQuakes.length; i++) {
				list += '<li>' + topTenQuakes[i].eqid + ' - ' + topTenQuakes[i].magnitude + '</li>';
			}
			
			list += '</ol>';
			topTenList.innerHTML = list;
		}
	}
}
 
findTopTen(6.0);
google.maps.event.addDomListener(window, 'load', initialize);