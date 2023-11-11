import { HANDS, TURN, divideDeck, generateDeck, shuffleDeck, Call, CardCall, PLAYER_ID, Card, CARD_SUIT, CARD_RANK, TEAM, BURN_TYPE, PitCall, CLAIM, PIT, DROP_TYPE, LOG } from "./Util";

export class LiteratureGame {
	/**
	 * @description Stores the cards held by individual players in the game.
	 * It is indexed by playerID (which goes from 1 - 6)
	 */
	public hands: HANDS;
	/**
	 * @description Stores the player whose current turn it is.
	 * In case of a burnt pit, the opposing team gets the call, and currentPlayer becomes "T1" or "T2".
	 * No calls are allowed until and unless the player is decided
	 */
	public currentPlayer: TURN = 1;
	/**
	 * @description Stores the team whose current turn it is
	 */
	public currentTeam: TEAM = "T1";
	/**
	 * @description Used to store the location of every card (i.e. maps cards to players' hands)
	 * Indexed using JSON strings of the cards and gives us the player ID of the person who owns the card
	 */
	public cardRegister;
	public logs: LOG[] = [];

	constructor() {
		this.hands = divideDeck(
			shuffleDeck(
				generateDeck(),
			),
		);

		// Setting up the card register!
		this.cardRegister = {};
		for(let i: PLAYER_ID = 1; i < 7; i++)
			for(const card of this.hands[i as PLAYER_ID])
				// @ts-ignore
				this.cardRegister[JSON.stringify(card)] = i;
	}

	/**
	 * @description Implementation for making a call, both for pits and cards via their different classes
	 */
	public makeCall(call: Call) {
		if(call instanceof CardCall) {
			// implementation of a Card Call!
			// check if currentPlayer selected
			if(this.currentPlayer === "T1" || this.currentPlayer === "T2")
				throw new Error("Player not decided after the previous pit burn!");

			const caller = this.currentPlayer as PLAYER_ID;
			const requested = call.requested;
			const card = call.card;
			const pitCards = this.getPitCards(card);

			// check if caller has a card of that pit
			let dumbCall = true;

			for(const pitCard of pitCards)
				if(this.getCardOwner(pitCard) === caller)
					dumbCall = false;

			if(dumbCall)
				return this._pitBurn(caller, "BAD_CARD_CALL", card);

			// check if the opponent has the card
			if(this.getCardOwner(card) === requested)
				return this._cardCallSuccess(caller, requested, card);
			else
				return this._cardCallFailure(requested);
		}
		if(call instanceof PitCall) {
			// implementation of a Pit Call!
			const caller = this.currentPlayer as PLAYER_ID;
			const claims = call.claims;
			const pit = call.pit;

			// in case the length of claims is zero, that means that the current player has 6 cards of the same pit in their possession
			if(claims.length === 0) {
				const pitCards = this.getPitCards(pit);

				for(const pitCard of pitCards)
					if(this.getCardOwner(pitCard) !== caller)
						return this._pitBurn(caller, "BAD_DROP_CALL", pitCards);

				return this._pitDrop(caller, "SELF_PIT_DROP", pitCards);
			}

			// if the code reaches here then the caller has claimed atleast one card
			// Check if caller has atleast one card of that pit
			const pitCards = this.getPitCards(claims[0].card);
			const callerPitCards = pitCards
				.filter((pitCard) => caller === this.getCardOwner(pitCard));

			if(callerPitCards.length === 0)
				this._pitBurn(caller, "BAD_CARD_CALL", claims);

			// checking if the number of cards tally up
			if(callerPitCards.length !== (pitCards.length + claims.length))
				this._pitBurn(caller, "PIT_CALL_FAIL", claims);

			// Check if the claims are correct
			let pitBurn = false;

			for(const claim of claims)
				if(this.getCardOwner(claim.card) !== claim.player)
					pitBurn = true;

			if(pitBurn)
				this._pitBurn(caller, "PIT_CALL_FAIL", claims);
			else
				this._pitDrop(caller, "COLLECTIVE_PIT_DROP", claims);
		}
	}

