const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const { response } = require('express');
require('dotenv').config();

const app = express();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

// Create Schemas
const exerciseSessionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [exerciseSessionSchema],
});

// Create models (can create documents from these models)
const Session = mongoose.model('Session', exerciseSessionSchema);
const User = mongoose.model('User', userSchema);

// Route handler for index.html form 1
app.post(
  '/api/exercise/new-user',
  bodyParser.urlencoded({ extended: false }),
  (req, res) => {
    User.findOne({ username: req.body.username }, (error, user) => {
      if (user)
        return res.json({
          msg: 'This username is already taken!',
          username: req.body.username,
          _id: user['_id'],
        });
      else {
        let newUser = new User({ username: req.body.username });
        newUser.save((error, savedUser) => {
          if (!error) {
            let responseObject = {};
            responseObject['username'] = savedUser.username;
            responseObject['_id'] = savedUser.id;
            res.json(responseObject);
          }
        });
      }
    });
  }
);

// Route to get an array of all users
app.get('/api/exercise/users', (req, res) => {
  User.find({}, (error, arrayOfUsers) => {
    if (!error) {
      res.send(arrayOfUsers);
    }
  });
});

// Route handler for index.html form 2
app.post(
  '/api/exercise/add',
  bodyParser.urlencoded({ extended: false }),
  (req, res) => {
    let newSession = new Session({
      description: req.body.description,
      duration: parseInt(req.body.duration),
      date: req.body.date,
    });

    if (newSession.date == '') {
      newSession.date = new Date().toISOString().substring(0, 10);
    }

    User.findByIdAndUpdate(
      req.body.userId,
      { $push: { log: newSession } },
      { new: true },
      (error, updatedUser) => {
        let responseObject = {};
        responseObject['_id'] = updatedUser.id;
        responseObject['username'] = updatedUser.username;
        responseObject['date'] = new Date(newSession.date).toDateString();
        responseObject['description'] = newSession.description;
        responseObject['duration'] = newSession.duration;
        res.json(responseObject);
      }
    );
  }
);

// Get full exercise log of any user
app.get('/api/exercise/log', (req, res) => {
  User.findById(req.query.userId, (error, userExerciseLog) => {
    if (error) console.log(error);
    else {
      let responseObject = {};

      responseObject['_id'] = userExerciseLog['_id'];
      responseObject['username'] = userExerciseLog.username;
      responseObject['count'] = userExerciseLog.log.length;
      responseObject['log'] = userExerciseLog.log;

      // Date to/from filter
      if (req.query.from || req.query.to) {
        let fromDate = new Date(0).getTime();
        let toDate = new Date().getTime();

        if (req.query.from) {
          fromDate = new Date(req.query.from).getTime();
        }

        if (req.query.to) {
          toDate = new Date(req.query.to).getTime();
        }

        responseObject.log = responseObject.log.filter((exercise) => {
          let exerciseDate = new Date(exercise.date).getTime();
          return exerciseDate >= fromDate && exerciseDate <= toDate;
        });
      }

      // Limit exercises shown
      if (req.query.limit) {
        responseObject.log = responseObject.log.slice(0, req.query.limit);
      }

      responseObject.count = responseObject.log.length;
      res.json(responseObject);
    }
  });
});

// Home page stuff
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
