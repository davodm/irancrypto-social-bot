#!/bin/bash
set -e

# Chromium Layer Deployment Script for AWS Lambda
# https://github.com/Sparticuz/chromium/tree/master/examples/serverless-with-preexisting-lambda-layer
# Deploys both x64 and arm64 layers automatically
# Auto-detects compatible Chromium version from installed Puppeteer

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
PROFILE=""
REGION="eu-west-1"
CHROMIUM_VERSION=""

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Deploy Chromium layer (x64 + arm64) for AWS Lambda"
    echo ""
    echo "OPTIONS:"
    echo "  -p, --profile PROFILE     AWS profile to use"
    echo "  -r, --region REGION       AWS region (default: eu-west-1)"
    echo "  -c, --chromium VERSION    Chromium version (default: auto-detected)"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                                    # Auto-detect chromium version"
    echo "  $0 --profile myprofile --region us-east-1"
    echo "  $0 --chromium 143.0.0                 # Force specific version"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--profile) PROFILE="$2"; shift 2 ;;
        -r|--region) REGION="$2"; shift 2 ;;
        -c|--chromium) CHROMIUM_VERSION="$2"; shift 2 ;;
        -h|--help) usage ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; usage ;;
    esac
done

# AWS CLI options
AWS_OPTS=""
[[ -n "$PROFILE" ]] && AWS_OPTS="--profile $PROFILE"

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text $AWS_OPTS)
BUCKET_NAME="chromium-layers-${ACCOUNT_ID}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} Chromium Layer Deployment ${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Profile: ${PROFILE:-default}"
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo

# Function to get Chromium version from web (pptr.dev)
fetch_chromium_version_from_web() {
    local puppeteer_version="$1"
    local major_minor=$(echo "$puppeteer_version" | cut -d'.' -f1-2)
    
    echo -e "${YELLOW}Fetching version mapping from pptr.dev...${NC}" >&2
    
    # Try to fetch the supported browsers page and extract Chrome version
    local html
    html=$(curl -s --max-time 10 "https://pptr.dev/supported-browsers" 2>/dev/null || echo "")
    
    if [[ -n "$html" ]]; then
        # Look for the puppeteer version in the table and extract Chrome version
        # The format is like: Puppeteer v24.33.0 ... Chrome for Testing 143.0.7499.42
        local chrome_version
        # Using sed for macOS compatibility instead of grep -oP
        chrome_version=$(echo "$html" | grep "Puppeteer v${major_minor}" | grep -o "Chrome for Testing[^0-9]*[0-9]*" | head -1 | grep -o '[0-9]*$')
        
        if [[ -n "$chrome_version" ]]; then
            echo -e "${GREEN}Found Chrome ${chrome_version} for Puppeteer ${major_minor}.x from web${NC}" >&2
            echo "${chrome_version}.0.0"
            return 0
        fi
    fi
    
    return 1
}

# Hardcoded fallback mapping (based on https://pptr.dev/supported-browsers)
get_chromium_version_fallback() {
    local puppeteer_version="$1"
    local major_minor=$(echo "$puppeteer_version" | cut -d'.' -f1-2)
    
    echo -e "${YELLOW}Using fallback version mapping...${NC}" >&2
    
    case $major_minor in
        # Puppeteer 24.33+ -> Chrome 143
        "24.33"|"24.32"|"24.31"|"24.30"|"24.29"|"24.27"|"24.26"|"24.25"|"24.23") echo "143.0.0" ;;
        # Puppeteer 24.22-24.19 -> Chrome 140
        "24.22"|"24.21"|"24.20"|"24.19") echo "140.0.0" ;;
        # Puppeteer 24.17-24.15 -> Chrome 138/139
        "24.18"|"24.17"|"24.16"|"24.15"|"24.14"|"24.13"|"24.12"|"24.11") echo "138.0.0" ;;
        # Puppeteer 24.10-24.8 -> Chrome 137
        "24.10"|"24.9"|"24.8") echo "137.0.0" ;;
        # Puppeteer 24.7-24.6 -> Chrome 135
        "24.7"|"24.6") echo "135.0.0" ;;
        # Puppeteer 24.5-24.4 -> Chrome 134
        "24.5"|"24.4") echo "134.0.0" ;;
        # Puppeteer 24.3-24.2 -> Chrome 133
        "24.3"|"24.2") echo "133.0.0" ;;
        # Puppeteer 24.1-24.0 -> Chrome 131/132
        "24.1"|"24.0") echo "131.0.0" ;;
        # Puppeteer 23.x -> Chrome 127-131
        "23.11"|"23.10"|"23.9"|"23.8") echo "131.0.0" ;;
        "23.7"|"23.6") echo "130.0.0" ;;
        "23.5"|"23.4"|"23.3") echo "129.0.0" ;;
        "23.2"|"23.1"|"23.0") echo "127.0.0" ;;
        # Puppeteer 22.x -> Chrome 123-127
        "22.15"|"22.14") echo "127.0.0" ;;
        "22.13"|"22.12"|"22.11") echo "126.0.0" ;;
        "22.10"|"22.9") echo "125.0.0" ;;
        "22.8"|"22.7") echo "124.0.0" ;;
        "22.6"|"22.5"|"22.4"|"22.3"|"22.2") echo "123.0.0" ;;
        # Default to latest known working version
        *) echo "143.0.0" ;;
    esac
}

