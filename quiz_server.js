const express = require("express");
const axios = require("axios").default;
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:");
const app = express();
const port = 3000;
app.use(express.json());

// Create room and player database table
db.run(
  "CREATE TABLE room (room_id INTEGER PRIMARY KEY AUTOINCREMENT, start DATETIME DEFAULT CURRENT_TIMESTAMP, questions TEXT, correct_answers TEXT);"
);

db.run(
  "CREATE TABLE player (player_id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER, answers TEXT DEFAULT '[]', name TEXT);"
);

// Create game room
app.post("/room", (req, res) => {
  // Get 10 computer science questions from open trivia db
  axios
    .get("https://opentdb.com/api.php?amount=10&category=18&type=multiple")
    .then((response) => {
      let questions = [];
      let correct_answers = [];

      // Format each question to merge correct and incorrect answers
      response.data.results.map((question, index) => {
        let formated_question = {
          id: index,
          question: question.question,
          possible_answers: question.incorrect_answers,
        };
        // insert correct answer in random index
        const random_number = Math.floor(
          Math.random() * (formated_question.possible_answers.length + 1)
        );
        formated_question.possible_answers.splice(
          random_number,
          0,
          question.correct_answer
        );
        questions.push(formated_question);
        correct_answers.push(question.correct_answer);
      });

      // Insert into sqlite db
      db.run(
        "INSERT INTO room (questions, correct_answers) VALUES(?, ?);",
        [JSON.stringify(questions), JSON.stringify(correct_answers)],
        function (err) {
          if (err) {
            res.status(500).send(err);
          } else {
            // send room_id (row_id of insert) back
            res.send(this);
          }
        }
      );
    });
});

// Get questions from game room
app.get("/room/:room_id", (req, res) => {
  const room_id = parseInt(req?.params?.room_id);
  // if room_id is not number send error
  if (isNaN(room_id)) {
    res.status(400).send("Invalid room id");
    return;
  }

  db.get(
    "SELECT questions, start FROM room WHERE room_id = " + room_id,
    function (err, row) {
      if (err) {
        res.status(500).send(err);
      } else if (row === undefined) {
        res.status(404).send("Room not found");
      } else {
        // Parse questions from text to json
        row.questions = JSON.parse(row.questions);
        res.send(row);
      }
    }
  );
});

// post answers to all questions
app.post("/room/:room_id", (req, res) => {
  // get all variables in order
  const room_id = parseInt(req?.params?.room_id);
  const answers = req?.body?.answer;
  const name = req?.body?.name;
  // send error if room_id is not number, or name is not a string or answers is not an array
  if (
    isNaN(room_id) |
    (typeof answers != "object") |
    (typeof name != "string")
  ) {
    res.status(400).send("Invalid room id, question id, name or answer");
    return;
  }

  // DELETE previous answers from db
  db.run("DELETE FROM player WHERE name = ? AND room_id=?", [name, room_id]);

  // INSERT
  db.run("INSERT INTO player (room_id, answers, name) VALUES(?, ?, ?)", [
    room_id,
    JSON.stringify(answers),
    name,
  ]);
  res.send("Answers submitted");
});

app.get("/score/:room_id/:player_name", (req, res) => {
  // Get all the questions from the room
  db.get("SELECT * FROM room WHERE room_id = " + room_id, function (err, row) {
    if (err) {
      res.status(500).send(err);
    } else if (row === undefined) {
      res.status(404).send("Room not found");
    } else {
      // Parse questions from text to json
      row.correct_answers = JSON.parse(row.correct_answers);
      if (row.correct_answers[question_id] == answer) res.send("correct");
      else res.send("Incorrect");
    }
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
