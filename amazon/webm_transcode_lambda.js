console.log('Newly uploaded file put');
var AWS = require('aws-sdk');

// S3
var s3 = new AWS.S3({apiVersion: '2006-03-01'});

// DynamoDB
var table = new AWS.DynamoDB( {apiVersion: '2012-08-10', region:  'us-west-2', params: {TableName: 'VideoLibrary'}});

// Elastic Transcoder
var eltr = new AWS.ElasticTranscoder({
    apiVersion: '2012-09-25',
    region: 'us-west-2'
});

// ID of pipeline
var pipelineId = '1437678243124-efkg32';
// ID of ET's web output preset
var webMP4Preset = 'webMP4Preset';
// Our custom WebM format
var webMPresetCustom = '1437689108599-6fhrpw';
// Our custom ogg format
var oggPresetCustom = 'oggPreset';


exports.jobCreator = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // VideoLibrary DB item
    var item =
    {
      "Item": {
        "VideoID" : {
            "S": ""
        },
        "ETag": {
            "S": ""
        },
        "Organization": {
            "S": "ecloudvault"
        },
        "OwnerID": {
            "S": "ggrajek"
        },
        "Description": {
            "S": "describe this video"
        },
        "Rawpath": {
            "S": ""
        }
      }
    };

    // Get the object from the event and show its content type
    var bucket = event.Records[0].s3.bucket.name;
    var key = event.Records[0].s3.object.key;
    if (bucket != 'videopail') {
      console.log('Not my-bucket');
    }
    var s3params = {
        Bucket: bucket,
        Key: key
    };
   
    var keySegments = key.split('/');
    var nameSegments = keySegments[keySegments.length - 1].split('.');
    var baseName = nameSegments[0];
    var extName = nameSegments[nameSegments.length - 1];

    if(keySegments.length == 3) {

      s3.headObject( s3params, function(err, data) {
        if (err) {
          console.log('error getting object ' + key + ' from bucket ' + bucket +
                      '. Make sure they exist and your bucket is in the same region as this function.');
          context.done('ERROR', 'error getting file' + err);
        } else {

          if ( (data.ContentType == 'application/octet-stream') 
              || (data.ContentType == 'video/mp4')
              || (data.ContentType == 'video/mp4; charset=UTF-8')
              || (data.ContentType == 'video/quicktime')
              || (data.ContentType == 'video/quicktime; charset=UTF-8')
              || (data.ContentType == 'video/x-msvideo')
              || (data.ContentType == 'video/x-msvideo; charset=UTF-8') ) {

            console.log('Found new video: ' + key + ', sending to ET');

            // add to db

            item.Item.VideoID.S = baseName;
            item.Item.ETag.S = JSON.parse(data.ETag);
            item.Item.Rawpath.S = key;
            table.putItem(item, function(err,dbdata) {
                if(err) {
                    console.log('db error: ' + err);
                } else {
                    console.log('db response:', JSON.stringify(dbdata));
                }
            });

            // schedule transcoding job

            var params = {
                PipelineId: pipelineId,
                OutputKeyPrefix: 'video/output/',
                Input: {
                  Key: key,
                  FrameRate: 'auto',
                  Resolution: 'auto',
                  AspectRatio: 'auto',
                  Interlaced: 'auto',
                  Container: 'auto'
                },
                Outputs: [
                  {
                    Key: baseName + '.webm',
                    ThumbnailPattern: baseName + '.{count}',
                    PresetId: webMPresetCustom,
                    Rotate: 'auto'
                    //UserMetadata: {
                    //  uuid: data.Metadata.uuid,
                    //  video_type: 'webm'
                    //}
                  }
                ]
              };

            eltr.createJob(params, function (error, data) {
              if (error) {
                console.log('Failed to send new video ' + key + ' to ET');
                console.log(error);
              } else {
                console.log(data);
              }
              context.done(null,'');
            });


          } else {
            console.log('Is it a webm? ' + key + ' (' + data.ContentType + ')');
            console.log(JSON.stringify(data.Metadata));

            var qkey = {'VideoID': {'S': baseName}};
                      
            var upexpress = extName == 'webm' ? "set Streampath = :val1" : "set Posterpath = :val1";
                     
            table.updateItem( { Key: qkey,
                                UpdateExpression: upexpress,
                                ExpressionAttributeValues: { ":val1": {"S": key} } },
                                function(err,dbdata) {
                                  if(err) {
                                    console.log('db error: (' + JSON.stringify(qkey) + ') ' + err );
                                  } else {
                                    console.log('db response:', JSON.stringify(dbdata));
                                    //context.succeed('Succeed at getItem');
                                  }
            });
            
            s3.putObjectAcl( { Bucket: 'videopail',
                                Key: key,
                                ACL: 'public-read' },
                                function(err,s3data) {
                                  if(err) {
                                    console.log('s3 (permissions put) error: ' + err );
                                  } else {
                                    console.log('s3 response:', JSON.stringify(s3data));
                                    //context.succeed('Succeed at getItem');
                                  }
            });
          }
        }
    });
    
    console.log('non video event');
    }
};
