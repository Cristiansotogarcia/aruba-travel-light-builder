import { CustomerInfo } from './types';
interface CustomerInfoSectionProps {
    customerInfo: CustomerInfo;
    onCustomerInfoChange: (info: CustomerInfo) => void;
}
export declare const CustomerInfoSection: ({ customerInfo, onCustomerInfoChange }: CustomerInfoSectionProps) => import("react/jsx-runtime").JSX.Element;
export {};
