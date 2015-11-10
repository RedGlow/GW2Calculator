///<reference path="../../typings/jquery/jquery.d.ts"/>
///<reference path="../../typings/angularjs/angular.d.ts"/>
///<reference path="gw2api.d.ts"/>

interface IGw2CalculatorScope extends ng.IScope {
	expression: string;
	result: any;
	error: Error;
	parsingError: Error;
	columnSpaces: string;
}

angular.module("gw2-calculator", [
	'redglow.gw2api'
])
	.controller('MainController', ["$scope", "GW2API", ($scope: IGw2CalculatorScope, GW2API: IGW2API) => {
		$scope.expression = "3+4+getCost(5,buy)+6";
		$scope.result = null;
		$scope.error = null;
		$scope.parsingError = null;
		$scope.$watch('expression', function() {
			try {
				var parsed = gw2CalculatorParser.parse($scope.expression);
				$scope.result = parsed.toString();
				$scope.error = null;
				$scope.parsingError = null;
			} catch(e) {
				$scope.result = null;
				if(e.constructor.name === "SyntaxError") {
					$scope.parsingError = e;
					$scope.columnSpaces = new Array(e.column).join(' ');
				} else {
					$scope.error = e;
				}
			}
		});
	}])
	;