/**
 * Firebase Admin Script - Set SUPER_ADMIN Role
 * 
 * This script assigns the SUPER_ADMIN role to a specific user.
 * Run this script using Node.js with Firebase Admin SDK.
 * 
 * Usage:
 * node scripts/set-super-admin.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Make sure you have your service account key JSON file
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Target UID for Super Admin
const SUPER_ADMIN_UID = "DEQvBejlJQVDs4d2zRWPdJOcgZu1";

async function setSuperAdminRole() {
  try {
    console.log(`Setting SUPER_ADMIN role for UID: ${SUPER_ADMIN_UID}`);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(SUPER_ADMIN_UID, {
      role: "SUPER_ADMIN"
    });
    
    console.log("✅ SUPER_ADMIN role assigned successfully!");
    
    // Verify the role was set
    const user = await admin.auth().getUser(SUPER_ADMIN_UID);
    console.log("\nUser Custom Claims:", user.customClaims);
    
    console.log("\n⚠️ IMPORTANT: User must logout and login again for changes to take effect!");
    console.log("Steps for user:");
    console.log("1. Logout from the application");
    console.log("2. Login again");
    console.log("3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting SUPER_ADMIN role:", error);
    process.exit(1);
  }
}

// Run the script
setSuperAdminRole();
