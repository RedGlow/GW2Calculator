namespace Typing {
	export class NumberWrapper {
		public constructor(public value: number) {}
	}
		
	export class Cost {
		public constructor(public value: number) {}
	}
	
	export class ItemWrapper {
		public constructor(public item: Item) {}
	}

	export class Table {
		public constructor(public headers: string[], public contents: any[][]) {}
	}
	
	export class Boolean {
		public constructor(public value: boolean) {}
	}
}