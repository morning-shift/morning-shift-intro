'use strict';

angular.module('MorningShiftIntro')
.controller("MainMessageCtrl", ["member", "$http", "$cookies", 
function MainMessageCtrl(member, $http, $cookies) {
	var ctrl = this;

	var isSubmitting = false;
	ctrl.submit = function () {
		if (isSubmitting) {
			return;
		}

		ctrl.submitSuccess = null;
		ctrl.submitError = null;
		isSubmitting = true;

		var data = {
			author: ctrl.author,
			cause: ctrl.cause,
			action: ctrl.action,
			contact: ctrl.contact,
			anything: ctrl.anything,
			member: member
		};

		$http.post("/api/action", data)
		.then(function (res) {
			ctrl.submitSuccess = "Thank you!";
			isSubmitting = false;
		})
		.catch(function (res) {
			ctrl.submitError = "Sorry, it seems our website is broken right now.";
			isSubmitting = false;
			console.log(res);
		});
	};

}]);