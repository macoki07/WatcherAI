import { ChangeEvent, ReactNode } from "react";

interface Props {
  width?: string;
  height?: string;
  type?: "text" | "password" | "email" | "number" | "tel" | "url" | "search";
  placeholder?: string;
  disabled?: boolean;
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  error?: string;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "translucent";
  className?: string;
  required?: boolean;
  name?: string;
}

const InputBox = ({
  width = "auto",
  height = "auto",
  type = "text",
  placeholder,
  disabled = false,
  value,
  onChange,
  label,
  error,
  icon,
  size = "md",
  variant = "default",
  className = "",
  required = false,
  name,
}: Props) => {
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

  const errorStyles = error
    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
    : "";

  const labelStyles =
    variant === "translucent"
      ? "text-sm font-medium text-gray-300"
      : "text-sm font-medium text-gray-700";

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className={labelStyles}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
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

        <input
          style={{ width, height }}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onChange={onChange}
          name={name}
          required={required}
          className={`
            ${baseStyles}
            ${sizeStyles[size]}
            ${variantStyles[variant]}
            ${errorStyles}
            ${icon ? "pl-10" : ""}
            ${className}
          `}
        />
      </div>

      {error && (
        <p
          className={`text-sm mt-1 ${
            variant === "translucent" ? "text-red-400" : "text-red-500"
          }`}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default InputBox;
