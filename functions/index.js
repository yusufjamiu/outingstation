// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// ✅ DELETE USER FUNCTION (Auth + Firestore + Notifications)
exports.deleteUser = functions.https.onCall(async (data, context) => {
  // ✅ SECURITY: Check if requester is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to delete users'
    );
  }

  // ✅ SECURITY: Check if requester is admin
  const requesterId = context.auth.uid;
  const requesterDoc = await admin.firestore()
    .collection('users')
    .doc(requesterId)
    .get();

  if (!requesterDoc.exists || requesterDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can delete users'
    );
  }

  const { userId } = data;

  // ✅ PREVENT self-deletion
  if (userId === requesterId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'You cannot delete your own account'
    );
  }

  try {
    // ✅ 1. Delete Firebase Auth account
    try {
      await admin.auth().deleteUser(userId);
      console.log(`✅ Deleted Auth account: ${userId}`);
    } catch (authError) {
      // User might not exist in Auth (e.g., already deleted)
      console.log(`⚠️ Auth deletion failed: ${authError.message}`);
    }

    // ✅ 2. Delete Firestore user document
    await admin.firestore().collection('users').doc(userId).delete();
    console.log(`✅ Deleted user document: ${userId}`);

    // ✅ 3. Delete user's notifications
    const notificationsSnapshot = await admin.firestore()
      .collection('notifications')
      .where('userId', '==', userId)
      .get();

    if (!notificationsSnapshot.empty) {
      const batch = admin.firestore().batch();
      notificationsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`✅ Deleted ${notificationsSnapshot.size} notifications for user: ${userId}`);
    }

    // ✅ 4. Remove user from savedEvents in events collection (optional cleanup)
    // This ensures events don't reference deleted users
    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('savedBy', 'array-contains', userId)
      .get();

    if (!eventsSnapshot.empty) {
      const eventBatch = admin.firestore().batch();
      eventsSnapshot.forEach(doc => {
        eventBatch.update(doc.ref, {
          savedBy: admin.firestore.FieldValue.arrayRemove(userId)
        });
      });
      await eventBatch.commit();
      console.log(`✅ Removed user from ${eventsSnapshot.size} saved events`);
    }

    return { 
      success: true, 
      message: 'User deleted successfully',
      deletedNotifications: notificationsSnapshot.size,
      cleanedEvents: eventsSnapshot.size
    };

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ✅ OPTIONAL: Function to update user role (called from admin panel)
exports.updateUserRole = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Check if requester is admin
  const requesterId = context.auth.uid;
  const requesterDoc = await admin.firestore()
    .collection('users')
    .doc(requesterId)
    .get();

  if (!requesterDoc.exists || requesterDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can update roles');
  }

  const { userId, role } = data;

  // Validate role
  if (!['user', 'organizer', 'admin'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
  }

  try {
    // Update Firestore
    await admin.firestore().collection('users').doc(userId).update({
      role: role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Set custom claim for role-based access
    await admin.auth().setCustomUserClaims(userId, { role });

    return { success: true, message: `User role updated to ${role}` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});