import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import stripeService from '../services/stripeService';
import { recordCouponUsage } from '../services/couponService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth } from '../firebase';
import { db } from '../firebase';

/**
 * Component that handles payment status checking and redirects based on the result
 * This can be placed on your payment/success page
 */
const PaymentStatusRouter = ({
  successRedirect = '/thank-you',
  failureRedirect = '/payment-failed',
  pendingRedirect = '/payment-pending',
  loadingComponent = null
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkComplete, setCheckComplete] = useState(false);
  const isVerifying = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Prevent duplicate checks
    if (checkComplete || isVerifying.current) return;

    const checkPaymentStatus = async () => {
      try {
        isVerifying.current = true;
        // Get session ID from URL params
        const searchParams = new URLSearchParams(location.search);
        const sessionId = searchParams.get('session_id');

        if (!sessionId) {
          console.error("No session ID found in URL");
          setError("No session ID found");
          navigate(failureRedirect);
          return;
        }

        // Check if purchases already exist for this session
        const userId = auth.currentUser?.uid;
        if (userId) {
          const existingPurchases = await getDocs(
            query(
              collection(db, "purchasedExams", userId, "purchases"),
              where("sessionId", "==", sessionId)
            )
          );

          if (!existingPurchases.empty) {
            console.log("Purchases already exist for this session, skipping verification");
            setCheckComplete(true);
            navigate(successRedirect, {
              state: {
                sessionId,
                sessionData: { success: true },
                purchaseDetails: existingPurchases.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                })),
                purchasedItems: existingPurchases.docs.map(doc => doc.data()),
                metadata: {}
              }
            });
            return;
          }
        }

        console.log("Starting payment verification for session:", sessionId);
        // Verify payment status with Stripe
        const sessionData = await stripeService.verifyCheckoutSession(sessionId);
        console.log("Session verification result:", sessionData);
        
        setCheckComplete(true);
        
        if (sessionData.success) {
          console.log("Payment successful, redirecting to success page");
          
          // Record coupon usage if a coupon was applied
          if (sessionData.metadata?.couponApplied === 'true' && sessionData.metadata?.couponCode) {
            try {
              await recordCouponUsage(
                sessionData.metadata.couponCode,
                auth.currentUser.uid,
                sessionId
              );
            } catch (error) {
              console.error('Error recording coupon usage:', error);
              // Don't block the success flow if coupon recording fails
            }
          }
          
          // Payment successful - redirect to success page with all session data
          navigate(successRedirect, {
            state: {
              sessionId,
              sessionData: sessionData,
              purchaseDetails: sessionData.purchases || [],
              purchasedItems: sessionData.purchasedItems || [],
              metadata: sessionData.metadata || {},
            }
          });
        } else if (sessionData.paymentStatus === 'pending') {
          console.log("Payment pending, redirecting to pending page");
          // Payment still pending
          navigate(pendingRedirect, {
            state: { sessionId, statusData: sessionData }
          });
        } else {
          console.log("Payment failed or was canceled. Status:", sessionData.paymentStatus);
          // Payment failed or was canceled
          navigate(failureRedirect, {
            state: { 
              error: "Payment was not completed",
              status: sessionData.paymentStatus,
              sessionData: sessionData
            }
          });
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
        setError(error.message || "Failed to verify payment");
        navigate(failureRedirect, {
          state: { 
            error: error.message,
            details: error
          }
        });
      } finally {
        setLoading(false);
        isVerifying.current = false;
      }
    };

    checkPaymentStatus();
  }, [navigate, location, successRedirect, failureRedirect, pendingRedirect, checkComplete]);

  // Show loading state
  if (loading) {
    return loadingComponent || (
      <div className="payment-processing">
        <div className="spinner"></div>
        <h2>Verifying your payment...</h2>
        <p>Please wait while we confirm your transaction.</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="payment-error">
        <h2>Payment Verification Error</h2>
        <p>{error}</p>
        <p>Redirecting you to the error page...</p>
      </div>
    );
  }

  // Default - this will briefly show before redirect happens
  return (
    <div className="payment-redirecting">
      <h2>Payment Processed</h2>
      <p>Redirecting you to the appropriate page...</p>
    </div>
  );
};

export default PaymentStatusRouter;