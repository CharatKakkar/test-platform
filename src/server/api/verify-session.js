// server/api/verify-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Handler for verifying a Stripe Checkout session
 * 
 * This endpoint confirms the status of a session after the user returns
 * from the Stripe checkout page
 */
exports.verifySession = async (req, res) => {
  const { session_id } = req.query;
  
  if (!session_id) {
    return res.status(400).json({ success: false, error: 'Missing session ID' });
  }
  
  try {
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent', 'line_items']
    });
    
    // Check session status
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    // Prepare response data
    const responseData = {
      success: session.payment_status === 'paid',
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customer: {
        email: session.customer_details?.email,
        name: session.customer_details?.name
      },
      amount: session.amount_total / 100, // Convert from cents
    };
    
    // If we have a client reference ID, we can look up user data
    const userId = session.client_reference_id;
    if (userId && userId !== 'guest') {
      // Check if we have a record of this session in Firestore
      const sessionDoc = await db.collection('users').doc(userId).collection('checkout_sessions').doc(session.id).get();
      
      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data();
        
        // Add order details from Firestore
        responseData.order = {
          items: sessionData.items,
          totalAmount: sessionData.totalAmount,
          discount: sessionData.discount,
          status: sessionData.status,
          createdAt: sessionData.createdAt.toDate().toISOString()
        };
      }
      
      // If payment was successful, also check purchased exams
      if (responseData.success) {
        const purchases = await db.collection('users').doc(userId).collection('purchased_exams')
          .where('sessionId', '==', session.id).get();
        
        if (!purchases.empty) {
          responseData.purchases = [];
          purchases.forEach(doc => {
            responseData.purchases.push({
              id: doc.id,
              ...doc.data(),
              purchasedAt: doc.data().purchasedAt.toDate().toISOString(),
              expiresAt: doc.data().expiresAt.toDate().toISOString()
            });
          });
        }
      }
    }
    
    // Return session information
    return res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Error verifying session:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify session',
      details: error.message
    });
  }
};