	// Utility functions
	/**
	 * @description Returns the cards present in a particular pit from one card of that pit
	 */
	public getPitCards(card: Card | string): Card[] {

		if(!(card instanceof Card)) {
			const strToCard = {
				"SPECIAL": new Card("JOKER"),
				"DIAMOND_HIGH": new Card({
					rank: 9,
					suit: "DIAMOND",
				}),
				"DIAMOND_LOW": new Card({
					rank: 7,
					suit: "DIAMOND",
				}),
				"SPADE": new Card({
					rank: 9,
					suit: "SPADE",
				}),
				"SPADE_LOW": new Card({
					rank: 7,
					suit: "SPADE",
				}),
				"HEART_HIGH": new Card({
					rank: 9,
					suit: "HEART",
				}),
				"HEART_LOW": new Card({
					rank: 7,
					suit: "HEART",
				}),
				"CLUB_HIGH": new Card({
					rank: 9,
					suit: "CLUB",
				}),
				"CLUB_LOW": new Card({
					rank: 7,
					suit: "CLUB",
				}),
			};

			// @ts-ignore
			return this.getPitCards(strToCard[card]);
		}
		if(card.special || card.rank === 8) return [
			new Card("JOKER"),
			new Card("GUARANTEE"),
			new Card({
				rank: 8,
				suit: "CLUB",
			}),
			new Card({
				rank: 8,
				suit: "SPADE",
			}),
			new Card({
				rank: 8,
				suit: "DIAMOND",
			}),
			new Card({
				rank: 8,
				suit: "HEART",
			}),
		];

		if((card.rank as number) > 8)
			return [
				new Card({
					rank: 9,
					suit: card.suit as CARD_SUIT,
				}),
				new Card({
					rank: 10,
					suit: card.suit as CARD_SUIT,
				}),
				new Card({
					rank: "A",
					suit: card.suit as CARD_SUIT,
				}),
				new Card({
					rank: "J",
					suit: card.suit as CARD_SUIT,
				}),
				new Card({
					rank: "Q",
					suit: card.suit as CARD_SUIT,
				}),
				new Card({
					rank: "K",
					suit: card.suit as CARD_SUIT,
				}),
			];

		const pitCards: Card[] = [];

		for(let i = 2; i < 8; i++)
			pitCards.push(new Card({
				suit: card.suit as CARD_SUIT,
				rank: i as CARD_RANK,
			}));

		return pitCards;
	}

	/**
	 * @param card The card whose pit you want to know
	 * @description Returns the pit of a card
	 */
	public getPit(card: Card): PIT {
		let pit = card.suit;
		if(card.special === true || card.rank === 8)
			return "SPECIAL";
		if(typeof card.rank === "number" && card.rank < 8)
			pit += "_LOW";
		else
			pit += "_HIGH";

		return pit as PIT;
	}

	/**
	 * @param player The player whose hand is required
	 * @description Returns the hand of the specified player
	 */
	public getHand(player: PLAYER_ID) {
		return this.hands[player];
	}

	/**
	 * @param player The player whose hand shall be changed
	 * @param hand The new hand of the player
	 * @description Sets the specified array of cards as the given player's hand
	 */
	public setHand(player: PLAYER_ID, hand: Card[]) {
		return this.hands[player] = hand;
	}

	/**
	 * @param player The player who is losing a card
	 * @param removedCard The card to be removed from the player's hand
	 * @description Removes the specified card from the player's hand
	 */
	private _removeCardFromHand(player: PLAYER_ID, removedCard: Card) {
		const hand = this.getHand(player)
			.filter(card => JSON.stringify(card) !== JSON.stringify(removedCard));
		this._updateCardOwner(removedCard, null);

		return this.setHand(player, hand);
	}

	/**
	 * @param player The player who is gaining a card
	 * @param addedCard The card to be added to the player's hand
	 * @description Adds the specified card to the player's hand
	 */
	private _addCardToHand(player: PLAYER_ID, addedCard: Card) {
		const hand = this.getHand(player);
		hand.push(addedCard);
		this._updateCardOwner(addedCard, player);
		return this.setHand(player, hand);
	}

