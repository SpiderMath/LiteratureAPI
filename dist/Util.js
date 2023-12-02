"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.divideDeck = exports.shuffleDeck = exports.generateDeck = exports.PitCall = exports.CardCall = exports.Call = exports.Card = void 0;
;
;
// Classes
class Card {
    constructor(input) {
        // Whether the card is the joker or guarantee
        this.special = false;
        // Responsible for storing the type of special card
        this.type = undefined;
        // The suit of the (normal) card
        this.suit = undefined;
        // The rank of the (normal) card
        this.rank = undefined;
        if (typeof input === "string") {
            this.special = true;
            this.type = input;
            return;
        }
        this.suit = input.suit;
        this.rank = input.rank;
    }
}
exports.Card = Card;
class Call {
    constructor(type) {
        this.type = type;
    }
}
exports.Call = Call;
class PitCall extends Call {
    constructor(claims, pit) {
        super("PIT");
        this.claims = claims;
        this.pit = pit;
    }
}
exports.PitCall = PitCall;
class CardCall extends Call {
    constructor(player, card) {
        super("CARD");
        this.requested = player;
        this.card = card;
    }
}
exports.CardCall = CardCall;
// Functions
function generateDeck() {
    // Initialising the special cards in advance
    const cards = [
        new Card("JOKER"),
        new Card("GUARANTEE"),
    ];
    for (const suit of ["HEART", "SPADE", "CLUB", "DIAMOND"])
        for (const rank of [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"])
            cards.push(new Card({
                suit: suit,
                rank: rank,
            }));
    return cards;
}
exports.generateDeck = generateDeck;
// Fisher-Yates algorithm implementation
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        // since j is defined as 0 ≤ j ≤ i
        const j = Math.floor(Math.random() * (i + 1));
        const temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
    }
    return deck;
}
exports.shuffleDeck = shuffleDeck;
function divideDeck(shuffledDeck) {
    const hands = {
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: [],
    };
    for (let i = 0; i < shuffledDeck.length; i++)
        // distribution of cards
        // @ts-ignore
        hands[(i % 6) + 1].push(shuffledDeck[i]);
    return hands;
}
exports.divideDeck = divideDeck;
