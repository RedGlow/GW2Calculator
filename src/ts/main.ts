///<reference path="../../typings/jquery/jquery.d.ts"/>

$(document).ready(() => {
	try {
		var parsed = gw2CalculatorParser.parse("getCost   ( getItem  ( 1234 )    , buy \n)");
		console.log(parsed);
	} catch(e) {
		if(e instanceof SyntaxError) {
			console.log("error!", e);
			console.log("line:", e.line);
			console.log("column:", e.column);
			console.log("offset:", e.offset);
		} else {
			throw e;
		}
	}
});