#!/usr/bin/env node

/**
 * Google Drive OAuth 2.0 Authentication Script
 * 
 * This script helps you get OAuth tokens for permanent Google Drive access.
 * Run this once to get your refresh token, then save it to your .env file.
 */

const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function authenticateGoogleDrive() {
  console.log('🔐 Google Drive OAuth 2.0 Authentication');
  console.log('==========================================\n');

  // Check if we have the required credentials
  if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
    console.error('❌ Missing CLIENT_ID or CLIENT_SECRET in .env file');
    console.log('📝 Please add these to your .env file:');
    console.log('CLIENT_ID=your_client_id_here');
    console.log('CLIENT_SECRET=your_client_secret_here');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );

  // Define the scopes we need
  const scopes = [
    'https://www.googleapis.com/auth/drive.file', // Create and manage files
    'https://www.googleapis.com/auth/drive.readonly' // Read existing files
  ];

  // Generate the auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Important: gets refresh token
    scope: scopes,
    prompt: 'consent' // Forces consent screen to get refresh token
  });

  console.log('🔗 Step 1: Authorize this app by visiting this URL:');
  console.log('================================================');
  console.log(authUrl);
  console.log('================================================\n');

  console.log('📋 Step 2: Follow these instructions:');
  console.log('1. Click the URL above (or copy-paste into browser)');
  console.log('2. Sign in with your Google account');
  console.log('3. Grant permissions to the app');
  console.log('4. Copy the authorization code from the redirect page');
  console.log('5. Paste it below\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('🔑 Enter the authorization code here: ', async (code) => {
    try {
      console.log('\n🔄 Exchanging code for tokens...');
      
      const { tokens } = await oauth2Client.getToken(code);
      
      console.log('✅ Authentication successful!\n');
      console.log('📝 Your OAuth tokens:');
      console.log('====================');
      console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('====================\n');

      // Test the tokens by making a simple API call
      oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      console.log('🧪 Testing Google Drive access...');
      const response = await drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)'
      });
      
      console.log('✅ Google Drive access confirmed!');
      console.log(`📁 Found ${response.data.files?.length || 0} files in your Drive\n`);

      // Save tokens to .env file
      await updateEnvFile(tokens);
      
      console.log('🎉 Setup complete!');
      console.log('📝 Tokens have been saved to your .env file');
      console.log('🚀 You can now restart your server and Google Drive uploads will work permanently!');
      
    } catch (error) {
      console.error('❌ Error getting tokens:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Make sure you copied the full authorization code');
      console.log('2. Check that your CLIENT_ID and CLIENT_SECRET are correct');
      console.log('3. Ensure the redirect URI matches: http://localhost:3000/oauth2callback');
    }
    
    rl.close();
  });
}

async function updateEnvFile(tokens) {
  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    let envContent = '';
    
    // Read existing .env file
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add tokens
    const accessTokenRegex = /^GOOGLE_ACCESS_TOKEN=.*$/m;
    const refreshTokenRegex = /^GOOGLE_REFRESH_TOKEN=.*$/m;
    
    if (accessTokenRegex.test(envContent)) {
      envContent = envContent.replace(accessTokenRegex, `GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
    } else {
      envContent += `\nGOOGLE_ACCESS_TOKEN=${tokens.access_token}`;
    }
    
    if (refreshTokenRegex.test(envContent)) {
      envContent = envContent.replace(refreshTokenRegex, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`;
    }
    
    // Write back to .env file
    fs.writeFileSync(envPath, envContent);
    console.log('💾 Tokens saved to .env file');
    
  } catch (error) {
    console.error('⚠️ Could not update .env file automatically:', error.message);
    console.log('📝 Please manually add these lines to your .env file:');
    console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
  }
}

// Run the authentication
authenticateGoogleDrive().catch(console.error);
