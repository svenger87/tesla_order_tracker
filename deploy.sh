#!/bin/bash
# Tesla Order Tracker - Deployment Script
# Usage: ./deploy.sh [message]

MESSAGE="${1:-Update deployment}"

echo "🚀 Tesla Order Tracker - Deployment"
echo "================================="

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "\n📝 Committing changes..."
    git add .
    git commit -m "$MESSAGE"
else
    echo -e "\n✅ No changes to commit"
fi

# Push to GitHub
echo -e "\n📤 Pushing to GitHub..."
git push

# Deploy to Vercel
echo -e "\n🌐 Deploying to Vercel..."
vercel --prod

echo -e "\n✅ Deployment complete!"
