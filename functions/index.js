const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")(functions.config().stripe.secret);
const cors = require("cors")({origin: true});

admin.initializeApp();

// Create a Stripe Checkout session
exports.createCheckoutSession = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
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

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${functions.config().app.url}/payment/success?` +
        `session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${functions.config().app.url}/payment/failed`,
        customer_email: customerEmail,
        client_reference_id: metadata?.userId || "guest",
        payment_intent_data: {
          metadata: {
            ...metadata,
            // Ensure userId is in payment intent metadata
            userId: metadata?.userId || "guest",
            itemsJson: JSON.stringify(items.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
            }))),
          },
        },
      });

      // Store session information in Firestore for tracking
      if (metadata?.userId && metadata.userId !== "guest") {
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
});

// Verify a Stripe Checkout session
exports.verifySession = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(405).send("Method Not Allowed");
    }

    const {sessionId} = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "Missing session ID",
      });
    }

    try {
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
});

// Check payment status
exports.checkPaymentStatus = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(405).send("Method Not Allowed");
    }

    const {paymentIntentId} = req.query;

    if (!paymentIntentId) {
      return res.status(400).json({error: "Missing payment intent ID"});
    }

    try {
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
          succeededAt: dbPaymentRecord.succeededAt?.toDate?.().toISOString(),
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
});

// Get session details
exports.getSession = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(405).send("Method Not Allowed");
    }

    const {sessionId} = req.query;

    if (!sessionId) {
      return res.status(400).json({error: "Missing session ID"});
    }

    try {
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
});

// Stripe webhook handler
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  // For webhooks, we don't use the CORS middleware as it interferes with
  // raw body verification
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).json({error: "Missing Stripe signature"});
  }

  try {
    // Firebase Functions v2+ no longer automatically exposes rawBody
    // We need to get the raw body from the request
    const rawBody = req.rawBody || req.body;

    if (!rawBody) {
      throw new Error("Missing request body");
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      typeof rawBody === "string" ?
          rawBody : JSON.stringify(rawBody),
      signature,
      functions.config().stripe.webhook_secret,
    );

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
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
    const userId = session.client_reference_id;

    // If guest checkout, we can't update user records
    if (!userId || userId === "guest") {
      console.log("Guest checkout completed:", session.id);
      return;
    }

    // Update session status in Firestore
    const sessionRef = admin.firestore().collection("users").doc(userId)
        .collection("checkout_sessions").doc(session.id);

    // Check if the session document exists before updating
    const sessionDoc = await sessionRef.get();

    if (sessionDoc.exists) {
      await sessionRef.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Create the session document if it doesn't exist
      await sessionRef.set({
        sessionId: session.id,
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Fetch payment intent to get detailed metadata
    const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent);
    if (!paymentIntent) {
      console.error("Payment intent not found for session:", session.id);
      return;
    }

    // Parse purchased items from metadata
    const {itemsJson} = paymentIntent.metadata || {};
    let purchasedItems = [];

    if (itemsJson) {
      try {
        purchasedItems = JSON.parse(itemsJson);
      } catch (error) {
        console.error("Error parsing purchased items:", error);
      }
    } else {
      console.warn("No itemsJson found in payment intent metadata for session:",
          session.id);
    }

    // Mark exams as purchased in user's account
    if (purchasedItems && purchasedItems.length > 0) {
      const userPurchasedRef = admin.firestore().collection("users")
          .doc(userId)
          .collection("purchased_exams");
      const batch = admin.firestore().batch();

      for (const item of purchasedItems) {
        // Validate item has required fields
        if (!item.id) {
          console.warn("Skipping purchased item without id:", item);
          continue;
        }

        const timestamp = Date.now();
        const purchaseId = `${item.id}_${timestamp}`;
        const purchaseDoc = userPurchasedRef.doc(purchaseId);

        batch.set(purchaseDoc, {
          examId: item.id,
          examName: item.name || "Unknown exam",
          quantity: item.quantity || 1,
          purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
          paymentIntentId: paymentIntent.id,
          sessionId: session.id,
          status: "active",
          expiresAt: admin.firestore.Timestamp.fromDate(
              new Date(timestamp + 365 * 24 * 60 * 60 * 1000), // 1 year access
          ),
        });
      }

      await batch.commit();
      console.log(
          `Added ${purchasedItems.length} purchased exams for user ${userId}`);
    }
  } catch (error) {
    console.error("Error handling checkout session completed:", error);
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
