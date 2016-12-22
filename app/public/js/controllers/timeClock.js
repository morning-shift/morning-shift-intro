'use strict';

angular.module('MorningShiftIntro')
.controller("TimeClockCtrl", ["$http", "$cookies", "$interval", 
	function TimeClockCtrl($http, $cookies, $interval) {

	var vm = this;

	var isClockedIn = function () {
		var val = $cookies.get("isClockedIn");

		if (val === "false") {
			return false;
		}

		if (val === "true") {
			return true;
		}

		return val;
	}(); // closure

	vm.isClockedIn = isClockedIn;

	if (isClockedIn) {
		var dateString = $cookies.get("clockedInDate");
		vm.clockedInDate = new Date(parseInt(dateString));
		updateTimer();
	}

	vm.toggleClockIn = function () {
		vm.isClockedIn = !vm.isClockedIn;
		$cookies.put("isClockedIn", vm.isClockedIn);

		if (vm.isClockedIn) {
			vm.clockedInDate = Date.now();
			$cookies.put("clockedInDate", vm.clockedInDate);
		}
		// TODO: Send vm.isClockedIn to server ...
	};

	function updateTimer() {
		if (vm.isClockedIn) {
			var now  = Date.now();
			var diff = now - vm.clockedInDate;

			var totalSeconds = Math.floor(diff / 1000);

			var hours   = Math.floor(totalSeconds / (60 * 60));
			var minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
			var seconds = Math.floor((totalSeconds % (60 * 60)) % 60);

			if (hours < 10) {
				hours = "0" + hours;
			}
			if (minutes < 10) {
				minutes = "0" + minutes;
			}
			if (seconds < 10) {
				seconds = "0" + seconds;
			}

			vm.shiftDuration = hours + ":" + minutes + ":" + seconds;
		}
	}

	$interval(updateTimer, 1000);

}]);