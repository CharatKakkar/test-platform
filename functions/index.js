/* eslint-disable require-jsdoc */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");
// Update CORS configuration to allow all origins with credentials
const cors = require("cors")({
  origin: ["http://localhost:3000", "https://yourdomain.com"], // Add your production domain
  credentials: true
});
const express = require("express");
const app = express();
require("dotenv").config();

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Initializes and returns the Stripe instance using environment variables.
 * Caches the instance to avoid recreating it on every function call.
 * @return {object} Configured Stripe instance
 * @throws {Error} If the Stripe secret key is not set in environment variables
 */
let stripe;
function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("Stripe Secret Key must be set in environment variables");
  }else{
    console.log(stripeSecretKey)
  }

  if (!stripe) {
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
  }

  return stripe;
}

/**
 * Retrieves the Stripe webhook secret from environment variables.
 * @return {string} The webhook secret key
 * @throws {Error} If the webhook secret is not set in environment variables
 */
// Get webhook secret with proper error handling
function getWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Stripe Webhook Secret" +
     " must be set in environment variables");
  }

  return webhookSecret;
}

// Enable CORS for all routes
app.use(cors);

// For webhook endpoints, we need the raw body
app.use("/stripeWebhook", express.raw({type: "application/json"}));
// For all other routes, use standard JSON parsing
app.use(express.json());

// Add explicit OPTIONS handling for preflight requests
app.options('*', cors);

// Configuration verification endpoint
app.get("/checkConfig", async (req, res) => {
  try {
    // Check if Stripe keys are configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripeWebhookSecretKey = process.env.STRIPE_WEBHOOK_SECRET;

    const configStatus = {
      stripeSecretConfigured: !!stripeSecretKey,
      webhookSecretConfigured: !!stripeWebhookSecretKey,
      appUrl: process.env.APP_URL || null,
    };

    return res.status(200).json({
      status: "success",
      message: "Configuration check completed",
      config: configStatus,
    });
  } catch (error) {
    console.error("Error checking configuration:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to check configuration",
      error: error.message,
    });
  }
});

