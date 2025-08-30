import { useEffect, useState } from 'react';
import socketService from '../services/socketService';
import { useNotifications } from '../contexts/NotificationContext';

interface Order {
  _id: string;
  orderNumber: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }>;
  total: number;
  status: string;
  orderDate: string;
  seller: string;
  customer: string;
}

interface OrderUpdate {
  orderId: string;
  order: Order;
  timestamp: Date;
}

interface UseRealTimeOrdersReturn {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  joinOrderRoom: (orderId: string) => void;
  leaveOrderRoom: (orderId: string) => void;
}

export const useRealTimeOrders = (initialOrders: Order[] = []): UseRealTimeOrdersReturn => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const { showToast } = useNotifications();

  useEffect(() => {
    // Set initial orders
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    // Subscribe to order updates
    const unsubscribeOrderUpdate = socketService.onOrderUpdate((update: OrderUpdate) => {
      console.log('Order update received:', update);
      
      // Update the orders list
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === update.orderId 
            ? { ...order, ...update.order }
            : order
        )
      );

      // Show toast notification
      showToast(
        `Order ${update.order.orderNumber} status updated to ${update.order.status}`,
        'info'
      );
    });

    // Subscribe to new order notifications
    const unsubscribeNotification = socketService.onNotification((notification) => {
      if (notification.type === 'new_order' && notification.data?.orderId) {
        // You might want to refresh the orders list or add the new order
        showToast(
          notification.message,
          notification.priority === 'high' ? 'success' : 'info'
        );
      }
    });

    return () => {
      unsubscribeOrderUpdate();
      unsubscribeNotification();
    };
  }, [showToast]);

  const joinOrderRoom = (orderId: string) => {
    socketService.joinOrderRoom(orderId);
  };

  const leaveOrderRoom = (orderId: string) => {
    socketService.leaveOrderRoom(orderId);
  };

  return {
    orders,
    setOrders,
    joinOrderRoom,
    leaveOrderRoom
  };
};

export default useRealTimeOrders;
