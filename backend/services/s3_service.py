import boto3
import os
import logging
from datetime import datetime
from typing import Optional
import uuid

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self, bucket_name: Optional[str] = None, region_name: Optional[str] = None):
        """Initialize S3 client"""
        self.region_name = region_name or os.getenv('AWS_REGION', 'us-east-1')
        self.s3_client = boto3.client('s3', region_name=self.region_name)
        self.bucket_name = bucket_name or os.getenv('S3_BUCKET_NAME', 'rift-rewind-shares')

    def upload_file(self, file_content: bytes, file_key: str, content_type: str = 'image/png') -> str:
        """
        Upload a file to S3 and return the public URL

        Args:
            file_content: The file content as bytes
            file_key: The S3 key (path/filename) for the file
            content_type: MIME type of the file (e.g., 'image/png', 'video/mp4')

        Returns:
            Public URL of the uploaded file
        """
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType=content_type
                # Public access is controlled by bucket policy, not ACL
            )

            # Generate the public URL
            url = f"https://{self.bucket_name}.s3.{self.region_name}.amazonaws.com/{file_key}"
            logger.info(f"File uploaded successfully to {url}")
            return url

        except Exception as e:
            logger.error(f"Error uploading file to S3: {str(e)}")
            raise

    def upload_recap_image(self, file_content: bytes, puuid: str, recap_type: str = 'collage') -> str:
        """
        Upload a year recap image to S3

        Args:
            file_content: Image file content as bytes
            puuid: Player's PUUID
            recap_type: Type of recap ('collage' or 'single')

        Returns:
            Public URL of the uploaded image
        """
        # Generate a unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        file_key = f"recaps/{puuid[:8]}/{recap_type}_{timestamp}_{unique_id}.png"

        return self.upload_file(file_content, file_key, content_type='image/png')

    def upload_recap_video(self, file_content: bytes, puuid: str, file_extension: str = 'mp4') -> str:
        """
        Upload a year recap video to S3

        Args:
            file_content: Video file content as bytes
            puuid: Player's PUUID
            file_extension: File extension (mp4 or webm)

        Returns:
            Public URL of the uploaded video
        """
        # Generate a unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        file_key = f"recaps/{puuid[:8]}/video_{timestamp}_{unique_id}.{file_extension}"

        # Set content type based on extension
        content_type = 'video/mp4' if file_extension == 'mp4' else 'video/webm'

        return self.upload_file(file_content, file_key, content_type=content_type)

    def ensure_bucket_exists(self):
        """Create the S3 bucket if it doesn't exist"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"Bucket {self.bucket_name} already exists")
        except:
            try:
                if self.region_name == 'us-east-1':
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                else:
                    self.s3_client.create_bucket(
                        Bucket=self.bucket_name,
                        CreateBucketConfiguration={'LocationConstraint': self.region_name}
                    )

                logger.info(f"Bucket {self.bucket_name} created successfully")

                # Try to set bucket policy to allow public read
                # If this fails due to Block Public Access, you need to manually configure it
                try:
                    bucket_policy = {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Sid": "PublicReadGetObject",
                                "Effect": "Allow",
                                "Principal": "*",
                                "Action": "s3:GetObject",
                                "Resource": f"arn:aws:s3:::{self.bucket_name}/*"
                            }
                        ]
                    }

                    import json
                    self.s3_client.put_bucket_policy(
                        Bucket=self.bucket_name,
                        Policy=json.dumps(bucket_policy)
                    )
                    logger.info(f"Bucket policy applied successfully")
                except Exception as policy_error:
                    logger.warning(f"Could not apply bucket policy (you may need to manually configure public access): {str(policy_error)}")
                    logger.warning("Files will upload but may not be publicly accessible until you configure bucket permissions")

                # Configure CORS for frontend access
                try:
                    cors_configuration = {
                        'CORSRules': [
                            {
                                'AllowedHeaders': ['*'],
                                'AllowedMethods': ['GET', 'HEAD'],
                                'AllowedOrigins': [
                                    'http://localhost:5173',
                                    'http://localhost:3000',
                                    'http://localhost:3002'
                                ],
                                'ExposeHeaders': ['ETag'],
                                'MaxAgeSeconds': 3000
                            }
                        ]
                    }
                    self.s3_client.put_bucket_cors(
                        Bucket=self.bucket_name,
                        CORSConfiguration=cors_configuration
                    )
                    logger.info(f"CORS configuration applied successfully")
                except Exception as cors_error:
                    logger.warning(f"Could not apply CORS configuration: {str(cors_error)}")

            except Exception as e:
                logger.error(f"Error creating bucket: {str(e)}")
                raise
