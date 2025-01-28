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
    },
    white: {
        solid: "bg-white text-gray-900 hover:bg-gray-100 focus:ring-white",
        outline: "border-2 border-white text-white hover:bg-white hover:text-black focus:ring-white",
        ghost: "text-white hover:bg-white/10 focus:ring-white",
      },
  };

  return (
    <button
      style={{ width, height }}
      className={`
        ${baseStyles}
        ${shapeStyles[shape]}
        ${sizeStyles[size]}
        ${variantStyles[color][variant]}
        ${className}
      `}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;