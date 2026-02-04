"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, FileText, Zap, Home } from "lucide-react";

const Navbar = () => {
    const pathname = usePathname();

    const links = [
        { href: "/", label: "Home", icon: Home },
        { href: "/popularity", label: "Popularity", icon: TrendingUp },
        { href: "/content-quality", label: "Quality", icon: FileText },
        { href: "/ux-performance", label: "UX & Perf", icon: Zap },
    ];

    return (
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-3 md:px-6 py-2 md:py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl flex items-center gap-2 md:gap-6 w-[90%] max-w-fit overflow-hidden">
            {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full transition-all duration-300 ${isActive
                            ? "bg-white text-black shadow-lg shadow-white/20"
                            : "text-white/70 hover:text-white hover:bg-white/10"
                            }`}
                    >
                        <Icon size={18} />
                        <span className="text-sm font-medium hidden md:block">{link.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
};

export default Navbar;
