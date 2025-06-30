import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/homepage/HeroSection';
import { FeaturedProducts } from '@/components/homepage/FeaturedProducts';
import { HowItWorks } from '@/components/homepage/HowItWorks';
const Index = () => {
    return (_jsxs("div", { className: "min-h-screen flex flex-col", children: [_jsx(Header, {}), _jsxs("main", { className: "flex-1", children: [_jsx(HeroSection, {}), _jsx(FeaturedProducts, {}), _jsx(HowItWorks, {})] }), _jsx(Footer, {})] }));
};
export default Index;
