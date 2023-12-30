import { CardManager } from "./CardManager";
import { CALL, Card, CardCallFailResponse, CardCallSuccessResponse, PIT, PLAYER_NAMES, PitBurnResponse, PitDropResponse, VARIANT, defaultPlayerNames, variantConfigs } from "./Util";

export class LiteratureGame {
	private cardManager: CardManager;
	private scores = {
		Team1: [] as PIT[],
		Team2: [] as PIT[],
	};
	public currentPlayer: typeof this.playerNames[number] | "Team1" | "Team2";
	public playerNames: PLAYER_NAMES;
	public gameOver = false;
	public status: null | "Team1" | "Team2" = null;

	/**
	 * Initialise a game of literature
	 */
	constructor(variant: VARIANT = "3v3", deck?: Card[], playerNames: PLAYER_NAMES = defaultPlayerNames) {
		this.cardManager = new CardManager(playerNames, variant, deck);
		this.playerNames = playerNames;
	}

	/**
	 * @description The points scoreboard showing for both teams
	 */
	get pitScore() {
		return this.scores;
	}

	/**
	 * @description The pit scoreboard showing for both teams
	 */
	get pointScore() {
		return {
			Team1: this.scores["Team1"].length,
			Team2: this.scores["Team2"].length,
		};
	}


	/**
	 * @description Returns the team of the player
	 * @param player The player whose team you wish to get
	 */
	public getTeam(player: typeof this.playerNames[number]) {
		const idx = this.playerNames.indexOf(player);

		if(idx === -1)
			return -1;
		if(idx < 3)
			return "Team1";
		else
			return "Team2";
	}


	/**
	 * @description Decides who shall take on the next call
	 * @param player The player who shall take the next call
	 */
	public changePlayer(player: typeof this.playerNames[number]) {
		// In case everyone in the team is out of cards
		if(this.status === this.currentPlayer)
			this.currentPlayer = this.currentPlayer === "Team1" ? "Team2" : "Team1";

		if(this.getTeam(player) === -1)
			throw new Error("Invalid player provided to switch to");
		if(this.getTeam(player) !== this.currentPlayer)
			throw new Error(`The player needs to be in ${this.currentPlayer}`);
		if(this.cardManager.getHand(player).length === 0)
			throw new Error("The player is out of cards, and hence is uneligible to switch to");
	}


	/**
	 * @description Simulates a call made in the game
	 * @param call The call which is made in the game
	 */
	public makeCall(call: CALL) {
		// In case the player who shall be calling is not decided yet, ask to change player
		if(this.currentPlayer === "Team1" || this.currentPlayer === "Team2")
			throw new Error("Please change the player first");

		if(call.type === "card") {
			if(this.status !== null)
				throw new Error(`There cannot be anymore card calls since all players of ${this.status} are out of cards`);
			// Code to deal with card calls

			/**
			 * Possible results of a card call:
			 * 1. Invalid input -> ERROR
			 * 	i. Invalid called field
			 *  ii. Called player doesn't have any cards
			 *  iii. Invalid card being called (special pit in 4v4)
			 * 2. You don't have a card of that pit -> PIT BURN
			 * 3. The opponent does not have the card you want -> CALL FAILED
			 * 4. The opponent does have the card you want -> CALL SUCCESS
			 */

			const { card, called } = call;

			// Validating the call (1)
			if(this.getTeam(call.called) === -1)
				throw new Error("Invalid value provided in the 'called' field");
			if(this.cardManager.getHand(call.called).length === 0)
				throw new Error("The 'called' player does not have any cards, hence they cannot be called!");
			if(card.pit === "SPECIAL" && this.cardManager.variant === "4v4")
				throw new Error("The pit called is not in the game of literature in 4v4 variant");

			// Working on two (2)
			if(this.cardManager.hasCardOfPit(this.currentPlayer, card.pit))
				return this.pitBurn(card.pit, "The caller did not have any card of the required pit", { call, caller: this.currentPlayer });

			// Working on three (3) & four (4)
			if(this.cardManager.hasCard(called, card))
				return this.cardCallSuccess(called, card);
			else
				return this.cardCallFail(called, card);
		}
		else {
			// Code to deal with pit calls
			const claims = call.claims;
			const pit = call.pit;

			/**
			 * Possibilities of a pit call
			 * 1. Invalid input -> ERROR
			 *  i. Special pit called in 4v4 literature
			 *  ii. Invalid users in claims
			 * 2. The player does not have a card of the pit -> PIT BURN
			 * 3. The number of claims does not add up with the number of cards the player has -> PIT BURN
			 * 4. One of the claims made is incorrect -> PIT BURN
			 * 5. All of the claims are correct -> PIT DROP
			 */

			// Validating the claims (1)
			if(pit === "SPECIAL" && this.cardManager.variant === "4v4")
				throw new Error("The special pit is not present in the 4v4 variant of literature");

			for(const claim of claims)
				if(this.getTeam(claim.called) !== -1)
					throw new Error("Invalid value provided in the 'called' field");

			// Checking for two (2)
			if(this.cardManager.hasCardOfPit(this.currentPlayer, pit))
				return this.pitBurn(pit, "The caller does not have a pit of the card they claim to drop", { claims, caller: this.currentPlayer });

			// Checking for three (3)
			const otherClaims = claims.filter(claim => claim.called !== this.currentPlayer);
			const pitCardsInHand = this.cardManager.getHand(this.currentPlayer).filter(c => c.pit === pit);

			if(otherClaims.length + pitCardsInHand.length !== 6)
				return this.pitBurn(pit, `The caller has ${pitCardsInHand.length} cards of the pit ${pit}, while claiming others have ${otherClaims.length} cards, which does not add up to 6`, { claims, caller: this.currentPlayer });

			// Checking for four (4) & five (5)
			for(const claim of otherClaims)
				if(this.cardManager.hasCard(claim.called, claim.card))
					return this.pitBurn(pit, `Atleast one of the claims is wrong, ${claim.called} does not have ${claim.card.name}`, { caller: this.currentPlayer, claims });
				else
					return this.pitDrop(pit, { claims, caller: this.currentPlayer });
		}
	}