// Existing functions converted to Express routes
app.post("/createCheckoutSession", async (req, res) => {
  try {
    // Get Stripe instance
    const stripe = getStripe();

    const {items, customerEmail, customerName, discount, metadata} = req.body;

    if (!items || !items.length) {
      return res.status(400).json({error: "No items provided"});
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
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          description: item.description || "",
          metadata: {
            item_id: item.id,
          },
        },
        unit_amount: item.amount, // Amount in cents
      },
      quantity: item.quantity,
    }));

    // Add discount as a separate line item if applicable
    if (discount && discount > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Discount",
            description: "Applied coupon discount",
          },
          unit_amount: -discount,
        },
        quantity: 1,
      });
    }

    // Get app URL from environment with fallback
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payment/failed`,
      customer_email: customerEmail,
      client_reference_id: metadata.userId || "guest",
      payment_intent_data: {
        metadata: {
          ...metadata,
          // Ensure userId is in payment intent metadata
          userId: metadata.userId || "guest",
          itemsJson: JSON.stringify(items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
          }))),
        },
      },
    });

    // Store session information in Firestore for tracking
    if (metadata.userId && metadata.userId !== "guest") {
      await admin.firestore().collection("users").doc(metadata.userId)
          .collection("checkout_sessions").doc(session.id).set({
            sessionId: session.id,
            items: items,
            // Convert back to dollars for storage
            totalAmount: totalAmount / 100,
            discount: discount ? discount / 100 : 0,
            status: "created",
            customerEmail,
            customerName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
    }

    // Return the session URL to the client
    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return res.status(500).json({
      error: "Failed to create checkout session",
      details: error.message,
    });
  }
});

app.get("/verifySession", async (req, res) => {
  try {
    const stripe = getStripe();
    const sessionId = req.query.sessionId || req.query.session_id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "Missing session ID",
      });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    });

    // Check session status
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }

    // Prepare response data
    const responseData = {
      success: session.payment_status === "paid",
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customer: {
        email: session.customer_details?.email,
        name: session.customer_details?.name,
      },
      amount: session.amount_total / 100, // Convert from cents
    };

    // If we have a client reference ID, we can look up user data
    const userId = session.client_reference_id;
    if (userId && userId !== "guest") {
      // Check if we have a record of this session in Firestore
      const sessionDoc = await admin.firestore().collection("users")
          .doc(userId)
          .collection("checkout_sessions")
          .doc(session.id)
          .get();

      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data();

        // Add order details from Firestore
        responseData.order = {
          items: sessionData.items,
          totalAmount: sessionData.totalAmount,
          discount: sessionData.discount,
          status: sessionData.status,
          createdAt: sessionData.createdAt.toDate().toISOString(),
        };
      }

      // If payment was successful, also check purchased exams
      if (responseData.success) {
        const purchases = await admin.firestore().collection("users")
            .doc(userId)
            .collection("purchased_exams")
            .where("sessionId", "==", session.id)
            .get();

        if (!purchases.empty) {
          responseData.purchases = [];
          purchases.forEach((doc) => {
            responseData.purchases.push({
              id: doc.id,
              ...doc.data(),
              purchasedAt: doc.data().purchasedAt.toDate().toISOString(),
              expiresAt: doc.data().expiresAt.toDate().toISOString(),
            });
          });
        }
      }
    }

    // Return session information
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error verifying session:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to verify session",
      details: error.message,
    });
  }
});

app.get("/checkPaymentStatus", async (req, res) => {
  try {
    const stripe = getStripe();
    const paymentIntentId = req.query.paymentIntentId || req.query.payment_intent_id;

    if (!paymentIntentId) {
      return res.status(400).json({error: "Missing payment intent ID"});
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents
        .retrieve(paymentIntentId);

    if (!paymentIntent) {
      return res.status(404).json({error: "Payment intent not found"});
    }

    // Check if there's a user ID in metadata
    const userId = paymentIntent.metadata?.userId;
    let dbPaymentRecord = null;

    // If we have a user ID and it's not a guest, try to get the payment
    // record from Firestore
    if (userId && userId !== "guest") {
      const paymentDoc = await admin.firestore().collection("users")
          .doc(userId)
          .collection("payments")
          .doc(paymentIntentId)
          .get();

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
        succeededAt: dbPaymentRecord.succeededAt?.toDate?.()
            .toISOString(),
        failedAt: dbPaymentRecord.failedAt?.toDate?.().toISOString(),
      } : null,
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return res.status(500).json({
      error: "Failed to check payment status",
      details: error.message,
    });
  }
});

app.get("/getSession", async (req, res) => {
  try {
    const stripe = getStripe();
    const sessionId = req.query.sessionId || req.query.session_id;

    if (!sessionId) {
      return res.status(400).json({error: "Missing session ID"});
    }

    // Retrieve the session from Stripe with expanded line items and payment
    // intent
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: [
        "line_items",
        "line_items.data.price.product",
        "payment_intent",
        "payment_intent.payment_method",
        "customer",
      ],
    });

    if (!session) {
      return res.status(404).json({error: "Session not found"});
    }

    // Get client reference ID (user ID)
    const userId = session.client_reference_id;
    let dbSessionRecord = null;

    // If there's a user ID and it's not a guest, try to get the session
    // record from Firestore
    if (userId && userId !== "guest") {
      const sessionDoc = await admin.firestore().collection("users")
          .doc(userId)
          .collection("checkout_sessions")
          .doc(sessionId)
          .get();

      if (sessionDoc.exists) {
        const data = sessionDoc.data();
        dbSessionRecord = {
          ...data,
          createdAt: data.createdAt?.toDate?.().toISOString(),
          completedAt: data.completedAt?.toDate?.().toISOString(),
        };
      }

      // Check for purchased exams related to this session
      if (session.payment_status === "paid") {
        const purchasedExamsSnapshot = await admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("purchased_exams")
            .where("sessionId", "==", sessionId)
            .get();

        if (!purchasedExamsSnapshot.empty) {
          dbSessionRecord = dbSessionRecord || {};
          dbSessionRecord.purchasedExams = [];

          purchasedExamsSnapshot.forEach((doc) => {
            const data = doc.data();
            dbSessionRecord.purchasedExams.push({
              id: doc.id,
              ...data,
              purchasedAt: data.purchasedAt?.toDate?.().toISOString(),
              expiresAt: data.expiresAt?.toDate?.().toISOString(),
            });
          });
        }
      }
    }

    // Format line items for easier consumption
    const formattedLineItems = [];

    if (session.line_items && session.line_items.data) {
      session.line_items.data.forEach((item) => {
        const product = item.price?.product;

        formattedLineItems.push({
          id: product?.id || item.price?.id,
          name: product?.name || "Unknown product",
          description: product?.description || "",
          amount: item.amount_total / 100, // Convert from cents to dollars
          quantity: item.quantity,
          currency: item.currency,
        });
      });
    }

    // Construct response with useful data
    const response = {
      id: session.id,
      paymentStatus: session.payment_status,
      paymentIntentId: session.payment_intent?.id,
      // Convert from cents to dollars
      amountTotal: session.amount_total / 100,
      currency: session.currency,
      customer: {
        id: session.customer?.id,
        email: session.customer_details?.email || session.customer?.email,
        name: session.customer_details?.name || session.customer?.name,
      },
      lineItems: formattedLineItems,
      created: new Date(session.created * 1000).toISOString(),
      status: session.status,
      url: session.url,
      // Include Firestore data if available
      dbRecord: dbSessionRecord,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error getting session:", error);
    return res.status(500).json({
      error: "Failed to get session",
      details: error.message,
    });
  }
});

app.post("/stripeWebhook", async (req, res) => {
  try {
    console.log("Webhook received");
    // Get Stripe instance and webhook secret
    const stripe = getStripe();
    const webhookSecret = getWebhookSecret();

    // For webhooks, we need to get raw body
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      console.error("Missing Stripe signature in webhook");
      return res.status(400).json({error: "Missing Stripe signature"});
    }

    // For webhook to work correctly in Express, we need raw body
    const rawBody = req.rawBody || req.body;

    if (!rawBody) {
      console.error("Missing request body in webhook");
      throw new Error("Missing request body");
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
    );

    console.log("Webhook event type:", event.type);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        console.log("Processing checkout.session.completed event");
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "payment_intent.succeeded": {
        console.log("Processing payment_intent.succeeded event");
        const paymentIntent = event.data.object;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        console.log("Processing payment_intent.payment_failed event");
        const paymentIntent = event.data.object;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }

      default: {
        console.log(`Unhandled event type: ${event.type}`);
        break;
      }
    }

    return res.status(200).json({received: true});
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(400).json({error: `Webhook Error: ${error.message}`});
  }
});

/**
 * Handles a completed checkout session.
 * @param {object} session - The checkout session object from Stripe.
 * @return {Promise<void>} A promise that resolves when processing is complete.
 */
async function handleCheckoutSessionCompleted(session) {
  try {
    console.log("Starting handleCheckoutSessionCompleted");
    console.log("Session data:", JSON.stringify(session, null, 2));
    const userId = session.client_reference_id;
    console.log("User ID from session:", userId);

    // If guest checkout, we can't update user records
    if (!userId || userId === "guest") {
      console.log("Guest checkout completed:", session.id);
      return;
    }

    // Get Stripe instance
    const stripe = getStripe();

    // Fetch payment intent to get detailed metadata
    console.log("Fetching payment intent for session:", session.id);
    const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent);
    if (!paymentIntent) {
      console.error("Payment intent not found for session:", session.id);
      return;
    }

    console.log("Payment intent data:", JSON.stringify(paymentIntent, null, 2));

    // Update session status in Firestore
    const sessionRef = admin.firestore()
        .collection("users")
        .doc(userId)
        .collection("checkout_sessions")
        .doc(session.id);

    await sessionRef.update({
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentStatus: session.payment_status,
      paymentIntentId: session.payment_intent
    });

    console.log(`Session ${session.id} marked as completed for user ${userId}`);
  } catch (error) {
    console.error("Error in handleCheckoutSessionCompleted:", error);
    throw error;
  }
}

/**
 * Handles a successful payment intent.
 * @param {object} paymentIntent - The payment intent object from Stripe.
 * @return {Promise<void>} A promise that resolves when processing is complete.
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    // Extract metadata
    const {userId} = paymentIntent.metadata;

    // Skip if no user ID or not a registered user
    if (!userId || userId === "guest") {
      console.log("Guest payment succeeded:", paymentIntent.id);
      return;
    }

    // Update payment status in Firestore
    const paymentRef = admin.firestore().collection("users").doc(userId)
        .collection("payments").doc(paymentIntent.id);

    await paymentRef.set({
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert to dollars
      currency: paymentIntent.currency,
      status: "succeeded",
      paymentMethod: paymentIntent.payment_method_types[0],
      createdAt: admin.firestore.Timestamp.fromDate(
          new Date(paymentIntent.created * 1000)),
      succeededAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    console.log(
        `Payment ${paymentIntent.id} marked as succeeded for user ${userId}`);
  } catch (error) {
    console.error("Error handling payment intent succeeded:", error);
  }
}

/**
 * Handles a failed payment intent.
 * @param {object} paymentIntent - The payment intent object from Stripe.
 * @return {Promise<void>} A promise that resolves when processing is complete.
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    // Extract metadata
    const {userId} = paymentIntent.metadata;

    // Skip if no user ID or not a registered user
    if (!userId || userId === "guest") {
      console.log("Guest payment failed:", paymentIntent.id);
      return;
    }

    // Update payment status in Firestore
    const paymentRef = admin.firestore().collection("users").doc(userId)
        .collection("payments").doc(paymentIntent.id);

    await paymentRef.set({
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert to dollars
      currency: paymentIntent.currency,
      status: "failed",
      error: paymentIntent.last_payment_error?.message || "Payment failed",
      createdAt: admin.firestore.Timestamp.fromDate(
          new Date(paymentIntent.created * 1000)),
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    console.log(
        `Payment ${paymentIntent.id} marked as failed for user ${userId}`);
  } catch (error) {
    console.error("Error handling payment intent failed:", error);
  }
}

// Secure admin-only endpoint for checking Stripe configuration
exports.getStripeConfig = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to access configuration.",
    );
  }

  try {
    // Get user data to check for admin role
    const userSnapshot = await admin.firestore().collection("users")
        .doc(context.auth.uid).get();
    const userData = userSnapshot.data();

    // Verify admin role
    if (!userData || userData.role !== "admin") {
      throw new functions.https.HttpsError(
          "permission-denied",
          "User must be an admin to access configuration.",
      );
    }

    // Get Stripe keys from environment
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripeWebhookSecretKey = process.env.STRIPE_WEBHOOK_SECRET;

    // Return sanitized configuration info (never return full keys)
    return {
      stripeConfigured: !!stripeSecretKey,
      webhookConfigured: !!stripeWebhookSecretKey,
      stripeKeyLastFour: stripeSecretKey ?
      `...${stripeSecretKey.slice(-4)}` : null,
      webhookKeyLastFour: stripeWebhookSecretKey ?
      `...${stripeWebhookSecretKey.slice(-4)}` : null,
      appUrl: process.env.APP_URL || null,
    };
  } catch (error) {
    console.error("Error in getStripeConfig:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Error retrieving configuration",
        {message: error.message},
    );
  }
});

// Export the Express app as a single Cloud Function
exports.api = functions.https.onRequest((req, res) => {
  // Add CORS headers to all responses
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle OPTIONS requests for preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Forward the request to Express
  return app(req, res);
});

// Export individual functions for backward compatibility
// These now simply redirect to the corresponding route in the Express app
exports.createCheckoutSession = functions.https.onRequest((req, res) => {
  // Add CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle OPTIONS requests for preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Forward to the Express app with modified path
  req.url = '/createCheckoutSession';
  return app(req, res);
});

exports.verifySession = functions.https.onRequest((req, res) => {
  // Add CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Forward to the Express app with modified path
  req.url = '/verifySession';
  return app(req, res);
});

exports.checkPaymentStatus = functions.https.onRequest((req, res) => {
  // Add CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Forward to the Express app with modified path
  req.url = '/checkPaymentStatus';
  return app(req, res);
});

exports.getSession = functions.https.onRequest((req, res) => {
  // Add CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Forward to the Express app with modified path
  req.url = '/getSession';
  return app(req, res);
});

exports.stripeWebhook = functions.https.onRequest((req, res) => {
  // For webhooks, don't add CORS headers as they come from Stripe servers
  
  // Forward to the Express app with modified path
  req.url = '/stripeWebhook';
  return app(req, res);
});

exports.checkConfig = functions.https.onRequest((req, res) => {
  // Add CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Forward to the Express app with modified path
  req.url = '/checkConfig';
  return app(req, res);
});