	/**
	 * @description Returns the player who currently owns a particular card
	 * @param card The card whose owner we wish to call
	 */
	public getCardOwner(card: Card): PLAYER_ID {
		// @ts-ignore
		return this.cardRegister[JSON.stringify(card)];
	}

	/**
	 * @param card The card whose owner we wish to update in Register
	 * @param player The player who now owns the card
	 * @description Updates the owner of the card
	 */
	private _updateCardOwner(card: Card, player: PLAYER_ID | null) {
		// @ts-ignore
		return this.cardRegister[JSON.stringify(card)] = player;
	}

	/**
	 * @description Changes the currentTeam
	 */
	private _changeTeam() {
		return this.currentTeam = this.currentTeam === "T1" ? "T2" : "T1";
	}

	// Methods implementing the different results
	/**
	 * @param caller The person who called the card
	 * @param requested The person from whom the card was asked
	 * @param card The card which was asked
	 * @description Implementation for when a card call is successful
	 */
	private _cardCallSuccess(caller: PLAYER_ID, requested: PLAYER_ID, card: Card) {
		// Remove card from the hand of the current owner and move to opponent
		this._removeCardFromHand(requested, card);
		this._addCardToHand(caller, card);

		// logging
		return;
	}

	/**
	 * @param player The player who will get the next turn
	 * @description Changes the player whose turn it is.
	 * @summary If there is a pit drop (where the player exhausts their cards), or conversely a pit burn, then the corresponding team gets the next call, and this function is used to pick the player who'll make the next call!
	 */
	public changePlayer(player: PLAYER_ID) {
		if(this.currentPlayer === "T1" && player > 3)
			throw new Error("The current turn is that of team 1, hence the chances can be passed to only player IDs 1, 2, 3");
		if(this.currentPlayer === "T2" && player < 4)
			throw new Error("The current turn is that of team 2, hence the chances can be passed to only player IDs 4, 5, 6");

		return this.currentPlayer = player;
	}

	/**
	 * @param requested The person from whom the card was asked
	 * @description Implementation for when a card call fails
	 */
	private _cardCallFailure(requested: PLAYER_ID) {
		this.currentPlayer = requested;
		this._changeTeam();

		return;
	}

	/**
	 * @param burner The person who burnt the pit
	 * @param reason The reason for which the pit was burned
	 * @param data Data used for logging purposes
	 * @description Implementation for when a pit is burnt
	 */
	private _pitBurn(burner: PLAYER_ID, type: BURN_TYPE, data: Card | Card[] | CLAIM[]) {
		// change the turn to the opponent team!
		this._changeTeam();
		this.currentPlayer = this.currentTeam;

		// remove the cards of the pit from all players
		let pitCards: Card[];

		if(data instanceof Card)
			pitCards = this.getPitCards(data);
		else if(data[0] instanceof Card)
			pitCards = this.getPitCards(data[0]);
		else
			pitCards = this.getPitCards(data[0].card);

		for(const pitCard of pitCards)
			this._removeCardFromHand(
				this.getCardOwner(pitCard),
				pitCard,
			);

		// logging
	}

	/**
	 * @param caller The person who dropped the pit
	 * @param reason The reason for pit drop point
	 * @param claims The claims made by the person dropping the pit
	 * @description The claims variable can be an array of cards (in case of a self drop) or an array of claims (in case of a collective drop). Either way, it ensures that atleast one element is present in the array since if array of claims was empty, then it'd be a self-drop, in which it would send in an array of six cards!
	 * @summary Implementation for when a pit is dropped
	 */
	private _pitDrop(caller: PLAYER_ID, type: DROP_TYPE, claims: Card[] | CLAIM[]) {
		// removing the cards of the pit from all players
		const pitCards = this.getPitCards(
			claims[0] instanceof Card ? claims[0] : claims[0].card,
		);

		for(const pitCard of pitCards)
			this._removeCardFromHand(
				this.getCardOwner(pitCard),
				pitCard,
			);

		// incase the player who dropped the pit is out of cards, someone in the team needs to pick the call up.
		if(this.getHand(caller).length === 0)
			this.currentPlayer = this.currentTeam;

		// logging
	}
}
