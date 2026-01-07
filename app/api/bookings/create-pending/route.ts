import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const adminDb = getAdminDb();

interface BookingRequest {
  eventId: string;
  eventName: string;
  eventDate: string;
  venueId: string;
  showId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  pricePerTicket: number;
  totalPrice: number;
  userId: string;
  userEmail: string;
  userName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: BookingRequest = await request.json();
    
    const {
      eventId,
      eventName,
      eventDate,
      venueId,
      showId,
      ticketTypeId,
      ticketTypeName,
      quantity,
      pricePerTicket,
      totalPrice,
      userId,
      userEmail,
      userName,
    } = body;

    // Validate required fields
    if (!eventId || !ticketTypeId || !quantity || !totalPrice || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    // Execute transaction to ensure inventory and analytics stay in sync
    const result = await adminDb.runTransaction(async (transaction) => {
      // 1. Get the ticket type document to check availability
      const ticketTypeRef = adminDb
        .collection('events')
        .doc(eventId)
        .collection('venues')
        .doc(venueId)
        .collection('shows')
        .doc(showId)
        .collection('ticketTypes')
        .doc(ticketTypeId);

      const ticketTypeDoc = await transaction.get(ticketTypeRef);

      if (!ticketTypeDoc.exists) {
        throw new Error('Ticket type not found');
      }

      const ticketTypeData = ticketTypeDoc.data();
      const availableQuantity = ticketTypeData?.availableQuantity || 0;
      const soldCount = ticketTypeData?.soldCount || 0;

      // 2. Check if enough tickets are available
      if (availableQuantity < quantity) {
        throw new Error(`Only ${availableQuantity} tickets available`);
      }

      // 3. Create the booking document
      const bookingRef = adminDb
        .collection('events')
        .doc(eventId)
        .collection('bookings')
        .doc();

      transaction.set(bookingRef, {
        bookingId: bookingRef.id,
        eventId,
        eventName,
        eventDate,
        venueId,
        showId,
        ticketTypeId,
        ticketTypeName,
        quantity,
        pricePerTicket,
        totalPrice,
        userId,
        userEmail,
        userName,
        bookingStatus: 'PENDING',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 4. Update ticket inventory (decrement available, increment sold)
      transaction.update(ticketTypeRef, {
        availableQuantity: FieldValue.increment(-quantity),
        soldCount: FieldValue.increment(quantity),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 5. Get event data (needed for analytics metadata)
      const eventRef = adminDb.collection('events').doc(eventId);
      const eventDoc = await transaction.get(eventRef);
      
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();
      const hostId = eventData?.hostUid || eventData?.hostId;

      if (!hostId) {
        throw new Error('Host ID not found in event data');
      }

      // Extract event name and date from the events document
      const actualEventName = eventData?.title || eventData?.name || eventName;
      const actualEventDate = eventData?.date || eventData?.startDate || eventDate;

      // 6. Update event_analytics with ticket type breakdown AND hostId
      const analyticsRef = adminDb.collection('event_analytics').doc(eventId);

      // Build the nested map update for ticket breakdown
      const ticketBreakdownUpdate: any = {};
      ticketBreakdownUpdate[`ticketBreakdown.${ticketTypeName}.soldCount`] = FieldValue.increment(quantity);
      ticketBreakdownUpdate[`ticketBreakdown.${ticketTypeName}.revenue`] = FieldValue.increment(totalPrice);

      transaction.set(
        analyticsRef,
        {
          // Top-level totals
          totalRevenue: FieldValue.increment(totalPrice),
          totalTicketsSold: FieldValue.increment(quantity),
          
          // Event metadata from events document
          eventName: actualEventName,
          eventDate: actualEventDate,
          eventId,
          hostId, // CRITICAL: Required for Firestore Rules
          
          // Nested ticket type breakdown
          ...ticketBreakdownUpdate,
          
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // 7. Update host_analytics
      const hostAnalyticsRef = adminDb.collection('host_analytics').doc(hostId);
      transaction.set(
        hostAnalyticsRef,
        {
          totalRevenue: FieldValue.increment(totalPrice),
          totalTicketsSold: FieldValue.increment(quantity),
          hostId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { bookingId: bookingRef.id };
    });

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      bookingId: result.bookingId,
    });

  } catch (error: any) {
    console.error('Booking creation error:', error);
    
    if (error.message.includes('Only') && error.message.includes('tickets available')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 } // Conflict
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create booking' },
      { status: 500 }
    );
  }
}
