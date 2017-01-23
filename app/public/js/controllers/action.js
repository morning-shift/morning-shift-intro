'use strict';

angular.module('MorningShiftIntro')
.controller("ActionCtrl", ["$http", 
	function ActionCtrl($http) {

	var ctrl = this;

	$http.get('/api/actions')
	.then(function (res) {
		ctrl.actions = res.data;
	})
	.catch(function (res) {
		ctrl.isError = true;
	})

}]);