# Firestore Index Setup

This document explains how to create the required Firestore composite indexes to resolve index errors.

## Required Indexes

The following composite indexes are required for efficient querying:

### 1. Events Collection - OrganizerId + Status + CreatedAt

**Collection:** `events`  
**Fields:**
- `organizerId` (ASCENDING)
- `status` (ASCENDING)
- `createdAt` (DESCENDING)

**Used by:** Owner panel organizer event queries

### 2. Events Collection - HostUserId + Status + CreatedAt

**Collection:** `events`  
**Fields:**
- `hostUserId` (ASCENDING)
- `status` (ASCENDING)
- `createdAt` (DESCENDING)

**Used by:** Organizer dashboard event queries

### 3. Support Tickets Collection - UserId + UpdatedAt

**Collection:** `supportTickets`  
**Fields:**
- `userId` (ASCENDING)
- `updatedAt` (DESCENDING)

**Used by:** Organizer Support panel to fetch user's tickets ordered by most recent

## Setup Methods

### Method 1: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Configure the index:
   - **Collection ID:** `events`
   - **Fields to index:**
     - `organizerId` → Ascending
     - `status` → Ascending
     - `createdAt` → Descending
6. Click **Create**
7. Repeat for the second index (using `hostUserId` instead of `organizerId`)
8. Repeat for the support tickets index:
   - **Collection ID:** `supportTickets`
   - **Fields to index:**
     - `userId` → Ascending
     - `updatedAt` → Descending
   - Click **Create**

### Method 2: Using Firebase CLI

If you have Firebase CLI installed:

```bash
# Deploy indexes
firebase deploy --only firestore:indexes
```

This will use the `firestore.indexes.json` file in the project root.

### Method 3: Using the Error Link

When Firestore throws an index error, it provides a direct link to create the index:

1. Copy the error message URL
2. Open it in your browser
3. Click **Create Index**
4. Wait for the index to build (usually 1-5 minutes)

## Verification

After creating the indexes:

1. Check Firebase Console → Firestore → Indexes
2. Verify all indexes show status: **Enabled**
3. Test the queries that were failing:
   - Owner panel organizer queries
   - Organizer dashboard queries
   - Support tickets panel queries
4. The errors should no longer appear

## Notes

- Index creation can take 1-5 minutes
- Large collections may take longer
- Queries will fail until the index is built
- Indexes are automatically maintained by Firestore
- No code changes needed - this is a database configuration only

## Troubleshooting

**Index still building:**
- Wait a few more minutes
- Check Firebase Console for status
- Large collections take longer

**Index not found:**
- Verify field names match exactly (case-sensitive)
- Check collection name is correct
- Ensure query order matches index order

**Query still failing:**
- Verify the query uses the exact same fields in the same order
- Check for typos in field names
- Ensure all fields in the query are in the index
