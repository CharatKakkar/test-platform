// server/api/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Handler for creating a Stripe Checkout session
 * 
 * This endpoint is typically implemented on your backend server
 * and not exposed directly in your client-side JavaScript
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { items, customerEmail, customerName, discount, metadata } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Calculate total amount
    let totalAmount = items.reduce((sum, item) => {
      return sum + (item.amount * item.quantity);
    }, 0);

    // Apply discount if provided
    if (discount && discount > 0) {
      totalAmount = Math.max(totalAmount - discount, 0);
    }

    // Create line items for Stripe
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description || '',
          metadata: {
            item_id: item.id
          }
        },
        unit_amount: item.amount, // Amount in cents
      },
      quantity: item.quantity
    }));

    // Add discount as a separate line item if applicable
    if (discount && discount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Discount',
            description: 'Applied coupon discount'
          },
          unit_amount: -discount,
        },
        quantity: 1
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/payment/failed`,
      customer_email: customerEmail,
      client_reference_id: metadata?.userId || 'guest',
      payment_intent_data: {
        metadata: {
          ...metadata,
          itemsJson: JSON.stringify(items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity
          })))
        }
      }
    });

    // Store session information in Firestore for tracking
    if (metadata?.userId && metadata.userId !== 'guest') {
      await db.collection('users').doc(metadata.userId).collection('checkout_sessions').doc(session.id).set({
        sessionId: session.id,
        items: items,
        totalAmount: totalAmount / 100, // Convert back to dollars for storage
        discount: discount ? discount / 100 : 0,
        status: 'created',
        customerEmail,
        customerName,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Return the session URL to the client
    return res.status(200).json({
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      details: error.message
    });
  }
};