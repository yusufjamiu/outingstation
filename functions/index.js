const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

// Delete User Function
exports.deleteUser = onCall(async (request) => {
  const { data, auth } = request;

  // Check if user is authenticated
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Get the calling user's data
  const callerDoc = await admin.firestore().collection('users').doc(auth.uid).get();
  const callerData = callerDoc.data();

  // Check if caller is admin
  if (!callerData || callerData.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can delete users');
  }

  const { uid } = data;

  if (!uid) {
    throw new HttpsError('invalid-argument', 'User ID is required');
  }

  try {
    // Delete user from Authentication
    await admin.auth().deleteUser(uid);

    // Delete user document from Firestore
    await admin.firestore().collection('users').doc(uid).delete();

    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new HttpsError('internal', error.message);
  }
});

// Update User Role Function
exports.updateUserRole = onCall(async (request) => {
  const { data, auth } = request;

  // Check if user is authenticated
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Get the calling user's data
  const callerDoc = await admin.firestore().collection('users').doc(auth.uid).get();
  const callerData = callerDoc.data();

  // Check if caller is admin
  if (!callerData || callerData.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can update user roles');
  }

  const { uid, newRole } = data;

  if (!uid || !newRole) {
    throw new HttpsError('invalid-argument', 'User ID and new role are required');
  }

  // Validate role
  const validRoles = ['user', 'admin', 'organizer'];
  if (!validRoles.includes(newRole)) {
    throw new HttpsError('invalid-argument', 'Invalid role specified');
  }

  try {
    // Update role in Firestore
    await admin.firestore().collection('users').doc(uid).update({
      role: newRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: 'User role updated successfully' };
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new HttpsError('internal', error.message);
  }
});