const mongoose = require('mongoose');

let PostsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  title: String,
  image: String,
  description: String
}, { timestamps: true });

const Posts = mongoose.model('posts', PostsSchema);

module.exports = Posts;