	/**
	 * @description Simulates a pit burn in the game
	 * 1. Removes all cards of pit in question
	 * 2. Sets the opponent team as the current player (they get to choose among themselves)
	 * 3. Returns data
	 * @param pit The pit in being burnt
	 * @param message Burn message
	 * @param data Relevant data surrounding the pit burn, if any
	 */
	private pitBurn(pit: PIT, message: string, data: any) {
		this.cardManager.removeAllCardsOfPit(pit);
		this.currentPlayer = this.getTeam(this.currentPlayer) === "Team1" ? "Team2" : "Team1";
		this.scores[this.currentPlayer].push(pit);

		this.checkGameStatus();

		return {
			type: "PIT_BURN",
			message,
			pit,
			data,
		} as PitBurnResponse;
	}


	/**
	 * @description Simulates a pit drop in the game
	 * 1. Removes all cards of pit in question
	 * 2. IF THE CURRENT PLAYER IS OUT OF CARDS, THE TEAM BECOMES THE CURRENT PLAYER
	 * @param pit The pit being dropped
	 * @param data Relevant data surrounding te pit drop, if any
	 */
	private pitDrop(pit: PIT, data: any) {
		this.cardManager.removeAllCardsOfPit(pit);
		this.scores[this.getTeam(this.currentPlayer)].push(pit);
		this.checkGameStatus();

		if(this.cardManager.getHand(this.currentPlayer).length === 0)
			this.currentPlayer = this.getTeam(this.currentPlayer) as "Team1" | "Team2";

		return {
			type: "PIT_DROP",
			pit,
			data,
		} as PitDropResponse;
	}


	/**
	 * @description Simulates a card call failure in the game
	 * Transfers call from the caller to the called
	 * @param called The person who was called
	 * @param card The card which was called
	 */
	private cardCallFail(called: typeof this.playerNames[number], card: Card) {
		const caller = this.currentPlayer;
		this.currentPlayer = called;

		return {
			type: "CARD_CALL_FAIL",
			caller,
			called,
			card,
		} as CardCallFailResponse;
	}

	/**
	 * @description Simulates a card call success in the game
	 * Transfers card from the called to the caller
	 * @param called The person who was called
	 * @param card The card which was called
	 */
	private cardCallSuccess(called: typeof this.playerNames[number], card: Card) {
		const caller = this.currentPlayer;
		this.cardManager.transferCard(called, caller, card);

		return {
			type: "CARD_CALL_SUCCESS",
			caller,
			called,
			card,
		} as CardCallSuccessResponse;
	}

	private checkGameStatus() {
		const currentPointScore = this.pointScore;

		if(currentPointScore["Team1"] + currentPointScore["Team2"] === variantConfigs[this.cardManager.variant].pits.length)
			return this.gameOver = true;

		for(const team of ["Team1", "Team2"]) {
			const t = Number(team[4]) - 1;
			const teamPlayers = [
				this.playerNames[t * 3],
				this.playerNames[(t * 3) + 1],
				this.playerNames[(t * 3) + 2],
			];

			let allExhausted = true;

			for(const player of teamPlayers)
				if(this.cardManager.getHand(player).length !== 0)
					allExhausted = false;

			if(allExhausted)
				this.status = team as "Team1" | "Team2";
		}
	}
}