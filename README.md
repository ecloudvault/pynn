# pynn
golang and polymer front end for Amazon services based ecloud vault



# notes

  * https connections to S3 buckets with names containing dots have problems since subdomains are beyond the validity of the wildcard ssl certificate. See http://shlomoswidler.com/2009/08/amazon-s3-gotcha-using-virtual-host.html

  * see ./amazon/crossorigin.xml for Cross-Origin Resource Sharing info for S3 bucket

  * the Authenticated Users group includes those with cognito unathenticated users, at least when they are allowed

