///<reference path="../../typings/jquery/jquery.d.ts"/>
///<reference path="../../typings/angularjs/angular.d.ts"/>
///<reference path="gw2api.d.ts"/>
///<reference path="types.ts"/>

interface IGw2CalculatorScope extends ng.IScope {
	expression: string;
	compressedExpression: string;
	parsedExpression: string;
	result: any;
	error: Error;
	parsingError: Error;
	columnSpaces: string;
	preError: string;
    inError: string;
	postError: string;
}

interface INodeRendererScope extends ng.IScope {
	value: any;
	type: string;
}

interface IFile {
	id: string;
	icon: string;
}

interface IMyRootScope extends ng.IRootScopeService {
	copperIcon: string;
	silverIcon: string;
	goldIcon: string;
}

interface ILineBreaker {
    break(lines: string[], startLine: number, startColumn: number, endLine: number, endColumn: number): string;
}

class CacheLine {
    result: any;
    queuedPromises: ng.IPromise<any>[];
}

angular.module("gw2-calculator", [
	'LZW',
	'base64',
	'redglow.gw2api'
])
.factory('RecursionHelper', ['$compile', function($compile){
    return {
        /**
         * Manually compiles the element, fixing the recursion loop.
         * @param element
         * @param [link] A post-link function, or an object with function(s) registered via pre and post properties.
         * @returns An object containing the linking functions.
         */
        compile: function(element, link){
            // Normalize the link parameter
            if(angular.isFunction(link)){
                link = { post: link };
            }

            // Break the recursion loop by removing the contents
            var contents = element.contents().remove();
            var compiledContents;
            return {
                pre: (link && link.pre) ? link.pre : null,
                /**
                 * Compiles and re-adds the contents
                 */
                post: function(scope, element){
                    // Compile the contents
                    if(!compiledContents){
                        compiledContents = $compile(contents);
                    }
                    // Re-add the compiled contents to the element
                    compiledContents(scope, function(clone){
                        element.append(clone);
                    });

                    // Call the post-linking function, if any
                    if(link && link.post){
                        link.post.apply(null, arguments);
                    }
                }
            };
        }
    };
}])
.directive('nodeUnknown', [function(): ng.IDirective {
	return {
		template: "<p>unknown type</p>"
	};
}])
.directive('nodeNumberRenderer', [function() {
	return {
		scope: {
			value: '='
		},
		template: "{{value}}"
	};
}])
.directive('nodeBooleanRenderer', [function() {
	return {
		scope: {
			value: '='
		},
		template: "{{value}}"
	};
}])
.directive('nodeItemRenderer', [function() {
	return {
		scope: {
			item: '='
		},
		template: "<img class='item-image' ng-src='{{item.icon}}'/> {{item.name}}"
	}
}])
.directive('nodeCostRenderer', [function(): ng.IDirective {
	return {
		scope: {
			cost: '='
		},
		controller: ['$scope', "$rootScope", function($scope, $rootScope: IMyRootScope) {
			var data = this;
            $scope.$watch('cost', () => {
                var cost = $scope.cost;
                data.negative = false;
                if(cost < 0) {
                    data.negative = true;
                    cost = -cost;
                }
                cost = Math.round(cost);
                data.copper = cost % 100;
                cost -= data.copper;
                cost /= 100;
                data.silver = cost % 100;
                cost -= data.silver;
                cost /= 100;
                data.gold = cost % 100;
            });
			$rootScope.$watch('goldIcon', function() {
				data.goldIcon = $rootScope.goldIcon;
				data.silverIcon = $rootScope.silverIcon;
				data.copperIcon = $rootScope.copperIcon;
			});
		}],
		controllerAs: 'data',
		template: "<span ng-if='data.negative'>-</span> <span ng-if='data.gold != 0'>{{data.gold}}<img class='coin-icon' ng-src='{{data.goldIcon}}'/></span> <span ng-if='data.gold != 0 || data.silver != 0'>{{data.silver}}<img class='coin-icon' ng-src='{{data.silverIcon}}'/></span> {{data.copper}}<img class='coin-icon' ng-src='{{data.copperIcon}}'/>"
	};
}])
.directive('nodeTableRenderer', ["RecursionHelper", function(RecursionHelper) {
	return {
		scope: {
			table: '='
		},
		template:
"<table class='table'>" +
	"<thead>" +
		"<tr>" +
			"<th ng-repeat='header in table.headers'>{{header}}</th>" +
		"</tr>" +
	"</thead>" +
	"<tbody>" +
		"<tr ng-repeat='content in table.contents'>" +
			"<td ng-repeat='cell in content'>" +
				"<node-renderer value='cell'></node-renderer>" +
			"</td>" +
		"</tr>" +
	"</tbody>" +
"</table>",
		compile: function(element) {
            // Use the compile function from the RecursionHelper,
            // And return the linking function(s) which it returns
            return RecursionHelper.compile(element);
        }
	};
}])
.directive('nodeRenderer', ["$q", "GW2API", "$compile", function($q: ng.IQService, api: IGW2API, $compile: ng.ICompileService): ng.IDirective {
	return {
		scope: {
			value: '='
		},
		template:
			"<div ng-switch on='type'>" +
				"<node-number-renderer ng-switch-when='number' value='value.value'></node-number-renderer>" +
				"<node-boolean-renderer ng-switch-when='boolean' value='value.value'></node-boolean-renderer>" +
				"<node-cost-renderer ng-switch-when='cost' cost='value.value'></node-cost-renderer>" +
				"<node-item-renderer ng-switch-when='item' item='value.item'></node-item-renderer>" +
				"<node-table-renderer ng-switch-when='table' table='value'></node-table-renderer>" +
				"<node-unknown ng-switch-default></node-unknown>" +
			"</div>",
		link: function(
            scope: INodeRendererScope,
            instanceElement: ng.IAugmentedJQuery,
            instanceAttributes: ng.IAttributes,
            controller: {},
            transclude: ng.ITranscludeFunction
        ): void {
			scope.$watch('value', function() {
				if(scope.value instanceof Typing.NumberWrapper) {
					scope.type = "number";
				} else if(scope.value instanceof Typing.Cost) {
					scope.type = "cost";
				} else if(scope.value instanceof Typing.ItemWrapper) {
					scope.type = "item";
				} else if(scope.value instanceof Typing.Table) {
					scope.type = "table";
				} else if(scope.value instanceof Typing.Boolean) {
					scope.type = "boolean";
				} else {
					scope.type = "unknown";
				}
				console.log("scope.value =", scope.value, "; type =", scope.type);
			});
		}
	};
}])
.controller('MainController', [
    "$q",             "$scope",                    "GW2API",        "$http",                "$rootScope",             "$location",                    "$injector",                         "lzw","$base64", "LineBreaker",
    ($q: ng.IQService, $scope: IGw2CalculatorScope, GW2API: IGW2API, $http: ng.IHttpService, $rootScope: IMyRootScope, $location: ng.ILocationService, $injector: ng.auto.IInjectorService, lzw, $base64, LineBreaker: ILineBreaker) => {
/*
makeTable(Item, Key Cost Through Stabilizing Matrix, Should I buy keys with Stabilizing Matrices?, Sell encryption with order, Sell contents with order)
(
getItem(75919),
cost(getCost(73248,buy)/2),
getCost(73248,buy)/2<=2000,
cost(getCost(75919,sell)),
cost(
getFrequency(Cracked_Fractal_Encryption, Manuscript)*6000+ 
getFrequency(Cracked_Fractal_Encryption, Postulate)*2000+
getFrequency(Cracked_Fractal_Encryption, Proof)*3000+
getFrequency(Cracked_Fractal_Encryption, Treatise)*2500+ 
getFrequency(Cracked_Fractal_Encryption, Potent Blood)*getCost(24294,sell)+
getFrequency(Cracked_Fractal_Encryption, Large Bone)*getCost(24341,sell)+
getFrequency(Cracked_Fractal_Encryption, Large Claw)*getCost(24350,sell)+
getFrequency(Cracked_Fractal_Encryption, Large Scale)*getCost(24288,sell)+
getFrequency(Cracked_Fractal_Encryption, Large Fang)*getCost(24356,sell)+
getFrequency(Cracked_Fractal_Encryption, Intricate Totem)*getCost(24299,sell)+
getFrequency(Cracked_Fractal_Encryption, Incandescent Dust)*getCost(24276,sell)+
getFrequency(Cracked_Fractal_Encryption, Aetherized Skin)*(
getCost(44049,sell)+
getCost(44052,sell)+
getCost(44055,sell)+
getCost(44037,sell)+
getCost(44034,sell)+
getCost(44025,sell)+
getCost(44016,sell)+
getCost(44013,sell)+
getCost(44010,sell)+
getCost(44046,sell)+
getCost(44043,sell)+
getCost(44031,sell)+
getCost(44007,sell)+
getCost(44040,sell)+
getCost(44028,sell)+
getCost(44022,sell)+
getCost(44019,sell)+
getCost(44004,sell)+
getCost(44001,sell)
)/19+
getFrequency(Cracked_Fractal_Encryption, Mini Mew)*getCost(74268,sell)+
getFrequency(Cracked_Fractal_Encryption, Infusion)*getCost(49424,sell)
)
)
*/
	var b64lzw = $location.search().b64lzw;
	if(!!b64lzw) {
		$scope.expression = lzw.decompress(decodeURIComponent($base64.decode(b64lzw)));
	}
	$scope.result = null;
	$scope.error = null;
	$scope.parsingError = null;
	$scope.$watch('expression', function() {
		$location.search('b64lzw', $base64.encode(encodeURIComponent(lzw.compress($scope.expression))));
		try {
			console.log("parsing", $scope.expression);
			var parsed = gw2CalculatorParser.parse($scope.expression);
			console.log("parsed:", parsed);
			$scope.parsedExpression = parsed.toString();
			console.log("parsed.toString():\n", $scope.parsedExpression);
            $injector.invoke(parsed.getValue, parsed).then(result => {
				console.log("got result:", result);
				$scope.result = result;
			}, (reason: any) => {
				console.log("got error:", reason);
			});
			$scope.error = null;
			$scope.parsingError = null;
		} catch(e) {
			console.error("got an error:", e);
			$scope.parsedExpression = null;
			$scope.result = null;
			if(e instanceof gw2CalculatorParser.SyntaxError) { 
				$scope.parsingError = e;
				var lines = $scope.expression.split('\n');
                $scope.preError = LineBreaker.break(lines, 1, 1, e.location.start.line, e.location.start.column);
                $scope.inError = LineBreaker.break(lines, e.location.start.line, e.location.start.column, e.location.end.line, e.location.end.column);
                $scope.postError = LineBreaker.break(lines, e.location.end.line, e.location.end.column, lines.length, lines[lines.length-1].length);
				$scope.columnSpaces = new Array(e.column).join(' ');
			} else {
				$scope.error = e;
			}
		}
	});
	$http.get('https://api.guildwars2.com/v2/files?ids=all').then((response: ng.IHttpPromiseCallbackArg<IFile[]>) => {
		response.data.forEach((value) => {
			if(value.id == "ui_coin_copper") {
				$rootScope.copperIcon = value.icon;
			}
			if(value.id == "ui_coin_silver") {
				$rootScope.silverIcon = value.icon;
			}
			if(value.id == "ui_coin_gold") {
				$rootScope.goldIcon = value.icon;
			}
		})
	});
}])
.service("LineBreaker", function() {
    return {
        break: function(lines: string[], startLine: number, startColumn: number, endLine: number, endColumn: number): string {
            var buffer = [];
            if(startLine != endLine) {
                buffer.push(lines[startLine-1].slice(startColumn-1));
                for(var i = startLine; i < endLine-1; i++) {
                    buffer.push(lines[i]);
                }
                buffer.push(lines[i].slice(endColumn-1));
            } else {
                buffer.push(lines[startLine-1].slice(startColumn-1, endColumn-1));
            }
            return buffer.join("\n");
        }
    };
})
.service("Cacher", function() {
    var cache = {};
    return {
        getFromCache: function(cacheName, key: any, getterFunction: Function) {
            if(!cache[cacheName]) {
                cache[cacheName] = {};
            }
            
        }
    }
})
;