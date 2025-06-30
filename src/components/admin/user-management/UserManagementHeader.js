import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CreateUserDialog } from './CreateUserDialog';
export const UserManagementHeader = ({ onUserCreated, onRefreshProfiles }) => {
    return (_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "User Management" }), _jsx("p", { className: "text-gray-600 mt-1", children: "Manage user accounts and permissions" })] }), _jsx(CreateUserDialog, { onUserCreated: onUserCreated, onRefreshProfiles: onRefreshProfiles })] }));
};
