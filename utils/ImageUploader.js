const AWS = require("aws-sdk");
const uuid = require("uuid"); //give all images unique ids
/*
File passed in is from req.file
*/
class ImageUploader {
  constructor(file) {
    this.s3 = new AWS.S3();
    this.S3_BUCKET = process.env.S3_BUCKET;
    this.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
    this.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    this.REGION = process.env.REGION;

    //Initialize S3 config options right awaay
    this.config();

    this.extension = file.mimetype.split("/")[1];
    this.fileName = `${uuid.v4()}.${this.extension}`;
    this.bucketName = "sciencenearme-storage/uploads";
    this.s3Bucket = new AWS.S3({ params: { Bucket: "sciencenearme-storage" } });
  }

  config() {
    AWS.config.update({
      accessKeyId: this.AWS_ACCESS_KEY_ID,
      secretAccessKey: this.AWS_SECRET_ACCESS_KEY,
      region: this.REGION
    });
  }

  getUrlPath() {
    return `https://s3.eu-west-2.amazonaws.com/${this.bucketName}/${this.fileName}`;
  }

  uploadPhoto(photoBuffer, cb) {
    const params = {
      Bucket: this.bucketName,
      Key: this.fileName,
      Body: photoBuffer,
      ContentType: "image/" + this.extension,
      ACL: "public-read"
    };

    this.s3.putObject(params, (err, res) => {
      if (err) {
        console.log("Error uploading data: ", err);
      } else {
        console.log("Successfully uploaded data to myBucket/myKey", res);
        // Callback used to call next in the parent file
        cb();
      }
    });
  }
}

exports.S3Loader = ImageUploader;
