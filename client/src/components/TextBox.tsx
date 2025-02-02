import { ReactNode } from "react";

interface Props {
  width?: string;
  height?: string;
  placeholder?: string;
  disabled?: boolean;
  value?: string | number;
  label?: string;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "translucent";
  className?: string;
  name?: string;
  children?: ReactNode;
  cols?: number;
  rows?: number;
  readonly?: boolean;
}

const TextBox = ({
  width = "auto",
  height = "auto",
  placeholder,
  disabled = false,
  value,
  label,
  icon,
  size = "md",
  variant = "default",
  className = "",
  name,
  children,
  cols = 1,
  rows = 1,
  readonly = true
}: Props) => {
  // console.log("text box renders")
  const baseStyles =
    "w-full transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-5 py-3 text-lg",
  };

  const variantStyles = {
    default:
      "bg-white border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
    translucent:
      "bg-gray-900/50 backdrop-blur-md border border-green-500/30 rounded-lg text-white placeholder:text-gray-400 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 focus:ring-offset-0",
  };

  const labelStyles =
    variant === "translucent"
      ? "text-sm font-medium text-gray-300"
      : "text-sm font-medium text-gray-700";

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className={labelStyles}>
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              variant === "translucent" ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {icon}
          </div>
        )}

        <textarea
          style={{ width, height }}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          name={name}
          className={`
            ${baseStyles}
            ${sizeStyles[size]}
            ${variantStyles[variant]}
            ${icon ? "pl-10" : ""}
            ${className}
          `}
          cols={cols}
          rows={rows}
          readOnly={readonly}>
          {children}
        </textarea>
      </div>
    </div>
  );
};

export default TextBox;
