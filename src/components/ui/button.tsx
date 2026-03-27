import React, { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost" | "outline";
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  children,
  className = "",
  size = "md",
  variant = "primary",
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: "text-sm px-3 py-1.5 rounded-lg",
    md: "text-sm font-semibold px-5 py-2.5 rounded-xl",
    lg: "text-base font-semibold px-6 py-3.5 rounded-xl",
  };

  const variantClasses = {
    primary:
      "bg-primary-500 text-white hover:bg-primary-600 shadow-soft hover:shadow-soft-lg transition-all duration-200 disabled:bg-slate-300 disabled:shadow-none",
    secondary:
      "bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors duration-200 disabled:opacity-50",
    ghost:
      "text-slate-700 hover:bg-slate-100 transition-colors duration-200 disabled:opacity-50",
    outline:
      "border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 disabled:opacity-50",
  };

  return (
    <button
      className={`${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
