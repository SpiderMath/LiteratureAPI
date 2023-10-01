import { randomDeck, CardCall, PitCall, getPitMaps, PIT, CARD, PLAYER, PitBurnResponse, joinArrays, CallSuccessResponse, CallFailResponse } from "./Util";

export class LiteratureGame {
	private _players: string[];
	private _players_to_P_map: Map<string, PLAYER> = new Map();
	private _P_to_players_map: Map<PLAYER, string> = new Map();
	private _currentTurn: PLAYER = "P1";
	private _players_deck: Map<PLAYER, CARD[]> = new Map();
	private _deck_to_players: Map<CARD, PLAYER> = new Map();
	private _pitMaps = getPitMaps();

	public teamPoints = {
		Team1: 0,
		Team2: 0,
	};

	constructor(players: string[]) {
		this._players = players;

		for(let i = 1; i <= this._players.length; i++) {
			this._players_to_P_map.set(players[i - 1], `P${i}`);
			this._P_to_players_map.set(`P${i}`, players[i - 1]);
		}
	}

	/**
	 * To get the name of the player whose call it is
	 */
	get getTurn() {
		return this._P_to_players_map.get(this._currentTurn);
	}

	/**
	 * To set the playing deck of the room
	 * If no parameter is provided, a random deck is initialised by itself
	 * @param customDeck
	 */
	public setDeck(customDeck: Map<PLAYER, CARD[]> = randomDeck()) {
		this._players_deck = customDeck;

		for(const cards of this._players_deck.entries())
			for(const card of cards[1])
				this._deck_to_players.set(card, cards[0]);
	}

	/**
	 * To get the playing cards of a player
	 * @param pName
	 */
	public getCards(pName: string = "") {
		return this.__getCards(this._players_to_P_map.get(pName));
	}

	private __getCards(player?: PLAYER) {
		return this._players_deck.get(
			player ?? this._currentTurn,
		);
	}

	public makeCall(input: CardCall | PitCall) {
		if(this._currentTurn === "Team1" || this._currentTurn === "Team2") throw new Error("Current player not decided.");

		if(input.type === "CARD") {
			// pit burn if player does not have a card of the pit or calls a card they already have
			if(!this.__hasCardOfPit(input) || this._players_deck.get(this._currentTurn)?.includes(input.card)) {
				const currentPit = this._pitMaps.pitMap.get(input.card) as PIT;
				const currentPitCards = this._pitMaps.cardsPerPit.get(currentPit) as CARD[];

				// Removing all cards of pit from everyone
				for(const card of currentPitCards) {
					const player = this._deck_to_players.get(card) as PLAYER;
					this._players_deck.set(
						player,
						this._players_deck.get(player)?.filter((v) => v !== card) as CARD[],
					);
				}

				const oppTeam = this.__getOppTeam(this._currentTurn);

				// Since this is a pit burn, the opponent team shall get a point
				this.teamPoints[
					oppTeam
				]++;

				this._currentTurn = oppTeam;

				return new PitBurnResponse(currentPit, this._currentTurn, oppTeam);
			}

			// if we reach here, then the person calling has a card of that pit
			const oppPlayer = input.player;
			const oppDeck = this._players_deck.get(oppPlayer) as CARD[];

			// The opponent has the desired card
			if(oppDeck.includes(input.card)) {
				this._players_deck.set(
					this._currentTurn,
					joinArrays(this.__getCards(this._currentTurn), [input.card]) as CARD[],
				);
				this._players_deck.set(
					oppPlayer,
					oppDeck.filter(v => v !== input.card),
				);

				this._deck_to_players.set(input.card, this._currentTurn);

				return new CallSuccessResponse(input.card, this._currentTurn, oppPlayer);
			}

			// The opponent does not have the card
			this._currentTurn = oppPlayer;
			return new CallFailResponse(input.card, this._currentTurn, oppPlayer);
		}
	}

	private __hasCardOfPit(input: CardCall): boolean {
		const pitCards = this._pitMaps.cardsPerPit.get(
			this._pitMaps.pitMap.get(
				input.card,
			) as PIT,
		) as CARD[];

		for(const pitCard of pitCards)
			if(this.getCards(this._currentTurn)?.includes(pitCard))
				return true;

		return false;
	}

	private __getTeam(player: PLAYER) {
		return Number(player[1]) > 3 ? "Team2" : "Team1";
	}

	private __getOppTeam(player: PLAYER) {
		return Number(player[1]) > 3 ? "Team1" : "Team2";
	}

	public takeCall(player: string) {
		const proposedPlayer = this._players_to_P_map.get(player) as PLAYER;

		if(this._currentTurn !== this.__getTeam(proposedPlayer)) throw new Error("Invalid team member provided");

		this._currentTurn = proposedPlayer;
	}
}
