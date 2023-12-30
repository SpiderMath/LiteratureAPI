export type PIT = "UPPER-CLUBS" | "LOWER-CLUBS" | "UPPER-DIAMONDS" | "LOWER-DIAMONDS" | "UPPER-HEARTS" | "LOWER-HEARTS" | "UPPER-SPADES" | "LOWER-SPADES" | "SPECIAL";
export type SUIT = "CLUBS" | "DIAMONDS" | "HEARTS" | "SPADES";
export type RANK = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type VARIANT = "3v3" | "4v4";
export type PLAYER_NAMES = [string, string, string, string, string, string];

export const defaultPlayerNames: PLAYER_NAMES = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"] as const;

export interface Card {
	name: `${RANK} ${SUIT}` | "JOKER" | "GUARANTEE",
	pit: PIT,
}

export interface CardCall {
	type: "card",
	called: string,
	card: Card,
}

export interface Claim {
	called: string,
	card: Card,
}

export interface PitCall {
	type: "pit",
	pit: PIT,
	claims: Claim[],
}

export type CALL = CardCall | PitCall;

export interface PitBurnResponse {
	type: "PIT_BURN",
	message: string,
	pit: PIT,
	data: any,
}

export interface PitDropResponse {
	type: "PIT_DROP",
	pit: PIT,
	data: any,
}

export interface CardCallFailResponse {
	type: "CARD_CALL_FAIL",
	caller: string,
	called: string,
	card: Card,
}

export interface CardCallSuccessResponse {
	type: "CARD_CALL_SUCCESS",
	caller: string,
	called: string,
	card: Card,
}

export const variantConfigs = {
	"3v3": {
		deckLength: 54,
		pits: ["UPPER-CLUBS", "LOWER-CLUBS", "UPPER-DIAMONDS", "LOWER-DIAMONDS", "UPPER-HEARTS", "LOWER-HEARTS", "UPPER-SPADES", "LOWER-SPADES", "SPECIAL"] as PIT[],
		playerCount: 6,
	},
	"4v4": {
		deckLength: 48,
		pits: ["UPPER-CLUBS", "LOWER-CLUBS", "UPPER-DIAMONDS", "LOWER-DIAMONDS", "UPPER-HEARTS", "LOWER-HEARTS", "UPPER-SPADES", "LOWER-SPADES"] as PIT[],
		playerCount: 8,
	},
};

/**
 * @param card The card whose rank you wish to get
 * @description Returns the rank of the card you wish to check for, returns undefined if the card is JOKER or GUARANTEE
 * @returns The rank of the card
 */
export function getCardRank(card: Card): RANK | undefined {
	return card.name.includes(" ")
		? (card.name.split(" ")[0] as RANK) : undefined;
}


/**
 * @param card The card whose suit you wish to check
 * @description Returns the suit of the input card. Returns "SPECIAL" for "JOKER" & "GUARANTEE"
 * @returns The suit of the card
 */
export function getCardSuit(card: Card): SUIT | "SPECIAL" {
	return card.name.includes(" ")
		? (card.name.split(" ")[1] as SUIT) : "SPECIAL";
}


/**
 * @param variant The variant of Literature for which the deck is being generated
 * @description Generates a full deck of playing cards, which aren't shuffled.
 */
export function generateDeck(variant: VARIANT = "3v3") {
	const deck: Card[] = [];

	if(variant === "3v3")
		deck.push(
			{
				pit: "SPECIAL",
				name: "JOKER",
			},
			{
				pit: "SPECIAL",
				name: "GUARANTEE",
			},
		);

	// Adding all of the other cards
	for(const suit of (["CLUBS", "DIAMONDS", "HEARTS", "SPADES"] as SUIT[])) {
		// adding the special pit
		if(variant === "3v3")
			deck.push({
				name: `8 ${suit}`,
				pit: "SPECIAL",
			});

		for(let i = 2; i < 8; i++)
			deck.push({
				name: `${String(i) as RANK} ${suit}`,
				pit: `LOWER-${suit}`,
			});

		for(const rank of ["9", "10", "A", "J", "Q", "K"])
			deck.push({
				name: `${rank as RANK} ${suit}`,
				pit: `UPPER-${suit}`,
			});
	}

	return deck;
}


/**
 * @description Returns the number of cards in the deck for the particular variant
 * @param variant The variant for which we wish to get the deck length
 */
export function deckLength(variant: VARIANT) {
	return variant === "3v3" ? 54 : 48;
}


/**
 * @param customDeck The deck which we wish to validate
 * @param variant The variant which we're playing with
 * @description Validates a custom deck input by the user
 * I've not added a parameter with the OG unshuffled deck or anything only because we take in the custom deck whilst initialising, which prompts us to not make a new deck in the main code.
 */
export function validateCustomDeck(customDeck: Card[], variant: VARIANT = "3v3") {
	/**
	 * Requirements of a valid deck:
	 * 1. Must have 54 (or 48) cards, 6 from each of the 9 (or 8) pits, depending on the variant being played
	 * 2. Every card in customDeck must be there in the defaultDeck
	 */

	if(customDeck.length !== variantConfigs[variant].deckLength)
		return false;

	const unshuffledDeck = generateDeck();

	for(let i = 0; i < customDeck.length; i++) {
		const cardArr = unshuffledDeck.filter(c => c.name === customDeck[i].name && c.pit === customDeck[i].pit);

		if(cardArr.length === 0)
			return false;
	}

	return true;
}


/**
 * @description Shuffles the given deck, using the Fisher-Yates algorithm
 * @param deck The deck which we wish to shuffle
 */
export function shuffleDeck(deck: Card[]) {
	for(let i = 0; i < deck.length; i++) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = deck[i];
		deck[i] = deck[j];
		deck[j] = temp;
	}

	return deck;
}
