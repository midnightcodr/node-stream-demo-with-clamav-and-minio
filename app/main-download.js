const AWS = require('aws-sdk')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const algorithm = 'aes-256-ctr'
const secretKey = process.env.CRYPTO_SECRET_KEY
const iv = Buffer.from(process.env.CRYPTO_IV, 'base64')
const Bucket = process.env.BUCKET

const s3 = new AWS.S3({
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  s3ForcePathStyle: true,
  endpoint: 'http://minio:9000',
  signatureVersion: 'v4'
})

if (process.argv.length < 3) {
  console.log(`usage: node ${process.argv[1]} key [outfile]`)
  process.exit(1)
}
const Key = process.argv[2]
let outputFile = Key
if (process.argv.length > 3) {
  outputFile = path.join('/work', process.argv[3])
}

const outputStream = fs.createWriteStream(outputFile)

const ts = () => new Date().getTime()
const reportTime = (label = 'label') => {
  const t = ts()
  console.log('%s %d', label, t)
  return t
}

;(async () => {
  const times = {}
  times.init = reportTime('init')
  const decrypt = crypto.createDecipheriv(algorithm, secretKey, iv)

  console.log(`outputFile = ${outputFile}`)
  s3.getObject({
    Bucket,
    Key
  })
    .createReadStream()
    .pipe(decrypt)
    .pipe(outputStream)
})()
