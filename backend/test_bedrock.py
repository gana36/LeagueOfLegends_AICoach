"""
Test script for Amazon Bedrock model access and functionality.
Tests various models available in Bedrock for the Rift Copilot integration.
"""

import boto3
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_bedrock_connection():
    """Test basic connection to Amazon Bedrock"""
    try:
        bedrock = boto3.client(
            service_name='bedrock-runtime',
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        print("✓ Successfully connected to Amazon Bedrock")
        return bedrock
    except Exception as e:
        print(f"✗ Failed to connect to Bedrock: {e}")
        return None

def test_claude_model(bedrock_client, model_id="anthropic.claude-3-sonnet-20240229-v1:0"):
    """Test Claude model with a League of Legends match analysis prompt"""
    print(f"\n{'='*60}")
    print(f"Testing Model: {model_id}")
    print(f"{'='*60}")
    
    prompt = """You are Rift Copilot, an AI assistant for League of Legends match analysis.

A player asks: "What should I focus on in the mid game when I'm playing ADC and we're behind 2k gold?"

Provide a concise, actionable response (2-3 sentences max)."""

    try:
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 200,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "top_p": 0.9
        })
        
        response = bedrock_client.invoke_model(
            modelId=model_id,
            body=body
        )
        
        response_body = json.loads(response['body'].read())
        assistant_message = response_body['content'][0]['text']
        
        print(f"\n📝 Prompt: {prompt.split('asks:')[1].strip()}")
        print(f"\n🤖 Response:\n{assistant_message}")
        print(f"\n✓ Model test successful!")
        print(f"Tokens used: {response_body.get('usage', {})}")
        
        return True
    except Exception as e:
        print(f"\n✗ Model test failed: {e}")
        return False

def test_titan_model(bedrock_client, model_id="amazon.titan-text-express-v1"):
    """Test Amazon Titan model"""
    print(f"\n{'='*60}")
    print(f"Testing Model: {model_id}")
    print(f"{'='*60}")
    
    prompt = "Explain in one sentence what a League of Legends ADC should prioritize when behind in gold."
    
    try:
        body = json.dumps({
            "inputText": prompt,
            "textGenerationConfig": {
                "maxTokenCount": 150,
                "temperature": 0.7,
                "topP": 0.9
            }
        })
        
        response = bedrock_client.invoke_model(
            modelId=model_id,
            body=body
        )
        
        response_body = json.loads(response['body'].read())
        assistant_message = response_body['results'][0]['outputText']
        
        print(f"\n📝 Prompt: {prompt}")
        print(f"\n🤖 Response:\n{assistant_message}")
        print(f"\n✓ Model test successful!")
        
        return True
    except Exception as e:
        print(f"\n✗ Model test failed: {e}")
        return False

def list_available_models(bedrock_client):
    """List available foundation models in Bedrock"""
    print(f"\n{'='*60}")
    print("Available Foundation Models")
    print(f"{'='*60}\n")
    
    try:
        bedrock_info = boto3.client(
            service_name='bedrock',
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        
        response = bedrock_info.list_foundation_models()
        
        models = response.get('modelSummaries', [])
        
        print(f"Found {len(models)} models:\n")
        
        for model in models:
            if 'claude' in model['modelId'].lower() or 'titan' in model['modelId'].lower():
                print(f"  • {model['modelName']}")
                print(f"    ID: {model['modelId']}")
                print(f"    Provider: {model['providerName']}")
                print()
        
        return True
    except Exception as e:
        print(f"✗ Failed to list models: {e}")
        return False

def main():
    """Main test execution"""
    print("\n" + "="*60)
    print("Amazon Bedrock Model Testing for Rift Copilot")
    print("="*60)
    
    # Test connection
    bedrock_client = test_bedrock_connection()
    if not bedrock_client:
        print("\n⚠️  Cannot proceed without Bedrock connection.")
        print("\nPlease ensure:")
        print("  1. AWS credentials are configured (aws configure)")
        print("  2. You have access to Amazon Bedrock")
        print("  3. Required models are enabled in your AWS account")
        return
    
    # List available models
    list_available_models(bedrock_client)
    
    # Test Claude 3 Sonnet (recommended for production)
    print("\n" + "="*60)
    print("Testing Recommended Model: Claude 3 Sonnet")
    print("="*60)
    test_claude_model(bedrock_client, "anthropic.claude-3-sonnet-20240229-v1:0")
    
    # Test Claude 3 Haiku (faster, cheaper alternative)
    print("\n" + "="*60)
    print("Testing Alternative Model: Claude 3 Haiku")
    print("="*60)
    test_claude_model(bedrock_client, "anthropic.claude-3-haiku-20240307-v1:0")
    
    # Test Amazon Titan (optional)
    print("\n" + "="*60)
    print("Testing Amazon Titan Express")
    print("="*60)
    test_titan_model(bedrock_client)
    
    print("\n" + "="*60)
    print("Testing Complete!")
    print("="*60)
    print("\nRecommendation:")
    print("  • Use Claude 3 Sonnet for production (best quality)")
    print("  • Use Claude 3 Haiku for development (faster, cheaper)")
    print("  • Titan Express is available but Claude models are superior for chat")

if __name__ == "__main__":
    main()
