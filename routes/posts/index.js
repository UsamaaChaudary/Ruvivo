const router = require('express').Router();
const Posts = require('./posts.model');
const Users = require('../users/users.model');

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

router.post('/', async (req, res) => {
  try {
    console.log('POST /posts/ called', req.body);
    let post = await Posts.create({
      user: req.body.userId,
      title: req.body.title,
      image: req.body.image,
      description: req.body.description
    });
    return res.status(200).send({
      responseStatus: true,
      responseMessage: 'Post published',
      responseData: post
    });
  } catch (err) {
    return res.status(500).send({
      responseStatus: false,
      responseMessage: 'Internal server error',
      responseData: []
    });
  }
});


router.get('/', async (req, res) => {
  try {
    let posts = await Posts.find()
      .select('-user')
      .sort({ createdAt: -1 })
      .skip(((parseInt(req.query.page) - 1) * 10)).limit(10);
    return res.status(200).send({
      responseStatus: true,
      responseMessage: 'All posts fetched successfuly',
      responseData: posts
    });
  } catch (err) {
    return res.status(200).send({
      responseStatus: false,
      responseMessage: 'Internal server error',
      responseData: []
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    let post = await Posts.findOne({ _id: req.params.id }).select('-user');
    res.status(200).send({
      responseStatus: true,
      responseMessage: 'Post fetched',
      responseData: post
    });
  } catch (err) {
    res.status(200).send({
      responseStatus: false,
      responseMessage: 'Internal server error',
      responseData: []
    });
  }
});

router.put('/', async (req, res) => {
  try {
    let postId = req.query.postId;
    let userId = req.query.userId;
    let post = await Posts.findOne({ _id: postId });
    if(post.user === userId) {
      let image = undefined;
      let result = await s3Upload(req.query.file);    // file will be in bas64
      if (result.success) {
        image = result.location;
      }
      await Posts.updateOne({ _id: postId }, {
        title: req.query.title,
        image,
        description: re.query.description
      });
      let updatedPost = await Posts.findOne({ _id: postId });
      return res.status(200).send({
        responseStatus: true,
        responseMessage: 'Post updated',
        responseData: updatedPost
      });
    } else {
      return res.status(401).send({
        responseStatus: false,
        responseMessage: 'Unauthorized user',
        responseData: updatedPost
      });
    }
  } catch (err) {
    return res.status(500).send({
      responseStatus: false,
      responseMessage: 'Internal server error',
      responseData: []
    });
  }
});

router.delete('/', async (req, res) => {
  try {
    let postId = req.query.postId;
    let userId = req.query.userId;
    let post = await Posts.findOne({ _id: postId });
    if(post.user === userId) {
      await Posts.deleteOne({ _id: postId });
      return res.status(200).send({
        responseStatus: true,
        responseMessage: 'Post deleted',
        responseData: updatedPost
      });
    } else {
      return res.status(401).send({
        responseStatus: false,
        responseMessage: 'Unauthorized user',
        responseData: updatedPost
      });
    }
  } catch(error) {
    return res.status(500).send({
      responseStatus: false,
      responseMessage: 'Internal server error',
      responseData: []
    });
  }
});

module.exports = router;