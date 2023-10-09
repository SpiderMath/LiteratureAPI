import { LiteratureGame } from "./LiteratureGame";

const game = new LiteratureGame(["A", "B", "C", "D", "E", "F"]);

const dick = [
	[
	  "QS", "4D", "6C",
	  "6D", "KC", "AC",
	  "3H", "7D", "QC",
	],
	[
	  "10C", "9S", "2S",
	  "GU", "8H", "6H",
	  "8D", "QD", "KH",
	],
	[
	  "JC", "4C", "6S",
	  "7C", "3C", "3S",
	  "KD", "3D", "5C",
	],
	[
	  "10D", "AH", "4H",
	  "JH", "10S", "7S",
	  "8C", "5H", "JK",
	],
	[
	  "KS", "9H", "QH",
	  "5S", "4S", "5D",
	  "2H", "AS", "2C",
	],
	[
	  "10H", "JD", "9D",
	  "9C", "8S", "JS",
	  "AD", "7H", "2D",
	],
];

const m = new Map();

for(let i = 0; i < dick.length; i++) {
	m.set(`P${i + 1}`, dick[i]);
}

game.setDeck(m);

game.makeCall({
	type: "CARD",
	card: "AC",
	player: "P1",
});
