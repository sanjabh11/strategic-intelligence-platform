#!/bin/bash
# Strategic Intelligence Platform - Netlify Deployment Commands
# Run these commands to deploy to Netlify

echo "🚀 Strategic Intelligence Platform - Netlify Deployment"
echo "========================================================"
echo ""

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

echo "✅ Netlify CLI installed"
echo ""

# Step 1: Build the application
echo "📦 Step 1: Building production bundle..."
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Step 2: Deploy to Netlify
echo "🌐 Step 2: Deploying to Netlify..."
echo ""
echo "Choose deployment method:"
echo "  1. New site (first time)"
echo "  2. Existing site (already linked)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "📝 Creating new site..."
        echo "Follow the prompts:"
        echo "  - Team: Select your team"
        echo "  - Site name: strategic-intelligence-platform (or custom)"
        echo "  - Publish directory: dist"
        echo ""
        netlify init
        ;;
    2)
        echo ""
        echo "🔗 Deploying to linked site..."
        netlify deploy --prod
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Go to Netlify dashboard: https://app.netlify.com"
echo "  2. Find your site: strategic-intelligence-platform"
echo "  3. Set environment variables:"
echo "     - VITE_SUPABASE_URL"
echo "     - VITE_SUPABASE_ANON_KEY"
echo "  4. Test your site"
echo ""
echo "🎉 Your platform is live!"
