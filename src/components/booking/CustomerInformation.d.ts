interface CustomerInfo {
    name: string;
    email: string;
    phone: string;
    address: string;
}
interface CustomerInformationProps {
    customerInfo: CustomerInfo;
    onCustomerInfoChange: (field: keyof CustomerInfo, value: string) => void;
}
export declare const CustomerInformation: ({ customerInfo, onCustomerInfoChange }: CustomerInformationProps) => import("react/jsx-runtime").JSX.Element;
export {};
