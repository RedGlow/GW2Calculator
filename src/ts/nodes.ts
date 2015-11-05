namespace Parser {
	class Node {
	}
	
	enum Type {
		Void,
		Integer,
		String,
		Item
	}
	
	export class Integer {
		value: number;
		
		constructor(text: string[]) {
			this.value = parseInt(text.join(""), 10);
		}
		
		getType(): Type {
			return Type.Integer;
		}
	}
	
	export class Token extends Node {
		value: string;
		
		constructor(text: string[]) {
			super();
			this.value = text.join("");
		}
	}
	
	export class GetItemFunctionCall {
		id: Integer;
		
		constructor(id: Integer) {
			this.id = id;
		}
	}
	
	export class GetCostFunctionCall {
		item: GetItemFunctionCall;
		buy: boolean;
		
		constructor(item: GetItemFunctionCall, buyOrSell: string) {
			this.item = item;
			this.buy = buyOrSell == "buy";
		}
	}
}