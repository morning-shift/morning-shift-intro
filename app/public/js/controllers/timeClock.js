'use strict';

angular.module('MorningShiftIntro')
.controller("TimeClockCtrl", ["$http", "$cookies", "$interval", 
	function TimeClockCtrl($http, $cookies, $interval) {

	var vm = this;

	var getIsClockedIn = function () {
		var val = $cookies.get("isClockedIn");

		if (val === "false") {
			return false;
		}

		if (val === "true") {
			return true;
		}

		return val;
	}; 

	var getClockedInDate = function () {
		var dateString = $cookies.get("clockedInDate");
		return new Date(parseInt(dateString));
	};

	var logError = function (err) {
		console.log(err);
	};

	updateViewModel();


	function startShift() {
		resetShiftDuration();

		$http.post('/api/shift/start')
		.then(shiftStarted)
		.catch(logError);
	}

	function shiftStarted (res) {
		var shiftData = res.data;

		vm.clockedInDate = Date.now();
		$cookies.put("clockedInDate", vm.clockedInDate);

		vm.isClockedIn = true;
		$cookies.put("isClockedIn", vm.isClockedIn);
		$cookies.put("shiftId", shiftData.shiftId);
	}

	function shiftStopped (res) {
		var data = res.data;
		console.log(data);

		vm.isClockedIn = false;
		$cookies.put("isClockedIn", vm.isClockedIn);
	}

	vm.toggleClockIn = function () {
		if (!vm.isClockedIn) {
			startShift();
		}
		else {
			var shiftData = {
				shiftId: $cookies.get("shiftId")
			};

			$http.put('/api/shift/stop', shiftData)
			.then(shiftStopped)
			.catch(shiftStopped);
		}
	};

	function updateViewModel() {
		vm.isClockedIn = getIsClockedIn();

		if (vm.isClockedIn) {
			vm.clockedInDate = getClockedInDate();

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

	function resetShiftDuration() {
		vm.shiftDuration = "00:00:00";
	}

	$interval(updateViewModel, 1000);

}]);