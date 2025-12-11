# Seller Centry Platform - Deployment Guide

Complete step-by-step instructions for deploying the Seller Centry Dashboard to production.

---

## Prerequisites

Before starting, ensure you have:
- [ ] GitHub account with access to quietst00rm/seller-centry-platform
- [ ] Vercel account (free tier is fine)
- [ ] Access to GoDaddy DNS for sellercentry.com
- [ ] Supabase project credentials (byaaliobjjdffkhnxytv)
- [ ] Google Service Account JSON file (tools-389920-9e8eb909fb61.json)
- [ ] Resend account for transactional email

---

## Step 1: Push Code to GitHub

```bash
# If not already done, push to GitHub
cd seller-centry-platform
git add .
git commit -m "Initial commit - Seller Centry Dashboard"
git push -u origin main
```

---

## Step 2: Create Resend Account & Verify Domain

1. Go to [resend.com](https://resend.com) and create an account
2. Navigate to **Domains** → **Add Domain**
3. Enter: `sellercentry.com`
4. Add the DNS records Resend provides to GoDaddy:
   - Usually 1 TXT record for verification
   - 1-3 DNS records for DKIM/SPF
5. Wait for verification (usually 5-15 minutes)
6. Go to **API Keys** → **Create API Key**
7. Copy the key (starts with `re_`)

---

## Step 3: Configure Supabase Authentication

### 3a. Get API Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/byaaliobjjdffkhnxytv/settings/api)
2. Copy these values:
   - **Project URL**: `https://byaaliobjjdffkhnxytv.supabase.co`
   - **anon public key**: (long string starting with `eyJ...`)
   - **service_role key**: (long string, keep secret!)

### 3b. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=tools-389920)
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://byaaliobjjdffkhnxytv.supabase.co/auth/v1/callback
   ```
4. Save

5. In Supabase Dashboard → **Authentication** → **Providers** → **Google**:
   - Enable Google provider
   - Add your Google Client ID
   - Add your Google Client Secret
   - Save

### 3c. Configure Auth Settings

1. In Supabase → **Authentication** → **URL Configuration**:
   - **Site URL**: `https://sellercentry.com`
   - **Redirect URLs** (add all):
     ```
     https://sellercentry.com/**
     https://*.sellercentry.com/**
     http://localhost:3000/**
     http://*.localhost:3000/**
     ```

---

## Step 4: Stringify Google Service Account Key

The service account JSON needs to be converted to a single-line string:

```bash
# In the project directory where the JSON file is located
cat tools-389920-9e8eb909fb61.json | jq -c
```

Copy the entire output (it will be one long line starting with `{"type":"service_account"...`).

If you don't have `jq` installed:
```bash
# macOS
brew install jq

# Or manually: Open the file, remove all newlines, keep it as one line
```

---

## Step 5: Deploy to Vercel

### 5a. Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select **quietst00rm/seller-centry-platform**
4. Click **Import**

### 5b. Configure Project Settings

On the configuration page:
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)

### 5c. Add Environment Variables

Click **Environment Variables** and add each one:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://byaaliobjjdffkhnxytv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key from Supabase |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | The stringified JSON from Step 4 |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `sellercentry.com` |
| `RESEND_API_KEY` | Your Resend API key |

**Important**: For `GOOGLE_SERVICE_ACCOUNT_KEY`, paste the entire stringified JSON (no quotes around it).

### 5d. Deploy

Click **Deploy** and wait for the build to complete (usually 1-2 minutes).

---

## Step 6: Configure Custom Domain

### 6a. Add Domain in Vercel

1. In your Vercel project, go to **Settings** → **Domains**
2. Add domain: `sellercentry.com`
3. Add domain: `*.sellercentry.com` (wildcard for subdomains)

Vercel will show you the required DNS records.

### 6b. Configure GoDaddy DNS

Log into GoDaddy and go to DNS Management for sellercentry.com:

**Remove existing A records for @ (if any pointing elsewhere)**

**Add these records:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `76.76.21.21` | 600 |
| CNAME | * | `cname.vercel-dns.com` | 600 |

**Note**: The A record IP may differ - use the one Vercel shows you.

### 6c. Wait for DNS Propagation

- DNS changes can take 5 minutes to 48 hours
- Usually works within 15-30 minutes
- Check status in Vercel Domains page (will show green checkmark when ready)

---

## Step 7: Test the Deployment

### Test Root Domain
1. Visit `https://sellercentry.com`
2. Should see the "Access your dashboard via subdomain" page

### Test Subdomain
1. Visit `https://alwayz-on-sale.sellercentry.com`
2. Should redirect to login page
3. Test login with email/password
4. Test Google Sign-In
5. Verify dashboard loads with data

### Test Features
- [ ] Summary cards show correct numbers
- [ ] Violations list loads
- [ ] Active/Resolved toggle works
- [ ] Filters work (time, status, search)
- [ ] Violation detail modal opens
- [ ] Export downloads CSV
- [ ] Submit Ticket sends email (check all 3 inboxes)

---

## Troubleshooting

### "Tenant not found" error
- Check that the subdomain exists in the Client Mapping Sheet (Column A)
- Subdomain in URL must match exactly (case-insensitive)

### Google Sign-In not working
- Verify redirect URI is added in Google Cloud Console
- Check Supabase Google provider is enabled
- Verify Site URL and Redirect URLs in Supabase

### Violations not loading
- Check Google Service Account key is correctly stringified
- Verify service account has access to the Google Sheets
- Check browser console for specific error messages

### Email not sending
- Verify Resend domain is verified
- Check Resend API key is correct
- Look at Resend dashboard for failed sends

### SSL Certificate errors
- Wait for DNS propagation to complete
- Vercel auto-provisions SSL once DNS is configured

---

## Post-Deployment Checklist

- [ ] Root domain loads correctly
- [ ] Wildcard subdomains work
- [ ] Login with email works
- [ ] Login with Google works
- [ ] Forgot password sends email
- [ ] Dashboard loads data from Google Sheets
- [ ] Export functionality works
- [ ] Submit Ticket sends to all 3 email addresses
- [ ] Mobile responsive design works

---

## Maintenance

### Adding New Clients

1. Add row to Client Mapping Sheet with:
   - Column A: Store name (becomes subdomain)
   - Column C: Client email
   - Column D: Link to their violations sheet
2. Client can immediately access: `{storename}.sellercentry.com`
3. They'll need to create a Supabase account (or use Google Sign-In)

### Updating the Application

```bash
# Make changes locally
git add .
git commit -m "Description of changes"
git push

# Vercel auto-deploys on push to main branch
```

### Viewing Logs

1. Vercel Dashboard → Your Project → **Deployments**
2. Click on a deployment → **Functions** tab
3. View real-time logs for debugging

---

## Support Contacts

- **Vercel Issues**: support@vercel.com
- **Supabase Issues**: support@supabase.io
- **Domain/DNS Issues**: GoDaddy support
