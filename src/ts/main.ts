///<reference path="../../typings/jquery/jquery.d.ts"/>

$(document).ready(() => {
	var parsed = gw2CalculatorParser.parse("func(1234,5678,9)");
	console.log(parsed);
});