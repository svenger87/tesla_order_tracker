# tff order stats - Deployment Script
# Usage: .\deploy.ps1 [message]

param(
    [string]$Message = "Update deployment"
)

Write-Host "🚀 tff order stats - Deployment" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "`n📝 Committing changes..." -ForegroundColor Yellow
    git add .
    git commit -m "$Message"
} else {
    Write-Host "`n✅ No changes to commit" -ForegroundColor Green
}

# Push to GitHub
Write-Host "`n📤 Pushing to GitHub..." -ForegroundColor Yellow
git push

# Deploy to Vercel
Write-Host "`n🌐 Deploying to Vercel..." -ForegroundColor Yellow
vercel --prod

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
