///<reference path="../../typings/angularjs/angular.d.ts"/>
// Type definitions for gw2api

interface IGW2API {
	getItem(id: number): ng.IPromise<Item>;
	getListing(id: number): ng.IPromise<Listings>;
}

declare class Item {
	id: number;
	chat_link: string;
	name: string;
	icon: string;
	description: string;
	type: string;
	rarity: string;
	level: number;
	vendor_value: number;
	default_skin: number;
	flags: string[];
	game_types: string[];
	restrictions: string[];
}

declare class Listings {
	id: number;
	buys: Listing[];
	sells: Listing[];
}

declare class Listing {
	listings: number;
	unit_price: number;
	quantity: number;
}