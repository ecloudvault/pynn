console.log('Loading function');

var aws = require('aws-sdk');
var s3 = new aws.S3({ apiVersion: '2006-03-01' });
//var doc = require('dynamodb-doc');
var table = new aws.DynamoDB( {apiVersion: '2012-08-10', region:  'us-west-2',
                accessKeyId: 'AKIAIOAPI7JRYJUHZKFQ', secretAccessKey: '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', params: {TableName: 'VideoLibrary'}});

exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // VideoAssets DB item
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
        "Ownerid": {
            "S": "ggrajek"
        },
        "Description": {
            "S": "describe this video"
        },
        "Rawpath": {
            "S": ""
        }
    }
}

//var item = {
//        etag: '',
//        organization: 'ecloudvault',
//        ownerid: 'stephen',
//        description: 'description of video contents',
//        raw: '',
//        stream: '',
//        thumbnail: ''
//    };

    // Get the object from the event and show its content type
    var bucket = event.Records[0].s3.bucket.name;
    var key = event.Records[0].s3.object.key;
    var params = {
        Bucket: bucket,
        Key: key
    };
    
    var keySegments = key.split('/');
    var baseName = keySegments[keySegments.length - 1].split('.')[0];
            
    if(keySegments.length == 3) {
        var headInfo = '';
        s3.headObject(params, function(err, data) {
            if (err) {
                console.log(err);
                var message = "Error getting object " + key + " from bucket " + bucket +
                                ". Make sure they exist and your bucket is in the same region as this function.";
                console.log(message);
                context.fail(message);
            } else {
                console.log('event: ', data);

                if(keySegments[1] == 'raw') {
                    item.Item.VideoID.S = keySegments[2].split('.')[0];
                    item.Item.ETag.S = JSON.parse(data.ETag);
                    item.Item.Rawpath.S = key;
                    table.putItem(item, function(err,dbdata) {
                        if(err) {
                            console.log('db error: ' + err);
                        } else {
                            console.log('db response:', JSON.stringify(dbdata));
                            context.succeed('Succeed');
                        }
                    });
                } else if(keySegments[1] == 'output') {
                    var vid = keySegments[2].split('.')[0];
                    var qkey = {'VideoID': {S: vid}}; // {Key: {'VideoID': {S: vid}}};
                    
                    var info = {
                        //"AttributeUpdates": 
                        //    {
                                "Stream" :
                                    {
                                        "Action": "ADD",
                                        "Value": {
                                            "S": key,
                                        }
                                    }
                           // }
                    };
                    
                    var upexpress = "set Streampath = :val1";
                    //"ExpressionAttributeValues": {
                    //":val1": {"S": "alice@example.com"},
                    //":val2": {"S": "fred@example.com"}
                    //},
                   
                    table.updateItem( { Key: qkey, UpdateExpression: upexpress, ExpressionAttributeValues: { ":val1": {"S": key} } }, function(err,dbdata) {
                        if(err) {
                            console.log('db error: (' + JSON.stringify(qkey) + ') ' + err );
                        } else {
                            //table.updateItem( {}, function(err, dbdata) {
                            //    if(err) {
                            //        
                            //    } else {
                                    console.log('db response:', JSON.stringify(dbdata));
                                    context.succeed('Succeed at getItem');
                            //    }
                            //});
                        }
                    });
                }
            }
        });
    }
    
    console.log('non video event');
};


