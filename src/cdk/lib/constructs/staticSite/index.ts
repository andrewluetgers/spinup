import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as targets from 'aws-cdk-lib/aws-route53-targets'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import { Construct, IConstruct } from 'constructs'


// todo  maybe use something more robust like this?
// https://constructs.dev/packages/@cloudcomponents/cdk-static-website/v/2.0.0/api/StaticWebsiteProps?lang=typescript
export class AwsStaticSiteStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        // Retrieve values from CDK context
        const domainName = this.node.tryGetContext('domainName')
        const subdomains = this.node.tryGetContext('subdomains') || ['qa', 'dev']; // List of subdomains
        const websiteIndexDocument = this.node.tryGetContext('websiteIndexDocument') || 'index.html'
        const websiteAssetPath = this.node.tryGetContext('websiteAssetPath') || './website'
        const apiName = this.node.tryGetContext('apiName') || 'api'

        // tag everything with the domain name
        cdk.Aspects.of(this).add(new DomainTagAspect(domainName));

        // Create an S3 bucket for static website hosting
        const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
            websiteIndexDocument,
            publicReadAccess: true,
        })

        // Deploy static files to the S3 bucket (adjust paths for each environment)
        new s3deploy.BucketDeployment(this, 'DevWebsiteDeployment', {
            sources: [s3deploy.Source.asset(websiteAssetPath)],
            destinationBucket: websiteBucket,
            destinationKeyPrefix: 'dev', // Deploy to /dev folder
        });
        new s3deploy.BucketDeployment(this, 'QaWebsiteDeployment', {
            sources: [s3deploy.Source.asset(websiteAssetPath)],
            destinationBucket: websiteBucket,
            destinationKeyPrefix: 'qa', // Deploy to /dev folder
        });
        new s3deploy.BucketDeployment(this, 'ProdWebsiteDeployment', {
            sources: [s3deploy.Source.asset(websiteAssetPath)],
            destinationBucket: websiteBucket,
            destinationKeyPrefix: 'prod', // Deploy to /dev folder
        });

        // Create a CloudFront distribution with path-based routing
        const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(websiteBucket, { originPath: '/prod' }), // Default to prod
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            additionalBehaviors: {
                ['dev/*']: { // Replace with your actual dev subdomain
                    origin: new origins.S3Origin(websiteBucket, { originPath: '/dev' }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                },
                ['qa/*']: { // Replace with your actual qa subdomain
                    origin: new origins.S3Origin(websiteBucket, { originPath: '/qa' }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                },
                'www/*': {
                    origin: new origins.S3Origin(websiteBucket),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    functionAssociations: [{
                        eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
                        function: new cloudfront.Function(this, 'RedirectFunction', {
                            code: cloudfront.FunctionCode.fromInline(`
                                function handler(event) {
                                    var request = event.request;
                                    var host = request.headers.host.value;
                                    
                                    if (host.startsWith('www.')) {
                                        var newHost = host.replace('www.', '');
                                        var newUrl = 'https://' + newHost + request.uri;
                                        
                                        var response = {
                                            statusCode: 301,
                                            statusDescription: 'Permanently moved',
                                            headers: {
                                                'location': { value: newUrl }
                                            }
                                        };
                                        
                                        return response;
                                    }
                                    
                                    return request;
                                }
                            `),
                        }),
                    }],
                },
            }
        });


        // Look up the existing hosted zone or create a new one
        let hostedZone
        try {
            hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
                domainName,
            })
        } catch (error) {
            hostedZone = new route53.HostedZone(this, 'HostedZone', {
                zoneName: domainName,
            })
        }

        // Create an ACM certificate for the domain and subdomains
        const certificate = new acm.Certificate(this, 'Certificate', {
            domainName,
            subjectAlternativeNames: subdomains, // Include subdomains in the certificate
            validation: acm.CertificateValidation.fromDns(hostedZone),
        });

        // Create an A record for the domain pointing to the CloudFront distribution
        new route53.ARecord(this, 'WebsiteAliasRecord', {
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        })
    }
}

// Aspect to add the domain tag
class DomainTagAspect implements cdk.IAspect {
    constructor(private readonly domainName: string) {}

    public visit(node: IConstruct): void {
        if (node instanceof cdk.CfnResource) {
            cdk.Tags.of(node).add('Domain', this.domainName); // Use Tags.of(node).add()
        }
    }
}