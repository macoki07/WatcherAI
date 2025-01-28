import { ReactNode } from "react";

interface Props {
  children?: ReactNode;
  width?: string;
  height?: string;
  className?: string;
}

const Card = ({
  children,
  width = "auto",
  height = "500px", // Set a default height
  className = "",
}: Props) => {
  return (
    <div
      className={`relative p-8 rounded-2xl overflow-hidden backdrop-blur-md ${className}`}
      style={{ width, minHeight: height }} // Ensure styles are applied directly here
    >
      <div className="absolute inset-0 rounded-2xl opacity-30 bg-gradient-to-tr from-green-500/40 via-green-500/10 to-green-500/40 shadow-[inset_0_0_30px_rgba(34,197,94,0.3)] border border-green-500/30" />
      <div className="absolute inset-0 rounded-2xl bg-gray-900/50 backdrop-blur-md" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};


export default Card;
