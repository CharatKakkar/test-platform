// server/api/stripe-webhook.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Handler for Stripe webhook events
 * 
 * This endpoint securely processes events from Stripe
 * like successful payments, refunds, etc.
 */
exports.stripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      req.rawBody, // Express needs proper setup to access raw body
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }
      
      // Add other event types as needed
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
};

/**
 * Handle completed checkout session
 */
async function handleCheckoutSessionCompleted(session) {
  try {
    const userId = session.client_reference_id;
    
    // If guest checkout, we can't update user records
    if (!userId || userId === 'guest') {
      console.log('Guest checkout completed:', session.id);
      return;
    }
    
    // Update session status in Firestore
    const sessionRef = db.collection('users').doc(userId).collection('checkout_sessions').doc(session.id);
    
    await sessionRef.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Fetch payment intent to get detailed metadata
    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
    if (!paymentIntent) {
      console.error('Payment intent not found for session:', session.id);
      return;
    }
    
    // Parse purchased items from metadata
    const { itemsJson } = paymentIntent.metadata;
    let purchasedItems = [];
    
    try {
      purchasedItems = JSON.parse(itemsJson);
    } catch (error) {
      console.error('Error parsing purchased items:', error);
    }
    
    // Mark exams as purchased in user's account
    if (purchasedItems && purchasedItems.length > 0) {
      const userPurchasedRef = db.collection('users').doc(userId).collection('purchased_exams');
      const batch = db.batch();
      
      for (const item of purchasedItems) {
        const purchaseId = `${item.id}_${Date.now()}`;
        const purchaseDoc = userPurchasedRef.doc(purchaseId);
        
        batch.set(purchaseDoc, {
          examId: item.id,
          examName: item.name,
          quantity: item.quantity,
          purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
          paymentIntentId: paymentIntent.id,
          sessionId: session.id,
          status: 'active',
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year access
          )
        });
      }
      
      await batch.commit();
      console.log(`Added ${purchasedItems.length} purchased exams for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    // Extract metadata
    const { userId, itemsJson } = paymentIntent.metadata;
    
    // Skip if no user ID or not a registered user
    if (!userId || userId === 'guest') {
      console.log('Guest payment succeeded:', paymentIntent.id);
      return;
    }
    
    // Update payment status in Firestore
    const paymentRef = db.collection('users').doc(userId).collection('payments').doc(paymentIntent.id);
    
    await paymentRef.set({
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert to dollars
      currency: paymentIntent.currency,
      status: 'succeeded',
      paymentMethod: paymentIntent.payment_method_types[0],
      createdAt: admin.firestore.Timestamp.fromDate(new Date(paymentIntent.created * 1000)),
      succeededAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`Payment ${paymentIntent.id} marked as succeeded for user ${userId}`);
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    // Extract metadata
    const { userId } = paymentIntent.metadata;
    
    // Skip if no user ID or not a registered user
    if (!userId || userId === 'guest') {
      console.log('Guest payment failed:', paymentIntent.id);
      return;
    }
    
    // Update payment status in Firestore
    const paymentRef = db.collection('users').doc(userId).collection('payments').doc(paymentIntent.id);
    
    await paymentRef.set({
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert to dollars
      currency: paymentIntent.currency,
      status: 'failed',
      error: paymentIntent.last_payment_error?.message || 'Payment failed',
      createdAt: admin.firestore.Timestamp.fromDate(new Date(paymentIntent.created * 1000)),
      failedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`Payment ${paymentIntent.id} marked as failed for user ${userId}`);
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}