// ✅ Firebase Functions v2 (Node 20+)
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

// ✅ DELETE USER FUNCTION (Auth + Firestore + Notifications)
exports.deleteUser = onCall(async (request) => {
  const { data, auth } = request;

  // ✅ SECURITY: Check if requester is authenticated
  if (!auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to delete users'
    );
  }

  // ✅ SECURITY: Check if requester is admin
  const requesterId = auth.uid;
  const requesterDoc = await admin.firestore()
    .collection('users')
    .doc(requesterId)
    .get();

  if (!requesterDoc.exists || requesterDoc.data().role !== 'admin') {
    throw new HttpsError(
      'permission-denied',
      'Only admins can delete users'
    );
  }

  const { userId } = data;

  // ✅ PREVENT self-deletion
  if (userId === requesterId) {
    throw new HttpsError(
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
    throw new HttpsError('internal', error.message);
  }
});

// ✅ OPTIONAL: Function to update user role (called from admin panel)
exports.updateUserRole = onCall(async (request) => {
  const { data, auth } = request;

  // Check authentication
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Check if requester is admin
  const requesterId = auth.uid;
  const requesterDoc = await admin.firestore()
    .collection('users')
    .doc(requesterId)
    .get();

  if (!requesterDoc.exists || requesterDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can update roles');
  }

  const { userId, role } = data;

  // Validate role
  if (!['user', 'organizer', 'admin'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role');
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
    throw new HttpsError('internal', error.message);
  }
});