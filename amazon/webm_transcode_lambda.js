console.log('Newly uploaded file put');
var AWS = require('aws-sdk');
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
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
   // Get the object from the event and show its content type
   var bucket = event.Records[0].s3.bucket.name;
   var key = event.Records[0].s3.object.key;
   if (bucket != 'videopail') {
     console.log('Not my-bucket')
   }
   s3.headObject({
       Bucket:bucket,
       Key:key
     },
      function(err, data) {
        if (err) {
           console.log('error getting object ' + key + ' from bucket ' + bucket +
               '. Make sure they exist and your bucket is in the same region as this function.');
           context.done('ERROR', 'error getting file' + err);
        }
        else {
          if ( (data.ContentType == 'application/octet-stream') 
            || (data.ContentType == 'video/x-msvideo; charset=UTF-8') ) {
            console.log('Found new video: ' + key + ', sending to ET');
            var today = new Date();
            var dd = today.getDate();
            var mm = today.getMonth() + 1;
            var yyyy = today.getFullYear();
            if (dd < 10) {
                dd = '0' + dd;
            }
            if (mm < 10) {
                mm = '0' + mm;
            }
            
            today = dd + '-' + mm + '-' + yyyy + '/';
            var keySegments = key.split('/');
            var newKey = keySegments[keySegments.length - 1].split('.')[0]
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
                    Key: newKey + '.webm',
                    ThumbnailPattern: '',
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
            console.log('Upload ' + key + ' was not video (' + data.ContentType + ')');
            console.log(JSON.stringify(data.Metadata));
          }
        }
      }
   );
};

