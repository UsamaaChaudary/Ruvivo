const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const AWS = require('aws-sdk');
const Users = require('./users/users.model');
const multer = require('multer');
const Storage = multer.diskStorage({
  destination: 'uploads',
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
})
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3Upload = async (file) => {

  const buffer = Buffer.from(file.replace(/^data:image\/\w+;base64,/, ''), 'base64')
  const mimeType = file.split(';')[0].split('/')[1]
  let name = Date.now() + '.' + mimeType 
  
  const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Body: buffer,
      Key:name,
      ContentType: `image/${mimeType}`,
      ContentEncoding: 'base64',
      CreateBucketConfiguration: {
          LocationConstraint: 'us-east-1'
      }
  }
  try {
      let s3Response = await s3.upload(params).promise()
      return {
        result: {
          success: true,
          location: s3Response.Location
        }
      }
  } catch (e) {
      console.log('error', e);
      return {
        result: {
          success: false
        }
      }
  }
}

const router = express.Router();

function getJWT(email, _id) {
  const token = jwt.sign({
    user: {
      email: email,
      _id: _id
    }
  }, process.env.SIGNING_SECRET || '');
  return token;
}

router.post('/login', passport.authenticate('login', { session: false }), async (req, res) => {
  console.log('LOGGING IN', !(!req.user));
  try {
    if (req.user.message == 'Incorrect password.' || req.user.message == 'Incorrect email.') {
      return res.status(200).send({
        responseStatus: false,
        responseMessage: 'Incorrect email/password',
        responseData: []
      });
    } else {
      await Users.updateOne({ email: req.body.email }, {
        deviceToken: req.body.deviceToken 
      });
      let user = await Users.findOne({ email: req.body.email }).select('-password');
      return res.status(200).send({
        responseStatus: true,
        responseMessage: 'User logged in successfully',
        responseData: user,
        token: getJWT(user.email, user._id),
      });
    }
  } catch (err) {
    console.log('error in /auth/login', err);
    return res.status(500).send({
      responseStatus: false,
      responseMessage: 'Server error occured',
      responseData: []
    });
  }
});

router.post('/signup', passport.authenticate('signup', { session: false }), async (req, res) => {
  try {
    if (req.user.message == 'Invalid email') {
      return res.status(500).send({
        responseStatus: false,
        responseMessage: 'Invalid email',
        responseData: []
      });
    }
    if (req.user.message == 'Users exist') {
      return res.status(200).send({
        responseStatus: false,
        responseMessage: 'User exist with same email',
        responseData: []
      });
    } else {
      let image = undefined;
      let { result } = s3Upload(req.body.file);   // file will be in base64
      if(result.success) {
        image = result.location;
      }
      await Users.updateOne({
        _id: req.user._id
      }, {
        $set: {
          name: req.body.name,
          image
        }
      });
      let user = await Users.findOne({ _id: req.user._id }).select('-password');
      return res.status(200).send({
        responseStatus: true,
        responseMessage: 'User successfuly registered',
        responseData: user,
        token: getJWT(req.user.email, req.user._id)
      });
    }
  } catch (err) {
    console.log('error in /auth/signup', err);
    return res.status(500).send({
      responseStatus: false,
      responseMessage: 'Server error occured',
      responseData: []
    });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    let user = await Users.findOne({ email: req.body.email });
    if (user != null) {
      let token = await Token.findOne({ userId: user._id });
      if (token) {
        await token.deleteOne()
      };
      const resetToken = Math.floor(100000 + Math.random() * 900000);
      await new Token({
        userId: user._id,
        token: resetToken,
        createdAt: Date.now(),
      }).save();
      let data = {
        user,
        subject: 'Password Resest Token',
        msg: `Please enter following code ${resetToken} in your app to reset your password.`
      }
      Helper.sendMail(data, res);
    } else {
      res.status(200).send({
        responseStatus: false,
        responseMessage: 'User not found',
        responseData: []
      });
    }
  } catch (err) {
    console.log('error in /auth/forgotPassword', err);
    res.status(200).send({
      responseStatus: false,
      responseMessage: 'Internal server error',
      responseData: []
    });
  }
});

router.post('/reset-password', async (req, res) => {
  console.log('/auth/reset-password called', req.body);
  try {
    let userId = req.body.userId;
    let token = req.body.token;
    let password = req.body.newPassword;
    let user = await Users.findOne({ _id: req.body.userId });
    if (user) {
      let passwordResetToken = await Token.findOne({ userId });
      if (passwordResetToken) {
        if (token === passwordResetToken.token) {
          const hash = await bcrypt.hash(password, 10);
          await Users.updateOne({
            _id: userId
          }, {
            $set: {
              password: hash
            }
          });
          await passwordResetToken.deleteOne();
          return res.status(200).send({
            responseStatus: true,
            responseMessage: 'Password changed',
            responseData: []
          });
        }
      }
      console.log('Invalid or expired password reset token');
      res.status(200).send({
        responseStatus: false,
        responseMessage: 'Invalid or expired password reset token',
        responseData: []
      });
    } else {
      res.status(200).send({
        responseStatus: false,
        responseMessage: 'User does not exist',
        responseData: []
      });
    }
  } catch (err) {
    console.log('error in /auth/reset-password', err);
    res.status(200).send({
      responseStatus: false,
      responseMessage: 'Internal server error',
      responseData: []
    });
  }
});

module.exports = router;