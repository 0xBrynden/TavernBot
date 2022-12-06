require('dotenv').config();

// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the Region 
AWS.config.update({region: 'us-west-2'});  // TODO, choose appropriate
// Create S3 service object
s3 = new AWS.S3();

// - - - - -

async function uploadObject (objectKey, object) {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: objectKey,
      Body: JSON.stringify(object),
      ContentType: 'application/json',
    };

    const data = await s3.upload(params).promise();
    console.log("Successful upload")
    return true
  } catch (e) {
    console.log(`Could not upload file to S3: ${e.message}`)
  }
}

async function downloadObject (objectKey) {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: objectKey 
    }

    const data = await s3.getObject(params).promise();
    console.log("Successful download")
    return JSON.parse(data.Body.toString());
  } catch (e) {
    console.log(`Could not retrieve file from S3: ${e.message}`)
    return {}
  }
}

async function lastObjectKey() {
  try {
    const params = {
      Bucket : process.env.S3_BUCKET,
    };
    
    const data = await s3.listObjectsV2(params).promise();
    console.log("Successful Read file List")
    return x = data.Contents[data.Contents.length-1].Key
  } catch (e) {
    console.log(`Could not Read file List from S3: ${e.message}`)
  }
}

module.exports = {
  uploadObject,
  downloadObject,
  lastObjectKey
};