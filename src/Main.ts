import express from 'express';
import { config } from 'dotenv';

config();

const app = express();

app.get('/', (req, res) => {
	res.send({ hello: "world" });
});

app.get('/create_room/:p1/:p2/:p3/:p4/:p5/:p6', (req, res) => {
	// The first three are one team, the next three are another team
	// P1 gets the first call!
});

app.listen(process.env.PORT);