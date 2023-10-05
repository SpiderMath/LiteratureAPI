const CARDS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "K", "Q", "A"];
const DECKS = ["H", "D", "S", "C"];

// Util Types
export type CARD = "JK" | "GU" | `${"A" | "2"| "3"| "4"| "5"| "6"| "7"| "8"| "9" | "10" | "J" | "K" | "Q"}${"H" | "D" | "S" | "C"}`;
export type PIT = "SPECIAL" | "HIGH-D" | "HIGH-S" | "HIGH-C" | "HIGH-H" | "LOW-D" | "LOW-S" | "LOW-C" | "LOW-H";
export type PLAYERID = `P${number}` | TEAM;
export type TEAM = "Team1" | "Team2";

interface Call {
	type: "CARD" | "PIT",
}

export interface CardCall extends Call {
	type: "CARD",
	player: PLAYERID,
	card: CARD,
}

export interface PitCall extends Call {
	type: "PIT",
	pit: PIT,
	cardCalls: CardCall[],
}

export type RESPONSE_TYPES = "PIT_BURN" | "PIT_DROP" | "CALL_SUCCESS" | "CALL_FAIL";

// Response Classes

class Response {
	public type: RESPONSE_TYPES;
	public message: string;

	constructor(type: RESPONSE_TYPES, message: string) {
		this.type = type;
		this.message = message;
	}
}

export class PitBurnResponse extends Response {
	public player: PLAYERID;
	public teamToTakeCall: TEAM;

	constructor(pit: PIT, player: PLAYERID, team: TEAM) {
		super("PIT_BURN", `The pit of ${pit} was burned by ${player}`);

		this.player = player;
		this.teamToTakeCall = team;
	}
}

export class PitDropResponse extends Response {
	public player: PLAYERID;

	constructor(pit: PIT, player: PLAYERID) {
		super("PIT_DROP", `The pit of ${pit} was dropped by ${player}`);

		this.player = player;
	}
}

export class CallSuccessResponse extends Response {
	public caller: PLAYERID;
	public called: PLAYERID;
	public card: CARD;

	constructor(card: CARD, caller: PLAYERID, called: PLAYERID) {
		super("CALL_SUCCESS", `${card} was taken by ${caller} from ${called}`);

		this.caller = caller;
		this.called = called;
		this.card = card;
	}
}

export class CallFailResponse extends Response {
	public caller: PLAYERID;
	public called: PLAYERID;
	public card: CARD;

	constructor(card: CARD, caller: PLAYERID, called: PLAYERID) {
		super("CALL_FAIL", `${caller} asked for ${card} from ${called} but did not get it`);

		this.caller = caller;
		this.called = called;
		this.card = card;
	}
}

// Util Functions
function getCardPool() {
	const cardPool = ["JK", "GU"];

	for(let i = 0; i < DECKS.length; i++)
		for(let j = 0; j < CARDS.length; j++)
			cardPool.push(`${CARDS[j]}${DECKS[i]}`);

	return cardPool;
}

// Using Fisher-Yates Method
// Credit: GeeksForGeeks - Wikipedia
function shuffleCards(cardPool: string[]) {
	let i = cardPool.length - 1;

	while(i > 0) {
		const j = Math.floor(Math.random() * (i + 1));
		[cardPool[i], cardPool[j]] = [cardPool[j], cardPool[i]];

		i--;
	}

	return cardPool;
}

export function randomDeck(): Map<PLAYERID, CARD[]> {
	const deck = new Map();

	const cardPool = getCardPool();
	const shuffledDeck = shuffleCards(cardPool);
	const decks: string[][] = [
		[], [], [], [], [], [],
	];

	for(let i = 0; i < shuffledDeck.length; i++)
		decks[i % 6].push(shuffledDeck[i]);

	console.log(decks);
	for(let i = 0; i < decks.length; i++)
		deck.set(`P${i + 1}`, decks[i]);

	return deck;
}

export function getPitMaps() {
	const pitMap: Map<CARD, PIT> = new Map();
	const cardsPerPit: Map<PIT, CARD[]> = new Map();

	for(let i = 0; i < DECKS.length; i++) {
		pitMap.set(`${CARDS[6]}${DECKS[i]}` as CARD, "SPECIAL");

		for(let j = 0; j < 6; j++) {
			const hPit = `HIGH-${DECKS[i]}` as PIT;
			const lPit = `LOW-${DECKS[i]}` as PIT;
			const lCard = `${CARDS[j]}${DECKS[i]}` as CARD;
			const hCard = `${CARDS[j + 7]}${DECKS[i]}` as CARD;

			pitMap.set(lCard, lPit);
			pitMap.set(hCard, hPit);
		}
	}

	pitMap.set("JK", "SPECIAL");
	pitMap.set("GU", "SPECIAL");

	cardsPerPit.set("SPECIAL", ["JK", "GU", "8C", "8D", "8H", "8S"]);
	cardsPerPit.set("HIGH-C", ["9C", "10C", "JC", "KC", "QC", "AC"]);
	cardsPerPit.set("HIGH-D", ["9D", "10D", "JD", "KD", "QD", "AD"]);
	cardsPerPit.set("HIGH-S", ["9S", "10S", "JS", "KS", "QS", "AS"]);
	cardsPerPit.set("HIGH-H", ["9H", "10H", "JH", "KH", "QH", "AH"]);

	cardsPerPit.set("LOW-C", ["2C", "3C", "4C", "5C", "6C", "7C"]);
	cardsPerPit.set("LOW-D", ["2D", "3D", "4D", "5D", "6D", "7D"]);
	cardsPerPit.set("LOW-S", ["2S", "3S", "4S", "5S", "6S", "7S"]);
	cardsPerPit.set("LOW-H", ["2H", "3H", "4H", "5H", "6H", "7H"]);

	return {
		pitMap,
		cardsPerPit,
	};
}

export function joinArrays(arr1: any[] = [], arr2: any[] = []): any[] {
	const res = [];

	for(const elem of arr1) res.push(elem);
	for(const elem of arr2) res.push(elem);

	return res;
}
