import express from "express"
import pkg from "pg";
import cors from "cors";

const { Pool } = pkg;

const app = express();
const PORT = 3000;

const myDB = new Pool({
  user: "postgres",
  host: "localhost",
  database: "monopoly",
  password: "password",
  port: 5541
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.post("/create-game", async (req, res) => {
  try {
  
    const store_this_amount = req.body.initial_amt;
    const result = await myDB.query(
      "INSERT INTO games (amount) VALUES ($1) RETURNING game_id",
      [store_this_amount]
    );
    const game_id = result.rows[0].game_id;

    const all_players = req.body.players;

    for (let pos = 0; pos < all_players.length; pos++) {
      const player = all_players[pos];
      const player_name = player.name;
      const player_color = player.color;

      await myDB.query(
        "INSERT INTO players (player_name, color, amount, game_id) VALUES ($1, $2, $3, $4)",
        [player_name, player_color, store_this_amount, game_id]
      );
    }

    res.json({ message: "Game created", game_id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database insert error");
  }
});

app.get("/fetch-game", async (req, res) => {
  const game_id = req.query.game_id;
  const result = await myDB.query("SELECT * from players where game_id = $1", [game_id]);
  res.json({data: result.rows})
})

app.post("/process", async (req, res) => {
  const { player_one, game_id, player_two, amount, type, desc } = req.body;

  if(type == 'DEBIT') {
    let player_id = player_two;

    if (player_id == null) {
      player_id = player_one
    }

    const result = await myDB.query("SELECT player_name, amount FROM players WHERE player_id = $1", [player_id]);
    const playBalance = result.rows[0].amount;
    const playName = result.rows[0].player_name;

    if(playBalance < amount) {
      return res.send("Insufficient Balance in " + playName + "'s account");
    }

    if(player_two == null) {
      const newPlay1Balance = playBalance - amount;
      await myDB.query("UPDATE players SET amount = $1 WHERE player_id = $2", [newPlay1Balance, player_one]);
    } else {
      const resultPlay1 = await myDB.query("SELECT amount FROM players WHERE player_id = $1", [player_one]);
      const play1Balance = resultPlay1.rows[0].amount;
      const newPlay2Balance = playBalance - amount;
      const newPlay1Balance = play1Balance + amount;

      await myDB.query("UPDATE players SET amount = $1 WHERE player_id = $2", [newPlay2Balance, player_two]);
      await myDB.query("UPDATE players SET amount = $1 WHERE player_id = $2", [newPlay1Balance, player_one]);
    }
  }

  if(type == 'CREDIT' && player_two == null) {
    const resultPlay1 = await myDB.query("SELECT amount FROM players WHERE player_id = $1", [player_one]);
    const play1Balance = resultPlay1.rows[0].amount;
    
    const newPlay1Balance = play1Balance + amount;
    await myDB.query("UPDATE players SET amount = $1 WHERE player_id = $2", [newPlay1Balance, player_one]);
  }

  const result = await myDB.query("INSERT INTO transactions (game_id, player_one, player_two, amount, transaction_type, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [game_id, player_one, player_two, amount, type, desc]);
  
  return res.json({"data": result.rows[0]})
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});