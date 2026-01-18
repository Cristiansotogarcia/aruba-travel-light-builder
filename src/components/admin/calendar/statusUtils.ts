
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'pending_admin_review':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'confirmed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'in_transit':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'out_for_delivery':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'delivered':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'undeliverable':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pending Payment';
    case 'pending_admin_review':
      return 'Pending Admin Review';
    case 'confirmed':
      return 'Confirmed';
    case 'in_transit':
      return 'In Transit';
    case 'out_for_delivery':
      return 'Out for Delivery';
    case 'delivered':
      return 'Delivered';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'rejected':
      return 'Rejected';
    case 'undeliverable':
      return 'Undeliverable';
    default:
      return status;
  }
};
