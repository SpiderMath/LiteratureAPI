// Types
type CARD_SUIT = "HEART" | "SPADE" | "CLUB" | "DIAMOND";
type CARD_RANK = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | "J" | "Q" | "K" | "A";
type PLAYER_ID = 1 | 2 | 3 | 4 | 5 | 6;
type TEAM = "T1" | "T2";
type TURN = PLAYER_ID | TEAM;
type BURN_TYPE = "BAD_CARD_CALL" | "BAD_DROP_CALL" | "PIT_CALL_FAIL";
type DROP_TYPE = "SELF_PIT_DROP" | "COLLECTIVE_PIT_DROP";
type PIT = "SPECIAL" | "DIAMOND_LOW" | "DIAMOND_HIGH" | "SPADE_LOW" | "SPADE_HIGH" | "CLUB_HIGH" | "CLUB_LOW" | "HEART_HIGH" | "HEART_LOW";
type LOG = PIT_DROP_LOG | PIT_BURN_LOG | CHANGE_PLAYER_LOG | CARD_CALL_SUCCESS_LOG | CARD_CALL_FAILURE_LOG;

interface BASE_LOG {
	type: "PIT_DROP" | "PIT_BURN" | "CHANGE_PLAYER" | "CARD_CALL_SUCCESS" | "CARD_CALL_FAILURE",
	message: string,
}

interface PIT_DROP_LOG extends BASE_LOG{
	type: "PIT_DROP",
	user: PLAYER_ID,
	// claims should include all cards, including the self-cards
	claims: CLAIM[],
	pit: PIT,
	pitDropType: DROP_TYPE,
}

interface PIT_BURN_LOG extends BASE_LOG {
	type: "PIT_BURN",
	user: PLAYER_ID,
	/** Note: claims should include all claims + self-claims */
	claims: CLAIM[],
	pit: PIT,
	pitBurnType: BURN_TYPE,
	mistakeMade: string,
}

interface CHANGE_PLAYER_LOG extends BASE_LOG {
	type: "CHANGE_PLAYER",
	newPlayer: PLAYER_ID,
	team: TEAM,
}

interface CARD_CALL_SUCCESS_LOG extends BASE_LOG {
	type: "CARD_CALL_SUCCESS",
	caller: PLAYER_ID,
	requested: PLAYER_ID,
	card: Card,
}

interface CARD_CALL_FAILURE_LOG extends BASE_LOG {
	type: "CARD_CALL_FAILURE",
	caller: PLAYER_ID,
	requested: PLAYER_ID,
	card: Card,
}

interface CardInput {
	suit: CARD_SUIT,
	rank: CARD_RANK,
};

interface CLAIM {
	player: PLAYER_ID,
	card: Card,
}

interface HANDS {
	1: Card[],
	2: Card[],
	3: Card[],
	4: Card[],
	5: Card[],
	6: Card[],
};

export {
	HANDS,
	PLAYER_ID,
	TEAM,
	TURN,
	CARD_SUIT,
	CARD_RANK,
	BURN_TYPE,
	DROP_TYPE,
	CLAIM,
	PIT,
	LOG,
	PIT_DROP_LOG,
	PIT_BURN_LOG,
	CARD_CALL_FAILURE_LOG,
	CARD_CALL_SUCCESS_LOG,
	CHANGE_PLAYER_LOG,
};

// Classes
class Card {
	// Whether the card is the joker or guarantee
	public special = false;
	// Responsible for storing the type of special card
	public type: "JOKER" | "GUARANTEE" | undefined = undefined;
	// The suit of the (normal) card
	public suit: CARD_SUIT | undefined = undefined;
	// The rank of the (normal) card
	public rank: CARD_RANK | undefined = undefined;

	constructor(input: CardInput | "JOKER" | "GUARANTEE") {
		if(typeof input === "string") {
			this.special = true;
			this.type = input;
			return;
		}

		this.suit = input.suit;
		this.rank = input.rank;
	}
}

abstract class Call {
	public type: "PIT" | "CARD";

	constructor(type: "PIT" | "CARD") {
		this.type = type;
	}
}

class PitCall extends Call {
	public claims: CLAIM[];
	public pit: PIT;

	constructor(claims: CLAIM[], pit: PIT) {
		super("PIT");
		this.claims = claims;
		this.pit = pit;
	}
}

class CardCall extends Call {
	public requested: PLAYER_ID;
	public card: Card;

	constructor(player: PLAYER_ID, card: Card) {
		super("CARD");
		this.requested = player;
		this.card = card;
	}
}

export {
	Card,
	Call,
	CardCall,
	PitCall,
};

// Functions
function generateDeck() {
	// Initialising the special cards in advance
	const cards = [
		new Card("JOKER"),
		new Card("GUARANTEE"),
	];

	for(const suit of ["HEART", "SPADE", "CLUB", "DIAMOND"])
		for(const rank of [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"])
			cards.push(new Card({
				suit: suit as CARD_SUIT,
				rank: rank as CARD_RANK,
			}));

	return cards;
}

// Fisher-Yates algorithm implementation
function shuffleDeck(deck: Card[]) {
	for(let i = deck.length - 1; i > 0; i--) {
		// since j is defined as 0 ≤ j ≤ i
		const j = Math.floor(Math.random() * (i + 1));

		const temp = deck[i];
		deck[i] = deck[j];
		deck[j] = temp;
	}

	return deck;
}

function divideDeck(shuffledDeck: Card[]) {
	const hands: HANDS = {
		1: [],
		2: [],
		3: [],
		4: [],
		5: [],
		6: [],
	};

	for(let i = 0; i < shuffledDeck.length; i++)
		// distribution of cards
		// @ts-ignore
		hands[(i % 6) + 1].push(shuffledDeck[i]);

	return hands;
}

export {
	generateDeck,
	shuffleDeck,
	divideDeck,
};
