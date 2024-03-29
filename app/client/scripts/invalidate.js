import AWS from 'aws-sdk'

let cloudfront = new AWS.CloudFront()

function invalidateCloudfront(distId = 'E2YVQM1SMPSX4G') {
	let params = {
		DistributionId: distId,
		InvalidationBatch: {
			CallerReference: `${Date.now()}`,
			Paths: {Quantity: 1, Items: ['/*']}
		}
	}


	cloudfront.createInvalidation(params, function(err, data) {
		if (err) {
			console.log(err, err.stack)
		} else {
			console.log(data)
		}
	})
}

invalidateCloudfront()