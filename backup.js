import express from "express"
import pkg from "pg";   // since using ES modules
const { Pool } = pkg;

const app = express();
const PORT = 3000;

const myDB = new Pool({
  user: "postgres",      // your postgres username
  host: "localhost",
  database: "monopoly",   // your database name
  password: "password",
  port: 5541             // default Postgres port
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/create-game", async (req, res) => {
  try {
    const store_this_amount = req.body.initial_amt;
    const result = await myDB.query("INSERT INTO games (amount) VALUES ($1) RETURNING game_id", [store_this_amount]);
    const game_id = result.rows[0].game_id;
    

    const all_players = req.body.players;

    for(let pos = 0; pos < all_players.length; pos++) {
      const player = all_players[pos];
      const player_name = player.name;
      const player_color = player.color;

      await myDB.query("INSERT INTO players (player_name, color, amount, game_id) VALUES ($1, $2, $3, $4)", [player_name, player_color, store_this_amount, game_id]);
    }

    res.send("Hello, Your game is created " + game_id);
  } catch (err) {
    console.error(err);
    res.send("Database insert error");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});