# pynn
golang and polymer front end for Amazon services based ecloud vault



# notes

  * golang needs to be installed, also packages:

    - /github.com/markbates/goth
    - /github.com/gorilla

  * environment variables expected: Amazon Login callback must be SSL, key and secret are OAUTH2 info

    - AMAZON_KEY
    - AMAZON_SECRET
    - GOTH_SSL_CERT
    - GOTH_SSL_KEY

  * https connections to S3 buckets with names containing dots have problems since subdomains are beyond the validity of the wildcard ssl certificate. See http://shlomoswidler.com/2009/08/amazon-s3-gotcha-using-virtual-host.html

  * see ./amazon/crossorigin.xml for Cross-Origin Resource Sharing info for S3 bucket

  * the Authenticated Users group includes those with cognito unathenticated users, at least when they are allowed (the original access I saw hasn't been duplicated may have been due to caching)


