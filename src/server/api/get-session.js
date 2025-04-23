// server/api/get-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Handler for retrieving full details of a Stripe Checkout session
 * 
 * This endpoint provides comprehensive session data including
 * line items and payment intent details
 */
exports.getSession = async (req, res) => {
  const { session_id } = req.query;
  
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session ID' });
  }
  
  try {
    // Retrieve the session from Stripe with expanded line items and payment intent
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: [
        'line_items',
        'line_items.data.price.product',
        'payment_intent',
        'payment_intent.payment_method',
        'customer'
      ]
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Get client reference ID (user ID)
    const userId = session.client_reference_id;
    let dbSessionRecord = null;
    
    // If there's a user ID and it's not a guest, try to get the session record from Firestore
    if (userId && userId !== 'guest') {
      const sessionDoc = await db.collection('users').doc(userId).collection('checkout_sessions').doc(session_id).get();
      
      if (sessionDoc.exists) {
        const data = sessionDoc.data();
        dbSessionRecord = {
          ...data,
          createdAt: data.createdAt?.toDate?.().toISOString(),
          completedAt: data.completedAt?.toDate?.().toISOString()
        };
      }
      
      // Check for purchased exams related to this session
      if (session.payment_status === 'paid') {
        const purchasedExamsSnapshot = await db.collection('users').doc(userId)
          .collection('purchased_exams')
          .where('sessionId', '==', session_id)
          .get();
        
        if (!purchasedExamsSnapshot.empty) {
          dbSessionRecord = dbSessionRecord || {};
          dbSessionRecord.purchasedExams = [];
          
          purchasedExamsSnapshot.forEach(doc => {
            const data = doc.data();
            dbSessionRecord.purchasedExams.push({
              id: doc.id,
              ...data,
              purchasedAt: data.purchasedAt?.toDate?.().toISOString(),
              expiresAt: data.expiresAt?.toDate?.().toISOString()
            });
          });
        }
      }
    }
    
    // Format line items for easier consumption
    const formattedLineItems = [];
    
    if (session.line_items && session.line_items.data) {
      session.line_items.data.forEach(item => {
        const product = item.price?.product;
        
        formattedLineItems.push({
          id: product?.id || item.price?.id,
          name: product?.name || 'Unknown product',
          description: product?.description || '',
          amount: item.amount_total / 100, // Convert from cents to dollars
          quantity: item.quantity,
          currency: item.currency
        });
      });
    }
    
    // Construct response with useful data
    const response = {
      id: session.id,
      paymentStatus: session.payment_status,
      paymentIntentId: session.payment_intent?.id,
      amountTotal: session.amount_total / 100, // Convert from cents to dollars
      currency: session.currency,
      customer: {
        id: session.customer?.id,
        email: session.customer_details?.email || session.customer?.email,
        name: session.customer_details?.name || session.customer?.name
      },
      lineItems: formattedLineItems,
      created: new Date(session.created * 1000).toISOString(),
      status: session.status,
      url: session.url,
      // Include Firestore data if available
      dbRecord: dbSessionRecord
    };
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Error getting session:', error);
    return res.status(500).json({
      error: 'Failed to get session',
      details: error.message
    });
  }
};