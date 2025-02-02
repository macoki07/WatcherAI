import { ReactNode } from "react";

interface Props {
  children?: ReactNode;
  width?: string;
  height?: string;
  shape?: "rounded" | "default";
  color?: "primary" | "white";
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading? :boolean;
  onClick?: () => void;
  className?: string;
}

const Button = ({
  children,
  width = "auto",
  height = "auto",
  shape = "default",
  color = "primary",
  variant = "solid",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  className = "",
}: Props) => {
  const baseStyles = "relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

  const shapeStyles = {
    default: "rounded-lg",
    rounded: "rounded-full",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const variantStyles = {
    primary: {
      solid: "bg-green-500 text-white hover:bg-green-600 focus:ring-green-500",
      outline: "border-2 border-green-500 text-green-500 hover:bg-green-50 focus:ring-green-500",
      ghost: "text-green-500 hover:bg-green-50 focus:ring-green-500",
      loading: "bg-gray-500 text-black cursor-not-allowed",
    },
    white: {
        solid: "bg-white text-gray-900 hover:bg-gray-100 focus:ring-white",
        outline: "border-2 border-white text-white hover:bg-white hover:text-black focus:ring-white",
        ghost: "text-white hover:bg-white/10 focus:ring-white",
        loading: "bg-gray-500 text-black cursor-not-allowed",
      },
  };
  const currentVariant = loading ? "loading" : variant;
  // console.log("button renders")
  return (
    <button
      style={{ width, height, cursor: disabled || loading ? "not-allowed" : "pointer" }}
      className={`
        ${baseStyles}
        ${shapeStyles[shape]}
        ${sizeStyles[size]}
        ${variantStyles[color][currentVariant]}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;