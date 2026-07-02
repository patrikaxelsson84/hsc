import type {ButtonHTMLAttributes, ReactNode} from "react";
import clsx from "clsx";

interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: "primary" | "secondary" | "danger";
}

export function Button({
                           children,
                           variant = "primary",
                           className,
                           ...props
                       }: ButtonProps) {
    return (
        <button
            className={clsx(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                {
                    "bg-slate-900 text-white hover:bg-slate-800":
                        variant === "primary",

                    "border bg-white text-slate-900 hover:bg-slate-50":
                        variant === "secondary",

                    "bg-red-600 text-white hover:bg-red-700":
                        variant === "danger",
                },
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}