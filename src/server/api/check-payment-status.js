// server/api/check-payment-status.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Handler for checking a payment intent status
 * 
 * This endpoint allows frontend to check the current status of a payment
 * without having to handle the full payment intent object
 */
exports.checkPaymentStatus = async (req, res) => {
  const { payment_intent_id } = req.query;
  
  if (!payment_intent_id) {
    return res.status(400).json({ error: 'Missing payment intent ID' });
  }
  
  try {
    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (!paymentIntent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }
    
    // Check if there's a user ID in metadata
    const userId = paymentIntent.metadata?.userId;
    let dbPaymentRecord = null;
    
    // If we have a user ID and it's not a guest, try to get the payment record from Firestore
    if (userId && userId !== 'guest') {
      const paymentDoc = await db.collection('users').doc(userId).collection('payments').doc(payment_intent_id).get();
      
      if (paymentDoc.exists) {
        dbPaymentRecord = paymentDoc.data();
      }
    }
    
    // Return payment status info
    return res.status(200).json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100, // Convert from cents to dollars
      currency: paymentIntent.currency,
      created: new Date(paymentIntent.created * 1000).toISOString(),
      // Include additional info from Firestore if available
      dbRecord: dbPaymentRecord ? {
        status: dbPaymentRecord.status,
        createdAt: dbPaymentRecord.createdAt?.toDate?.().toISOString(),
        succeededAt: dbPaymentRecord.succeededAt?.toDate?.().toISOString(),
        failedAt: dbPaymentRecord.failedAt?.toDate?.().toISOString()
      } : null
    });
    
  } catch (error) {
    console.error('Error checking payment status:', error);
    return res.status(500).json({
      error: 'Failed to check payment status',
      details: error.message
    });
  }
};