# Auto-detect Chromium version if not specified
if [[ -z "$CHROMIUM_VERSION" ]]; then
    echo -e "${YELLOW}Detecting Puppeteer version...${NC}"
    
    PUPPETEER_VERSION=$(node -p "
        try { 
            const pkg = require('./package.json');
            const ver = pkg.dependencies['puppeteer-core'] || pkg.dependencies['puppeteer'] || '';
            ver.replace(/[^0-9.]/g, '');
        } catch { '' }
    " 2>/dev/null)
    
    if [[ -z "$PUPPETEER_VERSION" ]]; then
        echo -e "${RED}Error: Could not detect puppeteer version${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Detected Puppeteer: $PUPPETEER_VERSION${NC}"
    
    # Try fetching from web first, fallback to hardcoded
    CHROMIUM_VERSION=$(fetch_chromium_version_from_web "$PUPPETEER_VERSION") || \
    CHROMIUM_VERSION=$(get_chromium_version_fallback "$PUPPETEER_VERSION")
fi

echo -e "${GREEN}Using Chromium: $CHROMIUM_VERSION${NC}"
echo

# Create S3 bucket if needed
echo -e "${YELLOW}Setting up S3 bucket...${NC}"
if ! aws s3 ls "s3://${BUCKET_NAME}" $AWS_OPTS 2>/dev/null; then
    echo "Creating bucket: ${BUCKET_NAME}"
    if [ "${REGION}" = "us-east-1" ]; then
        aws s3 mb "s3://${BUCKET_NAME}" $AWS_OPTS
    else
        aws s3 mb "s3://${BUCKET_NAME}" --region "${REGION}" $AWS_OPTS
    fi
fi

# Deploy both architectures
LAYER_ARNS=()
for ARCH in x64 arm64; do
    echo
    echo -e "${BLUE}>>> Deploying $ARCH architecture${NC}"
    
    LAYER_ZIP="chromium-v${CHROMIUM_VERSION}-layer.${ARCH}.zip"
    DOWNLOAD_URL="https://github.com/Sparticuz/chromium/releases/download/v${CHROMIUM_VERSION}/${LAYER_ZIP}"
    
    # Download
    echo -e "${YELLOW}Downloading ${LAYER_ZIP}...${NC}"
    if ! curl -L -f -o "${LAYER_ZIP}" "${DOWNLOAD_URL}" 2>/dev/null; then
        echo -e "${RED}Failed to download ${ARCH} layer. Skipping...${NC}"
        continue
    fi
    
    # Upload to S3
    S3_KEY="chromium-layers/${LAYER_ZIP}"
    echo -e "${YELLOW}Uploading to S3...${NC}"
    aws s3 cp "${LAYER_ZIP}" "s3://${BUCKET_NAME}/${S3_KEY}" --region "${REGION}" $AWS_OPTS
    
    # Publish layer
    [[ "$ARCH" == "arm64" ]] && LAMBDA_ARCH="arm64" || LAMBDA_ARCH="x86_64"
    # Use consistent naming: chromium for x64 (main), chromium-arm64 for arm64
    [[ "$ARCH" == "x64" ]] && LAYER_NAME="chromium" || LAYER_NAME="chromium-arm64"
    
    echo -e "${YELLOW}Publishing Lambda layer...${NC}"
    LAYER_RESPONSE=$(aws lambda publish-layer-version \
        --layer-name "$LAYER_NAME" \
        --description "Chromium v${CHROMIUM_VERSION} (${ARCH})" \
        --content "S3Bucket=${BUCKET_NAME},S3Key=${S3_KEY}" \
        --compatible-runtimes "nodejs20.x" "nodejs22.x" "nodejs24.x" \
        --compatible-architectures "$LAMBDA_ARCH" \
        --region "${REGION}" $AWS_OPTS)
    
    LAYER_ARN=$(echo "${LAYER_RESPONSE}" | grep -o '"LayerVersionArn": "[^"]*' | cut -d'"' -f4)
    LAYER_VERSION=$(echo "${LAYER_RESPONSE}" | grep -o '"Version": [0-9]*' | cut -d' ' -f2 | tr -d ',')
    
    LAYER_ARNS+=("$LAYER_ARN")
    
    echo -e "${GREEN}Published: $LAYER_ARN${NC}"
    
    # Cleanup S3 (layers are free, S3 storage is not)
    echo -e "${YELLOW}Cleaning up S3...${NC}"
    aws s3 rm "s3://${BUCKET_NAME}/${S3_KEY}" --region "${REGION}" $AWS_OPTS
    
    # Cleanup local file
    rm -f "${LAYER_ZIP}"
done

echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} Deployment Complete! ${NC}"
echo -e "${GREEN}========================================${NC}"

# Update .env file
echo -e "${YELLOW}Updating .env file...${NC}"

# Remove existing chromium entries
if [ -f ".env" ]; then
    sed -i.bak '/^CHROMIUM_LAYER_ARN/d' .env
    sed -i.bak '/^CHROMIUM_VERSION/d' .env
    rm -f .env.bak
fi

# Use x64 as default layer (most common)
X64_ARN="${LAYER_ARNS[0]:-}"
ARM64_ARN="${LAYER_ARNS[1]:-}"

echo "CHROMIUM_LAYER_ARN=${X64_ARN}" >> .env
echo "CHROMIUM_LAYER_ARN_ARM64=${ARM64_ARN}" >> .env
echo "CHROMIUM_VERSION=${CHROMIUM_VERSION}" >> .env

echo
echo "Layer ARNs saved to .env:"
echo "  CHROMIUM_LAYER_ARN=${X64_ARN}"
echo "  CHROMIUM_LAYER_ARN_ARM64=${ARM64_ARN}"
echo "  CHROMIUM_VERSION=${CHROMIUM_VERSION}"
echo
echo -e "${BLUE}Usage in serverless.yml:${NC}"
echo '  layers:'
echo '    - ${env:CHROMIUM_LAYER_ARN}'
