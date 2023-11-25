# aws-s3-node-lambda-image-scaler

## Installation

Clone the repo

```bash
git clone https://github.com/martinhjartmyr/aws-s3-node-lambda-image-scaler.git && cd aws-s3-node-lambda-image-scaler
```

Install deps

```bash
pnpm install
```

Download sharp layer

```bash
pnpm run download-sharp-layer
```

Deploy sharp layer

```bash
pnpm run deploy-sharp-layer
```

Build the lambda

```bash
pnpm build
```

Create a role for the lambda function:

```bash
aws iam create-role --role-name s3-image-scaler --assume-role-policy-document file://trust-policy.json && aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole --role-name s3-image-scaler && aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess --role-name s3-image-scaler
```

Copy the Arn from the output and use it in the next step.

```
arn:aws:iam::123456789:role/s3-image-scaler
```

Create the lambda function:

```bash
aws lambda create-function --function-name s3-image-scaler --runtime "nodejs18.x" --timeout 10 --memory-size 256 --zip-file "fileb://dist/index.zip" --handler index.handler --role [!!! CHANGE ME ROLE FROM ABOVE OUTPUT !!!]
```

Set the required environment variables, ALLOWED_BUCKETS needs to be comma separated.

```bash
aws lambda update-function-configuration --function-name s3-image-scaler --environment "Variables={ALLOWED_BUCKETS=[!!! CHANGE ME!!!],REGION=[!!! CHANGE ME!!!],DEBUG=false}"
```

Create a function URL. The output will display the generated URL that will be publicly accessible.

```bash
aws lambda create-function-url-config --function-name s3-image-scaler --auth-type NONE
```

Grant access to call the lambda function from the url

```bash
aws lambda add-permission --function-name s3-image-scaler --statement-id AuthNone --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE
```

It's recommended that you set up a CloudFront distribution in front of the function url.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
