# Firebase Admin Scripts

## Set Super Admin Role

This script assigns the `SUPER_ADMIN` role to a specific user using Firebase Admin SDK.

### Prerequisites

1. **Firebase Admin SDK**: Install the package
   ```bash
   npm install firebase-admin
   ```

2. **Service Account Key**: Download your Firebase service account key
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `serviceAccountKey.json` in the project root
   - **⚠️ NEVER commit this file to Git** (already in .gitignore)

### Usage

1. **Run the script**:
   ```bash
   node scripts/set-super-admin.js
   ```

2. **User must refresh session**:
   - Logout from the application
   - Login again
   - Hard refresh browser (Ctrl+Shift+R)

### Target User

- **UID**: `DEQvBejlJQVDs4d2zRWPdJOcgZu1`
- **Role**: `SUPER_ADMIN`

### What This Enables

After role assignment, the user will:
- ✅ See "Super Admin" button in dashboard sidebar
- ✅ Access `/super-admin/organizers` route
- ✅ View all organizers' data (KYC, bank details, events, payouts)

### Security

- Only users with `SUPER_ADMIN` role can access admin routes
- All other users are blocked and redirected
- Sensitive data (account numbers) are masked
- Read-only access (no editing capabilities)

### Troubleshooting

**Role not working after running script?**
- User must logout and login again
- Custom claims only load on fresh authentication
- Clear browser cache if needed

**Script fails?**
- Check `serviceAccountKey.json` exists in project root
- Verify Firebase Admin SDK is installed
- Check UID is correct
