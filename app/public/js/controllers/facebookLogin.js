'use strict';

angular.module('MorningShiftIntro')
.controller("FacebookLoginCtrl", ["$scope", "$http", 
function FacebookLoginCtrl($scope, $http) {
	var vm = this;

	$scope.$on('facebook-sdk-loaded', init);

	// Now that we've initialized the JavaScript SDK, we call 
	// FB.getLoginStatus().  This function gets the state of the
	// person visiting this page and can return one of three states to
	// the callback you provide.  They can be:
	//
	// 1. Logged into your app ('connected')
	// 2. Logged into Facebook, but not your app ('not_authorized')
	// 3. Not logged into Facebook and can't tell if they are logged into
	//    your app or not.
	//
	// These three cases are handled in the callback function.
	function init() {
		FB.Event.subscribe('auth.authResponseChange', checkLoginState);
		FB.getLoginStatus();
	}

	// This is called with the results from from FB.getLoginStatus().
	function statusChangeCallback(response) {
		console.log('statusChangeCallback');
		console.log(response);
		// The response object is returned with a status field that lets the
		// app know the current login status of the person.
		// Full docs on the response object can be found in the documentation
		// for FB.getLoginStatus().
		if (response.status === 'connected') {
			// Logged into your app and Facebook.
			testAPI(response);
		} 
		else if (response.status === 'not_authorized') {
			// The person is logged into Facebook, but not your app.
			vm.status = 'Please log into this app.';
		} 
		else {
			// The person is not logged into Facebook, so we're not sure if
			// they are logged into this app or not.
			vm.status = 'Please log into Facebook.';
		}
	}

	// This function is called when someone finishes with the Login
	// Button.  See the onlogin handler attached to it in the sample
	// code below.
	function checkLoginState() {
		FB.getLoginStatus(function (response) {
			statusChangeCallback(response);
		});
	}


	// Here we run a very simple test of the Graph API after login is
	// successful.  See statusChangeCallback() for when this call is made.
	function testAPI(loginResponse) {
		var authResponse = loginResponse.authResponse;
		$http.post('api/oauth/facebook/token', {
			userID: authResponse.userID,
			accessToken: authResponse.accessToken
		});

		FB.api('/me', function (response) {
			$scope.$apply(function() {
				vm.status = 'Thanks for logging in, ' + response.name + '!';
			});
		});

		// FB.api('/me/feed', function (response) {
		// 	console.log(response);
		// });
	}
}]);