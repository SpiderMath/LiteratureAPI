import { randomDeck, CardCall, PitCall, getPitMaps, PIT, CARD, PLAYERID, PitBurnResponse, joinArrays, CallSuccessResponse, CallFailResponse, PitDropResponse, TakeCallResponse } from "./Util";

export class LiteratureGame {
	private _playersToIDMap: Map<string, PLAYERID> = new Map();
	private _IDToPlayersMap: Map<PLAYERID, string> = new Map();
	private _currentTurn: PLAYERID = "P1";
	private _players_deck: Map<PLAYERID, CARD[]> = new Map();
	private _cardToPlayerID: Map<CARD, PLAYERID> = new Map();
	private _pitMaps = getPitMaps();

	public teamPoints = {};
	public teams;
	public logs: (PitBurnResponse | PitDropResponse | CallSuccessResponse | CallFailResponse | TakeCallResponse)[] = [];
	public permissionToLog = true;


	/**
	 * Initialises the literature game class
	 * @param players The names of the players who are participating in the current game, the first 3 belong in Team 1 and the other 3 belong in Team 2
	 */
	constructor(players: string[], teams: string[] = ["Team1", "Team2"]) {
		for(let i = 1; i <= players.length; i++) {
			this._playersToIDMap.set(players[i - 1], `P${i}`);
			this._IDToPlayersMap.set(`P${i}`, players[i - 1]);
		}

		this.teams = teams;
		if(this.teams.length !== 2) throw new Error("Either provide 2 team names, or stick to default names");

		// @ts-expect-error
		this.teamPoints[teams[0]] = 0;
		// @ts-expect-error
		this.teamPoints[teams[1]] = 0;
	}


	/**
	 * To get the name of the player whose call it is
	 */
	get getTurn() {
		return this._IDToPlayersMap.get(this._currentTurn) as string;
	}


	/**
	 * To set the playing deck of the room
	 * If no parameter is provided, a random deck is initialised by itself
	 * @param customDeck
	 */
	public setDeck(customDeck: Map<PLAYERID, CARD[]> = randomDeck()) {
		this._players_deck = customDeck;

		for(const cards of this._players_deck.entries())
			for(const card of cards[1])
				this._cardToPlayerID.set(card, cards[0]);
	}


	/**
	 * Returns the pit of the card you require
	 * @param card The card whose pit you want to know
	 * @returns the pit in which the card belongs
	 */
	public getPitFromCard(card: CARD) {
		return this._pitMaps.pitMap.get(card) as PIT;
	}


	/**
	 * Returns the cards in the pit you need
	 * @param pit The pit whose cards you want to know
	 * @returns the cards which belong in that pit
	*/
	public getCardsOfPit(pit: PIT) {
		return this._pitMaps.cardsPerPit.get(pit) as CARD[];
	}


	public makeCall(input: CardCall | PitCall) {
		if(this.teams.includes(this._currentTurn)) throw new Error("Current player not decided.");

		if(input.type === "CARD") {
			// pit burn if player does not have a card of the pit or calls a card they already have
			if(!this.__hasCardOfPit(input.card) || this.__getCards().includes(input.card)) {
				const burntPit = this.getPitFromCard(input.card);
				this.__removePlayingCards(burntPit);
				return this.__pitBurn(burntPit);
			}

			// if we reach here, then the person calling has a card of that pit
			const oppPlayer = input.player;
			const oppDeck = this._players_deck.get(oppPlayer) as CARD[];

			// The opponent has the desired card
			if(oppDeck.includes(input.card)) {
				this.__modifyPlayerCards("ADD", this._currentTurn, input.card);
				this.__modifyPlayerCards("REMOVE", input.player, input.card);

				const callSuccessResp = {
					type: "CALL_SUCCESS",
					message: `${this._currentTurn} collected ${input.card} from ${input.player} successfully`,
					calledCard: input.card,
					calledPlayer: input.player,
					callingPlayer: this._currentTurn,
				} as CallSuccessResponse;

				return this.__log(callSuccessResp);
			}

			// The opponent does not have the card
			this._currentTurn = oppPlayer;
			const callFailResp = {
				type: "CALL_FAIL",
				message: `${this._currentTurn} did not get ${input.card} from ${input.player}`,
				calledCard: input.card,
				calledPlayer: input.player,
				callingPlayer: this._currentTurn,
			} as CallFailResponse;

			return this.__log(callFailResp);
		}

		if(input.type === "PIT") {
			// Checking for pit burns

			// The reason I'm not making my life simpler by just saying take input.cardCalls[0].card, is because it is possible that the player just keeps 6 cards with them and drops at the end
			let pitBurn = !this.__hasCardOfPit(this.getCardsOfPit(input.pit)[0]);

			// If the player says that someone else has a card with them when he instead has those, it would be a pit burn
			const cards = input.cardCalls.map(call => call.card);
			for(const card of cards)
				if(this.getCards(this._currentTurn)?.includes(card))
					pitBurn = true;

			// In case they did not make an improper call, check whether the people they called all had those cards, otherwise its also a burn!
			if(!pitBurn) {
				let player: PLAYERID = this._currentTurn;

				for(const card of this.getCardsOfPit(input.pit)) {
					if(cards.includes(card)) {
						player = input.cardCalls
							.filter(call => call.card === card)[0]
							.player;
					}

					if(player !== this._cardToPlayerID.get(card)) {
						pitBurn = true;
					}
				}
			}

			this.__removePlayingCards(input.pit);

			// The player burned their pit
			if(pitBurn)
				return this.__pitBurn(input.pit);
			// The player actually dropped their pit
			else
				return this.__pitDrop(input.pit);
		}
	}


