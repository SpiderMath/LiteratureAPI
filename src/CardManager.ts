import { Card, PIT, PLAYER_NAMES, RANK, SUIT, VARIANT, defaultPlayerNames, generateDeck, shuffleDeck, validateCustomDeck, variantConfigs } from "./Util";

export class CardManager {
	public variant: VARIANT;
	public hands: Record<typeof this.playerNames[number], Card[]> = {};
	public playerNames: PLAYER_NAMES;

	constructor(playerNames: PLAYER_NAMES = defaultPlayerNames, variant: VARIANT = "3v3", deck?: Card[]) {
		this.variant = variant;

		if(playerNames.length !== variantConfigs[variant].playerCount)
			throw new Error("The number of players does not match the number of players required to play a game of literautre in the specified variant");
		this.playerNames = playerNames;

		if(!deck)
			deck = shuffleDeck(generateDeck());

		if(!this.validateCustomDeck(deck))
			throw new Error("The custom deck is not a valid Literature playing deck!");

		// Distributing the cards into hands
		for(let i = 0; i < deck.length; i++) {
			if(!this.hands[this.playerNames[i % 6]])
				this.hands[this.playerNames[i % 6]] = [];

			this.hands[this.playerNames[i % 6]].push(deck[i]);
		}
	}

	/**
	 * @param deck The custom deck to check
	 * @description Validates the custom deck input by user
	 */
	private validateCustomDeck(deck: Card[]) {
		return validateCustomDeck(deck, this.variant);
	}


	/**
	 * @param player The player whose hand is required
	 * @description Returns the hand of a player
	 */
	public getHand(player: typeof this.playerNames[number]) {
		return this.hands[player];
	}


	/**
	 * @param player The player whose hand is to be updated
	 * @param hand The new hand the player is being dealt
	 * @description Updates the hand of the player to the given hand
	 */
	private setHand(player: typeof this.playerNames[number], hand: Card[]) {
		this.hands[player] = hand;
	}


	/**
	 * @param player The player whose ownership of a card is being questioned
	 * @param card The card whose ownership is being questioned
	 * @description Returns whether a player owns a particular card
	 */
	public hasCard(player: typeof this.playerNames[number], card: Card) {
		const hand = this.getHand(player);

		return hand.filter(c => c.name === card.name).length === 1;
	}


	/**
	 * @description Returns whether a player has a card of a pit
	 * @param player The player who is being checked
	 * @param pit The pit in question
	 */
	public hasCardOfPit(player: typeof this.playerNames[number], pit: PIT) {
		return this.getHand(player).filter(c => c.pit === pit).length > 0;
	}

	/**
	 * @description Adds a card to a player's hand
	 * @param player The player whose hand is to be updated
	 * @param card The card which is to be added to the player's hand
	 */
	private addCard(player: typeof this.playerNames[number], card: Card) {
		const hand = this.getHand(player);
		hand.push(card);

		this.setHand(player, hand);
	}


	/**
	 * @description Removes a card from a player's hand
	 * @param player The player whose hand is to be updated
	 * @param card The card which is to be removed from the player's hand
	 */
	private removeCard(player: typeof this.playerNames[number], card: Card) {
		this.setHand(player, this.getHand(player).filter(c => c.name !== card.name));
	}


	/**
	 * @description Transfers a card from one player to the other
	 * This function is typically expected to be called for pit calls and successful card calls
	 * @param player1 The player who is losing the card
	 * @param player2 The player who is receiving the card
	 * @param card The card which is being transferred
	 */
	public transferCard(player1: typeof this.playerNames[number], player2: typeof this.playerNames[number], card: Card) {
		this.removeCard(player1, card);
		this.addCard(player2, card);
	}

	/**
	 * @description Removes all the cards of a specified pit from the hands of all players
	 * @param pit The pit whose cards are needed to be removed
	 */
	public removeAllCardsOfPit(pit: PIT) {
		for(const player of this.playerNames)
			this.setHand(player, this.getHand(player).filter(card => card.pit !== pit));
	}

	/**
	 *
	 */
	public getPitCards(pit: PIT) {
		const pitCards: Card[] = [];

		if(pit === "SPECIAL") {
			pitCards.push({
				pit,
				name: "JOKER",
			}, {
				pit,
				name: "GUARANTEE",
			}, {
				name: "8 CLUBS",
				pit,
			}, {
				name: "8 DIAMONDS",
				pit,
			}, {
				name: "8 HEARTS",
				pit,
			}, {
				name: "8 SPADES",
				pit,
			});
		}
		else {
			const ranks = pit.startsWith("LOWER")
				? ["2", "3", "4", "5", "6", "7"] : ["9", "10", "A", "J", "K", "Q"];

			for(const rank of ranks)
				pitCards.push({
					name: `${rank as RANK} ${pit.split("-")[1] as SUIT}`,
					pit,
				});
		}
	}
}
