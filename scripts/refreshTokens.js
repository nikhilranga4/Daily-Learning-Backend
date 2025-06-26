#!/usr/bin/env node

/**
 * Google Drive OAuth Token Refresh Utility
 * 
 * This script helps you get fresh OAuth tokens when they expire.
 * Run this when you see "internal_failure" or "invalid_grant" errors.
 */

const { google } = require('googleapis');
require('dotenv').config();

async function refreshTokens() {
  console.log('🔄 Google Drive Token Refresh Utility');
  console.log('=====================================\n');

  // Check if we have the required environment variables
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env file');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
  );

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('🔄 Attempting to refresh existing token...\n');
    
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      console.log('✅ Token refresh successful!');
      console.log('📝 New tokens:');
      console.log('=====================================');
      console.log(`GOOGLE_ACCESS_TOKEN=${credentials.access_token}`);
      if (credentials.refresh_token) {
        console.log(`GOOGLE_REFRESH_TOKEN=${credentials.refresh_token}`);
      }
      console.log('=====================================\n');
      
      console.log('🔧 Update your .env file with the new access token above.');
      if (credentials.refresh_token) {
        console.log('🔧 Also update the refresh token if provided.');
      }
      
    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      console.log('\n🚨 Your refresh token has expired!');
      showManualInstructions();
    }
  } else {
    console.log('❌ No refresh token found in .env file');
    showManualInstructions();
  }
}

function showManualInstructions() {
  console.log('\n📝 Manual Token Generation Required:');
  console.log('=====================================');
  console.log('1. Go to: https://developers.google.com/oauthplayground/');
  console.log('2. Click the gear icon (⚙️) in the top right');
  console.log('3. Check "Use your own OAuth credentials"');
  console.log('4. Enter your OAuth 2.0 Client ID and Secret:');
  console.log(`   Client ID: ${process.env.GOOGLE_CLIENT_ID}`);
  console.log(`   Client Secret: ${process.env.GOOGLE_CLIENT_SECRET}`);
  console.log('5. In Step 1: Select "Drive API v3" scope');
  console.log('6. Click "Authorize APIs"');
  console.log('7. In Step 2: Click "Exchange authorization code for tokens"');
  console.log('8. Copy the access_token and refresh_token');
  console.log('9. Update your .env file with the new tokens\n');
  
  console.log('🔧 Required .env format:');
  console.log('GOOGLE_ACCESS_TOKEN=your_new_access_token_here');
  console.log('GOOGLE_REFRESH_TOKEN=your_new_refresh_token_here\n');
}

// Run the script
refreshTokens().catch(console.error);
