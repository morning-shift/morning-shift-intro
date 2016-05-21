'use strict';

angular.module('CopperHeart')
.controller('SubscribeController', 
    ['$scope', '$http', 'config', SubscribeController]);

function SubscribeController($scope, $http, config) {

    $scope.amount = undefined;

    var handler = StripeCheckout.configure({
        key: config.stripePublicKey,
        image: 'https://s3.amazonaws.com/stripe-uploads/acct_18818EAOogUkjkilmerchant-icon-1462511432881-black-circle.png',
        locale: 'auto',
        token: function(token) {
          // You can access the token ID with `token.id`.
          // Get the token ID to your server-side code for use.
          var data = {
            stripeTokenId: token.id,
            email: token.email,
            amount: $scope.amount
          };

          $http.post("/data/subscribe", data)
          .success(function () {
            $scope.isSuccess = true;
          })
          .error(function (data, status) {
            console.log(data);
          });
        }
    });
    
    $scope.subscribe = function (amount) {
        $scope.amount = amount;
        // Open Checkout with further options:
        handler.open({
          name: 'Join Phil Manijak',
          description: 'Contribute $' + amount + ' per month',
          amount: amount * 100
        });
    };
};