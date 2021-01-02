The purpose of this docker-compose app is to illustrate the power of nodejs stream. In the upload script, the following occurs:

1. the node script takes in the input file, in the form a a Readable stream
2. the stream will be scanned with clamav (mkodockx/docker-clamav), I've enlarged CLAMD_CONF_StreamMaxLength to 4GB so it should not have problem scanning files under that limit
3. the stream will be encrypted using the key and iv defined in Dockerfile
4. finally the stream will be uploaded to a dockernized minio server (which is AWS s3 compatible), saved under process.env.BUCKET

On the other hand, download script will be a bit simpler
1. With the specified key, s3 object will be downloaded (getObject call) as a Readable stream
2. The stream will be decrypted using the same key/iv in the encryption process
3. The final result is the decrypted stream will be saved to an outfile

## Setup
```
docker-compose up --build
```

## Upload
Wait for at least 15 seconds after the above step is done, since it will take some time for clamav to be ready (initial auto update virus definition stuff)
```
echo 'say hello to stream' > hello.txt
docker-compose run -v $PWD:/work app main-upload.js hello.txt
```

## Download
```
docker-compose run -v $PWD:/work app main-download.js hello.txt hello-downloaded.txt
```