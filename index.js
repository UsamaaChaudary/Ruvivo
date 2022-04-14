require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const passport = require('./passport');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users/index');
const postsRouter = require('./routes/posts/index');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Ruvivo', { useNewUrlParser: true, useUnifiedTopology: true }, function () {
  console.log('database connected');
});

app.get('/', (req, res) => res.send('Express Server'));

app.use('/auth', authRouter);
app.use('/users', passport.authenticate("jwt", { session: false }), usersRouter);
app.use('/posts', passport.authenticate("jwt", { session: false }), postsRouter);

let http = require('http');
let server = http.createServer(app);

server.listen(PORT || 3000, () => console.log(`server listening at ${PORT}`));