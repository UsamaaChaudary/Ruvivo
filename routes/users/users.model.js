const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

let UsersSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  image: String
});

UsersSchema.methods.isValidPassword = async function (password) {
  const user = this;
  const compare = await bcrypt.compare(password, user.password);

  return compare;
}

const Users = mongoose.model('users', UsersSchema);

module.exports = Users;
