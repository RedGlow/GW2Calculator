namespace Parser {
	class Node {
	}
	
	export class Integer extends Node {
		value: number;
		
		constructor(text: string[]) {
			super();
			this.value = parseInt(text.join(""), 10);
		}
	}
	
	export class Token extends Node {
		value: string;
		
		constructor(text: string[]) {
			super();
			this.value = text.join("");
		}
	}
	
	export class ParameterList extends Node {
		value: number[];
		constructor(head: Integer, tail: any[]) {
			super();
			this.value = [head.value];
			tail.forEach((e) => {
				var i = <Integer>e[1];
				this.value.push(i.value);
			});
		}
	}
	
	export class FunctionCall extends Node {
		functionName: string;
		
		parameter: number[];
		
		constructor(functionName: Token, parameter: ParameterList) {
			super();
			this.functionName = functionName.value;
			this.parameter = parameter.value;
		}
	}
}