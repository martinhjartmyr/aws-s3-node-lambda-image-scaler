import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import AWS, { AWSError } from 'aws-sdk'
import sharp, { FitEnum } from 'sharp'

const printDebug = process.env.DEBUG === 'true'
const region = process.env.REGION || 'eu-north-1'
const allowedBuckets = process.env.ALLOWED_BUCKETS?.split(',') || []

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  debug(event)
  debug(context)

  const bucket = event.queryStringParameters?.bucket ?? 'unknown-bucket'

  if (!allowedBuckets.includes(bucket)) {
    console.log(`Bucket '${bucket}' not allowed`)
    return {
      statusCode: 403,
      body: JSON.stringify({
        message: 'Forbidden',
      }),
    }
  }

  if (!event || !event.queryStringParameters || !event.queryStringParameters.path || !bucket) {
    console.log('Missing required parameters')
    return {
      statusCode: 422,
      body: JSON.stringify({
        message: 'Unprocessable Entity',
      }),
    }
  }

  AWS.config.update({ region })

  const path = event.queryStringParameters.path
  const height = event.queryStringParameters.height
    ? parseInt(event.queryStringParameters.height)
    : undefined
  const width = event.queryStringParameters.width
    ? parseInt(event.queryStringParameters.width)
    : undefined

  const fitEnum = ['contain', 'cover', 'fill', 'inside', 'outside']
  let fit: keyof FitEnum = sharp.fit.contain
  if (event.queryStringParameters.fit) {
    const fitParam = event.queryStringParameters.fit.toLowerCase()
    if (fitEnum.includes(fitParam)) {
      fit = fitParam as keyof FitEnum
    }
  }

  console.log(`path: ${path} width: ${width} height: ${height} fit: ${fit}`)

  try {
    // Limit width and height for now
    if (width && width > 2024) {
      throw new Error('width more than 2024')
    }
    if (height && height > 2024) {
      throw new Error('height more than 2024')
    }

    const sharpTransforms = sharp()
      .resize({
        width,
        height,
        fit,
        position: sharp.strategy.attention,
        background: { r: 255, g: 255, b: 255, alpha: 255 },
      })
      .jpeg({
        mozjpeg: true,
        quality: 80,
      })

    const S3 = new AWS.S3()
    const stream = await S3.getObject({
      Bucket: bucket,
      Key: path,
    })
      .createReadStream()
      .pipe(sharpTransforms)
      .toBuffer()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
      body: stream.toString('base64'),
      isBase64Encoded: true,
    }
  } catch (error) {
    const errorData = error as AWSError
    console.error(`Error: ${JSON.stringify(error, null, 2)}`)
    return {
      statusCode: errorData.statusCode ?? 500,
      body: JSON.stringify({
        message: errorData.message ?? 'Internal Server Error',
      }),
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debug = (data: any) => {
  if (printDebug) {
    console.log(`Debug: ${JSON.stringify(data, null, 2)}`)
  }
}
