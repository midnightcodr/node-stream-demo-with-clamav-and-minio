const AWS = require('aws-sdk')
const stream = require('stream')
const NodeClam = require('clamscan')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const algorithm = 'aes-256-ctr'
const secretKey = process.env.CRYPTO_SECRET_KEY
const iv = Buffer.from(process.env.CRYPTO_IV, 'base64')
const Bucket = process.env.BUCKET

const clamavConfig = {
  clamdscan: {
    host: 'clamav',
    port: 3310
  }
}
const s3 = new AWS.S3({
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  s3ForcePathStyle: true,
  endpoint: 'http://minio:9000',
  signatureVersion: 'v4'
})

class PassCounter extends stream.PassThrough {
  constructor (opts) {
    super(opts)
    this.length = 0
  }

  _transform (chunk, encoding, callback) {
    this.length += chunk.length
    callback(null, chunk)
  }
}

const uploadToS3 = (s3, bucket, key) => {
  const pass = new PassCounter()
  const params = { Bucket: bucket, Key: key, Body: pass }
  s3.upload(params, (err, data) => {
    if (err) {
      pass.emit('upload:error', err)
    } else {
      pass.emit('upload:success', { ...data, uploadLength: pass.length })
    }
  })
  return pass
}

if (process.argv.length < 3) {
  console.log(`usage: node ${process.argv[1]} inputfile`)
  process.exit(1)
}
const inputFile = path.join('/work', process.argv[2])
let inputStream
try {
  inputStream = fs.createReadStream(inputFile)
} catch (err) {
  console.error(err)
  process.exit(1)
}
const Key = path.basename(inputFile)
const ts = () => new Date().getTime()
const reportTime = (label = 'label') => {
  const t = ts()
  console.log('%s %d', label, t)
  return t
}

;(async () => {
  const times = {}
  times.init = reportTime('init')
  const clamav = new NodeClam()
  await clamav.init(clamavConfig)
  times.clamavinit = reportTime("clamav init'ed")
  const av = clamav.passthrough()

  const encrypt = crypto.createCipheriv(algorithm, secretKey, iv)

  try {
    await s3
      .createBucket({
        Bucket
      })
      .promise()
  } catch (err) {
    if (err && err.statusCode === 409) {
      console.log('Bucket already exists')
    } else {
      console.log(`Bucket ${Bucket} has been created`)
    }
  }
  av.on('scan-complete', result => {
    times.scanCompleted = reportTime('scan-complete')
    console.log(result)
  })

  const s3Stream = uploadToS3(s3, Bucket, Key)
  s3Stream.on('upload:error', err => {
    console.error('upload:error', err)
  })

  s3Stream.on('upload:success', data => {
    times.uploadSuccess = reportTime('upload:success')
    console.log('upload:success', data)
  })

  console.log(`iv=${iv.toString('base64')}`)
  stream.pipeline(inputStream, av, encrypt, s3Stream, (err, data) => {
    if (err) {
      console.error('pipeline error: ', err)
    } else {
      times.pipelineDone = reportTime('pipeline done')
      console.log('pipeline done')
      setTimeout(() => {
        console.log(times)
      }, 2000)
    }
  })
})()
