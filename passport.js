const passport = require('passport');
const bcrypt = require('bcrypt');
const PassportJWT = require('passport-jwt');
const LocalStrategy = require('passport-local');
const Users = require('./routes/users/users.model');
const validator = require('validator');

let options = {
  usernameField: 'email',
  passwordField: 'password'
};

passport.use('login', new LocalStrategy.Strategy(options, (email, password, done) => {
  Users.findOne({
    email: email
  }, async function (err, user) {
    if (err) {
      return done(err);
    }
    if (!user) {
      console.log('incorrect email')
      return done(null, {
        message: 'Incorrect email.'
      });
    }
    let validate = await user.isValidPassword(password);
    if (!validate) {
      console.log('incorrect password')
      return done(null, {
        message: 'Incorrect password.'
      });
    }
    return done(null, user);
  });
}));

passport.use('signup', new LocalStrategy.Strategy(options,
  async (email, password, done) => {
    try {
      const userExist = await Users.findOne({ email });
      if (!userExist) {
        const valiEmail = validator.isEmail(email);
        if (valiEmail) {
          password = await bcrypt.hash(password, 10);
          let user = await Users.create({
            email,
            password
          });
          user.password = null;
          return done(null, user);
        } else {
          return done(null, {
            message: 'Invalid email'
          });
        }
      } else {
        return done(null, {
          message: 'Users exist'
        });
      }
    } catch (error) {
      done(error);
    }
  }
));

passport.use('jwt', new PassportJWT.Strategy({
  secretOrKey: process.env.SIGNING_SECRET,
  jwtFromRequest: PassportJWT.ExtractJwt.fromAuthHeaderAsBearerToken()
},
  async (token, done) => {
    try {
      let user = await Users.findOne({
        _id: token.user._id
      }, {
        password: 0,
        identity: 0
      });
      delete user.password;
      return done(null, user);
    } catch (error) {
      done(error);
    }
  }
));

module.exports = passport;