	/**
	 * To get the playing cards of a player
	 * @param pName The name of the player whose cards you wanna know
	*/
	public getCards(pName: string = "") {
		return this.__getCards(this._playersToIDMap.get(pName)) as CARD[];
	}


	public takeCall(player: string) {
		const proposedPlayer = this._playersToIDMap.get(player) as PLAYERID;

		if(this._currentTurn !== this.__getTeam(proposedPlayer)) throw new Error("Invalid team member provided");

		this._currentTurn = proposedPlayer;

		const takeCallResp = {
			type: "TAKE_CALL",
			player: proposedPlayer,
			team: this.__getTeam(proposedPlayer),
			message: `${proposedPlayer} is taking the call for ${this.__getTeam(proposedPlayer)} `,
		} as TakeCallResponse;

		return this.__log(takeCallResp);
	}


	/**
	 * The private method to get the playing cards of a player
	 * Takes in the player IDs
	 * @param player Defaults to the player whose turn it is
	 * @returns
	 */
	private __getCards(player?: PLAYERID) {
		return this._players_deck.get(
			player ?? this._currentTurn,
		) as CARD[];
	}


	private __getPitDistribution(pit: PIT) {
		const pitDist = {};

		for(const card of this.getCardsOfPit(pit)) {
			const player = this._cardToPlayerID.get(card) as PLAYERID;

			// @ts-ignore
			pitDist[player] = joinArrays(pitDist[player] ?? [], [card]);
		}

		return pitDist;
	}


	private __removePlayingCards(pit: PIT) {
		const currentPitCards = this.getCardsOfPit(pit);

		// Removing all cards of pit from everyone
		for(const card of currentPitCards) {
			const player = this._cardToPlayerID.get(card) as PLAYERID;
			this._players_deck.set(
				player,
				this._players_deck.get(player)?.filter((v) => v !== card) as CARD[],
			);
		}
	}


	private __modifyPlayerCards(type: "ADD" | "REMOVE", player: PLAYERID, card: CARD) {
		this._players_deck.set(player, type === "ADD" ?
			joinArrays(this.__getCards(player), [card]) : this.__getCards(player).filter(c => c !== card));

		if(type === "ADD") this._cardToPlayerID.set(card, player);
	}


	private __pitBurn(burntPit: PIT, burningPlayer?: PLAYERID) {
		burningPlayer ??= this._currentTurn;
		const pitDist = this.__getPitDistribution(burntPit);

		const oppTeam = this.__getOppTeam(burningPlayer);
		// @ts-ignore
		this.teamPoints[oppTeam as keyof typeof this.teamPoints]++;
		this._currentTurn = oppTeam;

		const pitBurnResp = {
			type: "PIT_BURN",
			message: `${burningPlayer} has burned the pit ${burntPit}`,
			burningPlayer,
			burningTeam: this.__getTeam(burningPlayer),
			burntPit,
			pitDistribution: pitDist,
		} as PitBurnResponse;

		return this.__log(pitBurnResp);
	}


	private __pitDrop(droppedPit: PIT, droppingPlayer?: PLAYERID) {
		droppingPlayer ??= this._currentTurn;
		const pitDist = this.__getPitDistribution(droppedPit);

		const team = this.__getTeam(droppingPlayer);
		// @ts-ignore
		this.teamPoints[team as keyof typeof this.teamPoints]++;

		const pitDropResp = {
			type: "PIT_DROP",
			droppedPit,
			droppingPlayer,
			droppingTeam: team,
			message: `${droppingPlayer} has dropped the pit ${droppedPit}`,
			pitDistribution: pitDist,
		} as PitDropResponse;

		return this.__log(pitDropResp);
	}


	private __hasCardOfPit(card: CARD): boolean {
		const pitCards = this.getCardsOfPit(this.getPitFromCard(card));

		for(const pitCard of pitCards)
			if(this.getCards(this._currentTurn)?.includes(pitCard))
				return true;

		return false;
	}


	private __getTeam(player: PLAYERID) {
		return Number(player[1]) > 3 ? this.teams[1] : this.teams[0];
	}


	private __getOppTeam(player: PLAYERID) {
		return Number(player[1]) > 3 ? this.teams[0] : this.teams[1];
	}


	private __log(response: PitBurnResponse | PitDropResponse | CallSuccessResponse | CallFailResponse | TakeCallResponse) {
		if(!this.permissionToLog) return;

		this.logs.push(response);

		return response;
	}
}
