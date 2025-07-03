# Umami API Credentials Issue

## Problem Identified

The Umami API credentials in your `.env` file are **invalid or expired**. Direct testing shows:

```
API Key: api_3IFy5J8Gfjz8JDdgovh9Je3cinTdrsng
Website ID: 79d3968a-436f-4946-9d49-a87feb3a65c4
Result: 401 Unauthorized
```

## Solution Steps

### 1. Access Your Umami Dashboard

1. Go to [https://cloud.umami.is](https://cloud.umami.is)
2. Log in to your account
3. Navigate to **Settings** → **Websites**
4. Find your website and note the correct **Website ID**

### 2. Generate New API Key

1. In Umami dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Give it a name (e.g., "Aruba Travel Analytics")
4. Copy the generated API key

### 3. Update Environment Variables

#### Local Development (.env file):
```env
# Replace with your actual credentials
VITE_UMAMI_API_KEY=your_new_api_key_here
VITE_UMAMI_WEBSITE_ID=your_correct_website_id_here
VITE_UMAMI_API_URL=https://cloud.umami.is/api
```

#### Supabase Edge Function Secrets:
```bash
supabase secrets set UMAMI_API_KEY=your_new_api_key_here
supabase secrets set UMAMI_WEBSITE_ID=your_correct_website_id_here
```

### 4. Test the Credentials

Test the new credentials directly:
```powershell
Invoke-WebRequest -Uri "https://cloud.umami.is/api/websites/YOUR_WEBSITE_ID/stats?startAt=1748901248833&endAt=1751493248833" -Headers @{"Authorization"="Bearer YOUR_API_KEY"}
```

### 5. Redeploy the Function

```bash
supabase functions deploy umami-proxy
```

## Current Function Status

✅ **TypeScript errors**: All resolved (20/20 fixed)
✅ **Function deployment**: Working correctly
✅ **Environment setup**: Configured properly
❌ **API credentials**: Invalid - needs update

## Next Steps

1. **Get valid Umami credentials** from your dashboard
2. **Update the .env file** with correct values
3. **Update Supabase secrets** with correct values
4. **Test the credentials** using the PowerShell command above
5. **Redeploy the function** once credentials are verified

The TypeScript configuration and function logic are working correctly. The only remaining issue is the invalid Umami API credentials.
