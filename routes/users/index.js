const router = require('express').Router();
const Posts = require('../posts/posts.model');
const Users = require('./users.model');

router.get('/other', async (req, res) => {
  try {
    console.log('GET /users/others called', req.query);
    let user = await Users.findOne({ _id: req.query.userId })
    .select('-password -status -membership -favourites -deviceToken -stripCustomerId -balance');
    let posts = await Posts.find({ 
      $and: [{ user: req.query.userId }, { group: req.query.groupId }] 
    }).select('video thumbnail views')
    .sort({ createdAt: -1 })
    .skip(((parseInt(req.query.page) - 1) * 10)).limit(10);
    console.log('got user in GET /users/other', user);
    console.log('got posts in GET /users/other', posts);
    return res.status(200).send({
      responseStatus: true,
      responseMessage: 'Profile data fetched succefully',
      responseData: {
        user, posts
      }
    });
  } catch(err) {
    console.log('got error in GET /users/', err);
    return res.status(200).send({
      responseStatus: false,
      responseMessage: 'Internal server error',
      responseData: []
    });
  }
});

router.get('/self', async (req, res) => {
  try {
    console.log('GET /users/self called', req.query);
    let user = await Users.findOne({ _id: req.query.userId })
    .populate({
      path: 'favourites',
      select: 'thumbnail video views'
    })
    .select('-password -stripCustomerId -deviceToken');
    console.log('got user profile', user);
    let myPosts = await Posts.find({ user: req.query.userId })
    .select('video thumbnail views');
    let myGroups = await Groups.find({ admin: req.query.userId })
    .select('name userName coverPicture privacy category');
    let joinedGroups = await Groups.find({ 'members.member': req.query.userId })
    .select('name userName coverPicture prievacy category');
    let chats = await Chats.find({ users: req.query.userId })
    .populate('users', 'userName profilePicture')
    .populate('messages.sentBy', 'userName profilePicture')
    .populate('messages.sentTo', 'userName profilePicture');
    for (let c = 0; c < chats.length; c++) {
      chats[c].messages.sort((a, b) => {
        return b.sendTime - a.sendTime;
      });
    }
    for (let c = 0; c < chats.length; c++) {
      chats[c].messages = chats[c].messages[0]
    }
    return res.status(200).send({
      responseStatus: true,
      responseMessage: 'Got user profile',
      responseData: { user, myPosts, myGroups, joinedGroups, chats, favourites: user.favourites }
    });
  } catch(err) {
    console.log('got error while fetching user profile', err);
    return res.status(200).send({
      responseStatus: false,
      responseMessage: 'Internal server error',
      responseData: []
    });
  }
});

router.get('/friends', async (req, res) => {
  try {
    console.log('GET /users/friends called', req.query);
    let users = await Users.find({ _id: { $ne: req.query.userId } });
    console.log('users', users)
    return res.status(200).send({
      responseStatus: true,
      responseMessage: 'Data fetched successfuly',
      responseData: users
    });
  } catch(err) {
    console.log('got error in GET /users/friends', err);
    return res.status(200).send({
      responseStatus: false,
      responseMessage: 'Internal server error',
      responseData: []
    });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('POST /users/ called', req.body);
    // let profileLink = 'https://txgroups.s3.us-east-2.amazonaws.com/' + req.body.profilePicture;
    let response = await Users.updateOne({ _id: req.body.userId }, {
      fullName: req.body.fullName,
      userName: req.body.userName,
      profilePicture: req.body.profilePicture,
      bio: req.body.bio,
      // status: req.body.status,
      // membership: req.body.membership,
      instagramProfileLink: req.body.instagramProfileLink,
      twitterProfileLink: req.body.twitterProfileLink,
      facebookProfileLink: req.body.facebookProfileLink,
      tiktokProfileLink: req.body.tiktokProfileLink
    });
    console.log('got response of PUT /users/', response);
    let user = await Users.findOne({ _id: req.body.userId }).select('-stripCustomerId -deviceToken -password -createdGroups -joinedGroups')
    return res.status(200).send({
      responseStatus: true,
      responseMessage: 'User updated successfuly',
      responseData: user
    });
  } catch (err) {
    console.log('got error in PUT /users/', err);
    return res.status(200).send({
      responseStatus: false,
      responseMessage: 'Internal server error',
      responseData: []
    });
  }
});


module.exports = router;